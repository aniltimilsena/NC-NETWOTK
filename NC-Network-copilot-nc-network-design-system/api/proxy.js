// api/proxy.js
const targetUrl = process.env.SERVER_URL || 'http://localhost:5000/api';

module.exports = async (req, res) => {
  if (!process.env.SERVER_URL) {
    console.warn('SERVER_URL environment variable is not configured. Falling back to localhost.');
  }

  // Remove the '/api' prefix and forward to the server URL
  const path = req.url.replace(/^\/api/, '');
  const destUrl = `${targetUrl.replace(/\/$/, '')}${path}`;

  try {
    const headers = { ...req.headers };
    // Remove host header to avoid SSL certificate issues
    delete headers.host;

    const options = {
      method: req.method,
      headers,
    };

    // Forward the request body stream for non-GET/HEAD methods
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      options.body = Buffer.concat(chunks);
    }

    const response = await fetch(destUrl, options);
    
    // Copy response headers to Vercel's response
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    res.status(response.status);

    // Read the response buffer and send it
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[Proxy Error]:', error);
    res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
};

// Disable body parsing so that req can be streamed directly to the backend
module.exports.config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb',
  },
};
