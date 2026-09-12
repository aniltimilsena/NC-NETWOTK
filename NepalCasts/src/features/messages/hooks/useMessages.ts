import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { subscribeToConversations, subscribeToMessages, sendMessage, createConversation, markConversationAsRead } from '../services/messaging';
import { getProfile } from '../../profile/services/profile';
import type { Message, ServiceResult } from '../../../types';
import { subscribeToCallHistory } from '../../../services';
import { cacheManager } from '../../../utils/cacheManager';
import { isUserOnline } from '../../../utils/presence';

export function useMessages(currentUser: any, initialUserId: string | null) {
    const cacheKey = currentUser?.uid ? `user_convos_cache_${currentUser.uid}` : null;
    const initialCached = cacheKey ? (cacheManager.getMemory<any[]>(cacheKey) || null) : null;
    const deletedStorageKey = currentUser?.uid ? `nc_deleted_convos_${currentUser.uid}` : null;

    const [deletedConvoIds, setDeletedConvoIds] = useState<Set<string>>(() => {
        if (!deletedStorageKey) return new Set();
        try {
            const raw = localStorage.getItem(deletedStorageKey);
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    });

    const [rawConversations, setRawConversations] = useState<any[]>(initialCached || []);
    const [receivedApps, setReceivedApps] = useState<any[]>([]);
    const [sentApps, setSentApps] = useState<any[]>([]);
    const [conversations, setConversations] = useState<any[]>(initialCached || []);
    const [activeChatId, setActiveChatId] = useState<string | null>(() => {
        if (!initialUserId) return null;
        if (initialUserId.includes('_') || initialUserId.startsWith('app_')) return initialUserId;
        if (currentUser?.uid) {
            return [currentUser.uid, initialUserId].sort().join('_');
        }
        return initialUserId;
    });

    useEffect(() => {
        if (!initialUserId) return;
        userClosedChatRef.current = false;
        if (initialUserId.includes('_') || initialUserId.startsWith('app_')) {
            setActiveChatId(initialUserId);
        } else if (currentUser?.uid) {
            const deterministicId = [currentUser.uid, initialUserId].sort().join('_');
            setActiveChatId(deterministicId);
        } else {
            setActiveChatId(initialUserId);
        }
    }, [initialUserId, currentUser?.uid]);
    const [syntheticChat, setSyntheticChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(!initialCached || initialCached.length === 0);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [callHistory, setCallHistory] = useState<any[]>([]);
    const [loadingCalls, setLoadingCalls] = useState(true);
    const userClosedChatRef = useRef(false);
    const resolvedInitialUserRef = useRef<string | null>(null);

    const handleSetActiveChatId = useCallback((id: string | null) => {
        if (id === null) {
            userClosedChatRef.current = true;
        } else {
            userClosedChatRef.current = false;
        }
        setActiveChatId(id);
    }, []);

    const removeConversation = useCallback((convoId: string) => {
        setDeletedConvoIds(prev => {
            const next = new Set(prev);
            next.add(convoId);
            if (deletedStorageKey) {
                try {
                    localStorage.setItem(deletedStorageKey, JSON.stringify(Array.from(next)));
                } catch (e) {}
            }
            return next;
        });
        setRawConversations(prev => prev.filter(c => c.id !== convoId && c.otherParticipantId !== convoId));
        setConversations(prev => prev.filter(c => c.id !== convoId && c.otherParticipantId !== convoId));
        setActiveChatId(prev => (prev === convoId ? null : prev));
        setMessages(prev => (activeChatId === convoId ? [] : prev));
    }, [deletedStorageKey, activeChatId]);

    // 1. Subscribe to regular conversations
    useEffect(() => {
        if (!currentUser?.uid) {
            setLoading(false);
            return;
        }
        const unsub = subscribeToConversations(currentUser.uid, (list) => {
            setRawConversations(list);
            setLoading(false);
        });
        return () => unsub();
    }, [currentUser?.uid]);

    // 2. Subscribe to received applications (where current user is the casting creator)
    useEffect(() => {
        if (!currentUser?.uid) return;
        const q = query(
            collection(db, 'applications'),
            where('creatorId', '==', currentUser.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setReceivedApps(apps);
        }, (err) => {
            console.warn('Received applications subscription error:', err);
        });
        return () => unsub();
    }, [currentUser?.uid]);

    // 3. Subscribe to sent applications (where current user is the applicant)
    useEffect(() => {
        if (!currentUser?.uid) return;
        const q = query(
            collection(db, 'applications'),
            where('userId', '==', currentUser.uid)
        );
        const unsub = onSnapshot(q, (snap) => {
            const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSentApps(apps);
        }, (err) => {
            console.warn('Sent applications subscription error:', err);
        });
        return () => unsub();
    }, [currentUser?.uid]);

    // 4. Combine conversations and casting call applications without duplicates
    useEffect(() => {
        const convosByParticipant = new Map<string, any>();

        // 1. Process regular conversations
        rawConversations.forEach(c => {
            if (deletedConvoIds.has(c.id) || (c.otherParticipantId && deletedConvoIds.has(c.otherParticipantId))) {
                return;
            }
            if (c.deletedFor && (c.deletedFor[currentUser?.uid] === true || (Array.isArray(c.deletedFor) && c.deletedFor.includes(currentUser?.uid)))) {
                return;
            }
            const otherId = c.otherParticipantId || c.participants?.find((p: string) => p !== currentUser?.uid);
            if (otherId) {
                if (deletedConvoIds.has(otherId)) return;
                convosByParticipant.set(otherId, { ...c });
            } else if (c.id) {
                convosByParticipant.set(c.id, { ...c });
            }
        });

        // 2. Merge received casting applications (as Creator)
        receivedApps.forEach(app => {
            const appId = `app_${app.id}`;
            if (deletedConvoIds.has(appId) || deletedConvoIds.has(app.id)) return;
            if (app.deletedFor && (app.deletedFor[currentUser?.uid] === true || (Array.isArray(app.deletedFor) && app.deletedFor.includes(currentUser?.uid)))) {
                return;
            }
            const otherId = app.userId;
            if (!otherId || deletedConvoIds.has(otherId)) return;
            const existing = convosByParticipant.get(otherId);
            if (existing) {
                // Enrich existing conversation with application details
                existing.isApplication = true;
                existing.applicationId = app.id;
                existing.castingId = app.castingId;
                existing.castingTitle = app.castingTitle || existing.castingTitle;
                existing.roleName = app.roleName || existing.roleName;
                existing.status = app.status || existing.status;
                existing.coverNote = app.coverNote || existing.coverNote;
                existing.selfTapeUrl = app.selfTapeUrl || existing.selfTapeUrl;
                existing.attachmentUrl = app.attachmentUrl || app.fileUrl || existing.attachmentUrl;
                if (!existing.avatar && app.userPhoto) {
                    existing.avatar = app.userPhoto;
                }
                if (!existing.name || existing.name === 'User') {
                    existing.name = app.userName || app.fullName || existing.name;
                }
            } else {
                // If no direct conversation exists yet with this applicant, create application thread
                convosByParticipant.set(otherId, {
                    id: `app_${app.id}`,
                    applicationId: app.id,
                    isApplication: true,
                    type: 'application',
                    castingId: app.castingId,
                    castingTitle: app.castingTitle || 'Casting Call',
                    roleName: app.roleName || 'Audition Role',
                    status: app.status || 'pending',
                    name: app.userName || app.fullName || 'Audition Applicant',
                    avatar: app.userPhoto || '',
                    otherParticipantId: app.userId,
                    participants: [app.userId, currentUser?.uid].filter(Boolean),
                    lastMessage: `Application for "${app.roleName || 'Role'}" • Status: ${(app.status || 'pending').toUpperCase()}`,
                    lastMessageAt: app.appliedAt || app.createdAt || null,
                    updatedAt: app.appliedAt || app.createdAt || null,
                    unread: app.status === 'pending',
                    unreadCounts: {
                        [currentUser?.uid]: app.status === 'pending' ? 1 : 0
                    },
                    coverNote: app.coverNote || '',
                    selfTapeUrl: app.selfTapeUrl || '',
                    attachmentUrl: app.attachmentUrl || app.fileUrl || '',
                });
            }
        });

        // 3. Merge sent casting applications (as Applicant)
        sentApps.forEach(app => {
            const appId = `app_${app.id}`;
            if (deletedConvoIds.has(appId) || deletedConvoIds.has(app.id)) return;
            if (app.deletedFor && (app.deletedFor[currentUser?.uid] === true || (Array.isArray(app.deletedFor) && app.deletedFor.includes(currentUser?.uid)))) {
                return;
            }
            const otherId = app.creatorId;
            if (!otherId || deletedConvoIds.has(otherId)) return;
            const existing = convosByParticipant.get(otherId);
            if (existing) {
                existing.isApplication = true;
                existing.applicationId = app.id;
                existing.castingId = app.castingId;
                existing.castingTitle = app.castingTitle || existing.castingTitle;
                existing.roleName = app.roleName || existing.roleName;
                existing.status = app.status || existing.status;
            } else {
                convosByParticipant.set(otherId, {
                    id: `app_${app.id}`,
                    applicationId: app.id,
                    isApplication: true,
                    type: 'application',
                    castingId: app.castingId,
                    castingTitle: app.castingTitle || 'Casting Call',
                    roleName: app.roleName || 'Audition Role',
                    status: app.status || 'pending',
                    name: app.castingTitle ? `${app.castingTitle} (${app.roleName || 'Audition'})` : 'Casting Application',
                    avatar: '',
                    otherParticipantId: app.creatorId,
                    participants: [app.creatorId, currentUser?.uid].filter(Boolean),
                    lastMessage: `Applied for "${app.roleName || 'Role'}" • Status: ${(app.status || 'pending').toUpperCase()}`,
                    lastMessageAt: app.appliedAt || app.createdAt || null,
                    updatedAt: app.appliedAt || app.createdAt || null,
                    unread: false,
                    coverNote: app.coverNote || '',
                    selfTapeUrl: app.selfTapeUrl || '',
                    attachmentUrl: app.attachmentUrl || app.fileUrl || '',
                });
            }
        });

        const combined = Array.from(convosByParticipant.values());
        combined.sort((a, b) => {
            const timeA = a.lastMessageAt?.toMillis?.() || (a.lastMessageAt?.seconds ? a.lastMessageAt.seconds * 1000 : new Date(a.lastMessageAt || 0).getTime()) || 0;
            const timeB = b.lastMessageAt?.toMillis?.() || (b.lastMessageAt?.seconds ? b.lastMessageAt.seconds * 1000 : new Date(b.lastMessageAt || 0).getTime()) || 0;
            return timeB - timeA;
        });

        setConversations(combined);
        if (currentUser?.uid && combined.length > 0) {
            cacheManager.setMemory?.(`user_convos_cache_${currentUser.uid}`, combined);
        }
    }, [rawConversations, receivedApps, sentApps, currentUser?.uid, deletedConvoIds]);

    useEffect(() => {
        if (userClosedChatRef.current) return;
        if (!activeChatId && !initialUserId && conversations.length > 0) {
            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                setActiveChatId(conversations[0].id);
            }
        }
    }, [conversations, activeChatId, initialUserId]);

    // Synthetic fallback chat object for newly initiated conversations
    useEffect(() => {
        if (!currentUser?.uid) {
            setSyntheticChat(null);
            return;
        }
        const targetChatId = activeChatId || initialUserId;
        if (!targetChatId) {
            setSyntheticChat(null);
            return;
        }
        const existing = conversations.find(c => c.id === targetChatId || c.otherParticipantId === targetChatId);
        if (existing) {
            setSyntheticChat(null);
            return;
        }

        let otherUserId: string | null = null;
        if (initialUserId && !initialUserId.includes('_') && !initialUserId.startsWith('app_') && initialUserId !== currentUser.uid) {
            otherUserId = initialUserId;
        } else if (targetChatId.includes('_') && !targetChatId.startsWith('app_')) {
            const parts = targetChatId.split('_');
            otherUserId = parts.find((p: string) => p !== currentUser.uid) || null;
        } else if (!targetChatId.startsWith('app_') && targetChatId !== currentUser.uid) {
            otherUserId = targetChatId;
        }

        if (!otherUserId) {
            setSyntheticChat(null);
            return;
        }

        // Set immediate synthetic chat so header & inputs are active immediately
        setSyntheticChat((prev: any) => {
            if (prev && prev.otherParticipantId === otherUserId) return prev;
            return {
                id: targetChatId,
                otherParticipantId: otherUserId,
                participants: [currentUser.uid, otherUserId],
                name: 'User',
                avatar: '',
                online: false
            };
        });

        let isCancelled = false;
        getProfile(otherUserId).then(res => {
            if (isCancelled) return;
            if (res.data) {
                const pData = res.data as any;
                const resolvedName = pData.name ||
                    [pData.firstName, pData.lastName].filter(Boolean).join(' ') ||
                    pData.displayName ||
                    pData.username ||
                    'User';
                const resolvedAvatar = pData.image || pData.photoURL || pData.profileImage || '';
                setSyntheticChat({
                    id: targetChatId,
                    otherParticipantId: otherUserId,
                    participants: [currentUser.uid, otherUserId],
                    name: resolvedName,
                    avatar: resolvedAvatar,
                    online: isUserOnline(pData)
                });
            }
        }).catch(console.warn);

        return () => {
            isCancelled = true;
        };
    }, [activeChatId, initialUserId, conversations, currentUser?.uid]);

    useEffect(() => {
        if (!activeChatId || !currentUser?.uid) {
            setMessages([]);
            setTypingUsers({});
            return;
        }
        const unsubMessages = subscribeToMessages(activeChatId, (list) => {
            if (list.length === 0) {
                const activeApp = [...receivedApps, ...sentApps].find(a => `app_${a.id}` === activeChatId || a.id === activeChatId);
                if (activeApp) {
                    const fallbackAppMsg: Message = {
                        id: `app_init_${activeApp.id}`,
                        senderId: activeApp.userId,
                        text: `Audition Application for role: "${activeApp.roleName || 'General'}" on "${activeApp.castingTitle || 'Casting Call'}"${activeApp.coverNote ? `\n\nCover Note: "${activeApp.coverNote}"` : ''}`,
                        fileUrl: activeApp.attachmentUrl || activeApp.fileUrl || activeApp.selfTapeUrl || null,
                        attachmentUrl: activeApp.attachmentUrl || activeApp.fileUrl || null,
                        selfTapeUrl: activeApp.selfTapeUrl || null,
                        type: activeApp.selfTapeUrl ? 'video' : 'text',
                        createdAt: activeApp.appliedAt || activeApp.createdAt || new Date(),
                        read: true,
                    } as any;
                    setMessages([fallbackAppMsg]);
                    return;
                }
            }
            setMessages(list as Message[]);
            markConversationAsRead(activeChatId, currentUser.uid).catch(console.warn);
        });
        const convoRef = doc(db, 'conversations', activeChatId);
        const unsubTyping = onSnapshot(convoRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setTypingUsers(data.typing || {});
            }
        });
        markConversationAsRead(activeChatId, currentUser.uid).catch(console.warn);
        return () => {
            unsubMessages();
            unsubTyping();
        };
    }, [activeChatId, currentUser?.uid, receivedApps, sentApps]);

    useEffect(() => {
        if (!currentUser?.uid || !initialUserId) return;
        if (userClosedChatRef.current || resolvedInitialUserRef.current === initialUserId) return;

        if (initialUserId.startsWith('app_') || initialUserId.includes('_')) {
            setActiveChatId(initialUserId);
            resolvedInitialUserRef.current = initialUserId;
            return;
        }

        const deterministicFallback = [currentUser.uid, initialUserId].sort().join('_');
        const existingConvo = conversations.find((c) => c.id === deterministicFallback || c.id === initialUserId || c.otherParticipantId === initialUserId);
        if (existingConvo) {
            setActiveChatId(existingConvo.id);
            resolvedInitialUserRef.current = initialUserId;
            return;
        }
        const resolveConvo = async () => {
            try {
                const res = await createConversation([currentUser.uid, initialUserId], undefined, currentUser.uid);
                if (res?.id) {
                    setActiveChatId(res.id);
                } else {
                    setActiveChatId(deterministicFallback);
                }
                resolvedInitialUserRef.current = initialUserId;
            }
            catch (err) {
                console.warn("Failed to resolve initial chat:", err);
                setActiveChatId(deterministicFallback);
                resolvedInitialUserRef.current = initialUserId;
            }
        };
        resolveConvo();
    }, [initialUserId, currentUser?.uid, conversations]);

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoadingCalls(false);
            return;
        }
        const unsub = subscribeToCallHistory(currentUser.uid, (historyList: any[]) => {
            const formattedHistory = historyList.map((cData: any) => {
                const isCaller = cData.callerId === currentUser.uid;
                return {
                    ...cData,
                    otherUser: {
                        name: isCaller ? (cData.calleeName || 'Discovery User') : (cData.callerName || 'Discovery User'),
                        image: isCaller ? (cData.calleePhoto || cData.receiverAvatar || '') : (cData.callerPhoto || cData.callerAvatar || '')
                    }
                };
            });
            setCallHistory(formattedHistory);
            setLoadingCalls(false);
        });
        return () => unsub();
    }, [currentUser?.uid]);

    const updateTyping = useCallback(async (isTyping: boolean) => {
        if (!activeChatId || !currentUser?.uid)
            return;
        try {
            await updateDoc(doc(db, 'conversations', activeChatId), {
                [`typing.${currentUser.uid}`]: isTyping
            });
        }
        catch (err) {
            console.warn("Failed to update typing state:", err);
        }
    }, [activeChatId, currentUser?.uid]);

    const dispatchMessage = useCallback(async (text: string, replyTo: any = null, type: 'text' | 'image' | 'video' = 'text'): Promise<ServiceResult> => {
        let targetConvoId = activeChatId;
        const activeConvo = conversations.find(c => c.id === targetConvoId);

        if (targetConvoId?.startsWith('app_') && activeConvo) {
            // Ensure conversation doc exists in Firestore for application thread
            try {
                await setDoc(doc(db, 'conversations', targetConvoId), {
                    participants: activeConvo.participants || [currentUser.uid, activeConvo.otherParticipantId],
                    type: 'application',
                    isApplication: true,
                    applicationId: activeConvo.applicationId || targetConvoId.replace('app_', ''),
                    castingId: activeConvo.castingId || null,
                    castingTitle: activeConvo.castingTitle || null,
                    roleName: activeConvo.roleName || null,
                    lastMessage: text,
                    lastMessageAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastSenderId: currentUser.uid,
                    unread: true,
                }, { merge: true });
            } catch (convoInitErr) {
                console.warn('Could not initialize application conversation doc:', convoInitErr);
            }
        } else if (!targetConvoId && initialUserId) {
            const res = await createConversation([currentUser.uid, initialUserId], undefined, currentUser.uid);
            if (res?.id) {
                targetConvoId = res.id;
                setActiveChatId(res.id);
            } else {
                const deterministicFallback = [currentUser.uid, initialUserId].sort().join('_');
                targetConvoId = deterministicFallback;
                setActiveChatId(deterministicFallback);
            }
        }
        if (!targetConvoId || !currentUser?.uid) {
            return { success: false, error: 'No active chat thread' };
        }

        // Optimistically append message immediately to local state for zero latency
        const optimisticId = `temp_${Date.now()}`;
        const optimisticMessage: Message = {
            id: optimisticId,
            senderId: currentUser.uid,
            text,
            type,
            replyTo,
            createdAt: new Date(),
            hasPendingWrites: true,
            read: false,
            delivered: false,
        } as any;
        setMessages(prev => [...prev, optimisticMessage]);

        // Optimistically update sidebar conversation preview
        setConversations(prev => {
            const exists = prev.some(c => c.id === targetConvoId || c.otherParticipantId === targetConvoId);
            if (!exists && syntheticChat) {
                return [{
                    ...syntheticChat,
                    id: targetConvoId,
                    lastMessage: text,
                    lastMessageAt: new Date(),
                    lastSenderId: currentUser.uid,
                    unread: false,
                }, ...prev];
            }
            return prev.map(c => {
                if (c.id === targetConvoId || c.otherParticipantId === targetConvoId) {
                    return {
                        ...c,
                        lastMessage: text,
                        lastMessageAt: new Date(),
                        lastSenderId: currentUser.uid,
                    };
                }
                return c;
            });
        });

        const res = await sendMessage(targetConvoId, currentUser.uid, text, false, replyTo, type, optimisticId);
        if (res.success) {
            setMessages(prev => prev.map(m => {
                if (m.id === optimisticId) {
                    return {
                        ...m,
                        id: (res as any).messageId || (res as any).message?.id || m.id,
                        hasPendingWrites: false,
                        createdAt: (res as any).message?.createdAt ? new Date((res as any).message.createdAt) : m.createdAt,
                    };
                }
                return m;
            }));
        } else {
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
        }
        return res;
    }, [activeChatId, initialUserId, currentUser?.uid, conversations, syntheticChat]);

    const fallbackOtherId = activeChatId && activeChatId.includes('_') && !activeChatId.startsWith('app_')
        ? activeChatId.split('_').find(p => p !== currentUser?.uid) || activeChatId
        : (activeChatId || initialUserId);

    const activeChat = activeChatId ? (
        conversations.find(c => c.id === activeChatId || c.otherParticipantId === activeChatId) ||
        syntheticChat ||
        (fallbackOtherId ? {
            id: activeChatId,
            otherParticipantId: fallbackOtherId,
            participants: currentUser?.uid ? [currentUser.uid, fallbackOtherId] : [fallbackOtherId],
            name: 'User',
            avatar: '',
            online: false
        } : null)
    ) : null;

    return {
        conversations,
        activeChatId,
        activeChat,
        setActiveChatId: handleSetActiveChatId,
        messages,
        loading,
        typingUsers,
        callHistory,
        loadingCalls,
        updateTyping,
        dispatchMessage,
        removeConversation
    };
}
export type UseMessagesReturn = ReturnType<typeof useMessages>;
