const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let db;

const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      // Use environment variable to specify which service account to use
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../../serviceAccountKey.json';
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id // Use project ID from the service account
      });
    }
    
    db = admin.firestore();
    return db;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    throw error;
  }
};

// Get Firestore instance
const getFirestore = () => {
  if (!db) {
    return initializeFirebase();
  }
  return db;
};

module.exports = {
  initializeFirebase,
  getFirestore,
  admin
};