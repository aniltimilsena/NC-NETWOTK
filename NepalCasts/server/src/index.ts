import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { app, PORT } from './config';
import { configureCloudinary } from './config/cloudinary';
import { getAllowedOrigins } from './config/cors';
import { rateLimitMiddleware } from './middleware/cacheProtection';
import { requestIdMiddleware } from './middleware/requestId';
import globalRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { startFirestoreListeners } from './services/listeners.service';
import { initBloomFilters } from './services/cacheService';
import { db } from './config';
configureCloudinary();
const allowedOrigins = getAllowedOrigins();
app.use(requestIdMiddleware);
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(helmet({
    frameguard: false,
    xssFilter: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://cdn.onesignal.com", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com", "https://www.gstatic.com", "https://*.firebaseapp.com", "https://*.firebase.com", "https://www.google-analytics.com", "https://apis.google.com"],
            scriptSrcElem: ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://cdn.onesignal.com", "https://api.onesignal.com", "https://cdn.jsdelivr.net", "https://www.googletagmanager.com", "https://www.gstatic.com", "https://*.firebaseapp.com", "https://www.google-analytics.com", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:", "https://res.cloudinary.com", "https://images.unsplash.com"],
            mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
            connectSrc: [
                "'self'", "https://*.cloudinary.com", "https://api.cloudinary.com", "https://res.cloudinary.com",
                "https://*.firebase.com", "https://*.firebaseio.com", "https://*.googleapis.com",
                "https://firebasestorage.googleapis.com", "https://*.firebasestorage.googleapis.com",
                "https://fcmregistrations.googleapis.com", "https://identitytoolkit.googleapis.com",
                "https://cdn.onesignal.com", "https://onesignal.com", "https://*.onesignal.com", "https://api.onesignal.com",
                "https://analytics.google.com", "https://www.google-analytics.com", "https://stats.g.doubleclick.net", "https://www.google.com",
                "wss://*.firebaseio.com"
            ],
            frameSrc: ["'self'", "https://*.firebaseapp.com", "https://challenges.cloudflare.com"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'self'"],
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
app.use('/api', globalRouter);
app.use(errorHandler);
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`NC Network Secure API running on http://localhost:${PORT}`);
        startFirestoreListeners();
        initBloomFilters(db);
    });
}
export { app };
