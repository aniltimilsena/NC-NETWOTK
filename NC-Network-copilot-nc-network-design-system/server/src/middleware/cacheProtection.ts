import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { 
  mightExist, 
  getFromCache, 
  setInCache,
  cacheNullResult 
} from '../services/cacheService';


const rateLimiter = new RateLimiterMemory({
  points: 100,      
  duration: 60,     
  blockDuration: 60, 
});


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




export const bloomFilterMiddleware = (resourceType: string) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const rawId = req.params.id || req.params.userId || 
                req.params.castingId || req.params.uid || (req.query.id as string);

    if (!rawId) return next();

    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    
    if (id.length < 10 || id.length > 100) {
      return res.status(404).json({ 
        error: 'Resource not found',
      });
    }

    
    if (!mightExist(resourceType, id)) {
      
      
      return res.status(404).json({ 
        error: 'Resource not found',
      });
    }

    
    next();
  };
};



export const cacheMiddleware = (
  keyGenerator: (req: Request) => string,
  ttlSeconds: number = 300
) => {
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
      } else if (res.statusCode === 404) {
        cacheNullResult(cacheKey);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

// Scraping detector: limit authenticated UIDs to 30 profile/casting reads per 60 seconds.
// If exceeded, block the UID for 5 minutes (300 seconds).
const scrapingRateLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
  blockDuration: 300,
});

export const scrapingPreventerMiddleware = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const uid = req.user?.uid;
  // Non-authenticated visitors are handled by IP rate limits, admins are excluded
  if (!uid || req.user?.admin === true) {
    return next();
  }

  try {
    await scrapingRateLimiter.consume(uid);
    next();
  } catch {
    console.warn(`[Scraping Attempt Detected] UID: ${uid}, IP: ${req.ip || 'unknown'}`);
    return res.status(429).json({
      error: 'Access restricted due to suspicious scraping activity. Please try again later.',
      retryAfter: 300,
    });
  }
};
