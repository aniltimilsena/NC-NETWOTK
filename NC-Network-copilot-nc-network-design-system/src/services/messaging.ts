import { db, auth } from "../lib/firebase";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import apiClient from "../api/client";

export const sendMessage = async (
  convoId: string,
  senderId: string,
  text: string,
  isSystem: boolean = false,
  replyTo?: any,
  type: "text" | "image" | "video" = "text"
) => {
  try {
    await apiClient.post(`/messaging/${convoId}/messages`, {
      text,
      type,
      isSystem,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            text: replyTo.text,
            senderId: replyTo.senderId,
          }
        : null,
    });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    console.error("SendMessage error:", message);
    return { success: false, error: message };
  }
};

export const updateMessage = async (
  convoId: string,
  messageId: string,
  newText: string
) => {
  try {
    await apiClient.put(`/messaging/${convoId}/messages/${messageId}`, { text: newText });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update message";
    console.error("UpdateMessage error:", message);
    return { success: false, error: message };
  }
};

export const deleteMessage = async (convoId: string, messageId: string) => {
  try {
    await apiClient.delete(`/messaging/${convoId}/messages/${messageId}`);
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete message";
    console.error("DeleteMessage error:", message);
    return { success: false, error: message };
  }
};

export const reactToMessage = async (
  convoId: string,
  messageId: string,
  emoji: string,
  userId: string
) => {
  try {
    await apiClient.post(`/messaging/${convoId}/messages/${messageId}/react`, { emoji });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to react to message";
    console.error("ReactToMessage error:", message);
    return { success: false, error: message };
  }
};

export const pinMessage = async (convoId: string, messageId: string, pinned: boolean) => {
  try {
    await apiClient.put(`/messaging/${convoId}/messages/${messageId}/pin`, { isPinned: pinned });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to pin message";
    console.error("PinMessage error:", message);
    return { success: false, error: message };
  }
};

export const subscribeToMessages = (
  conversationId: string,
  callback: (msgs: any) => void
) => {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(messages);
    },
    (error) => {
      console.error("Message subscription error:", error);
      callback([]);
    }
  );
};

export const subscribeToConversations = (
  uid: string,
  callback: (convos: any[]) => void
) => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      const convos = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data();
          const otherParticipantId = data.participants.find((p: string) => p !== uid);

          let participantInfo = {
            name: "User",
            avatar: "",
            gender: "unknown",
          };

          if (otherParticipantId) {
            const profileSnap = await getDoc(doc(db, "profiles", otherParticipantId));
            if (profileSnap.exists()) {
              const pData = profileSnap.data();
              participantInfo = {
                name: pData.name || [pData.firstName, pData.lastName].filter(Boolean).join(' ') || pData.username || pData.displayName || "User",
                avatar: pData.image || pData.photoURL || pData.avatar || "",
                gender: pData.gender || "unknown",
                online: pData.online || false,
                lastActive: pData.lastActive || null,
                lastSeen: pData.lastSeen || null,
              };
            }
          }

          // ── Determine unread status for THIS user ─────────────────────────
          // Log raw data in dev so we can see the exact field names
          if (import.meta.env.DEV) {
            console.debug('[messaging] convo', d.id, '| raw fields:', {
              unread: data.unread,
              readBy: data.readBy,
              unreadCounts: data.unreadCounts,
              lastSenderId: data.lastSenderId,
            });
          }

          let isUnreadForMe = false;
          const lastSender = data.lastSenderId;

          if (lastSender && lastSender !== uid) {
            if (data.readBy && typeof data.readBy === 'object' && !Array.isArray(data.readBy)) {
              // readBy[uid] === false  →  this user hasn't read yet
              isUnreadForMe = data.readBy[uid] === false;
            } else if (data.unreadCounts && typeof data.unreadCounts === 'object') {
              // unreadCounts[uid] > 0  →  unread for this user
              isUnreadForMe = (data.unreadCounts[uid] || 0) > 0;
            } else if (typeof data.unread === 'boolean') {
              // legacy single boolean
              isUnreadForMe = data.unread === true;
            } else if (typeof data.unread === 'number') {
              isUnreadForMe = data.unread > 0;
            }
          }
          // Never show unread for the sender of the last message
          if (lastSender === uid) isUnreadForMe = false;

          return {
            id: d.id,
            ...data,
            ...participantInfo,
            // Expose a normalised isUnread flag for the UI
            isUnreadForMe,
          };

        })
      );

      // Sort locally by lastMessageAt desc
      convos.sort((a: any, b: any) => {
        const timeA = a.lastMessageAt?.toMillis?.() || a.lastMessageAt?.seconds * 1000 || 0;
        const timeB = b.lastMessageAt?.toMillis?.() || b.lastMessageAt?.seconds * 1000 || 0;
        return timeB - timeA;
      });

      callback(convos);
    },
    (error) => {
      console.error("Conversations subscription error:", error);
      callback([]);
    }
  );
};

export const getConversations = async (uid: string) => {
  // Keep as a one-time fetch if needed elsewhere
  try {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid),
      orderBy("lastMessageAt", "desc")
    );
    const snapshot = await getDocs(q);
    // ... logic omitted for brevity as we'll use subscription mostly
    return []; 
  } catch (error) {
    return [];
  }
};

export const deleteConversation = async (convoId: string) => {
  try {
    await apiClient.delete(`/messaging/${convoId}`);
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete conversation";
    console.error("DeleteConversation error:", message);
    return { success: false, error: message };
  }
};

export const blockUser = async (uid: string, targetId: string) => {
  try {
    await apiClient.post(`/users/block`, { targetId });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to block user";
    console.error("BlockUser error:", message);
    return { success: false, error: message };
  }
};

export const createConversation = async (
  participants: string[],
  initialMessage?: string
) => {
  try {
    const response = await apiClient.post<{ id: string }>("/messaging/conversations", {
      participants,
      initialMessage,
    });
    return { id: response.data?.id || null, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    console.error("CreateConversation error:", message);
    return { id: null, error: message };
  }
};

export const findOrCreateConversation = async (participants: string[]) => {
  return createConversation(participants);
};

export const markConversationAsRead = async (convoId: string) => {
  try {
    const uid = auth.currentUser?.uid;

    // 1. Write directly to Firestore so the UI updates immediately
    if (uid && convoId) {
      const convoRef = doc(db, 'conversations', convoId);
      const snap = await getDoc(convoRef);
      if (snap.exists()) {
        const data = snap.data();
        const updatePayload: Record<string, any> = {};

        if (data.readBy && typeof data.readBy === 'object') {
          // Per-user readBy map: mark this user as read
          updatePayload[`readBy.${uid}`] = true;
        } else if (data.unreadCounts && typeof data.unreadCounts === 'object') {
          // Per-user unreadCounts map: zero out this user's count
          updatePayload[`unreadCounts.${uid}`] = 0;
        } else {
          // Legacy boolean — only clear if we were the recipient
          if (data.lastSenderId !== uid) {
            updatePayload['unread'] = false;
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateDoc(convoRef, updatePayload);
        }
      }
    }

    // 2. Also call backend for server-side sync (best-effort)
    await apiClient.put(`/messaging/${convoId}/read`);
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark conversation as read';
    console.error('markConversationAsRead error:', message);
    return { success: false, error: message };
  }
};
