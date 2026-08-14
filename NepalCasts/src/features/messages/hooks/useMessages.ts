import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { subscribeToConversations, subscribeToMessages, sendMessage, createConversation, markConversationAsRead } from '../services/messaging';
import { getProfile } from '../../profile/services/profile';
import type { Message, ServiceResult } from '../../../types';
import { subscribeToCallHistory } from '../../../services';

export function useMessages(currentUser: any, initialUserId: string | null) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [syntheticChat, setSyntheticChat] = useState<any | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [callHistory, setCallHistory] = useState<any[]>([]);
    const [loadingCalls, setLoadingCalls] = useState(true);
    const userClosedChatRef = useRef(false);

    const handleSetActiveChatId = useCallback((id: string | null) => {
        if (id === null) {
            userClosedChatRef.current = true;
        } else {
            userClosedChatRef.current = false;
        }
        setActiveChatId(id);
    }, []);

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoading(false);
            return;
        }
        const unsub = subscribeToConversations(currentUser.uid, (list) => {
            setConversations(list);
            setLoading(false);
        });
        return () => unsub();
    }, [currentUser?.uid]);

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
        const targetId = activeChatId;
        if (!targetId || !currentUser?.uid) {
            setSyntheticChat(null);
            return;
        }
        const existing = conversations.find(c => c.id === targetId || c.otherParticipantId === targetId);
        if (existing) {
            setSyntheticChat(null);
            return;
        }
        // Fetch target profile metadata for synthetic chat state
        getProfile(targetId).then(res => {
            if (res.data) {
                const pData = res.data as any;
                setSyntheticChat({
                    id: targetId,
                    otherParticipantId: targetId,
                    participants: [currentUser.uid, targetId],
                    name: pData.name || [pData.firstName, pData.lastName].filter(Boolean).join(' ') || pData.username || 'User',
                    avatar: pData.image || '',
                    online: pData.online || false
                });
            }
        }).catch(console.warn);
    }, [activeChatId, conversations, currentUser?.uid]);

    useEffect(() => {
        if (!activeChatId || !currentUser?.uid) {
            setMessages([]);
            setTypingUsers({});
            return;
        }
        const unsubMessages = subscribeToMessages(activeChatId, (list) => {
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
    }, [activeChatId, currentUser?.uid]);

    useEffect(() => {
        if (!currentUser?.uid || !initialUserId) return;
        if (userClosedChatRef.current || resolvedInitialUserRef.current === initialUserId) return;
        const existingConvo = conversations.find((c) => c.id === initialUserId || c.otherParticipantId === initialUserId);
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
                    setActiveChatId(initialUserId);
                }
                resolvedInitialUserRef.current = initialUserId;
            }
            catch (err) {
                console.warn("Failed to resolve initial chat:", err);
                setActiveChatId(initialUserId);
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
        if (!targetConvoId && initialUserId) {
            const res = await createConversation([currentUser.uid, initialUserId], undefined, currentUser.uid);
            if (res.id) {
                targetConvoId = res.id;
                setActiveChatId(res.id);
            }
        }
        if (!targetConvoId || !currentUser?.uid) {
            return { success: false, error: 'No active chat thread' };
        }
        return sendMessage(targetConvoId, currentUser.uid, text, false, replyTo, type);
    }, [activeChatId, initialUserId, currentUser?.uid]);

    const activeChat = activeChatId ? (conversations.find(c => c.id === activeChatId || c.otherParticipantId === activeChatId) || syntheticChat) : null;

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
        dispatchMessage
    };
}
export type UseMessagesReturn = ReturnType<typeof useMessages>;
