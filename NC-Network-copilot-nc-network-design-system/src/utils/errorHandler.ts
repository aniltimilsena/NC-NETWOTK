import { logger } from './logger';

/**
 * Handles errors securely by logging them only in development and returning a safe generic user message.
 */
export const handleError = (error: unknown, userMessage = 'Something went wrong. Please try again.') => {
  // Log detailed error in development (logger handles environment check internally)
  logger.error(error);
  
  // Return generic sanitized message for user display
  return userMessage;
};
