const express = require('express');
const router = express.Router();
const {
  savePortfolio,
  saveDraft,
  updatePortfolio,
  getAllPortfolios,
  getActivePortfolios,
  getDraftPortfolios,
  getArchivedPortfolios,
  getPortfolioById,
  archivePortfolio,
  unarchivePortfolio,
  deletePortfolio
} = require('../controllers/portfolioController');

// Portfolio management routes

// POST /api/portfolios - Save active portfolio
router.post('/', savePortfolio);

// GET /api/portfolios - Get all portfolios (with optional status filter)
router.get('/', getAllPortfolios);

// POST /api/portfolios/drafts - Save draft portfolio
router.post('/drafts', saveDraft);

// GET /api/portfolios/active - Get active portfolios
router.get('/active', getActivePortfolios);

// GET /api/portfolios/drafts - Get draft portfolios
router.get('/drafts', getDraftPortfolios);

// GET /api/portfolios/archived - Get archived portfolios
router.get('/archived', getArchivedPortfolios);

// GET /api/portfolios/:portfolio_id - Get portfolio by ID (must be after specific routes)
router.get('/:portfolio_id', getPortfolioById);

// PUT /api/portfolios/:portfolio_id - Update portfolio/draft
router.put('/:portfolio_id', updatePortfolio);

// PATCH /api/portfolios/:portfolio_id/archive - Archive portfolio
router.patch('/:portfolio_id/archive', archivePortfolio);

// PATCH /api/portfolios/:portfolio_id/unarchive - Unarchive portfolio
router.patch('/:portfolio_id/unarchive', unarchivePortfolio);

// DELETE /api/portfolios/:portfolio_id - Delete portfolio
router.delete('/:portfolio_id', deletePortfolio);

module.exports = router;


