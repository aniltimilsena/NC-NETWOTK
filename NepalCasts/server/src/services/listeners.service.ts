import { db, admin } from '../config';

const startupTime = admin.firestore.Timestamp.now();

export function startFirestoreListeners(): void {
  console.log("🔥 Starting background Firestore listeners for Push Notifications...");

  // 1. Notifications Listener
  db.collection('notifications')
    .where('createdAt', '>', startupTime)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const notif = change.doc.data();

          if (notif.pushSent === true || notif.read === true || notif.isRead === true) return;

          try {
            const recipientId = notif.recipientId || notif.userId || notif.receiverId;
            if (!recipientId) return;

            const settingsDoc = await db.collection('users').doc(recipientId).collection('private').doc('settings').get();
            const fcmTokens = settingsDoc.data()?.fcmTokens;

            if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
              const payload = {
                notification: {
                  title: notif.title || 'New Notification',
                  body: notif.body || '',
                  icon: notif.senderAvatar || '/logo.png',
                },
                data: {
                  link: notif.targetUrl || '/',
                },
                tokens: fcmTokens,
              };

              const response = await admin.messaging().sendEachForMulticast(payload);
              console.log(`[Push Notification] Sent ${response.successCount} pushes for notification ${docId}`);
            }

            await db.collection('notifications').doc(docId).update({ pushSent: true });
          } catch (err) {
            console.error(`[Push Notification] Error sending for notification ${docId}:`, err);
          }
        }
      });
    }, (error) => {
      console.error("[Push Notification] Notifications listener error:", error);
    });

  // 2. Calls Listener
  db.collection('calls')
    .where('createdAt', '>', startupTime)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const call = change.doc.data();

          if (call.status !== 'pending' && call.callStatus !== 'pending') return;

          try {
            const calleeId = call.calleeId;
            if (!calleeId) return;

            const settingsDoc = await db.collection('users').doc(calleeId).collection('private').doc('settings').get();
            const fcmTokens = settingsDoc.data()?.fcmTokens;

            if (fcmTokens && Array.isArray(fcmTokens) && fcmTokens.length > 0) {
              const payload = {
                data: {
                  type: 'incoming_call',
                  callId: docId,
                  callerName: call.callerName || 'Someone',
                  callerAvatar: call.callerPhoto || call.callerAvatar || '/logo.png',
                  callType: call.callType || 'audio',
                  link: `/call/${docId}`,
                },
                tokens: fcmTokens,
              };

              const response = await admin.messaging().sendEachForMulticast(payload);
              console.log(`[Call Push] Sent ${response.successCount} call alert pushes for call ${docId}`);
            }
          } catch (err) {
            console.error(`[Call Push] Error sending alert for call ${docId}:`, err);
          }
        }
      });
    }, (error) => {
      console.error("[Call Push] Calls listener error:", error);
    });

  // 3. Casting Calls Listener
  db.collection('casting_calls')
    .where('createdAt', '>', startupTime)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const docId = change.doc.id;
          const casting = change.doc.data();

          try {
            const castingType = casting.type;
            if (!castingType) return;

            const profilesSnap = await db.collection('profiles').get();
            const matchingProfiles = profilesSnap.docs.filter(doc => {
              const data = doc.data();
              const userSkills = data.skills || [];
              const userRole = data.role || "";

              const roleMatches = typeof userRole === 'string' && userRole.toLowerCase() === castingType.toLowerCase();
              const skillMatches = Array.isArray(userSkills) && userSkills.some((skill: any) =>
                typeof skill === 'string' && skill.toLowerCase() === castingType.toLowerCase()
              );

              return roleMatches || skillMatches;
            });

            console.log(`[Casting Alert] Found ${matchingProfiles.length} matching profiles for casting type "${castingType}"`);

            for (const profileDoc of matchingProfiles) {
              const recipientId = profileDoc.id;
              if (recipientId === casting.createdBy) continue; 

              await db.collection('notifications').add({
                userId: recipientId,
                recipientId: recipientId,
                receiverId: recipientId,
                senderId: casting.createdBy || 'system',
                senderName: casting.creatorName || casting.production || 'NC Network',
                senderAvatar: casting.thumbnail || '/logo.png',
                title: 'Matching Casting Call',
                body: `New ${castingType} casting call: "${casting.title}" in ${casting.location}`,
                type: 'casting',
                notificationType: 'casting',
                isRead: false,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                targetUrl: `/casting/${docId}`,
                profileUrl: `/casting/${docId}`,
              });
            }
          } catch (err) {
            console.error(`[Casting Alert] Error creating notifications for casting call ${docId}:`, err);
          }
        }
      });
    }, (error) => {
      console.error("[Casting Alert] Casting calls listener error:", error);
    });
}
