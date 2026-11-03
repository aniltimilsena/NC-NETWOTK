import { describe, it, expect, vi } from 'vitest';
import { isAdmin } from '../middleware/auth';
import type { Response, NextFunction } from 'express';

vi.mock('../config', () => {
    return {
        db: {
            collection: vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        exists: false,
                        data: () => ({})
                    })
                })
            })
        }
    };
});

describe('Authentication & Authorization Security Tests', () => {
    it('allows access when req.user.admin is true', async () => {
        const req: any = {
            user: { uid: 'user_admin_1', admin: true }
        };
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        await isAdmin(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('allows access when req.user.isAdmin is true', async () => {
        const req: any = {
            user: { uid: 'user_admin_2', isAdmin: true }
        };
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        await isAdmin(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('denies access when caller has no admin flag and no database record', async () => {
        const req: any = {
            user: { uid: 'regular_user_1', admin: false, isAdmin: false }
        };
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        await isAdmin(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'FORBIDDEN' }));
    });

    it('denies access when req.user has no uid', async () => {
        const req: any = {};
        const res: any = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        const next = vi.fn();

        await isAdmin(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
