import { logger } from "../../../utils/logger";
import { ICE_SERVERS } from "./ICEService";
export interface PeerConnectionCallbacks {
    onIceCandidate: (candidate: RTCIceCandidateInit) => void;
    onRemoteStream: (stream: MediaStream) => void;
    onIceStateChange: (state: RTCIceConnectionState) => void;
    onSignalingStateChange: (state: RTCSignalingState) => void;
}
export class PeerConnectionService {
    private pc: RTCPeerConnection | null = null;
    private remoteStream: MediaStream | null = null;
    private candidateQueue: RTCIceCandidateInit[] = [];
    public createPeerConnection(localStream: MediaStream, callbacks: PeerConnectionCallbacks): RTCPeerConnection {
        logger.log("[PeerConnectionService] Initializing Audio-Only RTCPeerConnection");
        this.close();
        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.pc = pc;
        this.remoteStream = new MediaStream();
        try {
            pc.addTransceiver("audio", { direction: "sendrecv" });
        }
        catch (tErr) {
            logger.warn("[PeerConnectionService] addTransceiver warning:", tErr);
        }
        localStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
            const existingSender = pc.getSenders().find((s) => s.track?.kind === "audio");
            if (existingSender) {
                existingSender.replaceTrack(track).catch((err) => {
                    logger.warn("[PeerConnectionService] replaceTrack error:", err);
                });
            }
            else {
                pc.addTrack(track, localStream);
            }
        });
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                callbacks.onIceCandidate(event.candidate.toJSON());
            }
        };
        pc.ontrack = (event) => {
            logger.log("[PeerConnectionService] Remote audio track received:", event.track.kind, "id:", event.track.id);
            if (event.track) {
                event.track.enabled = true;
            }
            if (this.remoteStream) {
                if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
                    this.remoteStream.addTrack(event.track);
                }
                callbacks.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
            }
        };
        pc.oniceconnectionstatechange = () => {
            logger.log("[PeerConnectionService] ICE Connection state ->", pc.iceConnectionState);
            callbacks.onIceStateChange(pc.iceConnectionState);
        };
        pc.onsignalingstatechange = () => {
            logger.log("[PeerConnectionService] Signaling state ->", pc.signalingState);
            callbacks.onSignalingStateChange(pc.signalingState);
            if (pc.signalingState === "stable") {
                this.flushCandidates();
            }
        };
        return pc;
    }
    public getPeerConnection(): RTCPeerConnection | null {
        return this.pc;
    }
    public getRemoteStream(): MediaStream | null {
        return this.remoteStream;
    }
    public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (this.pc && this.pc.remoteDescription && this.pc.remoteDescription.type) {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
                logger.log("[PeerConnectionService] Added remote ICE candidate successfully");
            }
            catch (err) {
                console.error("[PeerConnectionService] addIceCandidate error:", err);
            }
        }
        else {
            this.candidateQueue.push(candidate);
            logger.log("[PeerConnectionService] Queued remote ICE candidate (total queued:", this.candidateQueue.length, ")");
        }
    }
    public async flushCandidates(): Promise<void> {
        if (!this.pc || !this.pc.remoteDescription || !this.pc.remoteDescription.type)
            return;
        logger.log(`[PeerConnectionService] Flushing ${this.candidateQueue.length} queued ICE candidates...`);
        while (this.candidateQueue.length > 0) {
            const cand = this.candidateQueue.shift();
            if (cand) {
                try {
                    await this.pc.addIceCandidate(new RTCIceCandidate(cand));
                }
                catch (err) {
                    console.error("[PeerConnectionService] Error flushing candidate:", err);
                }
            }
        }
    }
    public close(): void {
        if (this.pc) {
            this.pc.ontrack = null;
            this.pc.onicecandidate = null;
            this.pc.oniceconnectionstatechange = null;
            this.pc.onconnectionstatechange = null;
            this.pc.onsignalingstatechange = null;
            this.pc.close();
            this.pc = null;
            logger.log("[PeerConnectionService] RTCPeerConnection closed");
        }
        this.remoteStream = null;
        this.candidateQueue = [];
    }
}
export const peerConnectionService = new PeerConnectionService();
