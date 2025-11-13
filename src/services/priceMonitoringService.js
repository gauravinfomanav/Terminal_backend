const { getFirestore } = require('../config/firebase');
const { admin } = require('../config/firebase');
const webSocketPriceService = require('./webSocketPriceService');
const cron = require('node-cron');
const logger = require('../utils/logger');

class PriceMonitoringService {
  constructor() {
    this.db = getFirestore();
    this.isRunning = false;
    this.webSocketService = webSocketPriceService;
    this.monitoredTickers = new Set(); // Track which tickers we're monitoring
  }

  // Start the price monitoring service
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Run every 5 minutes to check targets
    cron.schedule('*/5 * * * *', async () => {
      await this.checkAllPriceTargets();
    });

    // Check if there are existing targets first
    this.checkAndStartWebSocket();
  }

  // Check if we need to start WebSocket and subscribe to existing targets
  async checkAndStartWebSocket() {
    try {
      const userId = 'user123';
      
      // Get all active price targets
      const targetsRef = this.db.collection('price_targets').doc(userId).collection('targets');
      const snapshot = await targetsRef.where('is_active', '==', true).where('triggered', '==', false).get();
      
      if (snapshot.empty) {
        return;
      }

      // Start WebSocket and subscribe to existing targets
      this.webSocketService.start();
      
      // Wait a bit for WebSocket to connect, then subscribe
      setTimeout(async () => {
        await this.subscribeToExistingTargets();
      }, 3000); // Wait 3 seconds for WebSocket to connect
      
    } catch (error) {
      logger.error('Error checking existing targets:', error);
    }
  }

  // Stop the price monitoring service
  stop() {
    this.isRunning = false;
    this.webSocketService.stop();
  }

  // Subscribe to existing price targets
  async subscribeToExistingTargets() {
    try {
      const userId = 'user123';
      
      // Get all active price targets
      const targetsRef = this.db.collection('price_targets').doc(userId).collection('targets');
      const snapshot = await targetsRef.where('is_active', '==', true).where('triggered', '==', false).get();
      
      if (snapshot.empty) {
        return;
      }

      const tickers = [];
      snapshot.forEach(doc => {
        const ticker = doc.data().ticker;
        tickers.push(ticker);
        this.monitoredTickers.add(ticker);
      });

      this.webSocketService.subscribeToTickers(tickers);
    } catch (error) {
      logger.error('Error subscribing to existing targets:', error);
    }
  }

  // Get current stock price from WebSocket cache
  getCurrentStockPrice(ticker) {
    const price = this.webSocketService.getCurrentPrice(ticker);
    return price;
  }

  // Check all active price targets
  async checkAllPriceTargets() {
    try {
      const userId = 'user123'; // Using hardcoded user for now
      
      // Get all active price targets
      const targetsRef = this.db.collection('price_targets').doc(userId).collection('targets');
      const snapshot = await targetsRef.where('is_active', '==', true).where('triggered', '==', false).get();
      
      if (snapshot.empty) {
        return;
      }

      for (const doc of snapshot.docs) {
        const target = doc.data();
        await this.checkPriceTarget(target);
      }
    } catch (error) {
      logger.error('Error in checkAllPriceTargets:', error);
    }
  }

  // Check individual price target
  async checkPriceTarget(target) {
    try {
      const currentPrice = this.getCurrentStockPrice(target.ticker);
      
      if (currentPrice === null) {
        return;
      }

      // Update current price in database
      await this.updateTargetCurrentPrice(target.target_id, currentPrice);

      // Check if target is hit
      const isTargetHit = this.isTargetHit(currentPrice, target.target_price, target.alert_type);
      
      if (isTargetHit) {
        await this.handleTargetHit(target, currentPrice);
      }
    } catch (error) {
      logger.error(`Error checking target for ${target.ticker}:`, error);
    }
  }

  // Check if target price is hit
  isTargetHit(currentPrice, targetPrice, alertType) {
    if (alertType === 'above') {
      return currentPrice >= targetPrice;
    } else if (alertType === 'below') {
      return currentPrice <= targetPrice;
    }
    return false;
  }

  // Update current price in target document
  async updateTargetCurrentPrice(targetId, currentPrice) {
    try {
      const userId = 'user123';
      const targetRef = this.db.collection('price_targets').doc(userId).collection('targets').doc(targetId);
      await targetRef.update({
        current_price: currentPrice,
        last_price_check: new Date()
      });
    } catch (error) {
      logger.error('Error updating target current price:', error);
    }
  }

  // Handle when target price is hit
  async handleTargetHit(target, currentPrice) {
    try {
      const userId = 'user123';
      
      // Mark target as triggered
      const targetRef = this.db.collection('price_targets').doc(userId).collection('targets').doc(target.target_id);
      await targetRef.update({
        triggered: true,
        triggered_at: new Date(),
        triggered_price: currentPrice
      });

      // Send FCM notification with watchlist context
      await this.sendPriceAlertNotification(target, currentPrice);

      // Log notification in history
      await this.logNotification(target, currentPrice);

    } catch (error) {
      logger.error('Error handling target hit:', error);
    }
  }

  // Send FCM notification
  async sendPriceAlertNotification(target, currentPrice) {
    try {
      // Get all active FCM tokens for user
      const tokensRef = this.db.collection('fcm_tokens').doc('user123').collection('tokens');
      const snapshot = await tokensRef.where('is_active', '==', true).get();
      
      if (snapshot.empty) {
        logger.warn('No active FCM tokens found for user');
        return;
      }

      const tokens = [];
      snapshot.forEach(doc => {
        tokens.push(doc.data().token);
      });

      // Prepare notification message with watchlist context
      const message = {
        notification: {
          title: `🎯 ${target.ticker} Target Hit!`,
          body: `${target.ticker} reached $${currentPrice.toFixed(2)} (Target: $${target.target_price}) in ${target.watchlist_name}`
        },
        data: {
          ticker: target.ticker,
          current_price: currentPrice.toString(),
          target_price: target.target_price.toString(),
          alert_type: target.alert_type,
          target_id: target.target_id,
          watchlist_id: target.watchlist_id,
          watchlist_name: target.watchlist_name
        },
        tokens: tokens
      };

      // Send notification to each token individually
      // NOTE: APNs endpoint (production vs sandbox) is automatically handled by FCM
      // based on Firebase Console configuration. Ensure Firebase Console has:
      // 1. Production APNs Authentication Key uploaded (not sandbox)
      // 2. Correct iOS bundle ID configured
      // 3. Production environment selected for production apps
      let successCount = 0;
      let failureCount = 0;
      
      for (let i = 0; i < tokens.length; i++) {
        try {
          const singleMessage = {
            notification: message.notification,
            data: message.data,
            token: tokens[i],
            // APNs configuration is handled automatically by FCM based on Firebase Console settings
            // For production apps, ensure Firebase Console uses production APNs endpoint
            // (api.push.apple.com) - this is configured in Firebase Console, not in code
          };
          
          await admin.messaging().send(singleMessage);
          successCount++;
        } catch (error) {
          logger.warn(`Failed to send to token ${i + 1}: ${error.message}`);
          failureCount++;
        }
      }
      
      if (failureCount > 0) {
        logger.warn(`Failed to send to ${failureCount} devices`);
      }
    } catch (error) {
      logger.error('Error sending FCM notification:', error);
    }
  }

  // Log notification in history
  async logNotification(target, currentPrice) {
    try {
      const userId = 'user123';
      const notificationRef = this.db.collection('notification_history').doc(userId).collection('notifications');
      
      await notificationRef.add({
        target_id: target.target_id,
        ticker: target.ticker,
        target_price: target.target_price,
        current_price: currentPrice,
        alert_type: target.alert_type,
        watchlist_id: target.watchlist_id,
        watchlist_name: target.watchlist_name,
        sent_at: new Date(),
        status: 'sent'
      });
    } catch (error) {
      logger.error('Error logging notification:', error);
    }
  }

  // Subscribe to new ticker when target is created
  async subscribeToNewTicker(ticker) {
    if (!this.monitoredTickers.has(ticker)) {
      // Start WebSocket if not already running
      if (!this.webSocketService.isConnected) {
        this.webSocketService.start();
        
        // Wait for connection before subscribing
        setTimeout(() => {
          this.webSocketService.subscribeToTickers([ticker]);
          this.monitoredTickers.add(ticker);
        }, 2000);
      } else {
        // WebSocket is already running, subscribe immediately
        this.webSocketService.subscribeToTickers([ticker]);
        this.monitoredTickers.add(ticker);
      }
    }
  }

  // Get WebSocket service status
  getWebSocketStatus() {
    return this.webSocketService.getConnectionStatus();
  }
}

// Create singleton instance
const priceMonitoringService = new PriceMonitoringService();

module.exports = priceMonitoringService;
