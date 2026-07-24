import React, { useRef, useEffect } from "react";
import Avatar from "../../../components/ui/Avatar";

interface RemoteVideoProps {
  stream: MediaStream | null;
  isVideoCall: boolean;
  isConnected: boolean;
  isRemoteVideoOff: boolean;
  remotePhoto: string;
  remoteName: string;
  remoteProfile: any;
}

export const RemoteVideo: React.FC<RemoteVideoProps> = ({
  stream,
  isVideoCall,
  isConnected,
  isRemoteVideoOff,
  remotePhoto,
  remoteName,
  remoteProfile,
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const vEl = remoteVideoRef.current;
    if (!vEl || !stream) return;

    if (vEl.srcObject !== stream) {
      vEl.srcObject = stream;
    }

    stream.getVideoTracks().forEach((track) => {
      track.enabled = true;
    });

    const playVideo = () => {
      if (!remoteVideoRef.current) return;
      const promise = remoteVideoRef.current.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          console.warn("[RemoteVideo] Autoplay play() postponed by browser policy:", err);
          const unlockPlay = () => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {});
            }
            window.removeEventListener("click", unlockPlay);
            window.removeEventListener("touchstart", unlockPlay);
          };
          window.addEventListener("click", unlockPlay, { once: true });
          window.addEventListener("touchstart", unlockPlay, { once: true });
        });
      }
    };

    playVideo();

    const handleLoadedMetadata = () => {
      playVideo();
    };

    const handlePlaying = () => {
      console.log(`[PERF TIMING 8] T7: First remote video frame rendered! (${vEl.videoWidth}x${vEl.videoHeight})`);
    };

    vEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    vEl.addEventListener("playing", handlePlaying);

    return () => {
      vEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      vEl.removeEventListener("playing", handlePlaying);
    };
  }, [stream]);

  return (
    <>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 ${
          isVideoCall && (isConnected || stream) && !isRemoteVideoOff
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {isVideoCall && isConnected && isRemoteVideoOff && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0A0A0A] animate-fade-in">
          {remotePhoto && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-[80px] opacity-25 scale-110 pointer-events-none select-none"
              style={{ backgroundImage: `url(${remotePhoto})` }}
            />
          )}
          <div className="relative z-20 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="absolute -inset-2 rounded-full border-2 border-white/5 animate-pulse" style={{ animationDuration: "3s" }} />
              <Avatar
                src={remotePhoto}
                name={remoteName}
                gender={remoteProfile?.gender}
                size="none"
                className="w-24 h-24 sm:w-28 sm:h-28 text-3xl border-4 border-white/10 shadow-2xl"
              />
            </div>
            <h3 className="text-white text-lg font-extrabold tracking-tight mb-1">{remoteName}</h3>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Camera Off</p>
          </div>
        </div>
      )}
    </>
  );
};
