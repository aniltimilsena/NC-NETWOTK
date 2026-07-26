import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';

let redisClient: Redis | null = null;
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;

if (redisUrl || redisHost) {
    try {
        if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
            redisClient = new Redis(redisUrl, { enableOfflineQueue: false, maxRetriesPerRequest: 1 });
        }
        else if (redisHost) {
            redisClient = new Redis({
                host: redisHost,
                port: Number(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                enableOfflineQueue: false,
                maxRetriesPerRequest: 1,
            });
        }
        redisClient?.on('error', (err) => {
            console.warn('Redis rate limiter client error, falling back to memory:', err.message);
        });
    }
    catch (e) {
        console.warn('Could not initialize Redis client for rate limiting:', e);
    }
}

export function createLimiterInstance(options: { points: number; duration: number; blockDuration?: number; keyPrefix?: string }) {
    if (redisClient) {
        return new RateLimiterRedis({
            storeClient: redisClient,
            points: options.points,
            duration: options.duration,
            blockDuration: options.blockDuration || 0,
            keyPrefix: options.keyPrefix || 'rl',
            insuranceLimiter: new RateLimiterMemory({
                points: options.points,
                duration: options.duration,
                blockDuration: options.blockDuration || 0,
                keyPrefix: options.keyPrefix || 'rl_ins',
            })
        });
    }
    return new RateLimiterMemory({
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || 0,
        keyPrefix: options.keyPrefix || 'rl',
    });
}

export interface RateLimiterOptions {
    points: number;
    duration: number;
    blockDuration?: number;
    keyPrefix?: string;
    keyGenerator?: (req: Request) => string;
    errorMessage?: string;
}
export const createRateLimiterMiddleware = (options: RateLimiterOptions) => {
    const limiter = createLimiterInstance({
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
        }
        catch (rejRes) {
            if (rejRes instanceof RateLimiterRes || (rejRes && typeof rejRes === 'object' && 'msBeforeNext' in rejRes)) {
                const msBefore = (rejRes as any).msBeforeNext || 60000;
                const retryAfterSeconds = Math.ceil(msBefore / 1000) || 60;
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
export const publicApiLimiter = createRateLimiterMiddleware({
    points: 60,
    duration: 60,
    blockDuration: 60,
    keyPrefix: 'rl_public',
    errorMessage: 'Public API rate limit exceeded. Please wait 60 seconds before making more requests.',
});
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
