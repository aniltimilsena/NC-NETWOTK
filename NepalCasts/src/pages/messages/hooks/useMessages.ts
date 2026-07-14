import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  findOrCreateConversation,
  deleteConversation,
  updateMessage,
  deleteMessage,
  reactToMessage,
  pinMessage,
  markConversationAsRead
} from '../../../services/messaging';
import type { Conversation, Message, ServiceResult } from '../../../types';
import { subscribeToCallHistory } from '../../../services/call';

export function useMessages(currentUser: any, initialUserId: string | null) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);

  // Subscribe to conversations list
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

  // Subscribe to active chat messages & typing indicators
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

    // Mark as read
    markConversationAsRead(activeChatId).catch(console.warn);

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [activeChatId, currentUser?.uid]);

  // Handle initial user conversation resolution
  useEffect(() => {
    if (!initialUserId || !currentUser?.uid) return;

    const resolveConvo = async () => {
      try {
        const res = await findOrCreateConversation([currentUser.uid, initialUserId]);
        if (res?.id) {
          setActiveChatId(res.id);
        }
      } catch (err) {
        console.warn("Failed to resolve initial chat:", err);
      }
    };

    resolveConvo();
  }, [initialUserId, currentUser?.uid]);

  // Subscribe to calls history
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingCalls(false);
      return;
    }

    const unsub = subscribeToCallHistory(currentUser.uid, (historyList) => {
      const formattedHistory = historyList.map(cData => {
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
    if (!activeChatId || !currentUser?.uid) return;
    try {
      await updateDoc(doc(db, 'conversations', activeChatId), {
        [`typing.${currentUser.uid}`]: isTyping
      });
    } catch (err) {
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
