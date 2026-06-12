import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useWebRTC, type CallState } from "../hooks/useWebRTC";
import {
  subscribeToIncomingCalls,
  updateCallStatus,
  subscribeToCall,
  type CallDoc,
} from "../services/call";
import { getProfile } from "../services/profile";
import { playRingtone, stopRingtone, playEndCallSound } from "../utils/ringtone";
import { findOrCreateConversation, sendMessage } from "../services/messaging";
import { usePermissionContext } from "./PermissionContext";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ─── Context Types ──────────────────────────────────────────────────────────

interface CallContextValue {
  // State
  callState: CallState;
  activeCall: CallDoc | null;
  incomingCall: CallDoc | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  errorMessage: string;
  currentUser: any;

  // Actions
  initiateCall: (params: {
    calleeId: string;
    calleeName: string;
    calleePhoto: string;
    callType: "audio" | "video";
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  dismissError: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

interface CallProviderProps {
  children: ReactNode;
  user: any; // Firebase user
}

export function CallProvider({ children, user }: CallProviderProps) {
  const [activeCall, setActiveCall] = useState<CallDoc | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallDoc | null>(null);

  const webrtc = useWebRTC();
  const { requestPermission } = usePermissionContext();

  const loggedCallsRef = useRef<Record<string, boolean>>({});

  const logCallOutcome = useCallback(async (call: CallDoc, duration: number, finalStatus?: string) => {
    const callId = call.id || call.createdAt?.toString() || "unknown";
    if (!callId || loggedCallsRef.current[callId]) return;
    loggedCallsRef.current[callId] = true;

    try {
      const targetReceiverId = call.calleeId || call.receiverId;
      const callerId = call.callerId;
      if (!targetReceiverId || !callerId) return;

      const { id: convoId } = await findOrCreateConversation([callerId, targetReceiverId]);
      if (!convoId) return;

      const callTypeStr = call.callType || "audio";
      const callLabel = callTypeStr.charAt(0).toUpperCase() + callTypeStr.slice(1);
      let outcome = "";

      if (finalStatus === "rejected") {
        outcome = "Declined";
      } else if (finalStatus === "busy") {
        outcome = "Busy";
      } else if (finalStatus === "no-answer") {
        outcome = "Missed Call";
      } else if (finalStatus === "offline") {
        outcome = "Offline";
      } else if (finalStatus === "network-error") {
        outcome = "Network Error";
      } else if (finalStatus === "cancelled") {
        outcome = "Cancelled by Caller";
      } else if (duration > 0) {
        outcome = `${Math.floor(duration / 60)}m ${duration % 60}s`;
      } else {
        outcome = "Cancelled by Caller";
      }

      await sendMessage(convoId, "system", `${callLabel} call • ${outcome}`);
    } catch (e) {
      console.error("Error logging call outcome:", e);
    }
  }, []);

  // ─── Listen to the active call document changes in Firestore ───────────
  useEffect(() => {
    const callId = webrtc.callId;
    if (!callId || !user?.uid) return;

    const unsub = subscribeToCall(callId, (callDoc) => {
      if (callDoc) {
        setActiveCall(callDoc);

        // If this user is the caller, they are responsible for logging the outcome
        const isCaller = callDoc.callerId === user.uid;
        if (isCaller) {
          if (callDoc.status === "rejected") {
            logCallOutcome(callDoc, 0, "rejected");
          } else if (callDoc.status === "busy") {
            logCallOutcome(callDoc, 0, "busy");
          } else if (callDoc.status === "no-answer") {
            logCallOutcome(callDoc, 0, "no-answer");
          } else if (callDoc.status === "ended") {
            logCallOutcome(callDoc, webrtc.callDuration);
          }
        }
      } else {
        setActiveCall(null);
      }
    });

    return () => unsub();
  }, [webrtc.callId, user?.uid, webrtc.callDuration, logCallOutcome]);

  // ─── Listen to WebRTC call state changes to detect errors ───────────────
  useEffect(() => {
    if (webrtc.callState === "error" && activeCall && activeCall.callerId === user?.uid) {
      const isNetworkError = webrtc.errorMessage?.toLowerCase().includes("network") || 
                             webrtc.errorMessage?.toLowerCase().includes("disconnect") || 
                             webrtc.errorMessage?.toLowerCase().includes("failed");
      const statusType = isNetworkError ? "network-error" : "offline";
      logCallOutcome(activeCall, 0, statusType);
      
      // Update the call document in Firestore so the other side knows
      if (activeCall.id) {
        updateCallStatus(activeCall.id, "ended");
      }
    }
  }, [webrtc.callState, webrtc.errorMessage, activeCall, user?.uid, logCallOutcome]);

  // ─── Listen for incoming calls ─────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeToIncomingCalls(user.uid, (call) => {
      if (call && webrtc.callState === "idle") {
        setIncomingCall(call);
        playRingtone();
      } else if (!call) {
        setIncomingCall(null);
        stopRingtone();
      }
    });

    return () => {
      unsub();
      stopRingtone();
    };
  }, [user?.uid, webrtc.callState]);

  // ─── Stop ringtone when call state changes from idle ───────────────────

  useEffect(() => {
    if (webrtc.callState !== "idle") {
      stopRingtone();
    }
  }, [webrtc.callState]);

  // ─── Reset active/incoming call states when call ends ──────────────────

  useEffect(() => {
    if (webrtc.callState === "ended") {
      setActiveCall(null);
      setIncomingCall(null);
      stopRingtone();
      
      const timer = setTimeout(() => {
        webrtc.resetToIdle();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [webrtc.callState, webrtc.resetToIdle]);

  // ─── Listen for custom 'nc-call' events from non-context components ────

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && user?.uid) {
        initiateCall(detail);
      }
    };
    window.addEventListener("nc-call", handler);
    return () => window.removeEventListener("nc-call", handler);
  }, [user?.uid]);

  // ─── Initiate an outgoing call ─────────────────────────────────────────

  const initiateCall = useCallback(
    async (params: {
      calleeId: string;
      calleeName: string;
      calleePhoto: string;
      callType: "audio" | "video";
    }) => {
      if (!user?.uid) return;

      // Fetch caller and callee profile details dynamically from Firestore
      let callerName = user.displayName || "Unknown";
      let callerAvatar = user.photoURL || "";
      let calleeName = params.calleeName;
      let calleePhoto = params.calleePhoto;

      try {
        const callerRes = await getProfile(user.uid);
        if (callerRes.data) {
          callerName = callerRes.data.name || [callerRes.data.firstName, callerRes.data.lastName].filter(Boolean).join(' ') || callerRes.data.username || callerName;
          callerAvatar = callerRes.data.image || callerRes.data.avatar || callerRes.data.photoURL || callerAvatar;
        }
      } catch (e) {
        console.warn("Failed to fetch caller profile:", e);
      }

      try {
        const calleeRes = await getProfile(params.calleeId);
        if (calleeRes.data) {
          calleeName = calleeRes.data.name || [calleeRes.data.firstName, calleeRes.data.lastName].filter(Boolean).join(' ') || calleeRes.data.username || calleeName;
          calleePhoto = calleeRes.data.image || calleeRes.data.avatar || calleeRes.data.photoURL || calleePhoto;
        }
      } catch (e) {
        console.warn("Failed to fetch callee profile:", e);
      }

      const callParams = {
        callerId: user.uid,
        callerName,
        callerPhoto: callerAvatar,
        callerAvatar,
        calleeId: params.calleeId,
        calleeName,
        calleePhoto,
        receiverId: params.calleeId,
        receiverName: calleeName,
        receiverAvatar: calleePhoto,
        callType: params.callType,
      };

      setActiveCall({
        id: "", // Will be set after creation
        ...callParams,
        status: "pending",
        callStatus: "pending",
        createdAt: new Date(),
      } as any);

      await requestPermission("media", () => webrtc.startCall(callParams));
    },
    [user, webrtc.startCall, requestPermission]
  );

  // ─── Accept incoming call ──────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    stopRingtone();
    setActiveCall(incomingCall);
    setIncomingCall(null);

    await requestPermission("media", () => webrtc.answerCall(incomingCall));
  }, [incomingCall, webrtc.answerCall, requestPermission]);

  // ─── Reject incoming call ─────────────────────────────────────────────

  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    stopRingtone();
    await updateCallStatus(incomingCall.id, "rejected");

    // Send missed call notification
    try {
      let senderName = incomingCall.callerName;
      let senderAvatar = incomingCall.callerPhoto || "";
      const profileRes = await getProfile(incomingCall.callerId);
      if (profileRes.data) {
        senderName = profileRes.data.name || senderName;
        senderAvatar = profileRes.data.image || senderAvatar;
      }

      const targetReceiverId = incomingCall.calleeId || incomingCall.receiverId;

      await addDoc(collection(db, "notifications"), {
        userId: targetReceiverId,
        recipientId: targetReceiverId,
        receiverId: targetReceiverId,
        senderId: incomingCall.callerId,
        senderName,
        senderAvatar,
        title: "Missed Call",
        body: `Missed an ${incomingCall.callType} call from ${senderName}`,
        type: "messages",
        notificationType: "messages",
        isRead: false,
        read: false,
        createdAt: serverTimestamp(),
        targetUrl: `/messages/${incomingCall.callerId}`,
        profileUrl: `/messages/${incomingCall.callerId}`
      });
    } catch (err) {
      console.warn("Failed to write missed call notification:", err);
    }

    setIncomingCall(null);
  }, [incomingCall]);

  // ─── Hang up active call ──────────────────────────────────────────────

  const hangUp = useCallback(async () => {
    if (activeCall) {
      const targetReceiverId = activeCall.calleeId || activeCall.receiverId;
      // If duration was 0 and current user is caller, send a missed call notification to callee
      if (webrtc.callDuration === 0 && activeCall.callerId === user?.uid) {
        try {
          let senderName = activeCall.callerName;
          let senderAvatar = activeCall.callerPhoto || "";
          const profileRes = await getProfile(activeCall.callerId);
          if (profileRes.data) {
            senderName = profileRes.data.name || senderName;
            senderAvatar = profileRes.data.image || senderAvatar;
          }

          await addDoc(collection(db, "notifications"), {
            userId: targetReceiverId,
            recipientId: targetReceiverId,
            receiverId: targetReceiverId,
            senderId: activeCall.callerId,
            senderName,
            senderAvatar,
            title: "Missed Call",
            body: `Missed an ${activeCall.callType} call from ${senderName}`,
            type: "messages",
            notificationType: "messages",
            isRead: false,
            read: false,
            createdAt: serverTimestamp(),
            targetUrl: `/messages/${activeCall.callerId}`,
            profileUrl: `/messages/${activeCall.callerId}`
          });
        } catch (err) {
          console.warn("Failed to write missed call notification on hangup:", err);
        }
      }
    }
    
    playEndCallSound();
    await webrtc.endCall();
    setActiveCall(null);
  }, [activeCall, webrtc.endCall, webrtc.callDuration, user?.uid]);

  // ─── Dismiss error ────────────────────────────────────────────────────

  const dismissError = useCallback(() => {
    webrtc.endCall();
    setActiveCall(null);
  }, [webrtc.endCall]);

  // ─── Context value ────────────────────────────────────────────────────

  const value: CallContextValue = {
    callState: webrtc.callState,
    activeCall,
    incomingCall,
    localStream: webrtc.localStream,
    remoteStream: webrtc.remoteStream,
    isMuted: webrtc.isMuted,
    isVideoOff: webrtc.isVideoOff,
    callDuration: webrtc.callDuration,
    errorMessage: webrtc.errorMessage,
    currentUser: user,
    initiateCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute: webrtc.toggleMute,
    toggleVideo: webrtc.toggleVideo,
    switchCamera: webrtc.switchCamera,
    dismissError,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return ctx;
}
