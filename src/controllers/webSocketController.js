const webSocketPriceService = require('../services/webSocketPriceService');

// Get WebSocket connection status
const getWebSocketStatus = async (req, res) => {
  try {
    const status = webSocketPriceService.getConnectionStatus();
    
    res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    console.error('Error in getWebSocketStatus:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get current cached prices
const getCurrentPrices = async (req, res) => {
  try {
    const prices = webSocketPriceService.getAllPrices();
    
    res.status(200).json({
      status: 'success',
      data: prices,
      count: Object.keys(prices).length
    });
  } catch (error) {
    console.error('Error in getCurrentPrices:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  getWebSocketStatus,
  getCurrentPrices
};





