import admin from 'firebase-admin';

if (!admin.apps.length) {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nc-network-10d0b';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = rawKey.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    } else {
        admin.initializeApp({ projectId });
    }
}

const targetUrl = process.env.SERVER_URL || null;

export default async function handler(req, res) {
    if (!targetUrl) {
        return res.status(200).json({ status: 'ok', proxy: 'offline', message: 'Backend server not configured' });
    }

    // Require authentication before proxying to the internal backend
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        await admin.auth().verifyIdToken(token);
    } catch {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Extract path and prevent path traversal attacks
    let rawPath = req.url.replace(/^\/api\/proxy/, '').replace(/^\/api/, '');
    if (!rawPath.startsWith('/')) rawPath = '/' + rawPath;

    try {
        const base = new URL(targetUrl.endsWith('/') ? targetUrl : `${targetUrl}/`);
        const resolved = new URL(rawPath.replace(/^\//, ''), base);

        if (!resolved.pathname.startsWith(base.pathname)) {
            return res.status(400).json({ error: 'Invalid path: path traversal detected' });
        }

        const destUrl = resolved.toString();
        const headers = { ...req.headers };
        delete headers.host;

        const options = { method: req.method, headers };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            options.body = Buffer.concat(chunks);
        }

        const response = await fetch(destUrl, options);
        response.headers.forEach((value, name) => {
            res.setHeader(name, value);
        });
        res.status(response.status);
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('[Proxy Error]:', error);
        res.status(500).json({ error: 'Proxy failed' });
    }
}

export const config = {
    api: {
        bodyParser: false,
        sizeLimit: '10mb',
    },
};
