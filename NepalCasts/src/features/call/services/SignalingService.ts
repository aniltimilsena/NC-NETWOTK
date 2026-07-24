import { db } from "../../../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  getDocs,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../constants/collections";
import { logger } from "../../../utils/logger";
import type { CallDoc, CallStatus } from "../types/call";

export const createCallPending = async (params: {
  callerId: string;
  callerName: string;
  callerPhoto: string;
  callerAvatar: string;
  calleeId: string;
  calleeName: string;
  calleePhoto: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  callType: "audio" | "video";
}): Promise<{ callId: string | null; error: string | null }> => {
  const tStart = performance.now();
  try {
    const sanitizeStr = (str: string, maxLen: number = 100) => (str || "").substring(0, maxLen);

    const callRef = await addDoc(collection(db, COLLECTIONS.CALLS), {
      callerId: params.callerId,
      callerName: sanitizeStr(params.callerName, 100),
      callerPhoto: sanitizeStr(params.callerPhoto, 500),
      callerAvatar: sanitizeStr(params.callerAvatar, 500),
      calleeId: params.calleeId,
      calleeName: sanitizeStr(params.calleeName, 100),
      calleePhoto: sanitizeStr(params.calleePhoto, 500),
      receiverId: params.receiverId,
      receiverName: sanitizeStr(params.receiverName, 100),
      receiverAvatar: sanitizeStr(params.receiverAvatar, 500),
      callType: params.callType,
      status: "pending" as CallStatus,
      callStatus: "pending" as CallStatus,
      offer: null,
      answer: null,
      createdAt: serverTimestamp(),
    });
    const duration = (performance.now() - tStart).toFixed(1);
    logger.log(`[SignalingService] T1: Pending call doc created in Firestore (${duration}ms). Call ID: ${callRef.id}`);
    return { callId: callRef.id, error: null };
  } catch (err: any) {
    console.error("[SignalingService] createCallPending error:", err);
    return { callId: null, error: err.message };
  }
};

export const setCallOffer = async (
  callId: string,
  offer: RTCSessionDescriptionInit
): Promise<void> => {
  const tStart = performance.now();
  try {
    await updateDoc(doc(db, COLLECTIONS.CALLS, callId), { offer });
    const duration = (performance.now() - tStart).toFixed(1);
    logger.log(`[SignalingService] SDP Offer updated in Firestore (${duration}ms)`);
  } catch (err) {
    console.error("[SignalingService] setCallOffer error:", err);
  }
};

export const setCallAnswer = async (
  callId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> => {
  const tStart = performance.now();
  try {
    await updateDoc(doc(db, COLLECTIONS.CALLS, callId), {
      answer,
      status: "accepted" as CallStatus,
      callStatus: "accepted" as CallStatus,
    });
    const duration = (performance.now() - tStart).toFixed(1);
    logger.log(`[SignalingService] SDP Answer updated in Firestore (${duration}ms)`);
  } catch (err) {
    console.error("[SignalingService] setCallAnswer error:", err);
  }
};

export const updateCallVideoState = async (
  callId: string,
  role: "caller" | "callee",
  isVideoOff: boolean
): Promise<void> => {
  try {
    const field = role === "caller" ? "callerVideoOff" : "calleeVideoOff";
    await updateDoc(doc(db, COLLECTIONS.CALLS, callId), {
      [field]: isVideoOff,
    });
    logger.log(`[SignalingService] Updated call ${callId} ${field} ->`, isVideoOff);
  } catch (err) {
    console.error("[SignalingService] updateCallVideoState error:", err);
  }
};

export const updateCallStatus = async (
  callId: string,
  status: CallStatus
): Promise<void> => {
  try {
    const updates: any = { status, callStatus: status };
    if (status === "ended" || status === "rejected" || status === "no-answer") {
      updates.endedAt = serverTimestamp();
    }
    await updateDoc(doc(db, COLLECTIONS.CALLS, callId), updates);
    logger.log(`[SignalingService] Updated call ${callId} status to: ${status}`);
  } catch (err) {
    console.error("[SignalingService] updateCallStatus error:", err);
  }
};

export const subscribeToIncomingCalls = (
  userId: string,
  callback: (call: CallDoc | null) => void
): Unsubscribe => {
  logger.log(`[SignalingService] Registering incoming call listener for user: ${userId}`);
  const q = query(
    collection(db, COLLECTIONS.CALLS),
    where("calleeId", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }
      
      const callDoc = snapshot.docs[0];
      const data = { id: callDoc.id, ...callDoc.data() } as CallDoc;
      logger.log(`[SignalingService] T2: Incoming call snapshot for callee ${userId}. Call ID: ${data.id}`);
      callback(data);
    },
    (err) => {
      console.error("[SignalingService] subscribeToIncomingCalls error:", err);
      callback(null);
    }
  );
};

export const subscribeToCall = (
  callId: string,
  callback: (call: CallDoc | null) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, COLLECTIONS.CALLS, callId),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ id: snapshot.id, ...snapshot.data() } as CallDoc);
    },
    (err) => {
      console.error("[SignalingService] subscribeToCall error:", err);
      callback(null);
    }
  );
};

export const cleanupCall = async (callId: string): Promise<void> => {
  try {
    const callerCands = await getDocs(
      collection(db, COLLECTIONS.CALLS, callId, "callerCandidates")
    );
    for (const d of callerCands.docs) {
      await deleteDoc(d.ref);
    }
    
    const calleeCands = await getDocs(
      collection(db, COLLECTIONS.CALLS, callId, "calleeCandidates")
    );
    for (const d of calleeCands.docs) {
      await deleteDoc(d.ref);
    }
    
    await deleteDoc(doc(db, COLLECTIONS.CALLS, callId));
    logger.log(`[SignalingService] Cleaned up call ${callId} and subcollections`);
  } catch (err) {
    console.error("[SignalingService] cleanupCall error:", err);
  }
};

export const subscribeToCallHistory = (
  userId: string,
  callback: (calls: CallDoc[]) => void,
  maxResults: number = 50
): Unsubscribe => {
  const callerQ = query(
    collection(db, COLLECTIONS.CALLS),
    where("callerId", "==", userId),
    limit(maxResults)
  );

  const calleeQ = query(
    collection(db, COLLECTIONS.CALLS),
    where("calleeId", "==", userId),
    limit(maxResults)
  );

  let callerCalls: CallDoc[] = [];
  let calleeCalls: CallDoc[] = [];

  const merge = () => {
    const callMap = new Map<string, CallDoc>();
    callerCalls.forEach((c) => callMap.set(c.id, c));
    calleeCalls.forEach((c) => { if (!callMap.has(c.id)) callMap.set(c.id, c); });

    const sorted = Array.from(callMap.values()).sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });

    callback(sorted.slice(0, maxResults));
  };

  const unsub1 = onSnapshot(callerQ, 
    (snap) => {
      callerCalls = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallDoc));
      merge();
    },
    (err) => {
      console.warn("[SignalingService] callerQ subscription failed:", err);
    }
  );

  const unsub2 = onSnapshot(calleeQ, 
    (snap) => {
      calleeCalls = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallDoc));
      merge();
    },
    (err) => {
      console.warn("[SignalingService] calleeQ subscription failed:", err);
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
};

export const logCallOutcomeToFirestore = async (params: {
  call: CallDoc;
  duration: number;
  finalStatus?: string;
  currentUserId: string;
}): Promise<void> => {
  const { call, duration, finalStatus, currentUserId } = params;
  const callId = call.id;
  if (!callId || !currentUserId) return;

  const callerId = call.callerId;
  const receiverId = call.calleeId || call.receiverId;
  if (!callerId || !receiverId) return;

  logger.log(`[CallLog] Conversation lookup for participants: ${callerId}, ${receiverId}`);

  try {
    const sorted = [callerId, receiverId].sort();
    let convoId: string | null = null;

    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where("participants", "array-contains", currentUserId)
    );
    const snap = await getDocs(q);
    const existing = snap.docs.find((d) => {
      const p = d.data().participants;
      if (!Array.isArray(p) || p.length !== 2) return false;
      return p.slice().sort().every((v, i) => v === sorted[i]);
    });

    if (existing) {
      convoId = existing.id;
      logger.log(`[CallLog] Conversation found: ${convoId}`);
    } else {
      const newConvoRef = await addDoc(collection(db, COLLECTIONS.CONVERSATIONS), {
        participants: sorted,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "",
        lastSenderId: "",
        unreadCount: {},
      });
      convoId = newConvoRef.id;
      logger.log(`[CallLog] New conversation created: ${convoId}`);
    }

    if (!convoId) return;

    const callTypeStr = call.callType || "audio";
    const iconSymbol = callTypeStr === "video" ? "🎥" : "📞";
    const callLabel = callTypeStr.charAt(0).toUpperCase() + callTypeStr.slice(1);

    let statusText = "";
    if (finalStatus === "rejected" || finalStatus === "declined") {
      statusText = "Declined";
    } else if (finalStatus === "busy") {
      statusText = "Busy";
    } else if (finalStatus === "no-answer") {
      statusText = "Missed";
    } else if (finalStatus === "cancelled") {
      statusText = "Cancelled";
    } else if (finalStatus === "offline") {
      statusText = "Offline";
    } else if (finalStatus === "network-error") {
      statusText = "Failed";
    } else if (duration > 0) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      statusText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    } else {
      statusText = "Missed";
    }

    const messageText = `${iconSymbol} ${callLabel} call • ${statusText}`;
    logger.log(`[CallLog] Writing call message: "${messageText}" to convo: ${convoId}`);

    const msgRef = await addDoc(
      collection(db, COLLECTIONS.CONVERSATIONS, convoId, COLLECTIONS.MESSAGES),
      {
        senderId: "system",
        text: messageText,
        type: "call",
        callType: callTypeStr,
        status: finalStatus || (duration > 0 ? "ended" : "missed"),
        duration: duration || 0,
        isSystem: true,
        callerId,
        receiverId,
        createdAt: serverTimestamp(),
      }
    );

    await updateDoc(doc(db, COLLECTIONS.CONVERSATIONS, convoId), {
      lastMessage: messageText,
      lastSenderId: "system",
      updatedAt: serverTimestamp(),
    });

    logger.log(`[CallLog] Firestore write success. Message ID: ${msgRef.id}`);
  } catch (err) {
    console.error("[CallLog] Firestore write failure:", err);
  }
};
