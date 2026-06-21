import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';
import { getProfile } from '../../services/profile';
import Avatar from '../ui/Avatar';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ─── Voice Waveform Component ─────────────────────────────────────────────
// Analyzes the remote audio stream and renders animated bars that react
// to the remote peer's voice level during audio-only calls.

function VoiceWaveform({ stream }) {
  const [levels, setLevels] = useState(() => new Array(7).fill(0.15));
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const BAR_COUNT = 7;

      const tick = () => {
        analyser.getByteFrequencyData(data);
        // Sample BAR_COUNT frequency bins spread across the spectrum
        const newLevels = [];
        const step = Math.floor(data.length / BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.min(i * step + Math.floor(step / 2), data.length - 1);
          // Normalize 0-255 to 0.15-1.0 range, minimum bar height is 15%
          newLevels.push(Math.max(0.15, data[idx] / 255));
        }
        setLevels(newLevels);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[VoiceWaveform] Failed to create audio analyser:', err);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [stream]);

  return (
    <div className="flex items-end justify-center gap-1 h-12 mt-4">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-[#00BFFF] to-[#00FFAA]"
          animate={{ 
            height: `${level * 48}px`,
            opacity: 0.5 + level * 0.5,
          }}
          transition={{ 
            type: 'spring',
            stiffness: 400,
            damping: 25,
            mass: 0.5,
          }}
        />
      ))}
    </div>
  );
}

// ─── Calling Dots Animation ───────────────────────────────────────────────
// Shows animated bouncing dots during the "Calling..." state

function CallingDots() {
  return (
    <div className="flex items-center gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#00BFFF]"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Overlay ─────────────────────────────────────────────────────────

export default function CallingOverlay() {
  const {
    callState,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    errorMessage,
    hangUp,
    toggleMute,
    toggleVideo,
    switchCamera,
    dismissError,
    currentUser,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [remoteProfile, setRemoteProfile] = useState(null);

  const toggleSpeakerMute = () => {
    setIsSpeakerMuted(prev => {
      const next = !prev;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = next;
      }
      if (remoteStream) {
        remoteStream.getAudioTracks().forEach(track => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = isSpeakerMuted;
      
      // Ensure all remote audio tracks are in sync with the speaker muted state
      remoteStream.getAudioTracks().forEach(track => {
        track.enabled = !isSpeakerMuted;
      });
      
      // Explicitly trigger play to bypass browser autoplay restrictions
      remoteVideoRef.current.play().catch(err => {
        console.warn("[CallingOverlay] Remote stream play failed or interrupted:", err);
      });
    }
  }, [remoteStream, isSpeakerMuted]);

  // Dynamic remote profile loading using getProfile
  useEffect(() => {
    if (!activeCall || !currentUser?.uid) {
      setRemoteProfile(null);
      return;
    }
    const isCaller = currentUser.uid === activeCall.callerId;
    const remoteId = isCaller 
      ? (activeCall.calleeId || activeCall.receiverId) 
      : activeCall.callerId;

    if (!remoteId) return;

    let isMounted = true;
    getProfile(remoteId).then((res) => {
      if (isMounted && res.data) {
        setRemoteProfile(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeCall, currentUser?.uid]);

  const isActive = callState !== 'idle' && callState !== 'ended' && activeCall;
  const isVideoCall = activeCall?.callType === 'video';
  const isConnected = callState === 'connected';
  const isError = callState === 'error';
  const isCalling = callState === 'calling' || callState === 'ringing';

  // Determine the remote party's info correctly
  const isCaller = currentUser?.uid === activeCall?.callerId;
  const docRemoteName = isCaller 
    ? (activeCall?.calleeName || activeCall?.receiverName || 'Unknown') 
    : (activeCall?.callerName || 'Unknown');
  const docRemotePhoto = isCaller 
    ? (activeCall?.calleePhoto || activeCall?.receiverAvatar || '') 
    : (activeCall?.callerPhoto || activeCall?.callerAvatar || '');

  const remoteName = remoteProfile?.name || docRemoteName;
  const remotePhoto = remoteProfile?.image || remoteProfile?.avatar || remoteProfile?.photoURL || docRemotePhoto;
  const remoteProfession = remoteProfile?.role || 'Talent';

  const statusText = useMemo(() => {
    if (callState === 'requesting-media') return isCaller ? 'Requesting access...' : 'Connecting...';
    if (callState === 'creating-offer') return isCaller ? 'Preparing...' : 'Connecting...';
    if (callState === 'calling') return null; // We'll render CallingDots instead
    if (callState === 'ringing') return isCaller ? null : 'Incoming Call'; // Dots for caller
    if (callState === 'connecting') return 'Connecting...';
    if (callState === 'connected') return formatDuration(callDuration);
    if (callState === 'error') return 'Call Failed';
    return '';
  }, [callState, callDuration, isCaller]);

  if (!isActive && !isError) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="calling-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-[#0A0A0A]">
          {/* Gradient glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-nc-accent/5 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-nc-accent/5 rounded-full blur-[200px]" />
        </div>

        {/* Remote video / audio output element (always present to play remote stream audio/video) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${
            isVideoCall && isConnected && remoteStream
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* ── Video Layer ── */}
        {isVideoCall && (
          <>
            {/* Overlay gradient for controls visibility */}
            {isConnected && (
              <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
            )}

            {/* Local video (PIP) */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-16 right-4 sm:top-20 sm:right-6 w-28 h-40 sm:w-36 sm:h-48 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl z-30 bg-black"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-[#1A1A1A]">
                  <svg className="w-8 h-8 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* ── Audio Call / Pre-connect UI ── */}
        <div className={`relative z-30 flex-1 flex flex-col items-center justify-center px-6 ${
          isVideoCall && isConnected ? 'hidden' : ''
        }`}>
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-6"
          >
            <div className="relative">
              {/* Pulse ring animation — only during calling/ringing */}
              {isCalling && (
                <>
                  <div className="absolute inset-0 rounded-full bg-nc-accent/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute -inset-3 rounded-full border-2 border-nc-accent/10 animate-pulse" />
                </>
              )}
              {/* Connected glow ring for audio calls */}
              {!isVideoCall && isConnected && (
                <div className="absolute -inset-2 rounded-full border-2 border-green-500/20 animate-pulse" style={{ animationDuration: '3s' }} />
              )}
              <Avatar 
                src={remotePhoto}
                name={remoteName}
                gender={remoteProfile?.gender}
                size="none"
                className="w-28 h-28 sm:w-32 sm:h-32 text-4xl border-4 border-white/10 shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Name & Profession & Status */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-0.5"
          >
            {remoteName}
          </motion.h2>
          {remoteProfession && (
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-white/60 text-xs sm:text-sm font-semibold tracking-wide uppercase mb-2"
            >
              {remoteProfession}
            </motion.p>
          )}

          {/* Status text with animated dots for calling state */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`flex items-center text-sm font-bold uppercase tracking-widest ${
              isConnected ? 'text-green-400' :
              isError ? 'text-red-400' :
              'text-nc-accent'
            }`}
          >
            {(callState === 'calling' || (callState === 'ringing' && isCaller)) ? (
              <>
                <span>Calling</span>
                <CallingDots />
              </>
            ) : (
              <span>{statusText}</span>
            )}
          </motion.div>

          {/* Voice Waveform Animation — shown during connected audio calls */}
          {!isVideoCall && isConnected && remoteStream && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <VoiceWaveform stream={remoteStream} />
            </motion.div>
          )}

          {/* Error message */}
          {isError && (
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-red-400/80 text-xs mt-3 max-w-xs text-center"
            >
              {errorMessage}
            </motion.p>
          )}
        </div>

        {/* ── Connected call info bar (top) for video calls ── */}
        {isVideoCall && isConnected && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-0 left-0 right-0 z-30 p-4 pt-12 sm:pt-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Avatar 
                src={remotePhoto}
                name={remoteName}
                gender={remoteProfile?.gender}
                size="none"
                className="w-8 h-8 text-sm border border-white/20"
              />
              <div>
                <p className="text-white text-sm font-bold leading-tight">{remoteName}</p>
                <p className="text-green-400 text-[10px] font-bold tracking-wider">{formatDuration(callDuration)}</p>
              </div>
            </div>
            {/* Encrypted badge */}
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-green-500/60" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase">Encrypted</span>
            </div>
          </motion.div>
        )}

        {/* ── Controls bar ── */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
          className="mt-auto relative z-30 px-6 pb-12 sm:pb-16"
        >
          <div className="flex items-center justify-center gap-4 sm:gap-6 max-w-lg mx-auto bg-[#111111]/60 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Mute */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isMuted
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
              }`}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* Speaker Mute */}
            <button
              onClick={toggleSpeakerMute}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isSpeakerMuted
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
              }`}
              aria-label={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
            >
              {isSpeakerMuted ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            {/* Video toggle (video calls only) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isVideoOff
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                    : 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
                }`}
                aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            )}

            {/* Switch camera (mobile, video only) */}
            {isVideoCall && (
              <button
                onClick={switchCamera}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 border border-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
                aria-label="Switch camera"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            {/* End call */}
            <button
              onClick={isError ? dismissError : hangUp}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all active:scale-90"
              aria-label="End call"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>

          {/* Encrypted indicator — for audio calls */}
          {!isVideoCall && isConnected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center gap-1.5 mt-6"
            >
              <svg className="w-3 h-3 text-green-500/60" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase">End-to-end encrypted</span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
