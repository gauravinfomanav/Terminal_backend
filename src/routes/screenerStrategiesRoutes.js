const express = require('express');
const router = express.Router();
const {
  createStrategy,
  getAllStrategies,
  getStrategyById,
  deleteStrategy
} = require('../controllers/screenerStrategiesController');

// POST /api/screener/strategies - Create a new strategy
router.post('/', createStrategy);

// GET /api/screener/strategies - Get all strategies
router.get('/', getAllStrategies);

// GET /api/screener/strategies/:strategyId - Get single strategy by ID
router.get('/:strategyId', getStrategyById);

// DELETE /api/screener/strategies/:strategyId - Delete a strategy
router.delete('/:strategyId', deleteStrategy);

module.exports = router;

