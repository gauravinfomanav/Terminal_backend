const WebSocket = require('ws');

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
      console.log('Connecting to WebSocket price feed...');
      
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected to price feed');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send a heartbeat or keep-alive message if needed
        // Some WebSocket servers require immediate subscription
        if (this.subscribedTickers.size === 0) {
          console.log('No tickers subscribed yet, sending empty subscription to keep connection alive');
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
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('close', (code, reason) => {
        console.log(`WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
        this.isConnected = false;
        
        // Only attempt reconnection if it wasn't a clean close
        if (code !== 1000) { // 1000 = normal closure
          this.handleReconnect();
        }
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
        this.isConnected = false;
      });
      
      // Add ping/pong handling for keep-alive
      this.ws.on('ping', () => {
        console.log('Received ping from server');
        this.ws.pong();
      });
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.handleReconnect();
    }
  }

  // Handle reconnection
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval/1000} seconds...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached. WebSocket connection failed.');
    }
  }

  // Subscribe to tickers
  subscribeToTickers(tickers) {
    if (!this.isConnected || !this.ws) {
      console.log('WebSocket not connected. Will subscribe when connected.');
      tickers.forEach(ticker => this.subscribedTickers.add(ticker));
      return;
    }

    console.log(`Subscribing to tickers: ${tickers.join(', ')}`);
    
    try {
      this.ws.send(JSON.stringify(tickers));
      
      // Add to subscribed tickers set
      tickers.forEach(ticker => this.subscribedTickers.add(ticker));
      
      console.log(`✅ Subscribed to ${tickers.length} tickers`);
    } catch (error) {
      console.error('Error subscribing to tickers:', error);
    }
  }

  // Unsubscribe from tickers
  unsubscribeFromTickers(tickers) {
    tickers.forEach(ticker => this.subscribedTickers.delete(ticker));
    
    // Note: The WebSocket API doesn't seem to support unsubscription
    // We'll just remove from our local tracking
    console.log(`Unsubscribed from tickers: ${tickers.join(', ')}`);
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
      
      console.log(`📈 Price update received for ${Object.keys(priceData).join(', ')}`);
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
    console.log('WebSocket disconnected');
  }

  // Start the service
  start() {
    console.log('Starting WebSocket price service...');
    this.connect();
  }

  // Stop the service
  stop() {
    console.log('Stopping WebSocket price service...');
    this.disconnect();
  }
}

// Create singleton instance
const webSocketPriceService = new WebSocketPriceService();

module.exports = webSocketPriceService;
