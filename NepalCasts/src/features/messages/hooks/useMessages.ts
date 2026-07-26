import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { subscribeToConversations, subscribeToMessages, sendMessage, createConversation, markConversationAsRead } from '../services/messaging';
import type { Message, ServiceResult } from '../../../types';
import { subscribeToCallHistory } from '../../../services';
export function useMessages(currentUser: any, initialUserId: string | null) {
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [callHistory, setCallHistory] = useState<any[]>([]);
    const [loadingCalls, setLoadingCalls] = useState(true);
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
        if (!activeChatId || !currentUser?.uid) {
            setMessages([]);
            setTypingUsers({});
            return;
        }
        const unsubMessages = subscribeToMessages(activeChatId, (list) => {
            setMessages(list as Message[]);
            markConversationAsRead(activeChatId).catch(console.warn);
        });
        const convoRef = doc(db, 'conversations', activeChatId);
        const unsubTyping = onSnapshot(convoRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setTypingUsers(data.typing || {});
            }
        });
        markConversationAsRead(activeChatId).catch(console.warn);
        return () => {
            unsubMessages();
            unsubTyping();
        };
    }, [activeChatId, currentUser?.uid]);
    useEffect(() => {
        if (!initialUserId || !currentUser?.uid)
            return;
        const resolveConvo = async () => {
            try {
                const res = await createConversation([currentUser.uid, initialUserId]);
                if (res?.id) {
                    setActiveChatId(res.id);
                }
            }
            catch (err) {
                console.warn("Failed to resolve initial chat:", err);
            }
        };
        resolveConvo();
    }, [initialUserId, currentUser?.uid]);
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
        if (!activeChatId || !currentUser?.uid) {
            return { success: false, error: 'No active chat thread' };
        }
        return sendMessage(activeChatId, currentUser.uid, text, false, replyTo, type);
    }, [activeChatId, currentUser?.uid]);
    return {
        conversations,
        activeChatId,
        setActiveChatId,
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
