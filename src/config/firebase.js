const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const logger = require('../utils/logger');

// Prefer the FIREBASE_SERVICE_ACCOUNT env var (the key JSON as a single-line
// string) so the secret never has to live in the repo — needed for hosts like
// Render. Falls back to the local file for local development.
function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  const localPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(localPath)) {
    return require(localPath);
  }

  throw new Error(
    'Firebase credentials not found: set FIREBASE_SERVICE_ACCOUNT env var or add src/config/serviceAccountKey.json'
  );
}

if (!getApps().length) {
  const serviceAccount = loadServiceAccount();
  initializeApp({ credential: cert(serviceAccount) });
  logger.info(`🔥 Firebase Admin initialized for project: ${serviceAccount.project_id}`);
}
