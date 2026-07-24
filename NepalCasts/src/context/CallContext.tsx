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
  updateCallVideoState,
  logCallOutcomeToFirestore,
  type CallDoc,
  getProfile,
} from "../services";
import { playRingtone, stopRingtone, playEndCallSound } from "../utils/ringtone";
import { createConversation, sendMessage } from "../services";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";



interface CallContextValue {
  
  callState: CallState;
  activeCall: CallDoc | null;
  incomingCall: CallDoc | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isRemoteVideoOff: boolean;
  callDuration: number;
  errorMessage: string;
  currentUser: any;

  
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



const resolveUserName = async (userId: string, defaultName: string): Promise<string> => {
  let resolvedName = defaultName || 'Caller';
  const trimmed = resolvedName.trim();
  
  if (!resolvedName || resolvedName === 'Unknown' || resolvedName === 'Caller' || /^[a-zA-Z0-9_-]{20,40}$/.test(trimmed)) {
    try {
      // 1. Try profiles
      const profileRes = await getProfile(userId);
      if (profileRes.data) {
        const profileData = profileRes.data as any;
        resolvedName = profileData.name || [profileData.firstName, profileData.lastName].filter(Boolean).join(' ') || profileData.username || resolvedName;
      }
      
      // 2. Try users
      const currentTrimmed = resolvedName.trim();
      if (currentTrimmed === 'Unknown' || currentTrimmed === 'Caller' || /^[a-zA-Z0-9_-]{20,40}$/.test(currentTrimmed)) {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          resolvedName = userData.name || userData.displayName || resolvedName;
        }
      }
    } catch (e) {
      console.warn("resolveUserName error:", e);
    }
  }
  
  const finalTrimmed = resolvedName.trim();
  if (finalTrimmed && /^[a-zA-Z0-9_-]{20,40}$/.test(finalTrimmed)) {
    return 'Caller';
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
  const callerHungUpRef = useRef(false);
  const activeCallRef = useRef<CallDoc | null>(null);

  useEffect(() => {
    if (activeCall) {
      activeCallRef.current = activeCall;
    }
  }, [activeCall]);

  const logCallOutcome = useCallback(async (call: CallDoc, duration: number, finalStatus?: string) => {
    const callId = call.id || call.createdAt?.toString() || "unknown";
    if (!callId || loggedCallsRef.current[callId] || !user?.uid) return;
    loggedCallsRef.current[callId] = true;

    try {
      await logCallOutcomeToFirestore({
        call,
        duration,
        finalStatus,
        currentUserId: user.uid,
      });
    } catch (e) {
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
  }, [webrtc.activeCallDoc, user?.uid, webrtc.callDuration, logCallOutcome]);

  
  useEffect(() => {
    if (webrtc.callState === "error" && activeCall && activeCall.callerId === user?.uid) {
      const isNetworkError = webrtc.errorMessage?.toLowerCase().includes("network") || 
                             webrtc.errorMessage?.toLowerCase().includes("disconnect") || 
                             webrtc.errorMessage?.toLowerCase().includes("failed");
      const statusType = isNetworkError ? "network-error" : "offline";
      logCallOutcome(activeCall, 0, statusType);
      
      
      if (activeCall.id) {
        updateCallStatus(activeCall.id, "ended");
      }
    }
  }, [webrtc.callState, webrtc.errorMessage, activeCall, user?.uid, logCallOutcome]);

  // Log call outcome when call state changes to ended on caller's side
  useEffect(() => {
    if (webrtc.callState === "ended" && activeCallRef.current && activeCallRef.current.callerId === user?.uid) {
      let finalStatus: string | undefined = undefined;
      if (webrtc.callDuration === 0) {
        finalStatus = callerHungUpRef.current ? "cancelled" : "no-answer";
      }
      logCallOutcome(activeCallRef.current, webrtc.callDuration, finalStatus);
      activeCallRef.current = null;
    }
  }, [webrtc.callState, user?.uid, webrtc.callDuration, logCallOutcome]);

  

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeToIncomingCalls(user.uid, (call: any) => {
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

  

  useEffect(() => {
    if (webrtc.callState !== "idle") {
      stopRingtone();
    }
  }, [webrtc.callState]);

  

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

  

  const initiateCall = useCallback(
    async (params: {
      calleeId: string;
      calleeName: string;
      calleePhoto: string;
      callType: "audio" | "video";
    }) => {
      if (!user?.uid) return;

      callerHungUpRef.current = false;

      
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

      // Start WebRTC initialization immediately in parallel with profile name enrichment
      const streamPromise = webrtc.getUserMedia(params.callType);

      // Background profile resolution for avatar/display name enrichment
      Promise.allSettled([
        getProfile(user.uid),
        getProfile(params.calleeId)
      ]).then(([callerRes, calleeRes]) => {
        let callerName = user.displayName || "Unknown";
        let callerAvatar = user.photoURL || "";
        let calleeName = params.calleeName;
        let calleePhoto = params.calleePhoto;

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

        setActiveCall((prev: any) => prev ? {
          ...prev,
          callerName,
          callerPhoto: callerAvatar,
          callerAvatar,
          calleeName,
          calleePhoto,
          receiverName: calleeName,
          receiverAvatar: calleePhoto,
        } as any : null);
      }).catch((profileErr) => {
        console.warn("[CallContext] Background profile resolution notice:", profileErr);
      });

      (async () => {
        try {
          const stream = await streamPromise;

          const immediateCallParams = {
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
          };

          await webrtc.startCall(immediateCallParams, stream);
        } catch (err: any) {
          console.error("Failed to start call:", err);
          setActiveCall(null);
        }
      })();
    },
    [user, webrtc.getUserMedia, webrtc.startCall]
  );

  

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    stopRingtone();
    setActiveCall(incomingCall);
    setIncomingCall(null);

    try {
      
      const stream = await webrtc.getUserMedia(incomingCall.callType);
      
      await webrtc.answerCall(incomingCall, stream);
    } catch (err: any) {
      console.error("Failed to answer call:", err);
    }
  }, [incomingCall, webrtc.getUserMedia, webrtc.answerCall]);

  

  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

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
        body: `Missed an ${callDocToReject.callType} call from ${senderName}`,
        type: "messages",
        notificationType: "messages",
        isRead: false,
        read: false,
        createdAt: serverTimestamp(),
        targetUrl: `/messages/${callDocToReject.callerId}`,
        profileUrl: `/messages/${callDocToReject.callerId}`
      });
    } catch (err) {
      console.warn("Failed to write missed call notification:", err);
    }
  }, [incomingCall, logCallOutcome]);

  const hangUp = useCallback(async () => {
    if (activeCall) {
      const callDocToLog = activeCall;
      const duration = webrtc.callDuration;
      const finalStatus = duration > 0 ? "ended" : (activeCall.callerId === user?.uid ? "cancelled" : "no-answer");
      await logCallOutcome(callDocToLog, duration, finalStatus);
    }
    
    playEndCallSound();
    await webrtc.endCall();
    setActiveCall(null);
  }, [activeCall, webrtc, user?.uid, logCallOutcome]);

  

  const dismissError = useCallback(() => {
    webrtc.endCall();
    setActiveCall(null);
  }, [webrtc.endCall]);

  

  const toggleVideo = useCallback(() => {
    const nextVideoOff = !webrtc.isVideoOff;
    webrtc.toggleVideo();
    if (activeCall?.id && user?.uid) {
      const role = activeCall.callerId === user.uid ? "caller" : "callee";
      updateCallVideoState(activeCall.id, role, nextVideoOff);
    }
  }, [webrtc, activeCall, user?.uid]);

  const value: CallContextValue = {
    callState: webrtc.callState,
    activeCall,
    incomingCall,
    localStream: webrtc.localStream,
    remoteStream: webrtc.remoteStream,
    isMuted: webrtc.isMuted,
    isVideoOff: webrtc.isVideoOff,
    isRemoteVideoOff: webrtc.isRemoteVideoOff,
    callDuration: webrtc.callDuration,
    errorMessage: webrtc.errorMessage,
    currentUser: user,
    initiateCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute: webrtc.toggleMute,
    toggleVideo,
    switchCamera: webrtc.switchCamera,
    dismissError,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}



export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return ctx;
}
