import { vi, describe, it, expect } from 'vitest';
import { Writable } from 'stream';


vi.mock('firebase-admin', () => {
  const mockCollection = {
    doc: vi.fn().mockReturnThis(),
    collection: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: [] }),
    select: vi.fn().mockReturnThis(),
    add: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    set: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    where: vi.fn().mockReturnThis(),
    onSnapshot: vi.fn().mockReturnThis(),
  };
  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
    runTransaction: vi.fn(),
  };
  const mockTimestamp = {
    now: () => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    }),
  };
  const mockFieldValue = {
    serverTimestamp: () => new Date(),
    arrayUnion: (...args: any[]) => args,
    arrayRemove: (...args: any[]) => args,
    increment: (val: number) => val,
  };
  
  return {
    apps: [],
    initializeApp: vi.fn(),
    credential: {
      cert: vi.fn(),
    },
    firestore: Object.assign(() => mockDb, {
      Timestamp: mockTimestamp,
      FieldValue: mockFieldValue,
    }),
    storage: () => ({
      bucket: () => ({
        file: () => ({
          save: vi.fn().mockResolvedValue({}),
          delete: vi.fn().mockResolvedValue({}),
        }),
      }),
    }),
    auth: () => ({
      verifyIdToken: vi.fn().mockImplementation((token) => {
        if (token === 'valid-token') {
          return Promise.resolve({ uid: 'test-user-uid', email: 'test@example.com' });
        }
        return Promise.reject(new Error('Invalid token'));
      }),
    }),
  };
});


vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn().mockImplementation((options, callback) => {
        const mockStream = new Writable({
          write(chunk, encoding, cb) {
            cb();
          }
        });
        mockStream.on('finish', () => {
          callback(null, {
            secure_url: 'https://res.cloudinary.com/dummy/image/upload/v12345/mock-file.jpg',
            public_id: 'mock-file',
          });
        });
        return mockStream;
      }),
    },
  },
}));


process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
process.env.CLOUDINARY_API_KEY = 'test_key';
process.env.CLOUDINARY_API_SECRET = 'test_secret';

import request from 'supertest';
import { app } from '../index';

describe('File Upload Security', () => {
  it('rejects PHP file disguised as image', async () => {
    const fakeImage = Buffer.from('<?php echo shell_exec($_GET["cmd"]); ?>');
    
    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', fakeImage, 'shell.jpg');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Could not determine file type');
  });

  it('accepts valid JPEG image', async () => {
    
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    
    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });
    
    expect(response.status).toBe(200);
    expect(response.body.url).toBeDefined();
  });

  it('rejects files over size limit', async () => {
    
    const largeBuffer = Buffer.alloc(101 * 1024 * 1024);
    
    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', largeBuffer, { filename: 'large.jpg', contentType: 'image/jpeg' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('File too large');
  });
});
