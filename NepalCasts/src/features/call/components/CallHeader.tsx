import React from "react";
import Avatar from "../../../components/ui/Avatar";

interface CallHeaderProps {
  remoteName: string;
  remotePhoto: string;
  remoteProfession: string;
  remoteProfile: any;
  statusText: string | null;
}

export const CallHeader: React.FC<CallHeaderProps> = ({
  remoteName,
  remotePhoto,
  remoteProfession,
  remoteProfile,
  statusText,
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-3 sm:mb-4">
        <Avatar
          src={remotePhoto}
          name={remoteName}
          gender={remoteProfile?.gender}
          size="none"
          className="w-20 h-20 sm:w-24 sm:h-24 text-2xl border-2 border-white/20 shadow-2xl"
        />
      </div>

      <h2 className="text-white text-lg sm:text-xl font-extrabold tracking-tight mb-1">{remoteName}</h2>

      {remoteProfession && (
        <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">{remoteProfession}</p>
      )}

      {statusText && (
        <div className="px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
          <span className="text-nc-accent text-xs font-bold uppercase tracking-widest">{statusText}</span>
        </div>
      )}
    </div>
  );
};
