import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { app, PORT } from './config';
import { configureCloudinary } from './config/cloudinary';
import { getAllowedOrigins } from './config/cors';
import { rateLimitMiddleware } from './middleware/cacheProtection';
import globalRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { startFirestoreListeners } from './services/listeners.service';

// Initialize Cloudinary SDK
configureCloudinary();

const allowedOrigins = getAllowedOrigins();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Security and Cache Headers Middleware
app.use(helmet({
  frameguard: false, 
  xssFilter: false,  
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));

app.use((req, res, next) => {
  const path = req.path;
  
  if (path.startsWith('/api/2fa') || path.startsWith('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    res.setHeader('Cache-Control', 'no-cache, private');
    res.removeHeader('Pragma');
    res.removeHeader('Expires');
  }
  
  res.removeHeader('X-XSS-Protection');

  // Response intercepts for standardized HTTP API formats
  const originalSend = res.send;
  res.send = function (body: any) {
    const contentType = res.getHeader('Content-Type');
    const isJsonAlready = contentType && typeof contentType === 'string' && contentType.includes('application/json');

    if (res.statusCode >= 400 && typeof body === 'string' && !isJsonAlready) {
      let isJsonString = false;
      try {
        const trimmed = body.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          JSON.parse(trimmed);
          isJsonString = true;
        }
      } catch (e) {}

      if (!isJsonString) {
        res.setHeader('Content-Type', 'application/json');
        let message = body;
        if (body.trim().startsWith('<')) {
          message = 'An unexpected error occurred on the server.';
        }

        let errorCode = 'BAD_REQUEST';
        if (res.statusCode === 401) errorCode = 'UNAUTHORIZED';
        else if (res.statusCode === 403) errorCode = 'FORBIDDEN';
        else if (res.statusCode === 404) errorCode = 'NOT_FOUND';
        else if (res.statusCode === 500) errorCode = 'INTERNAL_SERVER_ERROR';

        return originalSend.call(this, JSON.stringify({
          success: false,
          message,
          error: message,
          errorCode
        }));
      }
    }
    return originalSend.call(this, body);
  };

  const originalJson = res.json;
  res.json = function (body: any) {
    if (res.statusCode === 500 && body && body.error) {
      if (process.env.NODE_ENV === 'production') {
        body.error = 'Something went wrong. Please try again.';
      }
    }
    
    if (res.statusCode >= 400 && body && typeof body === 'object') {
      if (!('success' in body)) {
        body.success = false;
      }
      if ('error' in body && !('message' in body)) {
        body.message = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
      } else if ('message' in body && !('error' in body)) {
        body.error = typeof body.message === 'string' ? body.message : JSON.stringify(body.message);
      }
      if (!('errorCode' in body)) {
        let code = 'BAD_REQUEST';
        if (res.statusCode === 401) code = 'UNAUTHORIZED';
        else if (res.statusCode === 403) code = 'FORBIDDEN';
        else if (res.statusCode === 404) code = 'NOT_FOUND';
        else if (res.statusCode === 500) code = 'INTERNAL_SERVER_ERROR';
        body.errorCode = code;
      }
    }
    return originalJson.call(this, body);
  };

  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.onesignal.com", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com", "https://www.gstatic.com", "https://*.firebaseapp.com", "https://*.firebase.com", "https://www.google-analytics.com", "https://apis.google.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.onesignal.com", "https://api.onesignal.com", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com", "https://www.gstatic.com", "https://*.firebaseapp.com", "https://www.google-analytics.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      connectSrc: [
        "'self'", "https://*.cloudinary.com", "https://api.cloudinary.com", "https://res.cloudinary.com",
        "https://*.firebase.com", "https://*.firebaseio.com", "https://*.googleapis.com",
        "https://firebasestorage.googleapis.com", "https://*.firebasestorage.googleapis.com",
        "https://fcmregistrations.googleapis.com", "https://cdn.onesignal.com", "https://onesignal.com",
        "https://*.onesignal.com", "https://api.onesignal.com", "https://analytics.google.com",
        "https://www.google-analytics.com", "https://stats.g.doubleclick.net", "https://www.google.com",
        "wss://*.firebaseio.com"
      ],
      frameSrc: ["'self'", "https://*.firebaseapp.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS origin rejected'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86400,
}));

app.use(limiter);
app.use(rateLimitMiddleware);
app.use(express.json());
app.use(morgan('dev'));

// Global Routing Table
app.use('/api', globalRouter);

// Unhandled error processing
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`NC Network Secure API running on http://localhost:${PORT}`);
  startFirestoreListeners();
});
