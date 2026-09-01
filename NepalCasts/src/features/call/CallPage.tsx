import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Users, ArrowLeft, ShieldCheck, Sparkles, Radio } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../../components/ui/Avatar';
const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};
interface CallPageProps {
  initialCallId?: string;
  filter?: string;
}

export default function CallPage({ initialCallId, filter }: CallPageProps = {}) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { callState, activeCall, isMuted, callDuration, initiateCall, hangUp, toggleMute, currentUser } = useCall();
    const hasInitiated = useRef(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
    const initiate = searchParams.get('initiate');
    const type = searchParams.get('type') as 'audio' | 'video';
    const calleeId = searchParams.get('calleeId');
    const calleeName = searchParams.get('calleeName');
    const calleePhoto = searchParams.get('calleePhoto');

    const calleeNameParam = calleeName || 'User';
    const calleePhotoParam = calleePhoto || '';
    useEffect(() => {
        if (initiate === 'true' && type && calleeId && !hasInitiated.current) {
            hasInitiated.current = true;
            initiateCall({
                calleeId,
                calleeName: calleeName || 'User',
                calleePhoto: calleePhoto || '',
                callType: type,
            });
        }
    }, [initiate, type, calleeId, calleeName, calleePhoto, initiateCall]);
    const isCaller = currentUser?.uid === activeCall?.callerId;
    const targetId = isCaller
        ? (activeCall?.calleeId || activeCall?.receiverId || calleeId || undefined)
        : (activeCall?.callerId || calleeId || undefined);
    const targetName = activeCall?.calleeName || calleeNameParam;
    const targetPhoto = activeCall?.calleePhoto || calleePhotoParam;
    const isCallConnected = callState === 'connected';
    const isCallConnecting = callState === 'calling' || callState === 'ringing' || callState === 'connecting';
    return (<div className="relative min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#522C69]/15 rounded-full blur-[160px] animate-pulse"/>
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#522C69]/10 rounded-full blur-[140px]"/>
      </div>

      
      <header className="relative z-20 w-full max-w-2xl flex items-center justify-between">
        <button onClick={() => navigate('/messages')} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-bold uppercase tracking-wider backdrop-blur-md">
          <ArrowLeft className="w-4 h-4 text-white"/>
          <span>Back to Messages</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-white"/>
          <span className="text-white/70 text-[11px] font-bold uppercase tracking-wider">
            Encrypted Session
          </span>
        </div>
      </header>

      
      <main className="relative z-20 my-auto w-full max-w-md flex flex-col items-center">
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="w-full flex flex-col items-center p-8 sm:p-10 rounded-3xl bg-[#12121A]/80 border border-white/10 shadow-[0_0_50px_rgba(0,191,255,0.1)] backdrop-blur-2xl text-center relative overflow-hidden">
          
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#522C69] to-transparent opacity-60"/>

          
          <div className="relative mb-6">
            
            <div className="absolute -inset-4 rounded-full border-2 border-[#522C69]/30 animate-ping opacity-60" style={{ animationDuration: '3s' }}/>
            <div className="absolute -inset-2 rounded-full bg-[#522C69]/10 blur-md"/>

            <div className="relative z-10 p-1.5 rounded-full bg-gradient-to-b from-[#522C69]/40 to-white/10 shadow-2xl">
              {targetPhoto ? (<Avatar userId={targetId} src={targetPhoto} name={targetName} size="none" className="w-28 h-28 sm:w-32 sm:h-32 text-3xl rounded-full border-4 border-[#0A0A0F] shadow-inner"/>) : (<div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0A0A0F] flex items-center justify-center border-4 border-[#0A0A0F]">
                  <div className="w-16 h-16 rounded-2xl bg-[#522C69]/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,191,255,0.25)]">
                    <Users className="w-8 h-8 text-white"/>
                  </div>
                </div>)}
            </div>

            
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A0A0F] shadow-lg">
              <Radio className="w-3.5 h-3.5 text-white animate-pulse"/>
              <span className="text-[#522C69] text-[10px] font-extrabold uppercase tracking-widest">
                {isCallConnected ? 'Live' : 'Audio'}
              </span>
            </div>
          </div>

          
          <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-1">
            {targetName}
          </h1>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-6">
            Voice Call Session
          </p>

          
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 mb-8">
            <span className={`w-2.5 h-2.5 rounded-full ${isCallConnected ? 'bg-green-400 animate-pulse' : 'bg-[#522C69] animate-ping'}`}/>
            <span className="text-[#522C69] font-mono text-xs font-bold uppercase tracking-widest">
              {isCallConnected
            ? formatTime(callDuration)
            : isCallConnecting
                ? 'Connecting Call...'
                : 'Call Ready'}
            </span>
          </div>

          
          <div className="flex items-center justify-center gap-4 sm:gap-6 w-full pt-2">
            
            <button onClick={toggleMute} title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${isMuted
            ? 'bg-red-500/20 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
            : 'bg-white/10 border-white/15 text-white hover:bg-white/20 hover:border-[#522C69]/40'}`}>
              {isMuted ? <MicOff className="w-6 h-6"/> : <Mic className="w-6 h-6 text-white"/>}
            </button>

            
            <button onClick={() => setIsSpeakerMuted((prev) => !prev)} title={isSpeakerMuted ? 'Enable Speaker' : 'Mute Speaker'} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${isSpeakerMuted
            ? 'bg-red-500/20 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
            : 'bg-white/10 border-white/15 text-white hover:bg-white/20 hover:border-[#522C69]/40'}`}>
              {isSpeakerMuted ? <VolumeX className="w-6 h-6"/> : <Volume2 className="w-6 h-6 text-white"/>}
            </button>

            
            <button onClick={hangUp} title="Hang Up Call" className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-[0_0_30px_rgba(225,29,72,0.4)] border border-red-400/40">
              <PhoneOff className="w-7 h-7"/>
            </button>
          </div>
        </motion.div>
      </main>

      
      <footer className="relative z-20 text-center text-white/40 text-xs font-semibold max-w-sm flex items-center justify-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-white"/>
        <span>NepalCasts High-Definition Audio Network</span>
      </footer>
    </div>);
}
