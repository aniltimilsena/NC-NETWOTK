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
  const { requestPermission } = usePermissionContext() as any;

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
        outcome = `Cancelled by ${callerId}`;
      } else if (duration > 0) {
        outcome = `${Math.floor(duration / 60)}m ${duration % 60}s`;
      } else {
        outcome = `Cancelled by ${callerId}`;
      }

      await sendMessage(convoId, "system", `${callLabel} call • ${outcome}`, true);
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

      // 1. Immediately show Calling overlay using cached and passed profile data (0ms delay)
      const initialActiveCall = {
        id: "",
        callerId: user.uid,
        callerName: user.displayName || "Unknown",
        callerPhoto: user.photoURL || "",
        callerAvatar: user.photoURL || "",
        calleeId: params.calleeId,
        calleeName: params.calleeName,
        calleePhoto: params.calleePhoto,
        receiverId: params.calleeId,
        receiverName: params.calleeName,
        receiverAvatar: params.calleePhoto,
        callType: params.callType,
        status: "pending",
        callStatus: "pending",
        createdAt: new Date(),
      };
      setActiveCall(initialActiveCall as any);

      // 2. Synchronously invoke getUserMedia to keep the call inside the original user gesture event stack (preventing NotAllowedError)
      const streamPromise = webrtc.getUserMedia(params.callType);

      // 3. Perform profile fetching, peer connection, and signaling asynchronously in the background
      (async () => {
        try {
          const stream = await streamPromise;

          let callerName = user.displayName || "Unknown";
          let callerAvatar = user.photoURL || "";
          let calleeName = params.calleeName;
          let calleePhoto = params.calleePhoto;

          // Fetch full profile info concurrently
          const [callerRes, calleeRes] = await Promise.allSettled([
            getProfile(user.uid),
            getProfile(params.calleeId)
          ]);

          if (callerRes.status === "fulfilled" && callerRes.value.data) {
            const callerData = callerRes.value.data as any;
            callerName = callerData.name || [callerData.firstName, callerData.lastName].filter(Boolean).join(' ') || callerData.username || callerName;
            callerAvatar = callerData.image || callerData.avatar || callerData.photoURL || callerAvatar;
          }

          if (calleeRes.status === "fulfilled" && calleeRes.value.data) {
            const calleeData = calleeRes.value.data as any;
            calleeName = calleeData.name || [calleeData.firstName, calleeData.lastName].filter(Boolean).join(' ') || calleeData.username || calleeName;
            calleePhoto = calleeData.image || calleeData.avatar || calleeData.photoURL || calleePhoto;
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

          // Update activeCall details once profile lookup is done
          setActiveCall((prev) => prev ? {
            ...prev,
            ...callParams,
          } as any : null);

          await webrtc.startCall(callParams, stream);
        } catch (err: any) {
          console.error("Failed to start call:", err);
          // If webrtc error state was not set, clean up here
          setActiveCall(null);
        }
      })();
    },
    [user, webrtc.getUserMedia, webrtc.startCall]
  );

  // ─── Accept incoming call ──────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    stopRingtone();
    setActiveCall(incomingCall);
    setIncomingCall(null);

    try {
      // Immediately pre-acquire media stream inside user gesture event loop
      const stream = await webrtc.getUserMedia(incomingCall.callType);
      // Answer call with the pre-acquired stream
      await webrtc.answerCall(incomingCall, stream);
    } catch (err: any) {
      console.error("Failed to answer call:", err);
    }
  }, [incomingCall, webrtc.getUserMedia, webrtc.answerCall]);

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
        const profileData = profileRes.data as any;
        senderName = profileData.name || senderName;
        senderAvatar = profileData.image || senderAvatar;
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
            const profileData = profileRes.data as any;
            senderName = profileData.name || senderName;
            senderAvatar = profileData.image || senderAvatar;
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
