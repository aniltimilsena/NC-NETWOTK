import { useState, useRef, useCallback, useEffect } from "react";
import { logger } from "../utils/logger";
import {
  ICE_SERVERS,
  createCall,
  setCallAnswer,
  addIceCandidate,
  updateCallStatus,
  subscribeToCall,
  subscribeToIceCandidates,
  cleanupCall,
  type CallDoc,
} from "../services";

export type CallState =
  | "idle"
  | "requesting-media"
  | "creating-offer"
  | "calling"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

interface UseWebRTCReturn {
  callState: CallState;
  callId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isRemoteVideoOff: boolean;
  callDuration: number;
  errorMessage: string;
  startCall: (params: StartCallParams, preAcquiredStream?: MediaStream) => Promise<void>;
  answerCall: (callDoc: CallDoc, preAcquiredStream?: MediaStream) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
  resetToIdle: () => void;
  getUserMedia: (callType: "audio" | "video") => Promise<MediaStream>;
}

interface StartCallParams {
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
}

export function useWebRTC(): UseWebRTCReturn {
  const [callState, setCallState] = useState<CallState>("idle");
  const [callId, setCallId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const roleRef = useRef<"caller" | "callee">("caller");
  const unsubsRef = useRef<Array<() => void>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(async () => {
    logger.log("[WebRTC Cleanup] Cleaning up WebRTC connection and timers...");
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (noAnswerTimerRef.current) {
      clearTimeout(noAnswerTimerRef.current);
      noAnswerTimerRef.current = null;
    }

    unsubsRef.current.forEach((unsub) => unsub());
    unsubsRef.current = [];

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        t.stop();
        logger.log("[WebRTC Cleanup] Stopped local track:", t.kind, t.id);
      });
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallId(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsRemoteVideoOff(false);
    setErrorMessage("");
    remoteCandidatesQueueRef.current = [];
  }, []);

  const getUserMedia = useCallback(
    async (callType: "audio" | "video"): Promise<MediaStream> => {
      setCallState("requesting-media");

      if (typeof window !== "undefined") {
        logger.log("[WebRTC getUserMedia] Secure context status:", window.isSecureContext);
        if (!window.isSecureContext) {
          logger.warn("[WebRTC getUserMedia] Not running in a secure context. Media permissions may fail.");
        }
      }

      const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const constraints: MediaStreamConstraints = {
        audio: isMobile
          ? true
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
        video:
          callType === "video"
            ? isMobile
              ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
              : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
      };

      try {
        logger.log("[WebRTC getUserMedia] Requesting media stream with constraints:", constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        stream.getTracks().forEach((track) => {
          track.enabled = true;
          logger.log("[WebRTC getUserMedia] Acquired local track:", track.kind, "id:", track.id, "enabled:", track.enabled);
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        localStorage.setItem("nc_perm_media", "granted");
        return stream;
      } catch (err: any) {
        logger.warn("[WebRTC getUserMedia] Advanced constraints failed. Trying basic fallback. Error:", err);
        
        try {
          const fallbackConstraints: MediaStreamConstraints = {
            audio: true,
            video: callType === "video" ? true : false,
          };
          logger.log("[WebRTC getUserMedia] Requesting fallback media stream:", fallbackConstraints);
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          
          stream.getTracks().forEach((track) => {
            track.enabled = true;
            logger.log("[WebRTC getUserMedia] Acquired fallback local track:", track.kind, "id:", track.id);
          });
          localStreamRef.current = stream;
          setLocalStream(stream);
          localStorage.setItem("nc_perm_media", "granted");
          return stream;
        } catch (fallbackErr: any) {
          console.error("[WebRTC getUserMedia] Fallback failed:", fallbackErr);
          if (fallbackErr.name === "NotAllowedError") {
            localStorage.setItem("nc_perm_media", "denied");
          }
          const msg =
            fallbackErr.name === "NotAllowedError"
              ? "Camera/microphone permission denied. Please allow access in your browser settings."
              : fallbackErr.name === "NotFoundError"
              ? "No camera or microphone found on this device."
              : `Media error: ${fallbackErr.message}`;
          setErrorMessage(msg);
          setCallState("error");
          throw fallbackErr;
        }
      }
    },
    []
  );

  const flushRemoteCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      logger.log("[WebRTC ICE Queue] Cannot flush candidates yet; remoteDescription not set.");
      return;
    }
    logger.log(`[WebRTC ICE Queue] Flushing ${remoteCandidatesQueueRef.current.length} queued ICE candidates...`);
    while (remoteCandidatesQueueRef.current.length > 0) {
      const cand = remoteCandidatesQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
          logger.log("[WebRTC ICE Queue] Added queued candidate successfully:", cand.candidate?.slice(0, 40));
        } catch (err) {
          console.error("[WebRTC ICE Queue] Error adding queued ICE candidate:", err);
        }
      }
    }
  }, []);

  const createPeerConnection = useCallback(
    (stream: MediaStream, callType: "audio" | "video"): RTCPeerConnection => {
      logger.log("[WebRTC PC] Creating new RTCPeerConnection with ICE servers:", ICE_SERVERS);
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add transceivers explicitly to guarantee bidirectional sendrecv SDP negotiation
      try {
        pc.addTransceiver("audio", { direction: "sendrecv" });
        if (callType === "video") {
          pc.addTransceiver("video", { direction: "sendrecv" });
        }
        logger.log("[WebRTC PC] Transceivers added with direction 'sendrecv'");
      } catch (tErr) {
        logger.warn("[WebRTC PC] addTransceiver warning:", tErr);
      }

      // Add local media tracks to peer connection
      stream.getTracks().forEach((track) => {
        track.enabled = true;
        const existingSender = pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch((err) => {
            logger.warn("[WebRTC PC] replaceTrack error:", err);
          });
        } else {
          pc.addTrack(track, stream);
        }
        logger.log("[WebRTC PC] Added local track to peer connection:", track.kind, "id:", track.id, "enabled:", track.enabled);
      });

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        logger.log("[WebRTC Track] Received remote track event:", {
          kind: event.track.kind,
          id: event.track.id,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          muted: event.track.muted,
          streamId: event.streams[0]?.id,
        });

        if (event.track) {
          event.track.enabled = true;
        }

        if (event.track.kind === "video") {
          setIsRemoteVideoOff(false);
          event.track.onmute = () => {
            logger.log("[WebRTC Track] Remote video track muted event");
            if (event.track.readyState === "ended") {
              setIsRemoteVideoOff(true);
            }
          };
          event.track.onunmute = () => {
            logger.log("[WebRTC Track] Remote video track onunmuted (active video stream)");
            setIsRemoteVideoOff(false);
          };
          event.track.onended = () => {
            logger.log("[WebRTC Track] Remote video track ended");
            setIsRemoteVideoOff(true);
          };
        }

        // Maintain a persistent MediaStream object
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        const rStream = remoteStreamRef.current;
        if (!rStream.getTracks().some((t) => t.id === event.track.id)) {
          rStream.addTrack(event.track);
          logger.log("[WebRTC Track] Added track to persistent remote stream. Total tracks:", rStream.getTracks().length);
        }

        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!rStream.getTracks().some((t) => t.id === track.id)) {
              track.enabled = true;
              rStream.addTrack(track);
              logger.log("[WebRTC Track] Added track from event.streams[0]:", track.kind, "id:", track.id);
            }
          });
        }

        setRemoteStream(new MediaStream(rStream.getTracks()));
      };

      // Handle ICE state changes
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        logger.log("[WebRTC ICE State] Change ->", state);

        if (state === "connected" || state === "completed") {
          setCallState("connected");
          callStateRef.current = "connected";
          
          if (!timerRef.current) {
            const start = Date.now();
            timerRef.current = setInterval(() => {
              setCallDuration(Math.floor((Date.now() - start) / 1000));
            }, 1000);
          }
        } else if (state === "failed") {
          logger.warn("[WebRTC ICE State] ICE connection failed. Attempting restart if supported.");
          setErrorMessage("Connection failed. Please try again.");
          setCallState("error");
        } else if (state === "disconnected") {
          setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" && pcRef.current === pc) {
              setErrorMessage("Call disconnected due to network issues.");
              setCallState("error");
            }
          }, 5000);
        }
      };

      pc.onsignalingstatechange = () => {
        logger.log("[WebRTC Signaling State] Change ->", pc.signalingState);
        if (pc.signalingState === "stable") {
          flushRemoteCandidates(pc);
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [flushRemoteCandidates]
  );

  const startCall = useCallback(
    async (params: StartCallParams, preAcquiredStream?: MediaStream) => {
      try {
        logger.log("[WebRTC startCall] Initiating call to:", params.calleeId, "callType:", params.callType);
        setCallState("calling");
        callStateRef.current = "calling";

        const stream = preAcquiredStream || (await getUserMedia(params.callType));
        const pc = createPeerConnection(stream, params.callType);

        const candidateQueue: RTCIceCandidateInit[] = [];
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const cand = event.candidate.toJSON();
            logger.log("[WebRTC ICE Candidate] Local caller candidate generated:", cand.candidate?.slice(0, 30));
            if (callIdRef.current) {
              addIceCandidate(callIdRef.current, "caller", cand);
            } else {
              candidateQueue.push(cand);
            }
          }
        };

        const offer = await pc.createOffer();
        logger.log("[WebRTC Offer] Created SDP offer:", offer.sdp?.slice(0, 100) + "...");
        await pc.setLocalDescription(offer);

        const { callId, error } = await createCall({
          ...params,
          offer: { type: offer.type!, sdp: offer.sdp! },
        });

        if (error || !callId) {
          throw new Error(error || "Failed to create call");
        }

        if ((callStateRef.current as string) === "ended") {
          logger.log("[WebRTC startCall] Call ended during setup. Cleaning up created Firestore doc:", callId);
          await updateCallStatus(callId, "ended");
          cleanupCall(callId);
          return;
        }

        callIdRef.current = callId;
        setCallId(callId);
        roleRef.current = "caller";
        setCallState("calling");
        callStateRef.current = "calling";

        logger.log(`[WebRTC startCall] Created Firestore call ${callId}. Flushing ${candidateQueue.length} queued caller ICE candidates...`);
        for (const cand of candidateQueue) {
          addIceCandidate(callId, "caller", cand);
        }

        // Listen for call document updates (answer from callee)
        const unsubCall = subscribeToCall(callId, async (callDoc: any) => {
          if (!callDoc || callDoc.status === "rejected" || callDoc.status === "no-answer" || callDoc.status === "ended") {
            logger.log("[WebRTC startCall] Call status changed to:", callDoc?.status || "ended");
            setCallState("ended");
            await cleanup();
            return;
          }

          if (callDoc.answer && pc.signalingState !== "stable") {
            try {
              logger.log("[WebRTC Answer] Setting remote description answer from callee...");
              await pc.setRemoteDescription(new RTCSessionDescription(callDoc.answer));
              setCallState("connecting");
              callStateRef.current = "connecting";
              await flushRemoteCandidates(pc);
            } catch (err) {
              console.error("[WebRTC Answer] setRemoteDescription error:", err);
            }
          }
        });
        unsubsRef.current.push(unsubCall);

        // Listen for ICE candidates from callee
        const unsubICE = subscribeToIceCandidates(
          callId,
          "caller",
          async (candidate: any) => {
            try {
              logger.log("[WebRTC ICE] Received callee ICE candidate:", candidate.candidate?.slice(0, 30));
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                remoteCandidatesQueueRef.current.push(candidate);
              }
            } catch (err) {
              console.error("[WebRTC ICE] addIceCandidate error:", err);
            }
          }
        );
        unsubsRef.current.push(unsubICE);

        noAnswerTimerRef.current = setTimeout(async () => {
          if (callStateRef.current === "calling") {
            logger.log("[WebRTC Timer] Call timed out (no answer after 30s).");
            await updateCallStatus(callId, "no-answer");
            setCallState("ended");
            callStateRef.current = "ended";
            await cleanup();
          }
        }, 30000);
      } catch (err: any) {
        console.error("[WebRTC startCall] Error:", err);
        if (callStateRef.current !== "ended") {
          setErrorMessage((prev) => prev || err.message || "Failed to start call");
          setCallState("error");
        }
      }
    },
    [getUserMedia, createPeerConnection, cleanup, flushRemoteCandidates]
  );

  const answerCall = useCallback(
    async (callDoc: CallDoc, preAcquiredStream?: MediaStream) => {
      try {
        logger.log("[WebRTC answerCall] Answering call:", callDoc.id, "callType:", callDoc.callType);
        const stream = preAcquiredStream || (await getUserMedia(callDoc.callType));
        const pc = createPeerConnection(stream, callDoc.callType);

        callIdRef.current = callDoc.id;
        setCallId(callDoc.id);
        roleRef.current = "callee";
        setCallState("connecting");
        callStateRef.current = "connecting";

        if (callDoc.offer) {
          logger.log("[WebRTC Offer] Setting remote description offer from caller...");
          await pc.setRemoteDescription(new RTCSessionDescription(callDoc.offer));
          await flushRemoteCandidates(pc);
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const cand = event.candidate.toJSON();
            logger.log("[WebRTC ICE Candidate] Local callee candidate generated:", cand.candidate?.slice(0, 30));
            addIceCandidate(callDoc.id, "callee", cand);
          }
        };

        const answer = await pc.createAnswer();
        logger.log("[WebRTC Answer] Created SDP answer:", answer.sdp?.slice(0, 100) + "...");
        await pc.setLocalDescription(answer);

        await setCallAnswer(callDoc.id, {
          type: answer.type!,
          sdp: answer.sdp!,
        });

        // Listen for caller ICE candidates
        const unsubICE = subscribeToIceCandidates(
          callDoc.id,
          "callee",
          async (candidate: any) => {
            try {
              logger.log("[WebRTC ICE] Received caller ICE candidate:", candidate.candidate?.slice(0, 30));
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                remoteCandidatesQueueRef.current.push(candidate);
              }
            } catch (err) {
              console.error("[WebRTC ICE] addIceCandidate error:", err);
            }
          }
        );
        unsubsRef.current.push(unsubICE);

        const unsubCall = subscribeToCall(callDoc.id, async (docData: any) => {
          if (!docData || docData.status === "ended") {
            logger.log("[WebRTC answerCall] Call ended by caller.");
            setCallState("ended");
            await cleanup();
          }
        });
        unsubsRef.current.push(unsubCall);
      } catch (err: any) {
        console.error("[WebRTC answerCall] Error:", err);
        if (callStateRef.current !== "error") {
          setErrorMessage((prev) => prev || err.message || "Failed to answer call");
          setCallState("error");
        }
      }
    },
    [getUserMedia, createPeerConnection, cleanup, flushRemoteCandidates]
  );

  const endCall = useCallback(async () => {
    const callId = callIdRef.current;
    logger.log("[WebRTC endCall] Ending call:", callId);
    if (callId) {
      await updateCallStatus(callId, "ended");
      setTimeout(() => cleanupCall(callId), 5000);
    }
    setCallState("ended");
    await cleanup();
    callIdRef.current = null;
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const newMute = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !newMute;
        logger.log("[WebRTC toggleMute] Audio track enabled ->", track.enabled);
      });
      setIsMuted(newMute);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const newVideoOff = !isVideoOff;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOff;
        logger.log("[WebRTC toggleVideo] Video track enabled ->", track.enabled);
      });
      setIsVideoOff(newVideoOff);
    }
  }, [isVideoOff]);

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || !pcRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const currentFacing = videoTrack.getSettings().facingMode;
    const newFacing = currentFacing === "user" ? "environment" : "user";
    logger.log("[WebRTC switchCamera] Switching camera from", currentFacing, "to", newFacing);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newTrack = newStream.getVideoTracks()[0];

      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newTrack);
        logger.log("[WebRTC switchCamera] Replaced video track on RTCRtpSender successfully.");
      }

      videoTrack.stop();
      localStreamRef.current.removeTrack(videoTrack);
      localStreamRef.current.addTrack(newTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) {
      console.error("[WebRTC switchCamera] Error:", err);
    }
  }, []);

  const resetToIdle = useCallback(() => {
    setCallState("idle");
    callStateRef.current = "idle";
  }, []);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    callState,
    callId,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isRemoteVideoOff,
    callDuration,
    errorMessage,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
    resetToIdle,
    getUserMedia,
  };
}
