const { initializeFirebase } = require('./firebase');

const connectDB = async () => {
  try {
    const db = initializeFirebase();
    console.log('Firebase Firestore connected successfully');
    return db;
  } catch (error) {
    console.error('Firebase connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;