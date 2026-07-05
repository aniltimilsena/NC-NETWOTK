


const targetUrl = process.env.SERVER_URL || 'http://localhost:5000/api';

export default async function handler(req, res) {
  if (!process.env.SERVER_URL) {
    console.warn('SERVER_URL environment variable is not configured. Falling back to localhost.');
  }

  
  const path = req.url.replace(/^\/api/, '');
  const destUrl = `${targetUrl.replace(/\/$/, '')}${path}`;

  try {
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
  } catch (error) {
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
