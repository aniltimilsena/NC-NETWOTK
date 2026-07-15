import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

export interface RateLimiterOptions {
  points: number;
  duration: number; // in seconds
  blockDuration?: number; // in seconds (lockout period)
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
  errorMessage?: string;
}

export const createRateLimiterMiddleware = (options: RateLimiterOptions) => {
  const limiter = new RateLimiterMemory({
    points: options.points,
    duration: options.duration,
    blockDuration: options.blockDuration || 0,
    keyPrefix: options.keyPrefix || 'rl',
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    let key = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
    if (options.keyGenerator) {
      key = options.keyGenerator(req);
    }

    try {
      const rateLimiterRes = await limiter.consume(key);
      
      res.setHeader('X-RateLimit-Limit', options.points);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimiterRes.msBeforeNext / 1000));
      
      next();
    } catch (rejRes) {
      if (rejRes instanceof RateLimiterRes) {
        const retryAfterSeconds = Math.ceil(rejRes.msBeforeNext / 1000) || 60;

        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', options.points);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', retryAfterSeconds);

        return res.status(429).json({
          success: false,
          error: options.errorMessage || 'Too many requests. Please slow down and try again later.',
          message: options.errorMessage || 'Too many requests. Please slow down and try again later.',
          errorCode: 'TOO_MANY_REQUESTS',
          retryAfter: retryAfterSeconds,
        });
      }

      next(rejRes);
    }
  };
};

// Tier 1: Strict Auth Limiter (5 attempts per 15 min per IP & Phone/Account, 1 hour lockout on breach)
export const strictAuthLimiter = createRateLimiterMiddleware({
  points: 5,
  duration: 15 * 60,
  blockDuration: 60 * 60,
  keyPrefix: 'rl_auth_strict',
  keyGenerator: (req: Request) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
    const identifier = req.body?.phone || req.body?.email || '';
    return `${ip}:${identifier}`;
  },
  errorMessage: 'Too many authentication attempts. Account access temporarily locked out for security. Please try again in 1 hour.',
});

// Tier 2: Upload Limiter (10 uploads per 1 min per user/IP, 15 min lockout on breach)
export const uploadLimiter = createRateLimiterMiddleware({
  points: 10,
  duration: 60,
  blockDuration: 15 * 60,
  keyPrefix: 'rl_upload',
  keyGenerator: (req: Request) => {
    const uid = (req as any).user?.uid;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
    return uid ? `user:${uid}` : `ip:${ip}`;
  },
  errorMessage: 'Media upload rate limit exceeded. Please wait 15 minutes before uploading more media.',
});

// Tier 3: Messaging Limiter (20 messages per 1 min per UID, 5 min lockout on abuse)
export const messagingLimiter = createRateLimiterMiddleware({
  points: 20,
  duration: 60,
  blockDuration: 5 * 60,
  keyPrefix: 'rl_msg',
  keyGenerator: (req: Request) => {
    const uid = (req as any).user?.uid;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
    return uid ? `user:${uid}` : `ip:${ip}`;
  },
  errorMessage: 'Too many messages sent in a short period. Messaging has been throttled for 5 minutes.',
});

// Tier 4: Public API Limiter (60 requests per 1 min per IP)
export const publicApiLimiter = createRateLimiterMiddleware({
  points: 60,
  duration: 60,
  blockDuration: 60,
  keyPrefix: 'rl_public',
  errorMessage: 'Public API rate limit exceeded. Please wait 60 seconds before making more requests.',
});

// Tier 5: Authenticated User Limiter (300 requests per 1 min per UID)
export const authenticatedUserLimiter = createRateLimiterMiddleware({
  points: 300,
  duration: 60,
  blockDuration: 60,
  keyPrefix: 'rl_user',
  keyGenerator: (req: Request) => {
    const uid = (req as any).user?.uid;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
    return uid ? `user:${uid}` : `ip:${ip}`;
  },
  errorMessage: 'User account request rate limit exceeded. Please wait 60 seconds.',
});

// Tier 6: Admin Action Limiter (30 actions per 1 min per Admin UID, 15 min lockout on breach)
export const adminActionLimiter = createRateLimiterMiddleware({
  points: 30,
  duration: 60,
  blockDuration: 15 * 60,
  keyPrefix: 'rl_admin',
  keyGenerator: (req: Request) => {
    const uid = (req as any).user?.uid || 'admin';
    return `admin:${uid}`;
  },
  errorMessage: 'Admin rate limit exceeded. Operation locked for 15 minutes.',
});
