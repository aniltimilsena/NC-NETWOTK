export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data?: T;
    message?: string;
}
export interface ApiErrorResponse {
    success: false;
    message: string;
    error: string;
    errorCode: ApiErrorCode;
}
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
export type ApiErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'SUSPENDED' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR' | 'RATE_LIMITED' | 'FCM_TOKEN_LIMIT_REACHED';
export interface ServiceResult<T = void> {
    success: boolean;
    data?: T;
    error: string | null;
}
export type ReportTargetType = 'user' | 'casting' | 'message';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fake_profile' | 'scam' | 'other';
export interface ReportPayload {
    reporterId: string;
    targetId: string;
    targetType: ReportTargetType;
    reason: ReportReason;
    details?: string;
}
