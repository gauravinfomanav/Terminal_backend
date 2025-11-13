const app = require('./src/app');
const connectDB = require('./src/config/database');
const priceMonitoringService = require('./src/services/priceMonitoringService');

const PORT = process.env.PORT || 3000;

// Connect to Firebase Firestore
connectDB();

// Start price monitoring service
priceMonitoringService.start();

// Start server
const server = app.listen(PORT, () => {
  // Server started silently
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  // Only log critical errors
  if (process.env.LOG_LEVEL !== 'silent') {
    console.error(`Unhandled Rejection: ${err.message}`);
  }
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  // Only log critical errors
  if (process.env.LOG_LEVEL !== 'silent') {
    console.error(`Uncaught Exception: ${err.message}`);
  }
  process.exit(1);
});

module.exports = server;
