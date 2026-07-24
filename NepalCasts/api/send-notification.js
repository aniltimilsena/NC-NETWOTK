


import admin from 'firebase-admin';


if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'nc-network-10d0b'
  });
}

export default async function handler(req, res) {
  
  const allowedOrigins = [
    'https://nc-netwotk.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (authError) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const senderId = decodedToken.uid;
    const { convoId, senderName, previewText, otherParticipants } = req.body;

    
    if (
      !convoId || typeof convoId !== 'string' || convoId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(convoId) ||
      !senderName || typeof senderName !== 'string' || senderName.length > 100 ||
      !previewText || typeof previewText !== 'string' || previewText.length > 500 ||
      !otherParticipants || !Array.isArray(otherParticipants) || otherParticipants.length > 50
    ) {
      return res.status(400).json({ error: 'Bad Request: Invalid or missing parameters' });
    }

    
    for (const uid of otherParticipants) {
      if (typeof uid !== 'string' || uid.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(uid)) {
        return res.status(400).json({ error: 'Bad Request: Invalid recipient format' });
      }
    }

    
    const recipients = otherParticipants.filter(uid => uid !== senderId);
    if (recipients.length === 0) {
      return res.status(200).json({ success: true, message: 'No recipients to notify' });
    }

    
    const appId = process.env.ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const payload = {
      app_id: appId,
      contents: { en: previewText },
      headings: { en: `New Message from ${senderName}` },
      url: `https://nc-netwotk.vercel.app/messages/${convoId}`,
      include_aliases: {
        external_id: recipients,
      },
      buttons: [
        { id: 'reply_chat', text: 'Reply' },
        { id: 'view_chat', text: 'Open Chat' }
      ],
      target_channel: 'push',
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: 'Notification gateway error' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
