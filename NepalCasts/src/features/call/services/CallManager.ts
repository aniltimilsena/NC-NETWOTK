import { logger } from "../../../utils/logger";
import { mediaService, MediaService } from "./MediaService";
import { peerConnectionService, PeerConnectionService } from "./PeerConnectionService";
import { createCallPending, setCallOffer, setCallAnswer, updateCallVideoState, updateCallStatus, cleanupCall, } from "./SignalingService";
import { addIceCandidate } from "./ICEService";
export class CallManager {
    private media: MediaService = mediaService;
    private pcService: PeerConnectionService = peerConnectionService;
    public getMediaService(): MediaService {
        return this.media;
    }
    public getPeerConnectionService(): PeerConnectionService {
        return this.pcService;
    }
    public async initiateCallPending(params: {
        callerId: string;
        callerName: string;
        callerPhoto: string;
        callerAvatar: string;
        calleeId: string;
        calleeName: string;
        calleePhoto: string;
        receiverId: string;
        receiverName: string;
        receiverAvatar: string;
        callType: "audio" | "video";
    }) {
        return createCallPending(params);
    }
    public async uploadOffer(callId: string, offer: RTCSessionDescriptionInit) {
        return setCallOffer(callId, offer);
    }
    public async uploadAnswer(callId: string, answer: RTCSessionDescriptionInit) {
        return setCallAnswer(callId, answer);
    }
    public async sendIceCandidate(callId: string, role: "caller" | "callee", candidate: RTCIceCandidateInit) {
        return addIceCandidate(callId, role, candidate);
    }
    public async syncVideoState(callId: string, role: "caller" | "callee", isVideoOff: boolean) {
        return updateCallVideoState(callId, role, isVideoOff);
    }
    public async endCall(callId: string | null) {
        logger.log("[CallManager] Ending active call session:", callId);
        if (callId) {
            await updateCallStatus(callId, "ended");
            setTimeout(() => cleanupCall(callId), 5000);
        }
        this.pcService.close();
    }
}
export const callManager = new CallManager();
