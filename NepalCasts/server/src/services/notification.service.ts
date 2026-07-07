import * as admin from 'firebase-admin';

interface OneSignalNotificationPayload {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

export async function sendOneSignalNotification({ userIds, title, body, url }: OneSignalNotificationPayload): Promise<void> {
  const appId = process.env.ONESIGNAL_APP_ID || "a9962176-972c-4874-8161-ec84428e9036";
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!restApiKey || restApiKey === 'your_onesignal_rest_api_key_here') {
    console.warn("⚠️ OneSignal Notification skipped: ONESIGNAL_REST_API_KEY is placeholder or not defined.");
    return;
  }

  try {
    const payload = {
      app_id: appId,
      contents: { en: body },
      headings: { en: title },
      url: url ? `${process.env.APP_URL || 'http://localhost:5173'}${url}` : undefined,
      include_aliases: {
        external_id: userIds
      },
      target_channel: "push"
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${restApiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ OneSignal Notification failed:", data);
    } else {
      console.log("🚀 OneSignal Notification sent successfully:", data);
    }
  } catch (error) {
    console.error("❌ Failed to send OneSignal notification:", error);
  }
}

export async function sendFcmMulticastNotification(tokens: string[], title: string, body: string, link: string): Promise<void> {
  if (tokens.length === 0) return;

  const payload = {
    notification: {
      title,
      body,
      icon: '/logo.png',
    },
    data: {
      link,
    },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`${response.successCount} FCM push notifications were sent successfully`);
  } catch (err) {
    console.error('Failed to send FCM multicast notifications:', err);
  }
}

export async function sendFcmMulticastCallAlert(tokens: string[], callId: string, callerName: string, callerAvatar: string, callType: string): Promise<void> {
  if (tokens.length === 0) return;

  const payload = {
    data: {
      type: 'incoming_call',
      callId,
      callerName,
      callerAvatar,
      callType,
      link: `/call/${callId}`,
    },
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`[Call Push] Sent ${response.successCount} call alert pushes for call ${callId}`);
  } catch (err) {
    console.error(`[Call Push] Error sending alert for call ${callId}:`, err);
  }
}
