import { db, auth } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

export const sendMessage = async (
  convoId: string,
  senderId: string,
  text: string,
  isSystem: boolean = false,
  replyTo?: any,
  type: "text" | "image" | "video" = "text"
) => {
  try {
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid) {
      return { success: false, error: "Authentication required" };
    }

    const message = {
      senderId: isSystem ? "system" : currentUserUid,
      text,
      isSystem: isSystem || senderId === "system",
      type,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            text: replyTo.text,
            senderId: replyTo.senderId,
          }
        : null,
      reactions: {},
      createdAt: serverTimestamp(),
    };

    // Add message to subcollection
    await addDoc(collection(db, "conversations", convoId, "messages"), message);

    // Update conversation metadata
    await updateDoc(doc(db, "conversations", convoId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      unread: true,
    });

    // Send real-time notification to the recipient
    const convoRef = doc(db, "conversations", convoId);
    const convoSnap = await getDoc(convoRef);
    if (convoSnap.exists()) {
      const convoData = convoSnap.data();
      const otherParticipantId = convoData.participants?.find(
        (p: string) => p !== currentUserUid
      );
      if (otherParticipantId && !isSystem) {
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
          console.warn("Error fetching profile for notification:", e);
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
    }

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
    await updateDoc(doc(db, "conversations", convoId, "messages", messageId), {
      text: newText,
      isEdited: true,
      updatedAt: serverTimestamp(),
    });
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update message";
    console.error("UpdateMessage error:", message);
    return { success: false, error: message };
  }
};

export const deleteMessage = async (convoId: string, messageId: string) => {
  try {
    await deleteDoc(doc(db, "conversations", convoId, "messages", messageId));
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
    const messageRef = doc(db, "conversations", convoId, "messages", messageId);
    const snap = await getDoc(messageRef);
    if (!snap.exists()) {
      return { success: false, error: "Message not found" };
    }

    const messageData = snap.data();
    const reactions = { ...(messageData.reactions ?? {}) };

    // Remove user's existing reaction under any emoji
    Object.keys(reactions).forEach((emojiKey) => {
      reactions[emojiKey] = (reactions[emojiKey] ?? []).filter((id: string) => id !== userId);
      if (reactions[emojiKey].length === 0) {
        delete reactions[emojiKey];
      }
    });

    // Add user to the new emoji reaction
    reactions[emoji] = [...(reactions[emoji] ?? []), userId];

    await updateDoc(messageRef, {
      reactions,
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to react to message";
    console.error("ReactToMessage error:", message);
    return { success: false, error: message };
  }
};

export const pinMessage = async (convoId: string, messageId: string, pinned: boolean) => {
  try {
    await updateDoc(doc(db, "conversations", convoId, "messages", messageId), {
      isPinned: pinned,
      updatedAt: serverTimestamp(),
    });
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
              };
            }
          }

          return {
            id: d.id,
            ...data,
            ...participantInfo,
          };
        })
      );

      // Sort locally by lastMessageAt desc
      convos.sort((a, b) => {
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
    await deleteDoc(doc(db, "conversations", convoId));
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete conversation";
    console.error("DeleteConversation error:", message);
    return { success: false, error: message };
  }
};

export const blockUser = async (uid: string, targetId: string) => {
  try {
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid || currentUserUid !== uid) {
      return { success: false, error: "Unauthorized" };
    }
    if (targetId === uid) {
      return { success: false, error: "Cannot block yourself" };
    }

    await setDoc(doc(db, "users", uid), {
      blockedUsers: arrayUnion(targetId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
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

    // Check if conversation already exists
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

    // Send a new conversation notification to the other participant
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
    }

    if (initialMessage) {
      await sendMessage(convoRef.id, "system", initialMessage, true);
    }

    return { id: convoRef.id, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create conversation";
    console.error("CreateConversation error:", message);
    return { id: null, error: message };
  }
};

export const findOrCreateConversation = async (participants: string[]) => {
  return createConversation(participants);
};
