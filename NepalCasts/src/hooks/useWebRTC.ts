import { useState, useRef, useCallback, useEffect } from "react";
import { logger } from "../utils/logger";
import {
  ICE_SERVERS,
  createCallPending,
  setCallOffer,
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
  activeCallDoc: CallDoc | null;
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
  const [activeCallDoc, setActiveCallDoc] = useState<CallDoc | null>(null);
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
    logger.log("[WebRTC Cleanup] Performing complete WebRTC resources and subscription cleanup");
    
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
      logger.log("[WebRTC Cleanup] PeerConnection closed and nullified");
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        t.stop();
        logger.log("[WebRTC Cleanup] Local media track stopped:", t.kind, t.id);
      });
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallId(null);
    setActiveCallDoc(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsRemoteVideoOff(false);
    setErrorMessage("");
    remoteCandidatesQueueRef.current = [];
  }, []);

  const getUserMedia = useCallback(
    async (callType: "audio" | "video"): Promise<MediaStream> => {
      const tStart = performance.now();
      setCallState("requesting-media");

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
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        localStorage.setItem("nc_perm_media", "granted");
        logger.log(`[PERF TIMING] Camera/mic acquired in ${(performance.now() - tStart).toFixed(1)}ms. Tracks:`, stream.getTracks().map(t => t.kind));
        return stream;
      } catch (err: any) {
        logger.warn("[WebRTC getUserMedia] Advanced constraints failed. Trying basic fallback. Error:", err);
        try {
          const fallbackConstraints: MediaStreamConstraints = {
            audio: true,
            video: callType === "video" ? true : false,
          };
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          
          stream.getTracks().forEach((track) => {
            track.enabled = true;
          });
          localStreamRef.current = stream;
          setLocalStream(stream);
          localStorage.setItem("nc_perm_media", "granted");
          logger.log(`[PERF TIMING] Fallback camera/mic acquired in ${(performance.now() - tStart).toFixed(1)}ms.`);
          return stream;
        } catch (fallbackErr: any) {
          console.error("[WebRTC getUserMedia] Fallback failed:", fallbackErr);
          if (fallbackErr.name === "NotAllowedError") {
            localStorage.setItem("nc_perm_media", "denied");
          }
          const msg =
            fallbackErr.name === "NotAllowedError"
              ? "Camera/microphone permission denied. Please allow access in browser settings."
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
    if (!pc.remoteDescription || !pc.remoteDescription.type) return;
    logger.log(`[WebRTC ICE Queue] Flushing ${remoteCandidatesQueueRef.current.length} queued ICE candidates...`);
    while (remoteCandidatesQueueRef.current.length > 0) {
      const cand = remoteCandidatesQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
          logger.log("[WebRTC ICE Queue] Added queued candidate successfully");
        } catch (err) {
          console.error("[WebRTC ICE Queue] Error adding candidate:", err);
        }
      }
    }
  }, []);

  const createPeerConnection = useCallback(
    (stream: MediaStream, callType: "audio" | "video"): RTCPeerConnection => {
      logger.log("[WebRTC PC] Initializing RTCPeerConnection");
      const pc = new RTCPeerConnection(ICE_SERVERS);

      try {
        pc.addTransceiver("audio", { direction: "sendrecv" });
        if (callType === "video") {
          pc.addTransceiver("video", { direction: "sendrecv" });
        }
      } catch (tErr) {
        logger.warn("[WebRTC PC] addTransceiver warning:", tErr);
      }

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
      });

      pc.ontrack = (event) => {
        logger.log("[WebRTC Track] Received remote track:", event.track.kind, "id:", event.track.id, "enabled:", event.track.enabled);

        if (event.track) {
          event.track.enabled = true;
        }

        if (event.track.kind === "video") {
          setIsRemoteVideoOff(false);
          event.track.onmute = () => {
            if (event.track.readyState === "ended") {
              setIsRemoteVideoOff(true);
            }
          };
          event.track.onunmute = () => {
            setIsRemoteVideoOff(false);
          };
          event.track.onended = () => {
            setIsRemoteVideoOff(true);
          };
        }

        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        const rStream = remoteStreamRef.current;
        if (!rStream.getTracks().some((t) => t.id === event.track.id)) {
          rStream.addTrack(event.track);
        }

        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!rStream.getTracks().some((t) => t.id === track.id)) {
              track.enabled = true;
              rStream.addTrack(track);
            }
          });
        }

        setRemoteStream(new MediaStream(rStream.getTracks()));
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        logger.log("[WebRTC ICE State] ->", state);

        if (state === "connected" || state === "completed") {
          const tConnected = performance.now();
          logger.log(`[PERF TIMING 7] T6: WebRTC ICE Connected (${tConnected.toFixed(1)}ms)`);
          setCallState("connected");
          callStateRef.current = "connected";
          
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
          setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" && pcRef.current === pc) {
              setErrorMessage("Call disconnected due to network issues.");
              setCallState("error");
            }
          }, 5000);
        }
      };

      pc.onsignalingstatechange = () => {
        logger.log("[WebRTC Signaling State] ->", pc.signalingState);
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
      const t0 = performance.now();
      logger.log(`[PERF TIMING 1] T0: Call button pressed / startCall initiated`);

      try {
        setCallState("calling");
        callStateRef.current = "calling";

        // STEP 1: Immediately create lightweight pending call doc in Firestore (< 200ms)
        const { callId, error } = await createCallPending({
          ...params
        });

        if (error || !callId) {
          throw new Error(error || "Failed to create pending call");
        }

        callIdRef.current = callId;
        setCallId(callId);
        roleRef.current = "caller";

        // STEP 2: Initialize getUserMedia & SDP offer generation in parallel
        const streamPromise = preAcquiredStream ? Promise.resolve(preAcquiredStream) : getUserMedia(params.callType);

        (async () => {
          try {
            const stream = await streamPromise;
            const pc = createPeerConnection(stream, params.callType);

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                const cand = event.candidate.toJSON();
                if (callIdRef.current) {
                  addIceCandidate(callIdRef.current, "caller", cand);
                }
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if ((callStateRef.current as string) === "ended") {
              logger.log("[WebRTC startCall] Call ended during setup. Cleaning up created Firestore doc:", callId);
              await updateCallStatus(callId, "ended");
              cleanupCall(callId);
              return;
            }

            // Upload SDP offer to Firestore
            await setCallOffer(callId, { type: offer.type!, sdp: offer.sdp! });
          } catch (mErr: any) {
            console.error("[WebRTC startCall] Stream/Offer error:", mErr);
            setErrorMessage(mErr.message || "Failed to initialize call media");
            setCallState("error");
          }
        })();

        // STEP 3: Single unified listener for call document updates
        const unsubCall = subscribeToCall(callId, async (callDoc: any) => {
          if (!callDoc || callDoc.status === "rejected" || callDoc.status === "no-answer" || callDoc.status === "ended") {
            setCallState("ended");
            await cleanup();
            return;
          }

          setActiveCallDoc(callDoc);

          if (callDoc.answer && pcRef.current && pcRef.current.signalingState !== "stable") {
            try {
              if (noAnswerTimerRef.current) {
                clearTimeout(noAnswerTimerRef.current);
                noAnswerTimerRef.current = null;
              }
              logger.log("[WebRTC Answer] Setting remote SDP answer...");
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(callDoc.answer));
              setCallState("connecting");
              callStateRef.current = "connecting";
              await flushRemoteCandidates(pcRef.current);
            } catch (err) {
              console.error("[WebRTC Answer] setRemoteDescription error:", err);
            }
          }
        });
        unsubsRef.current.push(unsubCall);

        const unsubICE = subscribeToIceCandidates(
          callId,
          "caller",
          async (candidate: any) => {
            try {
              if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
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
            logger.log("[WebRTC Timer] Call timed out (30s)");
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
      const tAnswer = performance.now();
      logger.log(`[PERF TIMING 5] T4: Callee Accept pressed (${tAnswer.toFixed(1)}ms)`);
      try {
        setCallState("connecting");
        callStateRef.current = "connecting";
        callIdRef.current = callDoc.id;
        setCallId(callDoc.id);
        setActiveCallDoc(callDoc);
        roleRef.current = "callee";

        // STEP 1: Initialize getUserMedia in parallel with SDP answer setup
        const streamPromise = preAcquiredStream ? Promise.resolve(preAcquiredStream) : getUserMedia(callDoc.callType);

        (async () => {
          try {
            const stream = await streamPromise;
            const pc = createPeerConnection(stream, callDoc.callType);

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                const cand = event.candidate.toJSON();
                addIceCandidate(callDoc.id, "callee", cand);
              }
            };

            if (callDoc.offer) {
              logger.log("[WebRTC Offer] Setting remote offer in callee...");
              await pc.setRemoteDescription(new RTCSessionDescription(callDoc.offer));
              await flushRemoteCandidates(pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await setCallAnswer(callDoc.id, {
                type: answer.type!,
                sdp: answer.sdp!,
              });
            }
          } catch (err: any) {
            console.error("[WebRTC answerCall] Media/Answer error:", err);
            setErrorMessage(err.message || "Failed to answer call");
            setCallState("error");
          }
        })();

        // STEP 2: Listen for ICE candidates and call status updates
        const unsubICE = subscribeToIceCandidates(
          callDoc.id,
          "callee",
          async (candidate: any) => {
            try {
              if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
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
          if (!docData || docData.status === "ended" || docData.status === "rejected" || docData.status === "no-answer") {
            setCallState("ended");
            await cleanup();
            return;
          }

          setActiveCallDoc(docData);

          if (docData.offer && pcRef.current && pcRef.current.remoteDescription === null) {
            try {
              logger.log("[WebRTC Offer] Setting remote offer asynchronously in callee...");
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(docData.offer));
              await flushRemoteCandidates(pcRef.current);

              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);

              await setCallAnswer(docData.id, {
                type: answer.type!,
                sdp: answer.sdp!,
              });
            } catch (aErr) {
              console.error("[WebRTC Offer Async] Error:", aErr);
            }
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
      });
      setIsMuted(newMute);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const newVideoOff = !isVideoOff;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOff;
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

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newTrack = newStream.getVideoTracks()[0];

      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newTrack);
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
    activeCallDoc,
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
