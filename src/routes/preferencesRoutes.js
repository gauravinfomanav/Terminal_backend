const express = require('express');
const {
  getUserPreferences,
  setDefaultWatchlist,
  removeDefaultWatchlist
} = require('../controllers/preferencesController');

const router = express.Router();

// GET /user/preferences - Get user preferences including default watchlist
router.get('/', getUserPreferences);

// PUT /user/preferences/default-watchlist - Set default watchlist
router.put('/default-watchlist', setDefaultWatchlist);

// DELETE /user/preferences/default-watchlist - Remove default watchlist
router.delete('/default-watchlist', removeDefaultWatchlist);

module.exports = router;
