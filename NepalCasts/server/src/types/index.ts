import type { Request } from 'express';
import * as admin from 'firebase-admin';

export type AuthedRequest<
  TParams = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, unknown>
> = Request<TParams, unknown, TBody, TQuery> & {
  user?: admin.auth.DecodedIdToken;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  validatedFile?: {
    buffer: Buffer;
    safeName: string;
    mimeType: string;
    isVideo: boolean;
  };
};
