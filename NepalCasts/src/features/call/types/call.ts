import type { Timestamp } from 'firebase/firestore';
export type CallStatus = 'pending' | 'accepted' | 'rejected' | 'ended' | 'no-answer' | 'busy';
export type CallType = 'audio';
export type CallRole = 'caller' | 'callee';
export interface CallDoc {
    id: string;
    callerId: string;
    callerName: string;
    callerPhoto: string;
    callerAvatar?: string;
    calleeId: string;
    calleeName: string;
    calleePhoto: string;
    receiverId?: string;
    receiverName?: string;
    receiverAvatar?: string;
    callType: 'audio';
    status: CallStatus;
    callStatus?: CallStatus;
    offer?: RTCSessionDescriptionInit | null;
    answer?: RTCSessionDescriptionInit | null;
    createdAt?: Timestamp | {
        seconds: number;
        nanoseconds: number;
    };
    endedAt?: Timestamp | {
        seconds: number;
        nanoseconds: number;
    };
}
export interface CallDocument extends CallDoc {
}
