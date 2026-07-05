import { db, auth } from "../lib/firebase";
import { logger } from "../utils/logger";
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
  addDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import apiClient from "../api/client";
import { COLLECTIONS } from "../constants/collections";

export const sendMessage = async (
  convoId: string,
  senderId: string,
  text: string,
  isSystem: boolean = false,
  replyTo?: any,
  type: "text" | "image" | "video" = "text",
  clientMsgId?: string
) => {
  try {
    await apiClient.post(`/messaging/${convoId}/messages`, {
      text,
      type,
      isSystem,
      clientMsgId,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            text: replyTo.text,
            senderId: replyTo.senderId,
          }
        : null,
    }, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend sendMessage failed, attempting client-side fallback write:", apiError);
    if (apiError.response?.status === 403 || apiError.response?.status === 401) {
      return { success: false, error: apiError.response.data?.error || "Action forbidden" };
    }
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid) {
      return { success: false, error: "Authentication required" };
    }
    try {
      const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, convoId);
      const convoSnap = await getDoc(convoRef);
      let participants: string[] = [];
      if (convoSnap.exists()) {
        participants = convoSnap.data().participants || [];
      }

      
      for (const participantId of participants) {
        if (participantId !== currentUserUid) {
          const participantSnap = await getDoc(doc(db, COLLECTIONS.USERS, participantId));
          if (participantSnap.exists()) {
            const blockedUsers: string[] = participantSnap.data().blockedUsers || [];
            if (blockedUsers.includes(currentUserUid)) {
              return { success: false, error: "You cannot message this user" };
            }
          }
          const currentUserSnap = await getDoc(doc(db, COLLECTIONS.USERS, currentUserUid));
          if (currentUserSnap.exists()) {
            const userBlocked: string[] = currentUserSnap.data().blockedUsers || [];
            if (userBlocked.includes(participantId)) {
              return { success: false, error: "You have blocked this user" };
            }
          }
        }
      }

      await addDoc(collection(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES), {
        senderId: isSystem ? "system" : currentUserUid,
        text,
        type,
        isSystem,
        clientMsgId: clientMsgId || null,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text,
              senderId: replyTo.senderId,
            }
          : null,
        reactions: {},
        read: false,
        delivered: false,
        createdAt: serverTimestamp(),
      });

      const convoUpdate: Record<string, any> = {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unread: true,
        lastSenderId: isSystem ? "system" : currentUserUid,
        lastMessageDelivered: false,
        lastMessageRead: false,
      };

      if (participants.length > 0) {
        const readBy: Record<string, boolean> = {};
        participants.forEach((pId: string) => {
          readBy[pId] = pId === currentUserUid;
        });
        convoUpdate.readBy = readBy;

        const currentUnreadCounts = convoSnap.data()?.unreadCounts || {};
        const newUnreadCounts: Record<string, number> = {};
        participants.forEach((pId: string) => {
          if (pId === currentUserUid) {
            newUnreadCounts[pId] = 0;
          } else {
            newUnreadCounts[pId] = (currentUnreadCounts[pId] || 0) + 1;
          }
        });
        convoUpdate.unreadCounts = newUnreadCounts;
      }

      await updateDoc(convoRef, convoUpdate);

      const otherParticipants = participants.filter((p: string) => p !== currentUserUid);
      if (otherParticipants.length > 0) {
        let senderName = auth.currentUser?.displayName || "Someone";
        let senderAvatar = auth.currentUser?.photoURL || "";

        try {
          const profileSnap = await getDoc(doc(db, "profiles", currentUserUid));
          if (profileSnap.exists()) {
            const pData = profileSnap.data();
            senderName = pData.name || [pData.firstName, pData.lastName].filter(Boolean).join(' ') || pData.username || senderName;
            senderAvatar = pData.image || pData.photoURL || pData.avatar || senderAvatar;
          }
        } catch (e) {
          console.warn("Error fetching profile for fallback notification:", e);
        }

        let title = "New Message";
        let body = text;
        if (type === "image") {
          title = "Media received";
          body = "Sent an image";
        } else if (type === "video") {
          title = "Media received";
          body = "Sent a video";
        }

        for (const otherParticipantId of otherParticipants) {
          await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
            userId: otherParticipantId,
            recipientId: otherParticipantId,
            receiverId: otherParticipantId,
            senderId: currentUserUid,
            senderName,
            senderAvatar,
            title,
            body,
            type: "messages",
            notificationType: "messages",
            isRead: false,
            read: false,
            createdAt: serverTimestamp(),
            targetUrl: `/messages/${currentUserUid}`,
            profileUrl: `/messages/${currentUserUid}`
          });
        }

        
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            let previewText = body;
            if (type === "image") {
              previewText = "📷 Sent a photo";
            } else if (type === "video") {
              previewText = "🎥 Sent a video";
            }

            fetch("/api/notifications/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
              },
              body: JSON.stringify({
                convoId,
                senderName,
                previewText,
                otherParticipants
              })
            }).then(async (res) => {
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                logger.warn("OneSignal serverless function trigger failed:", errData);
              } else {
                logger.log("OneSignal push notification successfully queued via serverless function");
              }
            }).catch((err) => {
              logger.warn("Error calling OneSignal serverless function:", err);
            });
          }
        } catch (tokenError) {
          console.warn("Failed to get idToken for push notification:", tokenError);
        }
      }

      return { success: true, error: null };
    } catch (fallbackError: any) {
      console.error("SendMessage fallback failed:", fallbackError);
      return { success: false, error: fallbackError.message || "Failed to send message" };
    }
  }
};

export const updateMessage = async (
  convoId: string,
  messageId: string,
  newText: string
) => {
  try {
    await apiClient.put(`/messaging/${convoId}/messages/${messageId}`, { text: newText }, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend updateMessage failed, attempting client-side fallback:", apiError);
    try {
      await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId), {
        text: newText,
        isEdited: true,
        updatedAt: serverTimestamp(),
      });
      return { success: true, error: null };
    } catch (fallbackError: any) {
      console.error("UpdateMessage fallback failed:", fallbackError);
      return { success: false, error: fallbackError.message || "Failed to update message" };
    }
  }
};

export const deleteMessage = async (convoId: string, messageId: string) => {
  try {
    await apiClient.delete(`/messaging/${convoId}/messages/${messageId}`, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend deleteMessage failed, attempting client-side fallback:", apiError);
    try {
      await deleteDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId));
      return { success: true, error: null };
    } catch (fallbackError: any) {
      console.error("DeleteMessage fallback failed:", fallbackError);
      return { success: false, error: fallbackError.message || "Failed to delete message" };
    }
  }
};

export const reactToMessage = async (
  convoId: string,
  messageId: string,
  emoji: string,
  userId: string
) => {
  try {
    await apiClient.post(`/messaging/${convoId}/messages/${messageId}/react`, { emoji }, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend reactToMessage failed, attempting client-side fallback:", apiError);
    try {
      const messageRef = doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId);
      const snap = await getDoc(messageRef);
      if (snap.exists()) {
        const reactions = { ...(snap.data().reactions ?? {}) };
        Object.keys(reactions).forEach((emojiKey) => {
          reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id: string) => id !== userId);
          if (reactions[emojiKey].length === 0) {
            delete reactions[emojiKey];
          }
        });
        reactions[emoji] = [...(reactions[emoji] ?? []), userId];
        await updateDoc(messageRef, { reactions, updatedAt: serverTimestamp() });
      }
      return { success: true, error: null };
    } catch (fallbackError: any) {
      console.error("ReactToMessage fallback failed:", fallbackError);
      return { success: false, error: fallbackError.message || "Failed to react to message" };
    }
  }
};

export const pinMessage = async (convoId: string, messageId: string, pinned: boolean) => {
  try {
    await apiClient.put(`/messaging/${convoId}/messages/${messageId}/pin`, { isPinned: pinned }, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend pinMessage failed, attempting client-side fallback:", apiError);
    try {
      await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES, messageId), {
        isPinned: pinned,
        updatedAt: serverTimestamp(),
      });
      return { success: true, error: null };
    } catch (fallbackError: any) {
      console.error("PinMessage fallback failed:", fallbackError);
      return { success: false, error: fallbackError.message || "Failed to pin message" };
    }
  }
};

export const subscribeToMessages = (
  conversationId: string,
  callback: (msgs: any) => void
) => {
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES),
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
    collection(db, COLLECTIONS.CONVERSATIONS),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      const convos = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data();
          const otherParticipantId = data.participants.find((p: string) => p !== uid);

          let participantInfo: any = {
            name: "User",
            avatar: "",
            gender: "unknown",
            online: false,
            lastActive: null,
            lastSeen: null,
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
              
              isUnreadForMe = data.readBy[uid] === false;
            } else if (data.unreadCounts && typeof data.unreadCounts === 'object') {
              
              isUnreadForMe = (data.unreadCounts[uid] || 0) > 0;
            } else if (typeof data.unread === 'boolean') {
              
              isUnreadForMe = data.unread === true;
            } else if (typeof data.unread === 'number') {
              isUnreadForMe = data.unread > 0;
            }
          }
          
          if (lastSender === uid) isUnreadForMe = false;

          return {
            id: d.id,
            ...data,
            ...participantInfo,
            
            isUnreadForMe,
          };

        })
      );

      
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
  
  try {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where("participants", "array-contains", uid),
      orderBy("lastMessageAt", "desc")
    );
    const snapshot = await getDocs(q);
    
    return []; 
  } catch (error) {
    return [];
  }
};

export const deleteConversation = async (convoId: string) => {
  try {
    await apiClient.delete(`/messaging/${convoId}`, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend deleteConversation failed, attempting client-side fallback:", apiError);
    try {
      await deleteDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId));
      return { success: true, error: null };
    } catch (fallbackError: any) {
      console.error("DeleteConversation fallback failed:", fallbackError);
      return { success: false, error: fallbackError.message || "Failed to delete conversation" };
    }
  }
};

export const blockUser = async (uid: string, targetId: string) => {
  try {
    await apiClient.post(`/users/block`, { targetId });
    return { success: true, error: null };
  } catch (error: unknown) {
    console.warn("Backend blockUser failed, attempting client-side fallback:", error);
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
        blockedUsers: arrayUnion(targetId),
        updatedAt: serverTimestamp()
      });
      return { success: true, error: null };
    } catch (fallbackError: any) {
      console.error("BlockUser fallback failed:", fallbackError);
      const message = error instanceof Error ? error.message : "Failed to block user";
      return { success: false, error: fallbackError.message || message };
    }
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
    }, { timeout: 1500 });
    return { id: response.data?.id || null, error: null };
  } catch (apiError: any) {
    console.warn("Backend createConversation failed, attempting client-side fallback:", apiError);
    if (apiError.response?.status === 403 || apiError.response?.status === 401) {
      return { id: null, error: apiError.response.data?.error || "Action forbidden" };
    }
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid) {
      return { id: null, error: "Authentication required" };
    }
    const uniqueParticipants = Array.from(new Set(participants));
    if (!uniqueParticipants.includes(currentUserUid)) {
      return { id: null, error: "Conversation must include authenticated user" };
    }
    if (uniqueParticipants.length < 2) {
      return { id: null, error: "Conversation requires at least two participants" };
    }

    
    const otherParticipants = uniqueParticipants.filter(p => p !== currentUserUid);
    for (const participantId of otherParticipants) {
      const participantSnap = await getDoc(doc(db, COLLECTIONS.USERS, participantId));
      if (participantSnap.exists()) {
        const blockedUsers: string[] = participantSnap.data().blockedUsers || [];
        if (blockedUsers.includes(currentUserUid)) {
          return { id: null, error: "You cannot message this user" };
        }
      }
      const currentUserSnap = await getDoc(doc(db, COLLECTIONS.USERS, currentUserUid));
      if (currentUserSnap.exists()) {
        const userBlocked: string[] = currentUserSnap.data().blockedUsers || [];
        if (userBlocked.includes(participantId)) {
          return { id: null, error: "You have blocked this user" };
        }
      }
    }

    const sorted = uniqueParticipants.slice().sort();

    try {
      const q = query(
        collection(db, COLLECTIONS.CONVERSATIONS),
        where("participants", "array-contains", currentUserUid)
      );
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find((doc) => {
        const p = doc.data().participants;
        if (!Array.isArray(p) || p.length !== sorted.length) {
          return false;
        }
        const normalized = [...p].sort();
        return normalized.every((item, index) => item === sorted[index]);
      });

      if (existing) {
        return { id: existing.id, error: null };
      }

      const convoRef = await addDoc(collection(db, COLLECTIONS.CONVERSATIONS), {
        participants: sorted,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
      });

      const otherParticipantId = sorted.find((p) => p !== currentUserUid);
      if (otherParticipantId) {
        let senderName = auth.currentUser?.displayName || "Someone";
        let senderAvatar = auth.currentUser?.photoURL || "";
        try {
          const profileSnap = await getDoc(doc(db, COLLECTIONS.PROFILES, currentUserUid));
          if (profileSnap.exists()) {
            const pData = profileSnap.data();
            senderName = pData.name || [pData.firstName, pData.lastName].filter(Boolean).join(' ') || pData.username || senderName;
            senderAvatar = pData.image || pData.photoURL || pData.avatar || senderAvatar;
          }
        } catch (e) {
          console.warn("Error fetching profile for new convo notification:", e);
        }

        await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
          userId: otherParticipantId,
          recipientId: otherParticipantId,
          receiverId: otherParticipantId,
          senderId: currentUserUid,
          senderName,
          senderAvatar,
          title: "New Conversation",
          body: `${senderName} started a new conversation with you.`,
          type: "messages",
          notificationType: "messages",
          isRead: false,
          read: false,
          createdAt: serverTimestamp(),
          targetUrl: `/messages/${currentUserUid}`,
          profileUrl: `/messages/${currentUserUid}`
        });

        
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            fetch("/api/notifications/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
              },
              body: JSON.stringify({
                convoId: convoRef.id,
                senderName,
                previewText: `${senderName} started a new conversation with you.`,
                otherParticipants: [otherParticipantId]
              })
            }).then(async (res) => {
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                logger.warn("OneSignal serverless function trigger failed:", errData);
              } else {
                logger.log("OneSignal push notification for new convo successfully queued");
              }
            }).catch((err) => {
              logger.warn("Error calling OneSignal serverless function:", err);
            });
          }
        } catch (tokenError) {
          logger.warn("Failed to get idToken for push notification:", tokenError);
        }
      }

      if (initialMessage) {
        await sendMessage(convoRef.id, "system", initialMessage, true);
      }

      return { id: convoRef.id, error: null };
    } catch (fallbackError: any) {
      console.error("CreateConversation fallback failed:", fallbackError);
      return { id: null, error: fallbackError.message || "Failed to create conversation" };
    }
  }
};

export const findOrCreateConversation = async (participants: string[]) => {
  return createConversation(participants);
};

export const markConversationAsRead = async (convoId: string) => {
  try {
    const uid = auth.currentUser?.uid;

    
    if (uid && convoId) {
      const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, convoId);
      const snap = await getDoc(convoRef);
      if (snap.exists()) {
        const data = snap.data();
        const updatePayload: Record<string, any> = {};

        if (data.readBy && typeof data.readBy === 'object') {
          
          updatePayload[`readBy.${uid}`] = true;
        } else if (data.unreadCounts && typeof data.unreadCounts === 'object') {
          
          updatePayload[`unreadCounts.${uid}`] = 0;
        } else {
          
          if (data.lastSenderId !== uid) {
            updatePayload['unread'] = false;
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateDoc(convoRef, updatePayload);
        }
      }
    }

    
    await apiClient.put(`/messaging/${convoId}/read`, {}, { timeout: 1500 });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark conversation as read';
    console.error('markConversationAsRead error:', message);
    return { success: false, error: message };
  }
};
