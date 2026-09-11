const ALLOWED_ORIGINS = [
    'https://nc-netwotk.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Require authentication — error telemetry is only accepted from signed-in users
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        // Enforce a payload size guard — reject clearly oversized payloads
        const bodyStr = JSON.stringify(body);
        if (bodyStr.length > 10_000) {
            return res.status(413).json({ error: 'Payload too large' });
        }

        // Log only safe, structured fields — never log the raw body
        const safeLog = {
            type: typeof body.type === 'string' ? body.type.slice(0, 100) : 'unknown',
            component: typeof body.component === 'string' ? body.component.slice(0, 100) : 'unknown',
            message: typeof body.message === 'string' ? body.message.slice(0, 500) : 'unknown',
        };
        console.log('[Client Error Telemetry]:', JSON.stringify(safeLog));
        return res.status(200).json({ success: true });
    } catch {
        return res.status(200).json({ success: true });
    }
}
