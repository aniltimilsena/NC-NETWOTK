import { useState, useRef, useCallback, useEffect } from "react";
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
  type CallStatus,
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
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  callDuration: number;
  errorMessage: string;
  startCall: (params: StartCallParams) => Promise<void>;
  answerCall: (callDoc: CallDoc) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  switchCamera: () => Promise<void>;
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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
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
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setErrorMessage("");
    remoteCandidatesQueueRef.current = [];
  }, [localStream]);

  // ─── Get user media ──────────────────────────────────────────────────────

  const getUserMedia = useCallback(
    async (callType: "audio" | "video"): Promise<MediaStream> => {
      setCallState("requesting-media");
      try {
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
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        return stream;
      } catch (err: any) {
        console.error("[WebRTC] getUserMedia error:", err);
        const msg =
          err.name === "NotAllowedError"
            ? "Camera/microphone permission denied. Please allow access in your browser settings."
            : err.name === "NotFoundError"
            ? "No camera or microphone found on this device."
            : `Media error: ${err.message}`;
        setErrorMessage(msg);
        setCallState("error");
        throw err;
      }
    },
    []
  );

  // ─── Create peer connection ──────────────────────────────────────────────

  const createPeerConnection = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks to connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Listen for remote tracks
      const remote = new MediaStream();
      setRemoteStream(remote);

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            remote.addTrack(track);
          });
        } else if (event.track) {
          remote.addTrack(event.track);
        }
        setRemoteStream(new MediaStream(remote.getTracks()));
      };

      // Connection state monitoring
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("[WebRTC] ICE state:", state);

        if (state === "connected" || state === "completed") {
          setCallState("connected");
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
    async (params: StartCallParams) => {
      try {
        const stream = await getUserMedia(params.callType);
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

        callIdRef.current = callId;
        roleRef.current = "caller";
        setCallState("calling");

        // Flush queued local candidates
        for (const cand of candidateQueue) {
          addIceCandidate(callId, "caller", cand);
        }

        // Listen for answer from callee
        const unsubCall = subscribeToCall(callId, async (callDoc) => {
          if (!callDoc) return;

          if (callDoc.status === "rejected" || callDoc.status === "no-answer" || callDoc.status === "ended") {
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
          if (callState === "calling") {
            await updateCallStatus(callId, "no-answer");
            setCallState("ended");
            await cleanup();
          }
        }, 30000);
      } catch (err: any) {
        console.error("[WebRTC] startCall error:", err);
        if (callState !== "error") {
          setErrorMessage(err.message || "Failed to start call");
          setCallState("error");
        }
      }
    },
    [getUserMedia, createPeerConnection, cleanup, callState]
  );

  // ─── Answer call (callee) ────────────────────────────────────────────────

  const answerCall = useCallback(
    async (callDoc: CallDoc) => {
      try {
        const stream = await getUserMedia(callDoc.callType);
        const pc = createPeerConnection(stream);

        callIdRef.current = callDoc.id;
        roleRef.current = "callee";
        setCallState("connecting");

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
          if (!doc) return;
          if (doc.status === "ended") {
            setCallState("ended");
            await cleanup();
          }
        });
        unsubsRef.current.push(unsubCall);
      } catch (err: any) {
        console.error("[WebRTC] answerCall error:", err);
        if (callState !== "error") {
          setErrorMessage(err.message || "Failed to answer call");
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    errorMessage,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  };
}
