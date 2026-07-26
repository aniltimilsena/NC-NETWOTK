import { logger } from "../../../utils/logger";
export class MediaService {
    private localStream: MediaStream | null = null;
    public async getUserMedia(): Promise<MediaStream> {
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
            video: false,
        };
        try {
            logger.log("[MediaService] Requesting audio stream:", constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach((t) => (t.enabled = true));
            this.localStream = stream;
            localStorage.setItem("nc_perm_media", "granted");
            logger.log(`[MediaService] Audio acquired in ${(performance.now() - tStart).toFixed(1)}ms.`);
            return stream;
        }
        catch (err: any) {
            logger.warn("[MediaService] Advanced audio constraints failed. Trying basic fallback. Error:", err);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                stream.getTracks().forEach((t) => (t.enabled = true));
                this.localStream = stream;
                localStorage.setItem("nc_perm_media", "granted");
                return stream;
            }
            catch (fallbackErr: any) {
                console.error("[MediaService] getUserMedia audio failed:", fallbackErr);
                if (fallbackErr.name === "NotAllowedError") {
                    localStorage.setItem("nc_perm_media", "denied");
                }
                throw fallbackErr;
            }
        }
    }
    public stopStream(stream: MediaStream | null) {
        if (!stream)
            return;
        stream.getTracks().forEach((t) => {
            t.stop();
            logger.log("[MediaService] Stopped audio track:", t.kind, t.id);
        });
        if (this.localStream === stream) {
            this.localStream = null;
        }
    }
}
export const mediaService = new MediaService();
