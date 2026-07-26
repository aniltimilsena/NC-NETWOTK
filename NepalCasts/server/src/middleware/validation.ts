import type { Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import type { AuthedRequest } from '../types';
export const validateBody = (schema: ZodSchema) => {
    return (req: AuthedRequest, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            next(result.error);
            return;
        }
        req.body = result.data;
        next();
    };
};
export const validateQuery = (schema: ZodSchema) => {
    return (req: AuthedRequest, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            next(result.error);
            return;
        }
        req.query = result.data as any;
        next();
    };
};
export const validateParams = (schema: ZodSchema) => {
    return (req: AuthedRequest, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            next(result.error);
            return;
        }
        req.params = result.data as any;
        next();
    };
};
export const sanitizeString = (input: unknown): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/[<>$]/g, '').trim();
};
