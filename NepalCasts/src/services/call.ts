import { db } from "../lib/firebase";
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
import { COLLECTIONS } from "../constants/collections";



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

export const createCall = async (params: {
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
  offer: RTCSessionDescriptionInit;
}): Promise<{ callId: string | null; error: string | null }> => {
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
      offer: params.offer,
      answer: null,
      createdAt: serverTimestamp(),
    });
    return { callId: callRef.id, error: null };
  } catch (err: any) {
    console.error("[CallService] createCall error:", err);
    return { callId: null, error: err.message };
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
  } catch (err) {
    console.error("[CallService] updateCallStatus error:", err);
  }
};


export const setCallAnswer = async (
  callId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.CALLS, callId), {
      answer,
      status: "accepted" as CallStatus,
      callStatus: "accepted" as CallStatus,
    });
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
    const subCol =
      role === "caller" ? "callerCandidates" : "calleeCandidates";
    await addDoc(collection(db, COLLECTIONS.CALLS, callId, subCol), candidate);
  } catch (err) {
    console.error("[CallService] addIceCandidate error:", err);
  }
};


export const subscribeToIncomingCalls = (
  userId: string,
  callback: (call: CallDoc | null) => void
): Unsubscribe => {
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
      callback({ id: callDoc.id, ...callDoc.data() } as CallDoc);
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
  
  const subCol =
    role === "caller" ? "calleeCandidates" : "callerCandidates";

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
  } catch (err) {
    console.error("[CallService] cleanupCall error:", err);
  }
};




export const getCallHistory = async (
  userId: string,
  maxResults: number = 50
): Promise<CallDoc[]> => {
  try {
    
    const callerQuery = query(
      collection(db, COLLECTIONS.CALLS),
      where("callerId", "==", userId),
      limit(maxResults)
    );

    
    const calleeQuery = query(
      collection(db, COLLECTIONS.CALLS),
      where("calleeId", "==", userId),
      limit(maxResults)
    );

    const [callerSnap, calleeSnap] = await Promise.all([
      getDocs(callerQuery),
      getDocs(calleeQuery),
    ]);

    const callMap = new Map<string, CallDoc>();

    callerSnap.docs.forEach((d) => {
      callMap.set(d.id, { id: d.id, ...d.data() } as CallDoc);
    });
    calleeSnap.docs.forEach((d) => {
      if (!callMap.has(d.id)) {
        callMap.set(d.id, { id: d.id, ...d.data() } as CallDoc);
      }
    });

    
    const allCalls = Array.from(callMap.values());
    allCalls.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });

    return allCalls.slice(0, maxResults);
  } catch (err) {
    console.error("[CallService] getCallHistory error:", err);
    return [];
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
      console.warn("[CallService] callerQ subscription failed (likely missing index):", err);
    }
  );

  const unsub2 = onSnapshot(calleeQ, 
    (snap) => {
      calleeCalls = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CallDoc));
      merge();
    },
    (err) => {
      console.warn("[CallService] calleeQ subscription failed (likely missing index):", err);
    }
  );

  return () => {
    unsub1();
    unsub2();
  };
};
