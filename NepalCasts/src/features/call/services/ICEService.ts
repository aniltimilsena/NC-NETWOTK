import { db } from "../../../lib/firebase";
import { collection, addDoc, onSnapshot, } from "firebase/firestore";
import { COLLECTIONS } from "../../../constants/collections";
import { logger } from "../../../utils/logger";
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
export const addIceCandidate = async (callId: string, role: "caller" | "callee", candidate: RTCIceCandidateInit): Promise<void> => {
    try {
        const subCol = role === "caller" ? "callerCandidates" : "calleeCandidates";
        await addDoc(collection(db, COLLECTIONS.CALLS, callId, subCol), candidate);
    }
    catch (err) {
        console.error("[ICEService] addIceCandidate error:", err);
    }
};
export const subscribeToIceCandidates = (callId: string, role: "caller" | "callee", callback: (candidate: RTCIceCandidateInit) => void) => {
    const subCol = role === "caller" ? "calleeCandidates" : "callerCandidates";
    return onSnapshot(collection(db, COLLECTIONS.CALLS, callId, subCol), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                callback(change.doc.data() as RTCIceCandidateInit);
            }
        });
    }, (err) => {
        console.error("[ICEService] subscribeToIceCandidates error:", err);
    });
};
