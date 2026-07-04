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
} from "../services/call";

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Hook ───────────────────────────────────────────────────────────────────

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

  // ─── Cleanup everything ──────────────────────────────────────────────────

  const cleanup = useCallback(async () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (noAnswerTimerRef.current) {
      clearTimeout(noAnswerTimerRef.current);
      noAnswerTimerRef.current = null;
    }

    // Unsubscribe all Firestore listeners
    unsubsRef.current.forEach((unsub) => unsub());
    unsubsRef.current = [];

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop local media tracks
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallId(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsRemoteVideoOff(false);
    setErrorMessage("");
    remoteCandidatesQueueRef.current = [];
  }, [localStream]);

  // ─── Get user media ──────────────────────────────────────────────────────

  const getUserMedia = useCallback(
    async (callType: "audio" | "video"): Promise<MediaStream> => {
      setCallState("requesting-media");

      if (typeof window !== "undefined") {
        logger.log("[WebRTC] Secure context status:", window.isSecureContext);
        if (!window.isSecureContext) {
          logger.warn("[WebRTC] Not running in a secure context. getUserMedia will likely fail.");
        }
      }

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          callType === "video"
            ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
      };

      try {
        logger.log("[WebRTC] Requesting media stream with constraints:", constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Explicitly verify and enable all acquired local tracks
        stream.getTracks().forEach((track) => {
          track.enabled = true;
          logger.log("[WebRTC] Local track enabled:", track.kind, "id:", track.id);
        });
        setLocalStream(stream);
        localStorage.setItem("nc_perm_media", "granted");
        return stream;
      } catch (err: any) {
        logger.warn("[WebRTC] getUserMedia with advanced constraints failed. Trying basic fallback constraints. Error:", err);
        
        try {
          const fallbackConstraints: MediaStreamConstraints = {
            audio: true,
            video: callType === "video" ? true : false,
          };
          logger.log("[WebRTC] Requesting fallback media stream with constraints:", fallbackConstraints);
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          // Explicitly verify and enable all acquired local tracks
          stream.getTracks().forEach((track) => {
            track.enabled = true;
            logger.log("[WebRTC] Local fallback track enabled:", track.kind, "id:", track.id);
          });
          setLocalStream(stream);
          localStorage.setItem("nc_perm_media", "granted");
          return stream;
        } catch (fallbackErr: any) {
          console.error("[WebRTC] getUserMedia fallback failed. Error:", fallbackErr);
          
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

  // ─── Create peer connection ──────────────────────────────────────────────

  const createPeerConnection = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Ensure all local tracks are enabled and add them to connection
      stream.getTracks().forEach((track) => {
        if (!track.enabled) {
          track.enabled = true;
        }
        pc.addTrack(track, stream);
        logger.log("[WebRTC] Added local track to peer connection:", track.kind, "enabled:", track.enabled);
      });

      // Listen for remote tracks and bind directly to the remote stream
      pc.ontrack = (event) => {
        logger.log("[WebRTC] Received remote track:", event.track.kind);
        if (event.track) {
          event.track.enabled = true;
        }

        if (event.track.kind === "video") {
          setIsRemoteVideoOff(!event.track.enabled || event.track.muted);
          event.track.onmute = () => {
            setIsRemoteVideoOff(true);
            logger.log("[WebRTC] Remote video track muted (camera turned off)");
          };
          event.track.onunmute = () => {
            setIsRemoteVideoOff(false);
            logger.log("[WebRTC] Remote video track onunmuted (camera turned on)");
          };
          event.track.onended = () => {
            setIsRemoteVideoOff(true);
          };
        }

        // Use a state accumulator to merge all incoming remote tracks into a single stream.
        // This resolves issues where tracks are sent separately or stream arrays are empty.
        setRemoteStream((prevStream) => {
          const stream = prevStream || new MediaStream();
          
          if (!stream.getTracks().some(t => t.id === event.track.id)) {
            stream.addTrack(event.track);
            logger.log("[WebRTC] Added remote track to stream:", event.track.kind, "id:", event.track.id);
          }
          
          if (event.streams && event.streams[0]) {
            event.streams[0].getTracks().forEach((track) => {
              if (!stream.getTracks().some(t => t.id === track.id)) {
                track.enabled = true;
                stream.addTrack(track);
                logger.log("[WebRTC] Added additional track from event stream:", track.kind, "id:", track.id);
              }
            });
          }
          
          return new MediaStream(stream.getTracks());
        });
      };

      // Connection state monitoring
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        logger.log("[WebRTC] ICE state:", state);

        if (state === "connected" || state === "completed") {
          setCallState("connected");
          callStateRef.current = "connected";
          // Start duration timer
          if (!timerRef.current) {
            const start = Date.now();
            timerRef.current = setInterval(() => {
              setCallDuration(Math.floor((Date.now() - start) / 1000));
            }, 1000);
          }
        } else if (state === "failed") {
          setErrorMessage("Connection failed. Please try again.");
          setCallState("error");
        } else if (state === "disconnected") {
          // Give it a moment to reconnect before erroring
          setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" && pcRef.current === pc) {
              setErrorMessage("Call disconnected due to network issues.");
              setCallState("error");
            }
          }, 5000);
        }
      };

      pcRef.current = pc;
      return pc;
    },
    []
  );

  // ─── Start call (caller) ─────────────────────────────────────────────────

  const startCall = useCallback(
    async (params: StartCallParams, preAcquiredStream?: MediaStream) => {
      try {
        const stream = preAcquiredStream || await getUserMedia(params.callType);
        const pc = createPeerConnection(stream);

        setCallState("creating-offer");

        const candidateQueue: RTCIceCandidateInit[] = [];
        // ICE candidate handler — set BEFORE setLocalDescription to catch early candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const cand = event.candidate.toJSON();
            if (callIdRef.current) {
              addIceCandidate(callIdRef.current, "caller", cand);
            } else {
              candidateQueue.push(cand);
            }
          }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Store call in Firestore
        const { callId, error } = await createCall({
          ...params,
          offer: { type: offer.type!, sdp: offer.sdp! },
        });

        if (error || !callId) {
          throw new Error(error || "Failed to create call");
        }

        if (callStateRef.current === "ended") {
          logger.log("[WebRTC] Call was ended during setup. Cleaning up created Firestore call:", callId);
          await updateCallStatus(callId, "ended");
          cleanupCall(callId);
          return;
        }

        callIdRef.current = callId;
        setCallId(callId);
        roleRef.current = "caller";
        setCallState("calling");
        callStateRef.current = "calling";

        // Flush queued local candidates
        for (const cand of candidateQueue) {
          addIceCandidate(callId, "caller", cand);
        }

        // Listen for answer from callee
        const unsubCall = subscribeToCall(callId, async (callDoc) => {
          if (!callDoc || callDoc.status === "rejected" || callDoc.status === "no-answer" || callDoc.status === "ended") {
            setCallState("ended");
            await cleanup();
            return;
          }

          if (callDoc.answer && pc.signalingState !== "stable") {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(callDoc.answer)
              );
              setCallState("connecting");
              callStateRef.current = "connecting";

              // Process queued remote candidates
              while (remoteCandidatesQueueRef.current.length > 0) {
                const cand = remoteCandidatesQueueRef.current.shift();
                if (cand) {
                  await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(err => {
                    console.error("[WebRTC] failed to add queued candidate:", err);
                  });
                }
              }
            } catch (err) {
              console.error("[WebRTC] setRemoteDescription error:", err);
            }
          }
        });
        unsubsRef.current.push(unsubCall);

        // Listen for callee ICE candidates
        const unsubICE = subscribeToIceCandidates(
          callId,
          "caller",
          async (candidate) => {
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                remoteCandidatesQueueRef.current.push(candidate);
              }
            } catch (err) {
              console.error("[WebRTC] addIceCandidate error:", err);
            }
          }
        );
        unsubsRef.current.push(unsubICE);

        // No-answer timeout (30 seconds)
        noAnswerTimerRef.current = setTimeout(async () => {
          // Use ref instead of stale closure to get current call state
          if (callStateRef.current === "calling") {
            await updateCallStatus(callId, "no-answer");
            setCallState("ended");
            callStateRef.current = "ended";
            await cleanup();
          }
        }, 30000);
      } catch (err: any) {
        console.error("[WebRTC] startCall error:", err);
        if (callStateRef.current !== "ended") {
          setErrorMessage((prev) => prev || err.message || "Failed to start call");
          setCallState("error");
        }
      }
    },
    [getUserMedia, createPeerConnection, cleanup]
  );

  // ─── Answer call (callee) ────────────────────────────────────────────────

  const answerCall = useCallback(
    async (callDoc: CallDoc, preAcquiredStream?: MediaStream) => {
      try {
        const stream = preAcquiredStream || await getUserMedia(callDoc.callType);
        const pc = createPeerConnection(stream);

        callIdRef.current = callDoc.id;
        setCallId(callDoc.id);
        roleRef.current = "callee";
        setCallState("connecting");
        callStateRef.current = "connecting";

        // Set the remote description (offer)
        if (callDoc.offer) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(callDoc.offer)
          );

          // Process queued remote candidates
          while (remoteCandidatesQueueRef.current.length > 0) {
            const cand = remoteCandidatesQueueRef.current.shift();
            if (cand) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(err => {
                console.error("[WebRTC] failed to add queued candidate:", err);
              });
            }
          }
        }

        // ICE candidate handler — set BEFORE setLocalDescription to catch early candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addIceCandidate(callDoc.id, "callee", event.candidate.toJSON());
          }
        };

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Store answer in Firestore
        await setCallAnswer(callDoc.id, {
          type: answer.type!,
          sdp: answer.sdp!,
        });

        // Listen for caller ICE candidates
        const unsubICE = subscribeToIceCandidates(
          callDoc.id,
          "callee",
          async (candidate) => {
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                remoteCandidatesQueueRef.current.push(candidate);
              }
            } catch (err) {
              console.error("[WebRTC] addIceCandidate error:", err);
            }
          }
        );
        unsubsRef.current.push(unsubICE);

        // Monitor call status for remote hangup
        const unsubCall = subscribeToCall(callDoc.id, async (doc) => {
          if (!doc || doc.status === "ended") {
            setCallState("ended");
            await cleanup();
          }
        });
        unsubsRef.current.push(unsubCall);
      } catch (err: any) {
        console.error("[WebRTC] answerCall error:", err);
        if (callState !== "error") {
          setErrorMessage((prev) => prev || err.message || "Failed to answer call");
          setCallState("error");
        }
      }
    },
    [getUserMedia, createPeerConnection, cleanup, callState]
  );

  // ─── End call ────────────────────────────────────────────────────────────

  const endCall = useCallback(async () => {
    const callId = callIdRef.current;
    if (callId) {
      await updateCallStatus(callId, "ended");
      // Clean up Firestore after a delay to allow the other peer to see the status
      setTimeout(() => cleanupCall(callId), 5000);
    }
    setCallState("ended");
    await cleanup();
    callIdRef.current = null;
  }, [cleanup]);

  // ─── Toggle mute ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, [localStream]);

  // ─── Toggle video ────────────────────────────────────────────────────────

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  }, [localStream]);

  // ─── Switch camera (mobile) ──────────────────────────────────────────────

  const switchCamera = useCallback(async () => {
    if (!localStream || !pcRef.current) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const currentFacing = videoTrack.getSettings().facingMode;
    const newFacing = currentFacing === "user" ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
      });
      const newTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      // Replace track in local stream
      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newTrack);
      setLocalStream(new MediaStream(localStream.getTracks()));
    } catch (err) {
      console.error("[WebRTC] switchCamera error:", err);
    }
  }, [localStream]);

  const resetToIdle = useCallback(() => {
    setCallState("idle");
    callStateRef.current = "idle";
  }, []);

  // Keep callStateRef updated to avoid stale closure issues
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Cleanup on unmount
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
