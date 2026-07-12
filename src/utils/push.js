require('../config/firebase');
const { getMessaging } = require('firebase-admin/messaging');
const logger = require('./logger');

// Sends a push notification to a single FCM token.
// Never throws — a notification failure must not fail the caller's request.
async function sendPushNotification(fcmToken, { title, body, data = {} }) {
  if (!fcmToken) return { sent: false, reason: 'No FCM token' };

  try {
    await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
    return { sent: true };
  } catch (err) {
    logger.error(`🔥 Push notification failed: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendPushNotification };
