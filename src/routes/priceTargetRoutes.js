const express = require('express');
const router = express.Router();
const {
  createPriceTarget,
  getUserPriceTargets,
  getWatchlistPriceTargets,
  updatePriceTarget,
  deletePriceTarget,
  getPriceTargetById
} = require('../controllers/priceTargetController');

// Price Target Management Routes
// POST /targets - Create a new price target
router.post('/', createPriceTarget);

// GET /targets - Get all price targets for user (with optional watchlist filter)
router.get('/', getUserPriceTargets);

// GET /targets/watchlist/:watchlistId - Get price targets for specific watchlist
router.get('/watchlist/:watchlistId', getWatchlistPriceTargets);

// GET /targets/:id - Get specific price target
router.get('/:id', getPriceTargetById);

// PUT /targets/:id - Update price target
router.put('/:id', updatePriceTarget);

// DELETE /targets/:id - Delete price target
router.delete('/:id', deletePriceTarget);

module.exports = router;
