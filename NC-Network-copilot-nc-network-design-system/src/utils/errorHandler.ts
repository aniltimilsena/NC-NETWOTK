import { logger } from './logger';


export const handleError = (error: unknown, userMessage = 'Something went wrong. Please try again.') => {
  
  logger.error(error);
  
  
  return userMessage;
};
