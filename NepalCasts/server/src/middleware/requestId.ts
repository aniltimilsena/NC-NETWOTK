import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
export interface RequestWithId extends Request {
    id?: string;
}
export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction): void => {
    const incomingId = req.headers['x-request-id'];
    const requestId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
