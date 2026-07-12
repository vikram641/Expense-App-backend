const { initializeApp, cert, getApps } = require('firebase-admin/app');
const logger = require('../utils/logger');
const serviceAccount = require('./serviceAccountKey.json');

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
  logger.info(`🔥 Firebase Admin initialized for project: ${serviceAccount.project_id}`);
}
