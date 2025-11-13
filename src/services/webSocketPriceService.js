const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketPriceService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.subscribedTickers = new Set();
    this.priceCache = new Map(); // Cache for current prices
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 seconds
    this.wsUrl = 'ws://risepython.infomanav.in:6003/ws/price';
  }

  // Connect to WebSocket
  connect() {
    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send a heartbeat or keep-alive message if needed
        // Some WebSocket servers require immediate subscription
        if (this.subscribedTickers.size === 0) {
          // Send empty array to keep connection alive
          this.ws.send(JSON.stringify([]));
        } else {
          // Resubscribe to any previously subscribed tickers
          this.subscribeToTickers(Array.from(this.subscribedTickers));
        }
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handlePriceUpdate(message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('close', (code, reason) => {
        logger.warn(`WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
        this.isConnected = false;
        
        // Only attempt reconnection if it wasn't a clean close
        if (code !== 1000) { // 1000 = normal closure
          this.handleReconnect();
        }
      });
      
      this.ws.on('error', (error) => {
        logger.error('WebSocket error:', error.message);
        this.isConnected = false;
      });
      
      // Add ping/pong handling for keep-alive
      this.ws.on('ping', () => {
        this.ws.pong();
      });
      
    } catch (error) {
      logger.error('Error connecting to WebSocket:', error);
      this.handleReconnect();
    }
  }

  // Handle reconnection
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.warn(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval/1000} seconds...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      logger.error('Max reconnection attempts reached. WebSocket connection failed.');
    }
  }

  // Subscribe to tickers
  subscribeToTickers(tickers) {
    if (!this.isConnected || !this.ws) {
      tickers.forEach(ticker => this.subscribedTickers.add(ticker));
      return;
    }

    try {
      this.ws.send(JSON.stringify(tickers));
      
      // Add to subscribed tickers set
      tickers.forEach(ticker => this.subscribedTickers.add(ticker));
    } catch (error) {
      logger.error('Error subscribing to tickers:', error);
    }
  }

  // Unsubscribe from tickers
  unsubscribeFromTickers(tickers) {
    tickers.forEach(ticker => this.subscribedTickers.delete(ticker));
    
    // Note: The WebSocket API doesn't seem to support unsubscription
    // We'll just remove from our local tracking
  }

  // Handle incoming price updates
  handlePriceUpdate(message) {
    if (message.status === 'success' && message.type === 'trade' && message.data) {
      const priceData = message.data;
      
      // Update price cache
      Object.keys(priceData).forEach(ticker => {
        const stockData = priceData[ticker];
        this.priceCache.set(ticker, {
          symbol: stockData.symbol,
          price: stockData.price,
          volume: stockData.volume,
          timestamp: stockData.timestamp,
          date_time_utc: stockData.date_time_utc,
          last_updated: new Date()
        });
      });
    }
  }

  // Get current price for a ticker
  getCurrentPrice(ticker) {
    const priceData = this.priceCache.get(ticker.toUpperCase());
    return priceData ? priceData.price : null;
  }

  // Get all cached prices
  getAllPrices() {
    return Object.fromEntries(this.priceCache);
  }

  // Check if ticker is subscribed
  isSubscribed(ticker) {
    return this.subscribedTickers.has(ticker.toUpperCase());
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscribedTickers: Array.from(this.subscribedTickers),
      cachedPrices: this.priceCache.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  // Start the service
  start() {
    this.connect();
  }

  // Stop the service
  stop() {
    this.disconnect();
  }
}

// Create singleton instance
const webSocketPriceService = new WebSocketPriceService();

module.exports = webSocketPriceService;
