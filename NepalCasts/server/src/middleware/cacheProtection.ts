import { Request, Response, NextFunction } from 'express';
import { createLimiterInstance } from './rateLimiter';
import { mightExist, getFromCache, setInCache, cacheNullResult } from '../services/cacheService';

const rateLimiter = createLimiterInstance({
    points: 100,
    duration: 60,
    blockDuration: 60,
    keyPrefix: 'rl_global_ip'
});
export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
        await rateLimiter.consume(ip);
        next();
    }
    catch {
        return res.status(429).json({
            error: 'Too many requests. Please slow down.',
            retryAfter: 60,
        });
    }
};
export const bloomFilterMiddleware = (_resourceType: string) => {
    return (req: Request, res: Response, next: NextFunction): any => {
        const rawId = req.params.id || req.params.userId ||
            req.params.castingId || req.params.uid || (req.query.id as string);
        if (!rawId)
            return next();
        const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);
        if (id.length < 5 || id.length > 100) {
            return res.status(404).json({
                error: 'Resource not found',
            });
        }
        // Do not reject with 404 here: newly registered users and castings created after
        // server boot must be verified against Firestore rather than an out-of-sync in-memory filter.
        next();
    };
};
export const cacheMiddleware = (keyGenerator: (req: Request) => string, ttlSeconds: number = 300) => {
    return (req: Request, res: Response, next: NextFunction): any => {
        const cacheKey = keyGenerator(req);
        const cached = getFromCache(cacheKey);
        if (cached !== undefined) {
            if (cached === null) {
                return res.status(404).json({ error: 'Resource not found' });
            }
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached);
        }
        const originalJson = res.json.bind(res);
        res.json = (data: any): any => {
            if (res.statusCode === 200) {
                setInCache(cacheKey, data, ttlSeconds);
            }
            else if (res.statusCode === 404) {
                cacheNullResult(cacheKey);
            }
            res.setHeader('X-Cache', 'MISS');
            return originalJson(data);
        };
        next();
    };
};
const scrapingRateLimiter = createLimiterInstance({
    points: 30,
    duration: 60,
    blockDuration: 300,
    keyPrefix: 'rl_scraping'
});
export const scrapingPreventerMiddleware = async (req: any, res: Response, next: NextFunction): Promise<any> => {
    const uid = req.user?.uid;
    if (!uid || req.user?.admin === true) {
        return next();
    }
    try {
        await scrapingRateLimiter.consume(uid);
        next();
    }
    catch {
        console.warn(`[Scraping Attempt Detected] UID: ${uid}, IP: ${req.ip || 'unknown'}`);
        return res.status(429).json({
            error: 'Access restricted due to suspicious scraping activity. Please try again later.',
            retryAfter: 300,
        });
    }
};
