const targetUrl = process.env.SERVER_URL || null;
export default async function handler(req, res) {
    if (!targetUrl) {
        // Return clean JSON instead of crashing proxy
        return res.status(200).json({ status: 'ok', proxy: 'offline', message: 'Backend server not configured' });
    }
    
    // Extract path and prevent path traversal attacks
    let rawPath = req.url.replace(/^\/api\/proxy/, '').replace(/^\/api/, '');
    // Ensure path starts with / and strip query string for path checking
    if (!rawPath.startsWith('/')) rawPath = '/' + rawPath;

    // Use URL normalization to verify path safety
    try {
        const base = new URL(targetUrl.endsWith('/') ? targetUrl : `${targetUrl}/`);
        const resolved = new URL(rawPath.replace(/^\//, ''), base);
        
        // Ensure resolved URL starts with base URL path
        if (!resolved.pathname.startsWith(base.pathname)) {
            return res.status(400).json({ error: 'Invalid path: path traversal detected' });
        }
        
        const destUrl = resolved.toString();

        const headers = { ...req.headers };
        delete headers.host;
        const options = {
            method: req.method,
            headers,
        };
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
    }
    catch (error) {
        console.error('[Proxy Error]:', error);
        res.status(500).json({ error: 'Proxy failed', message: error.message });
    }
}
export const config = {
    api: {
        bodyParser: false,
        sizeLimit: '50mb',
    },
};
