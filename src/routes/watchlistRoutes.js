const express = require('express');
const router = express.Router();
const {
  getAllWatchlists,
  createWatchlist,
  getWatchlistStocks,
  addStockToWatchlist,
  removeStockFromWatchlist
} = require('../controllers/watchlistController');

// Watchlist management routes
// GET /watchlists - Get all watchlists
router.get('/', getAllWatchlists);

// POST /watchlists - Create a new watchlist
router.post('/', createWatchlist);

// Stock management routes for specific watchlist
// GET /watchlists/:watchlistId/stocks - Get stocks in a watchlist
router.get('/:watchlistId/stocks', getWatchlistStocks);

// POST /watchlists/:watchlistId/stocks - Add stock to watchlist
router.post('/:watchlistId/stocks', addStockToWatchlist);

// DELETE /watchlists/:watchlistId/stocks/:ticker - Remove stock from watchlist
router.delete('/:watchlistId/stocks/:ticker', removeStockFromWatchlist);

module.exports = router;