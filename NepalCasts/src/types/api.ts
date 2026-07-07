/**
 * @module types/api
 * @description Generic API response wrappers and error shapes used across
 * frontend services and backend responses.
 */

// ---------------------------------------------------------------------------
// Standard API Responses
// ---------------------------------------------------------------------------

/** Standard success response from the Express server. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/** Standard error response from the Express server. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error: string;
  errorCode: ApiErrorCode;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Error Codes (match server-side error standardization middleware)
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SUSPENDED'
  | 'NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'FCM_TOKEN_LIMIT_REACHED';

// ---------------------------------------------------------------------------
// Service Result Pattern
// ---------------------------------------------------------------------------

/**
 * A lightweight result tuple used by frontend service functions.
 * Avoids throwing exceptions for expected failure cases.
 */
export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export type ReportTargetType = 'user' | 'casting' | 'message';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'fake_profile'
  | 'scam'
  | 'other';

export interface ReportPayload {
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: ReportReason;
  details?: string;
}
