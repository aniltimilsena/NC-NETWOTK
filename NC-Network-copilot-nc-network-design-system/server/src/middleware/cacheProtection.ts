import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { 
  mightExist, 
  getFromCache, 
  setInCache,
  cacheNullResult 
} from '../services/cacheService';

// Rate limiter — max 100 requests per minute per IP
const rateLimiter = new RateLimiterMemory({
  points: 100,      // 100 requests
  duration: 60,     // per 60 seconds
  blockDuration: 60, // block for 60 seconds if exceeded
});

// ─── RATE LIMIT MIDDLEWARE ────────────
export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown-ip';
    await rateLimiter.consume(ip);
    next();
  } catch {
    return res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter: 60,
    });
  }
};

// ─── BLOOM FILTER MIDDLEWARE ──────────
// Checks if requested ID could possibly exist
// before hitting the database
export const bloomFilterMiddleware = (resourceType: string) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const rawId = req.params.id || req.params.userId || 
                req.params.castingId || req.params.uid || (req.query.id as string);

    if (!rawId) return next();

    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    // Basic ID format validation first
    if (id.length < 10 || id.length > 100) {
      return res.status(404).json({ 
        error: 'Resource not found',
      });
    }

    // Check bloom filter
    if (!mightExist(resourceType, id)) {
      // ID definitely doesn't exist — fast reject
      // DB is never touched
      return res.status(404).json({ 
        error: 'Resource not found',
      });
    }

    // ID might exist — continue to DB check
    next();
  };
};

// ─── CACHE MIDDLEWARE ─────────────────
// Serves cached response if available
export const cacheMiddleware = (
  keyGenerator: (req: Request) => string,
  ttlSeconds: number = 300
) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const cacheKey = keyGenerator(req);
    const cached = getFromCache(cacheKey);

    if (cached !== undefined) {
      if (cached === null) {
        // Cached "not found" result
        return res.status(404).json({ error: 'Resource not found' });
      }
      // Serve from cache
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Not in cache — attach cache setter to response
    const originalJson = res.json.bind(res);
    res.json = (data: any): any => {
      if (res.statusCode === 200) {
        setInCache(cacheKey, data, ttlSeconds);
      } else if (res.statusCode === 404) {
        cacheNullResult(cacheKey);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};
