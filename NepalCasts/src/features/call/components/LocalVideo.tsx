import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Avatar from "../../../components/ui/Avatar";

interface LocalVideoProps {
  stream: MediaStream | null;
  isVideoOff: boolean;
  user: any;
}

export const LocalVideo: React.FC<LocalVideoProps> = ({ stream, isVideoOff, user }) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
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
        className={`w-full h-full object-cover -scale-x-100 ${isVideoOff ? "hidden" : ""}`}
      />
      {isVideoOff && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#111116] p-3 text-center">
          <Avatar
            src={user?.photoURL || user?.profileImage || user?.image}
            name={user?.displayName || user?.name || "Me"}
            size="none"
            className="w-12 h-12 sm:w-16 sm:h-16 text-lg border border-white/10 shadow-lg mb-2"
          />
          <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Camera Off</p>
        </div>
      )}
    </motion.div>
  );
};
