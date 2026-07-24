import { logger } from "../../../utils/logger";

export class MediaService {
  private localStream: MediaStream | null = null;

  public async getUserMedia(callType: "audio" | "video"): Promise<MediaStream> => {
    const tStart = performance.now();
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
      logger.log("[MediaService] Requesting user media stream:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((t) => (t.enabled = true));
      this.localStream = stream;
      localStorage.setItem("nc_perm_media", "granted");
      logger.log(`[MediaService] Stream acquired in ${(performance.now() - tStart).toFixed(1)}ms. Tracks:`, stream.getTracks().map(t => t.kind));
      return stream;
    } catch (err: any) {
      logger.warn("[MediaService] Advanced constraints failed. Trying basic fallback. Error:", err);
      try {
        const fallbackConstraints: MediaStreamConstraints = {
          audio: true,
          video: callType === "video" ? true : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        stream.getTracks().forEach((t) => (t.enabled = true));
        this.localStream = stream;
        localStorage.setItem("nc_perm_media", "granted");
        return stream;
      } catch (fallbackErr: any) {
        console.error("[MediaService] Fallback getUserMedia failed:", fallbackErr);
        if (fallbackErr.name === "NotAllowedError") {
          localStorage.setItem("nc_perm_media", "denied");
        }
        throw fallbackErr;
      }
    }
  }

  public async switchCamera(
    localStream: MediaStream,
    pc: RTCPeerConnection | null
  ): Promise<MediaStream | null> {
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const currentFacing = videoTrack.getSettings().facingMode;
    const newFacing = currentFacing === "user" ? "environment" : "user";

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newTrack = newStream.getVideoTracks()[0];

      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }

      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      localStream.addTrack(newTrack);
      return newStream;
    } catch (err) {
      console.error("[MediaService] switchCamera error:", err);
      return null;
    }
  }

  public stopStream(stream: MediaStream | null) {
    if (!stream) return;
    stream.getTracks().forEach((t) => {
      t.stop();
      logger.log("[MediaService] Stopped local track:", t.kind, t.id);
    });
    if (this.localStream === stream) {
      this.localStream = null;
    }
  }
}

export const mediaService = new MediaService();
