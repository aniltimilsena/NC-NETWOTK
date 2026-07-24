import React from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, RefreshCw, Volume2, VolumeX } from "lucide-react";

interface CallControlsProps {
  isVideoCall: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerMuted: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onSwitchCamera: () => void;
  onHangUp: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isVideoCall,
  isMuted,
  isVideoOff,
  isSpeakerMuted,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
  onHangUp,
}) => {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5 max-w-md mx-auto w-full px-4">
      {/* Audio Mute */}
      <button
        onClick={onToggleMute}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${
          isMuted
            ? "bg-red-500/20 border-red-500/30 text-red-400"
            : "bg-white/10 border-white/15 text-white hover:bg-white/20"
        }`}
      >
        {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
      </button>

      {/* Camera Toggle */}
      {isVideoCall && (
        <button
          onClick={onToggleVideo}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${
            isVideoOff
              ? "bg-red-500/20 border-red-500/30 text-red-400"
              : "bg-white/10 border-white/15 text-white hover:bg-white/20"
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      )}

      {/* Switch Camera */}
      {isVideoCall && !isVideoOff && (
        <button
          onClick={onSwitchCamera}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-white/10 border border-white/15 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
        >
          <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Speaker Toggle */}
      <button
        onClick={onToggleSpeaker}
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all active:scale-95 border ${
          isSpeakerMuted
            ? "bg-red-500/20 border-red-500/30 text-red-400"
            : "bg-white/10 border-white/15 text-white hover:bg-white/20"
        }`}
      >
        {isSpeakerMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
      </button>

      {/* Hang Up */}
      <button
        onClick={onHangUp}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xl shadow-red-600/40 border border-red-500/30"
      >
        <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
      </button>
    </div>
  );
};
