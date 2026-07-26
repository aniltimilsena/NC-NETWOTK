import React from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
interface CallControlsProps {
    isMuted: boolean;
    isSpeakerMuted: boolean;
    onToggleMute: () => void;
    onToggleSpeaker: () => void;
    onHangUp: () => void;
}
export const CallControls: React.FC<CallControlsProps> = ({ isMuted, isSpeakerMuted, onToggleMute, onToggleSpeaker, onHangUp, }) => {
    return (<div className="flex items-center justify-center gap-4 sm:gap-6 max-w-xs mx-auto w-full px-4">
      
      <button onClick={onToggleMute} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${isMuted
            ? "bg-red-500/20 border-red-500/30 text-red-400"
            : "bg-white/10 border-white/15 text-white hover:bg-white/20"}`}>
        {isMuted ? <MicOff className="w-6 h-6 sm:w-7 sm:h-7"/> : <Mic className="w-6 h-6 sm:w-7 sm:h-7"/>}
      </button>

      
      <button onClick={onToggleSpeaker} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${isSpeakerMuted
            ? "bg-red-500/20 border-red-500/30 text-red-400"
            : "bg-white/10 border-white/15 text-white hover:bg-white/20"}`}>
        {isSpeakerMuted ? <VolumeX className="w-6 h-6 sm:w-7 sm:h-7"/> : <Volume2 className="w-6 h-6 sm:w-7 sm:h-7"/>}
      </button>

      
      <button onClick={onHangUp} className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl sm:rounded-3xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xl shadow-red-600/40 border border-red-500/30">
        <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8"/>
      </button>
    </div>);
};
