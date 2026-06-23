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
  addDoc,
  deleteDoc,
  serverTimestamp,
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
    }, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend sendMessage failed, attempting client-side fallback write:", apiError);
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid) {
      return { success: false, error: "Authentication required" };
    }
    try {
      const convoRef = doc(db, "conversations", convoId);
      const convoSnap = await getDoc(convoRef);
      let participants: string[] = [];
      if (convoSnap.exists()) {
        participants = convoSnap.data().participants || [];
      }

      await addDoc(collection(db, "conversations", convoId, "messages"), {
        senderId: isSystem ? "system" : currentUserUid,
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
          await addDoc(collection(db, "notifications"), {
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

        // Call our Vercel Serverless Function to securely trigger OneSignal notification
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            let previewText = body;
            if (type === "image") {
              previewText = "📷 Sent a photo";
            } else if (type === "video") {
              previewText = "🎥 Sent a video";
            }

            fetch("/api/send-notification", {
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
                console.warn("OneSignal serverless function trigger failed:", errData);
              } else {
                console.log("OneSignal push notification successfully queued via serverless function");
              }
            }).catch((err) => {
              console.warn("Error calling OneSignal serverless function:", err);
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
      await updateDoc(doc(db, "conversations", convoId, "messages", messageId), {
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
      await deleteDoc(doc(db, "conversations", convoId, "messages", messageId));
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
      const messageRef = doc(db, "conversations", convoId, "messages", messageId);
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
      await updateDoc(doc(db, "conversations", convoId, "messages", messageId), {
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
    await apiClient.delete(`/messaging/${convoId}`, { timeout: 1500 });
    return { success: true, error: null };
  } catch (apiError: any) {
    console.warn("Backend deleteConversation failed, attempting client-side fallback:", apiError);
    try {
      await deleteDoc(doc(db, "conversations", convoId));
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
    }, { timeout: 1500 });
    return { id: response.data?.id || null, error: null };
  } catch (apiError: any) {
    console.warn("Backend createConversation failed, attempting client-side fallback:", apiError);
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
    const sorted = uniqueParticipants.slice().sort();

    try {
      const q = query(
        collection(db, "conversations"),
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

      const convoRef = await addDoc(collection(db, "conversations"), {
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
          const profileSnap = await getDoc(doc(db, "profiles", currentUserUid));
          if (profileSnap.exists()) {
            const pData = profileSnap.data();
            senderName = pData.name || [pData.firstName, pData.lastName].filter(Boolean).join(' ') || pData.username || senderName;
            senderAvatar = pData.image || pData.photoURL || pData.avatar || senderAvatar;
          }
        } catch (e) {
          console.warn("Error fetching profile for new convo notification:", e);
        }

        await addDoc(collection(db, "notifications"), {
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

        // Call our Vercel Serverless Function to securely trigger OneSignal notification
        try {
          const idToken = await auth.currentUser?.getIdToken();
          if (idToken) {
            fetch("/api/send-notification", {
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
                console.warn("OneSignal serverless function trigger failed:", errData);
              } else {
                console.log("OneSignal push notification for new convo successfully queued");
              }
            }).catch((err) => {
              console.warn("Error calling OneSignal serverless function:", err);
            });
          }
        } catch (tokenError) {
          console.warn("Failed to get idToken for push notification:", tokenError);
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
    await apiClient.put(`/messaging/${convoId}/read`, {}, { timeout: 1500 });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to mark conversation as read';
    console.error('markConversationAsRead error:', message);
    return { success: false, error: message };
  }
};
