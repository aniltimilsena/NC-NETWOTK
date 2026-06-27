import { db } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "../constants/collections";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── STUN/TURN Configuration ────────────────────────────────────────────────
// TURN servers ensure calls work behind strict NATs, corporate firewalls,
// and symmetric NATs where STUN alone fails (~15-20% of connections).

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (fast, reliable, free)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // TURN relay servers for restrictive networks
    // Using OpenRelay (free, open-source TURN service)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * Create a new call document in Firestore.
 * Returns the call ID.
 */
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
    const callRef = await addDoc(collection(db, COLLECTIONS.CALLS), {
      callerId: params.callerId,
      callerName: params.callerName,
      callerPhoto: params.callerPhoto,
      callerAvatar: params.callerAvatar,
      calleeId: params.calleeId,
      calleeName: params.calleeName,
      calleePhoto: params.calleePhoto,
      receiverId: params.receiverId,
      receiverName: params.receiverName,
      receiverAvatar: params.receiverAvatar,
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

/**
 * Update call status (accept, reject, end).
 */
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

/**
 * Set the answer SDP on the call document.
 */
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

/**
 * Add an ICE candidate to the caller or callee sub-collection.
 */
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

/**
 * Subscribe to incoming calls for a user (callee).
 * Fires callback when a call with status 'pending' is found for this user.
 */
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
      // Take the most recent pending call
      const callDoc = snapshot.docs[0];
      callback({ id: callDoc.id, ...callDoc.data() } as CallDoc);
    },
    (err) => {
      console.error("[CallService] subscribeToIncomingCalls error:", err);
      callback(null);
    }
  );
};

/**
 * Subscribe to changes on a specific call document.
 */
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

/**
 * Subscribe to ICE candidates from the remote peer.
 */
export const subscribeToIceCandidates = (
  callId: string,
  role: "caller" | "callee",
  callback: (candidate: RTCIceCandidateInit) => void
): Unsubscribe => {
  // Listen to the OPPOSITE role's candidates
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

/**
 * Clean up a call: delete all sub-collection documents, then the call doc.
 */
export const cleanupCall = async (callId: string): Promise<void> => {
  try {
    // Delete caller candidates
    const callerCands = await getDocs(
      collection(db, COLLECTIONS.CALLS, callId, "callerCandidates")
    );
    for (const d of callerCands.docs) {
      await deleteDoc(d.ref);
    }
    // Delete callee candidates
    const calleeCands = await getDocs(
      collection(db, COLLECTIONS.CALLS, callId, "calleeCandidates")
    );
    for (const d of calleeCands.docs) {
      await deleteDoc(d.ref);
    }
    // Finally delete the call document
    await deleteDoc(doc(db, COLLECTIONS.CALLS, callId));
  } catch (err) {
    console.error("[CallService] cleanupCall error:", err);
  }
};

// ─── Call History ───────────────────────────────────────────────────────────

/**
 * Fetch call history for a user (both as caller and callee).
 * Runs two queries and merges + sorts by createdAt descending.
 */
export const getCallHistory = async (
  userId: string,
  maxResults: number = 50
): Promise<CallDoc[]> => {
  try {
    // Query 1: Calls where user is the caller
    const callerQuery = query(
      collection(db, COLLECTIONS.CALLS),
      where("callerId", "==", userId),
      limit(maxResults)
    );

    // Query 2: Calls where user is the callee
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

    // Sort by createdAt descending
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

/**
 * Subscribe to call history changes in real-time.
 */
export const subscribeToCallHistory = (
  userId: string,
  callback: (calls: CallDoc[]) => void,
  maxResults: number = 50
): Unsubscribe => {
  // We listen to calls where user is caller
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
