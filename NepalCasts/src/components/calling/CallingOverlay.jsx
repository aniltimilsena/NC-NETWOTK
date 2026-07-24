import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../../context/CallContext';
import { getProfile } from '../../services';
import Avatar from '../ui/Avatar';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

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
        const newLevels = [];
        const step = Math.floor(data.length / BAR_COUNT);
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.min(i * step + Math.floor(step / 2), data.length - 1);
          newLevels.push(Math.max(0.15, data[idx] / 255));
        }
        setLevels(newLevels);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[VoiceWaveform] AudioContext error:', err);
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
    <div className="flex items-end justify-center gap-1.5 h-12 mt-4">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-2 rounded-full bg-gradient-to-t from-nc-accent to-green-400"
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

function CallingDots() {
  return (
    <div className="flex items-center gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-nc-accent"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export default function CallingOverlay() {
  const {
    callState,
    activeCall,
    remoteStream,
    isMuted,
    callDuration,
    errorMessage,
    hangUp,
    toggleMute,
    dismissError,
    currentUser,
  } = useCall();

  const audioRef = useRef(null);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [remoteProfile, setRemoteProfile] = useState(null);

  const toggleSpeakerMute = () => {
    setIsSpeakerMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  };

  useEffect(() => {
    const aEl = audioRef.current;
    if (!aEl || !remoteStream) return;

    if (aEl.srcObject !== remoteStream) {
      aEl.srcObject = remoteStream;
    }

    aEl.play().catch((err) => {
      console.warn('[CallingOverlay] Audio play warning:', err);
    });
  }, [remoteStream]);

  const isCaller = currentUser?.uid === activeCall?.callerId;
  const remoteId = isCaller 
    ? (activeCall?.calleeId || activeCall?.receiverId) 
    : activeCall?.callerId;

  useEffect(() => {
    if (!remoteId) {
      setRemoteProfile(null);
      return;
    }
    let isMounted = true;
    getProfile(remoteId).then((res) => {
      if (isMounted && res.data) {
        setRemoteProfile(res.data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [remoteId]);

  const isActive = callState !== 'idle' && callState !== 'ended' && activeCall;
  const isConnected = callState === 'connected';
  const isError = callState === 'error';

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
    if (callState === 'requesting-media') return 'Connecting microphone...';
    if (callState === 'calling') return isCaller ? 'Calling...' : 'Ringing...';
    if (callState === 'ringing') return isCaller ? 'Ringing...' : 'Incoming Call'; 
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
        className="fixed inset-0 z-[9999] flex flex-col justify-between p-6 sm:p-10 bg-[#0A0A0F] overflow-hidden select-none"
      >
        {/* Hidden Audio Output Element */}
        <audio ref={audioRef} autoPlay playsInline className="hidden" />

        {/* Ambient Glow Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-nc-accent/10 rounded-full blur-[150px]" />
          {remotePhoto && (
            <div 
              className="absolute inset-0 bg-cover bg-center blur-[100px] opacity-15 scale-125"
              style={{ backgroundImage: `url(${remotePhoto})` }}
            />
          )}
        </div>

        {/* Top Bar */}
        <div className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">
              Audio Call
            </span>
          </div>

          {isConnected && (
            <span className="text-nc-accent font-mono text-sm font-bold tracking-widest bg-nc-accent/10 border border-nc-accent/20 px-3 py-1 rounded-full">
              {formatDuration(callDuration)}
            </span>
          )}
        </div>

        {/* Main Center Content */}
        <div className="relative z-20 flex flex-col items-center justify-center my-auto">
          {/* Avatar Ring */}
          <div className="relative mb-6">
            <div className={`absolute -inset-4 rounded-full border-2 border-nc-accent/20 ${isConnected ? 'animate-ping' : ''}`} style={{ animationDuration: '3s' }} />
            <Avatar 
              src={remotePhoto}
              name={remoteName}
              gender={remoteProfile?.gender}
              size="none"
              className="w-32 h-32 sm:w-40 sm:h-40 text-4xl border-4 border-white/10 shadow-2xl shadow-black/80"
            />
          </div>

          {/* User Info */}
          <h2 className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-1 text-center">
            {remoteName}
          </h2>

          {remoteProfession && (
            <p className="text-white/50 text-xs sm:text-sm font-bold uppercase tracking-wider mb-3">
              {remoteProfession}
            </p>
          )}

          {/* Call Status Pill */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-nc-accent text-xs font-extrabold uppercase tracking-widest">
              {statusText}
            </span>
            {(callState === 'calling' || callState === 'ringing' || callState === 'connecting') && <CallingDots />}
          </div>

          {/* Real-time Voice Waveform */}
          {isConnected && remoteStream && (
            <VoiceWaveform stream={remoteStream} />
          )}

          {/* Error Message Alert */}
          {isError && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center max-w-sm"
            >
              <p className="text-red-400 text-xs font-semibold mb-3">{errorMessage || 'Audio call disconnected'}</p>
              <button
                onClick={dismissError}
                className="px-5 py-2 rounded-xl bg-red-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-all"
              >
                Close
              </button>
            </motion.div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        {!isError && (
          <div className="relative z-20 flex items-center justify-center gap-6 max-w-xs mx-auto w-full pb-4">
            {/* Mute Mic */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${
                isMuted
                  ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6 sm:w-7 sm:h-7" /> : <Mic className="w-6 h-6 sm:w-7 sm:h-7" />}
            </button>

            {/* Speaker Toggle */}
            <button
              onClick={toggleSpeakerMute}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${
                isSpeakerMuted
                  ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
              }`}
            >
              {isSpeakerMuted ? <VolumeX className="w-6 h-6 sm:w-7 sm:h-7" /> : <Volume2 className="w-6 h-6 sm:w-7 sm:h-7" />}
            </button>

            {/* End Call */}
            <button
              onClick={hangUp}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xl shadow-red-600/40 border border-red-500/30"
            >
              <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
