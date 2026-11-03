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

import crypto from 'crypto';

const jwksCache = new Map();

function isValidClerkIssuer(iss) {
    if (typeof iss !== 'string') return false;
    try {
        const parsed = new URL(iss);
        if (parsed.protocol !== 'https:') return false;

        const configuredIssuer = process.env.CLERK_ISSUER_URL;
        if (configuredIssuer && iss.replace(/\/$/, '') === configuredIssuer.replace(/\/$/, '')) {
            return true;
        }

        if (/^[a-zA-Z0-9-]+\.clerk\.accounts\.dev$/.test(parsed.hostname)) {
            return true;
        }
        if (parsed.hostname === 'clerk.com' || parsed.hostname.endsWith('.clerk.com')) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

async function verifyClerkToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;
        if (payload.nbf && payload.nbf > now) return null;

        if (!isValidClerkIssuer(payload.iss)) return null;

        const kid = header.kid;
        let publicKeyPem = null;

        if (kid) {
            const cached = jwksCache.get(kid);
            if (cached && cached.expiresAt > Date.now()) {
                publicKeyPem = cached.pem;
            } else {
                const parsedIss = new URL(payload.iss);
                const jwksUrl = `https://${parsedIss.hostname}/.well-known/jwks.json`;
                const res = await fetch(jwksUrl).catch(() => null);
                if (res && res.ok) {
                    const jwks = await res.json();
                    const key = jwks.keys?.find((k) => k.kid === kid);
                    if (key) {
                        const jwkKey = crypto.createPublicKey({ key, format: 'jwk' });
                        publicKeyPem = jwkKey.export({ type: 'spki', format: 'pem' });
                        jwksCache.set(kid, { pem: publicKeyPem, expiresAt: Date.now() + 3600000 });
                    }
                }
            }
        }

        if (publicKeyPem) {
            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(`${parts[0]}.${parts[1]}`);
            const isValid = verifier.verify(publicKeyPem, Buffer.from(parts[2], 'base64url'));
            if (!isValid) return null;
            return { uid: payload.sub, email: payload.email || payload.primary_email_address || '' };
        }
        return null;
    } catch {
        return null;
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
    let authed = false;
    try {
        await admin.auth().verifyIdToken(token);
        authed = true;
    } catch {
        const clerkUser = await verifyClerkToken(token);
        if (clerkUser) authed = true;
    }
    if (!authed) {
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
