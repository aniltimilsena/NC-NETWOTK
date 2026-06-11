import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useWebRTC, type CallState } from "../hooks/useWebRTC";
import {
  subscribeToIncomingCalls,
  updateCallStatus,
  type CallDoc,
} from "../services/call";
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

      const callParams = {
        callerId: user.uid,
        callerName: user.displayName || "Unknown",
        callerPhoto: user.photoURL || "",
        ...params,
      };

      setActiveCall({
        id: "", // Will be set after creation
        ...callParams,
        status: "pending",
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
      await addDoc(collection(db, "notifications"), {
        userId: incomingCall.calleeId,
        recipientId: incomingCall.calleeId,
        receiverId: incomingCall.calleeId,
        senderId: incomingCall.callerId,
        senderName: incomingCall.callerName,
        senderAvatar: incomingCall.callerPhoto || "",
        title: "Missed Call",
        body: `Missed an ${incomingCall.callType} call from ${incomingCall.callerName}`,
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
      // Log the call in chat history
      const { id: convoId } = await findOrCreateConversation([activeCall.callerId, activeCall.calleeId]);
      if (convoId) {
        const durationText = webrtc.callDuration > 0 
          ? `${Math.floor(webrtc.callDuration / 60)}m ${webrtc.callDuration % 60}s`
          : "Cancelled";
        await sendMessage(convoId, "system", `${activeCall.callType.charAt(0).toUpperCase() + activeCall.callType.slice(1)} call • ${durationText}`);
      }

      // If duration was 0, it was cancelled/unanswered. Send a missed call notification to callee
      if (webrtc.callDuration === 0) {
        try {
          await addDoc(collection(db, "notifications"), {
            userId: activeCall.calleeId,
            recipientId: activeCall.calleeId,
            receiverId: activeCall.calleeId,
            senderId: activeCall.callerId,
            senderName: activeCall.callerName,
            senderAvatar: activeCall.callerPhoto || "",
            title: "Missed Call",
            body: `Missed an ${activeCall.callType} call from ${activeCall.callerName}`,
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
  }, [activeCall, webrtc.endCall, webrtc.callDuration]);

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
