import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Users, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Radio 
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../../components/ui/Avatar';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function CallPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { 
    callState, 
    activeCall, 
    isMuted, 
    callDuration, 
    initiateCall, 
    hangUp, 
    toggleMute 
  } = useCall();
  
  const hasInitiated = useRef(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  const calleeNameParam = searchParams.get('calleeName') || 'User';
  const calleePhotoParam = searchParams.get('calleePhoto') || '';

  useEffect(() => {
    const initiate = searchParams.get('initiate');
    const type = searchParams.get('type') as 'audio' | 'video';
    const calleeId = searchParams.get('calleeId');
    const calleeName = searchParams.get('calleeName');
    const calleePhoto = searchParams.get('calleePhoto');

    if (initiate === 'true' && type && calleeId && !hasInitiated.current) {
      hasInitiated.current = true;
      initiateCall({
        calleeId,
        calleeName: calleeName || 'User',
        calleePhoto: calleePhoto || '',
        callType: type,
      });
    }
  }, [searchParams, initiateCall]);

  const targetName = activeCall?.calleeName || calleeNameParam;
  const targetPhoto = activeCall?.calleePhoto || calleePhotoParam;

  const isCallConnected = callState === 'connected';
  const isCallConnecting = callState === 'calling' || callState === 'ringing' || callState === 'connecting';

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* Background ambient lighting glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00BFFF]/15 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#00BFFF]/10 rounded-full blur-[140px]" />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-20 w-full max-w-2xl flex items-center justify-between">
        <button
          onClick={() => navigate('/messages')}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-bold uppercase tracking-wider backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-[#00BFFF]" />
          <span>Back to Messages</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-[#00BFFF]" />
          <span className="text-white/70 text-[11px] font-bold uppercase tracking-wider">
            Encrypted Session
          </span>
        </div>
      </header>

      {/* Main Call Hero Card */}
      <main className="relative z-20 my-auto w-full max-w-md flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full flex flex-col items-center p-8 sm:p-10 rounded-3xl bg-[#12121A]/80 border border-white/10 shadow-[0_0_50px_rgba(0,191,255,0.1)] backdrop-blur-2xl text-center relative overflow-hidden"
        >
          {/* Top subtle highlight accent line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00BFFF] to-transparent opacity-60" />

          {/* Central Animated Icon & Avatar Ring */}
          <div className="relative mb-6">
            {/* Pulsing ring animation */}
            <div className="absolute -inset-4 rounded-full border-2 border-[#00BFFF]/30 animate-ping opacity-60" style={{ animationDuration: '3s' }} />
            <div className="absolute -inset-2 rounded-full bg-[#00BFFF]/10 blur-md" />

            <div className="relative z-10 p-1.5 rounded-full bg-gradient-to-b from-[#00BFFF]/40 to-white/10 shadow-2xl">
              {targetPhoto ? (
                <Avatar
                  src={targetPhoto}
                  name={targetName}
                  size="none"
                  className="w-28 h-28 sm:w-32 sm:h-32 text-3xl rounded-full border-4 border-[#0A0A0F] shadow-inner"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0A0A0F] flex items-center justify-center border-4 border-[#0A0A0F]">
                  <div className="w-16 h-16 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,191,255,0.25)]">
                    <Users className="w-8 h-8 text-[#00BFFF]" />
                  </div>
                </div>
              )}
            </div>

            {/* Floating Live Badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A0A0F] border border-[#00BFFF]/40 shadow-lg">
              <Radio className="w-3.5 h-3.5 text-[#00BFFF] animate-pulse" />
              <span className="text-[#00BFFF] text-[10px] font-extrabold uppercase tracking-widest">
                {isCallConnected ? 'Live' : 'Audio'}
              </span>
            </div>
          </div>

          {/* Recipient Name & Details */}
          <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-1">
            {targetName}
          </h1>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-6">
            Voice Call Session
          </p>

          {/* Status Indicator Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 mb-8">
            <span className={`w-2.5 h-2.5 rounded-full ${isCallConnected ? 'bg-green-400 animate-pulse' : 'bg-[#00BFFF] animate-ping'}`} />
            <span className="text-[#00BFFF] font-mono text-xs font-bold uppercase tracking-widest">
              {isCallConnected 
                ? formatTime(callDuration) 
                : isCallConnecting 
                ? 'Connecting Call...' 
                : 'Call Ready'}
            </span>
          </div>

          {/* Audio Control Buttons */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full pt-2">
            {/* Toggle Mute */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${
                isMuted
                  ? 'bg-red-500/20 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/20 hover:border-[#00BFFF]/40'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6 text-[#00BFFF]" />}
            </button>

            {/* Speaker Toggle */}
            <button
              onClick={() => setIsSpeakerMuted((prev) => !prev)}
              title={isSpeakerMuted ? 'Enable Speaker' : 'Mute Speaker'}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${
                isSpeakerMuted
                  ? 'bg-red-500/20 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                  : 'bg-white/10 border-white/15 text-white hover:bg-white/20 hover:border-[#00BFFF]/40'
              }`}
            >
              {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6 text-[#00BFFF]" />}
            </button>

            {/* End Call / Leave Session */}
            <button
              onClick={hangUp}
              title="Hang Up Call"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-[0_0_30px_rgba(225,29,72,0.4)] border border-red-400/40"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-20 text-center text-white/40 text-xs font-semibold max-w-sm flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-[#00BFFF]" />
        <span>NepalCasts High-Definition Audio Network</span>
      </footer>
    </div>
  );
}

