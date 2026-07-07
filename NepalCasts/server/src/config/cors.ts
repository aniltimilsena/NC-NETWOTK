/**
 * @module server/config/cors
 * @description CORS origin allow-list configuration.
 */

export const getAllowedOrigins = (): string[] => {
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Always allow local dev servers
  if (!origins.includes('http://localhost:5173')) {
    origins.push('http://localhost:5173');
  }
  if (!origins.includes('http://127.0.0.1:5173')) {
    origins.push('http://127.0.0.1:5173');
  }

  return origins;
};
