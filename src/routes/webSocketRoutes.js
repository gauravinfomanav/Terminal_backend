const express = require('express');
const router = express.Router();
const {
  getWebSocketStatus,
  getCurrentPrices
} = require('../controllers/webSocketController');

// WebSocket Status Routes
// GET /websocket/status - Get WebSocket connection status
router.get('/status', getWebSocketStatus);

// GET /websocket/prices - Get current cached prices
router.get('/prices', getCurrentPrices);

module.exports = router;





