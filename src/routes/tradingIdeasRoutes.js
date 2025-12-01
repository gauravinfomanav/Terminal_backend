const express = require('express');
const router = express.Router();
const {
  getTradingIdeas,
  createTradingIdea
} = require('../controllers/tradingIdeasController');

router.get('/', getTradingIdeas);
router.post('/', createTradingIdea);

module.exports = router;




