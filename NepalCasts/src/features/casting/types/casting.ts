import type { Timestamp } from 'firebase/firestore';
export type CastingType = 'Film' | 'Commercial' | 'Web Series' | 'Theatre';
export type CastingStatus = 'Open' | 'Closed';
export interface CastingRole {
    name?: string;
    description?: string;
    gender?: string;
    ageRange?: string;
    [key: string]: unknown;
}
export interface CastingCall {
    id: string;
    title: string;
    description?: string;
    type: CastingType | string;
    budget?: string;
    location: string;
    thumbnail?: string;
    requirements?: string[];
    deadline?: string;
    production?: string;
    roles?: CastingRole[];
    highPriority?: boolean;
    status: CastingStatus;
    createdBy: string;
    creatorName?: string;
    creatorEmail?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export interface CastingApplication {
    id: string;
    userId: string;
    creatorId: string;
    castingId: string;
    status: ApplicationStatus;
    createdAt?: Timestamp;
}
export type CreateCastingPayload = Omit<CastingCall, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'> & {
    id?: string;
    status?: CastingStatus;
};
export type UpdateCastingPayload = Partial<Omit<CastingCall, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>> & {
    id: string;
};
