import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode, } from "react";
import { useWebRTC, type CallState } from "../hooks/useWebRTC";
import { subscribeToIncomingCalls, updateCallStatus, logCallOutcomeToFirestore, type CallDoc, } from "../features/call/services/call";
import { getProfile } from "../features/profile/services/profile";
import { playRingtone, stopRingtone, playEndCallSound } from "../utils/ringtone";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
interface CallContextValue {
    callState: CallState;
    activeCall: CallDoc | null;
    incomingCall: CallDoc | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    callDuration: number;
    errorMessage: string;
    currentUser: any;
    initiateCall: (params: {
        calleeId: string;
        calleeName: string;
        calleePhoto: string;
        callType?: "audio" | "video";
    }) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    hangUp: () => Promise<void>;
    toggleMute: () => void;
    dismissError: () => void;
}
const CallContext = createContext<CallContextValue | null>(null);
const resolveUserName = async (userId: string, defaultName: string) => {
    let resolvedName = defaultName;
    if (!resolvedName || resolvedName === "User" || resolvedName === "Caller") {
        try {
            const profileRes = await getProfile(userId);
            if (profileRes.data) {
                const profileData = profileRes.data as any;
                resolvedName = profileData.name || resolvedName;
            }
        }
        catch (_err) {
            // Profile fetch optional, fallback to default display name
        }
    }
    return resolvedName;
};
interface CallProviderProps {
    children: ReactNode;
    user: any;
}
export function CallProvider({ children, user }: CallProviderProps) {
    const [activeCall, setActiveCall] = useState<CallDoc | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallDoc | null>(null);
    const webrtc = useWebRTC();
    const loggedCallsRef = useRef<Record<string, boolean>>({});
    const activeCallRef = useRef<CallDoc | null>(null);
    useEffect(() => {
        if (activeCall) {
            activeCallRef.current = activeCall;
        }
    }, [activeCall]);
    const logCallOutcome = useCallback(async (call: CallDoc, duration: number, finalStatus?: string) => {
        const callId = call.id || call.createdAt?.toString() || "unknown";
        if (!callId || loggedCallsRef.current[callId] || !user?.uid)
            return;
        loggedCallsRef.current[callId] = true;
        try {
            await logCallOutcomeToFirestore({
                call,
                duration,
                finalStatus,
                currentUserId: user.uid,
            });
        }
        catch (e) {
            console.error("[CallContext] Error logging call outcome:", e);
        }
    }, [user?.uid]);
    useEffect(() => {
        const callDoc = webrtc.activeCallDoc;
        if (callDoc) {
            setActiveCall(callDoc);
            const isCaller = callDoc.callerId === user?.uid;
            if (isCaller) {
                if (callDoc.status === "rejected") {
                    logCallOutcome(callDoc, 0, "rejected");
                }
                else if (callDoc.status === "busy") {
                    logCallOutcome(callDoc, 0, "busy");
                }
                else if (callDoc.status === "no-answer") {
                    logCallOutcome(callDoc, 0, "no-answer");
                }
                else if (callDoc.status === "ended") {
                    logCallOutcome(callDoc, webrtc.callDuration);
                }
            }
        }
        else {
            setActiveCall(null);
        }
    }, [webrtc.activeCallDoc, user?.uid, webrtc.callDuration, logCallOutcome]);
    useEffect(() => {
        if (!user?.uid)
            return;
        const unsub = subscribeToIncomingCalls(user.uid, (call: any) => {
            if (call && webrtc.callState === "idle") {
                setIncomingCall(call);
                playRingtone();
            }
            else if (!call) {
                setIncomingCall(null);
                stopRingtone();
            }
        });
        return () => {
            unsub();
            stopRingtone();
        };
    }, [user?.uid, webrtc.callState]);
    const initiateCall = useCallback(async (params: {
        calleeId: string;
        calleeName: string;
        calleePhoto: string;
        callType?: "audio" | "video";
    }) => {
        if (!user?.uid)
            return;
        const resolvedCallerName = await resolveUserName(user.uid, user.displayName || user.name || "Caller");
        const initialActiveCall: CallDoc = {
            id: "",
            callerId: user.uid,
            callerName: resolvedCallerName,
            callerPhoto: user.photoURL || user.profileImage || user.image || "",
            callerAvatar: user.photoURL || user.profileImage || user.image || "",
            calleeId: params.calleeId,
            calleeName: params.calleeName,
            calleePhoto: params.calleePhoto,
            receiverId: params.calleeId,
            receiverName: params.calleeName,
            receiverAvatar: params.calleePhoto,
            callType: "audio",
            status: "pending",
            createdAt: undefined,
        };
        setActiveCall(initialActiveCall);
        try {
            await webrtc.startCall({
                callerId: user.uid,
                callerName: resolvedCallerName,
                callerPhoto: user.photoURL || user.profileImage || user.image || "",
                callerAvatar: user.photoURL || user.profileImage || user.image || "",
                calleeId: params.calleeId,
                calleeName: params.calleeName,
                calleePhoto: params.calleePhoto,
                receiverId: params.calleeId,
                receiverName: params.calleeName,
                receiverAvatar: params.calleePhoto,
                callType: "audio",
            });
        }
        catch (err: any) {
            console.error("[CallContext] initiateCall error:", err);
        }
    }, [user, webrtc]);
    const acceptCall = useCallback(async () => {
        if (!incomingCall)
            return;
        stopRingtone();
        const callDocToAnswer = incomingCall;
        setIncomingCall(null);
        await webrtc.answerCall(callDocToAnswer);
    }, [incomingCall, webrtc]);
    const rejectCall = useCallback(async () => {
        if (!incomingCall)
            return;
        stopRingtone();
        const callDocToReject = incomingCall;
        setIncomingCall(null);
        await updateCallStatus(callDocToReject.id, "rejected");
        await logCallOutcome(callDocToReject, 0, "rejected");
        try {
            const senderName = await resolveUserName(callDocToReject.callerId, callDocToReject.callerName);
            let senderAvatar = callDocToReject.callerPhoto || "";
            const profileRes = await getProfile(callDocToReject.callerId);
            if (profileRes.data) {
                const profileData = profileRes.data as any;
                senderAvatar = profileData.image || senderAvatar;
            }
            const targetReceiverId = callDocToReject.calleeId || callDocToReject.receiverId;
            await addDoc(collection(db, "notifications"), {
                userId: targetReceiverId,
                recipientId: targetReceiverId,
                receiverId: targetReceiverId,
                senderId: callDocToReject.callerId,
                senderName,
                senderAvatar,
                title: "Missed Call",
                body: `Missed an audio call from ${senderName}`,
                type: "messages",
                notificationType: "messages",
                isRead: false,
                read: false,
                createdAt: serverTimestamp(),
                targetUrl: `/messages/${callDocToReject.callerId}`,
                profileUrl: `/messages/${callDocToReject.callerId}`,
            });
        }
        catch (err) {
            console.warn("Failed to write missed call notification:", err);
        }
    }, [incomingCall, logCallOutcome]);
    const hangUp = useCallback(async () => {
        if (activeCall) {
            const callDocToLog = activeCall;
            const duration = webrtc.callDuration;
            const finalStatus = duration > 0 ? "ended" : activeCall.callerId === user?.uid ? "cancelled" : "no-answer";
            await logCallOutcome(callDocToLog, duration, finalStatus);
        }
        playEndCallSound();
        await webrtc.endCall();
        setActiveCall(null);
    }, [activeCall, webrtc, user?.uid, logCallOutcome]);
    const dismissError = useCallback(() => {
        webrtc.endCall();
        setActiveCall(null);
    }, [webrtc]);
    const value: CallContextValue = {
        callState: webrtc.callState,
        activeCall,
        incomingCall,
        localStream: webrtc.localStream,
        remoteStream: webrtc.remoteStream,
        isMuted: webrtc.isMuted,
        callDuration: webrtc.callDuration,
        errorMessage: webrtc.errorMessage,
        currentUser: user,
        initiateCall,
        acceptCall,
        rejectCall,
        hangUp,
        toggleMute: webrtc.toggleMute,
        dismissError,
    };
    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
export function useCall(): CallContextValue {
    const ctx = useContext(CallContext);
    if (!ctx) {
        return {
            callState: "idle",
            activeCall: null,
            incomingCall: null,
            localStream: null,
            remoteStream: null,
            isMuted: false,
            callDuration: 0,
            errorMessage: "",
            currentUser: null,
            initiateCall: async () => { },
            acceptCall: async () => { },
            rejectCall: async () => { },
            hangUp: async () => { },
            toggleMute: () => { },
            dismissError: () => { },
        };
    }
    return ctx;
}
