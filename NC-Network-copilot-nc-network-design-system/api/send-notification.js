// api/send-notification.js
// Uses ES module syntax to prevent ES module scope crashes on Vercel.

import admin from 'firebase-admin';

// Initialize admin SDK using the project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'nc-network-10d0b'
  });
}

export default async function handler(req, res) {
  // SECURITY FIX: Restrict CORS to known origins instead of wildcard
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
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

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
    
    // Verify Firebase ID Token securely
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (authError) {
      console.error('Token verification failed:', authError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const senderId = decodedToken.uid;
    const { convoId, senderName, previewText, otherParticipants } = req.body;

    if (!convoId || !senderName || !previewText || !otherParticipants || !Array.isArray(otherParticipants)) {
      return res.status(400).json({ error: 'Bad Request: Missing parameters' });
    }

    // Double check that sender is not notifying themselves
    const recipients = otherParticipants.filter(uid => uid !== senderId);
    if (recipients.length === 0) {
      return res.status(200).json({ success: true, message: 'No recipients to notify' });
    }

    // Send OneSignal push notification
    const appId = process.env.ONESIGNAL_APP_ID || 'a9962176-972c-4874-8161-ec84428e9036';
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!restApiKey) {
      console.error('OneSignal REST API Key is not configured in environment variables.');
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
      console.error('OneSignal notification call failed:', data);
      return res.status(502).json({ error: 'OneSignal API failed', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Internal serverless function error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
