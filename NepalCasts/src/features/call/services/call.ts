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

export type CallStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "ended"
  | "no-answer"
  | "busy";

export interface CallDoc {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  callerAvatar?: string;
  calleeId: string;
  calleeName: string;
  calleePhoto: string;
  receiverId?: string;
  receiverName?: string;
  receiverAvatar?: string;
  callType: "audio" | "video";
  status: CallStatus;
  callStatus?: CallStatus;
  offer?: RTCSessionDescriptionInit | null;
  answer?: RTCSessionDescriptionInit | null;
  createdAt: any;
  endedAt?: any;
}

export const getIceServers = (): RTCConfiguration => {
  const customTurnUrl = import.meta.env.VITE_TURN_SERVER;
  const customTurnUsername = import.meta.env.VITE_TURN_USERNAME;
  const customTurnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  if (customTurnUrl && customTurnUsername && customTurnCredential) {
    servers.push({
      urls: customTurnUrl,
      username: customTurnUsername,
      credential: customTurnCredential,
    });
  }

  return {
    iceServers: servers,
    iceCandidatePoolSize: 10,
  };
};

export const ICE_SERVERS: RTCConfiguration = getIceServers();

/**
 * Creates a lightweight call document immediately upon caller tap (T0 -> T1 < 300ms)
 * before acquiring media or generating SDP offer.
 */
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
    logger.log(`[PERF TIMING 2] T1: Call doc created in Firestore (${duration}ms). Call ID: ${callRef.id}`);
    return { callId: callRef.id, error: null };
  } catch (err: any) {
    console.error("[CallService] createCallPending error:", err);
    return { callId: null, error: err.message };
  }
};

/**
 * Updates an existing call document with the generated SDP offer.
 */
export const setCallOffer = async (
  callId: string,
  offer: RTCSessionDescriptionInit
): Promise<void> => {
  const tStart = performance.now();
  try {
    await updateDoc(doc(db, COLLECTIONS.CALLS, callId), { offer });
    const duration = (performance.now() - tStart).toFixed(1);
    logger.log(`[PERF TIMING 6] T5: SDP Offer updated in Firestore (${duration}ms)`);
  } catch (err) {
    console.error("[CallService] setCallOffer error:", err);
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
    logger.log(`[CallService] Updated call ${callId} ${field} ->`, isVideoOff);
  } catch (err) {
    console.error("[CallService] updateCallVideoState error:", err);
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
    logger.log(`[CallService] Updated call ${callId} status to: ${status}`);
  } catch (err) {
    console.error("[CallService] updateCallStatus error:", err);
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
    logger.log(`[PERF TIMING 6] T5: SDP Answer updated in Firestore (${duration}ms)`);
  } catch (err) {
    console.error("[CallService] setCallAnswer error:", err);
  }
};

export const addIceCandidate = async (
  callId: string,
  role: "caller" | "callee",
  candidate: RTCIceCandidateInit
): Promise<void> => {
  try {
    const subCol = role === "caller" ? "callerCandidates" : "calleeCandidates";
    await addDoc(collection(db, COLLECTIONS.CALLS, callId, subCol), candidate);
  } catch (err) {
    console.error("[CallService] addIceCandidate error:", err);
  }
};

export const subscribeToIncomingCalls = (
  userId: string,
  callback: (call: CallDoc | null) => void
): Unsubscribe => {
  logger.log(`[CallService] Registering real-time incoming call listener for user: ${userId}`);
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
      logger.log(`[PERF TIMING 3] T2: Incoming call onSnapshot fired for callee ${userId}. Call ID: ${data.id}`);
      callback(data);
    },
    (err) => {
      console.error("[CallService] subscribeToIncomingCalls error:", err);
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
      console.error("[CallService] subscribeToCall error:", err);
      callback(null);
    }
  );
};

export const subscribeToIceCandidates = (
  callId: string,
  role: "caller" | "callee",
  callback: (candidate: RTCIceCandidateInit) => void
): Unsubscribe => {
  const subCol = role === "caller" ? "calleeCandidates" : "callerCandidates";

  return onSnapshot(
    collection(db, COLLECTIONS.CALLS, callId, subCol),
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          callback(change.doc.data() as RTCIceCandidateInit);
        }
      });
    },
    (err) => {
      console.error("[CallService] subscribeToIceCandidates error:", err);
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
    logger.log(`[CallService] Cleaned up call ${callId} and ICE subcollections`);
  } catch (err) {
    console.error("[CallService] cleanupCall error:", err);
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
      console.warn("[CallService] callerQ subscription failed:", err);
    }
  );

  const unsub2 = onSnapshot(calleeQ, 
    (snap) => {
      calleeCalls = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallDoc));
      merge();
    },
    (err) => {
      console.warn("[CallService] calleeQ subscription failed:", err);
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
};
