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
  serverTimestamp,
  getDocs,
  type Unsubscribe,
} from "firebase/firestore";

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
  calleeId: string;
  calleeName: string;
  calleePhoto: string;
  callType: "audio" | "video";
  status: CallStatus;
  offer?: RTCSessionDescriptionInit | null;
  answer?: RTCSessionDescriptionInit | null;
  createdAt: any;
  endedAt?: any;
}

// ─── STUN/TURN Configuration ────────────────────────────────────────────────

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
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
  calleeId: string;
  calleeName: string;
  calleePhoto: string;
  callType: "audio" | "video";
  offer: RTCSessionDescriptionInit;
}): Promise<{ callId: string | null; error: string | null }> => {
  try {
    const callRef = await addDoc(collection(db, "calls"), {
      callerId: params.callerId,
      callerName: params.callerName,
      callerPhoto: params.callerPhoto,
      calleeId: params.calleeId,
      calleeName: params.calleeName,
      calleePhoto: params.calleePhoto,
      callType: params.callType,
      status: "pending" as CallStatus,
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
    const updates: any = { status };
    if (status === "ended" || status === "rejected" || status === "no-answer") {
      updates.endedAt = serverTimestamp();
    }
    await updateDoc(doc(db, "calls", callId), updates);
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
    await updateDoc(doc(db, "calls", callId), {
      answer,
      status: "accepted" as CallStatus,
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
    await addDoc(collection(db, "calls", callId, subCol), candidate);
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
    collection(db, "calls"),
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
    doc(db, "calls", callId),
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
    collection(db, "calls", callId, subCol),
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
      collection(db, "calls", callId, "callerCandidates")
    );
    for (const d of callerCands.docs) {
      await deleteDoc(d.ref);
    }
    // Delete callee candidates
    const calleeCands = await getDocs(
      collection(db, "calls", callId, "calleeCandidates")
    );
    for (const d of calleeCands.docs) {
      await deleteDoc(d.ref);
    }
    // Finally delete the call document
    await deleteDoc(doc(db, "calls", callId));
  } catch (err) {
    console.error("[CallService] cleanupCall error:", err);
  }
};
