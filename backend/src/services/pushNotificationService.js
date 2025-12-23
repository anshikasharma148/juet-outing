const admin = require('firebase-admin');

let initialized = false;

const initializeFirebase = () => {
  if (initialized) return;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
      console.log('Firebase initialized');
    } else {
      console.log('Firebase not configured - push notifications will be logged only');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!initialized) {
    initializeFirebase();
  }

  if (!pushToken) {
    return { success: false, error: 'No push token provided' };
  }

  if (!admin.apps.length) {
    console.log(`[Push Notification] ${title}: ${body}`, data);
    return { success: true, message: 'Notification logged (Firebase not configured)' };
  }

  try {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      token: pushToken
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Firebase messaging error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPushNotification, initializeFirebase };

