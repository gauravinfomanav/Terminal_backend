const { getFirestore, admin } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// Constants
const VALID_RISK_PROFILES = ['Conservative', 'Moderate', 'Aggressive', 'Tactical', 'Income', 'Balanced'];
const VALID_STRATEGY_TYPES = ['Growth', 'Value', 'Dividend', 'Thematic', 'Balanced'];
const VALID_INVESTMENT_HORIZONS = ['6 Months', '1 Year', '3 Years', '5 Years', '7 Years', '10 Years'];
const MIN_RATE_OF_RETURN = 8.0;
const MAX_RATE_OF_RETURN = 30.0;

// Helper function to convert investment horizon to years
const getYearsFromHorizon = (horizon) => {
  const mapping = {
    '6 Months': 0.5,
    '1 Year': 1.0,
    '3 Years': 3.0,
    '5 Years': 5.0,
    '7 Years': 7.0,
    '10 Years': 10.0
  };
  return mapping[horizon] || 0;
};

// Calculate estimated returns using compound interest
const calculateEstimatedReturns = (initialCapital, rateOfReturn, investmentHorizon) => {
  if (!initialCapital || !rateOfReturn || !investmentHorizon) {
    return 0;
  }
  const years = getYearsFromHorizon(investmentHorizon);
  const rate = rateOfReturn / 100;
  const totalValue = initialCapital * Math.pow(1 + rate, years);
  return totalValue - initialCapital; // Returns only (not total value)
};

// Calculate allocation for holdings
const calculateAllocations = (holdings, initialCapital) => {
  if (!holdings || holdings.length === 0) {
    return {
      allocatedAmount: 0,
      allocationPercent: 0,
      holdings: []
    };
  }

  const processedHoldings = holdings.map(holding => {
    const allocationAmount = (holding.current_price || 0) * (holding.quantity || 0);
    const allocationPercent = initialCapital > 0 
      ? (allocationAmount / initialCapital) * 100 
      : 0;

    return {
      ...holding,
      allocation_amount: allocationAmount,
      allocation_percent: allocationPercent
    };
  });

  const allocatedAmount = processedHoldings.reduce(
    (sum, holding) => sum + (holding.allocation_amount || 0),
    0
  );
  const allocationPercent = initialCapital > 0 
    ? (allocatedAmount / initialCapital) * 100 
    : 0;

  return {
    allocatedAmount,
    allocationPercent,
    holdings: processedHoldings
  };
};

// Validate portfolio data
const validatePortfolio = (data, isDraft = false) => {
  const errors = {};

  if (!isDraft) {
    if (!data.portfolio_name || !data.portfolio_name.trim()) {
      errors.portfolio_name = ['Portfolio name is required'];
    }

    if (!data.client_name || !data.client_name.trim()) {
      errors.client_name = ['Client name is required'];
    }

    if (!data.initial_capital || data.initial_capital <= 0) {
      errors.initial_capital = ['Initial capital must be greater than 0'];
    }

    if (!data.holdings || !Array.isArray(data.holdings) || data.holdings.length === 0) {
      errors.holdings = ['At least one holding is required'];
    } else {
      data.holdings.forEach((holding, index) => {
        if (!holding.ticker || !holding.ticker.trim()) {
          errors[`holdings[${index}].ticker`] = ['Ticker is required'];
        }
        if (!holding.quantity || holding.quantity <= 0) {
          errors[`holdings[${index}].quantity`] = ['Quantity must be greater than 0'];
        }
        if (!holding.current_price || holding.current_price <= 0) {
          errors[`holdings[${index}].current_price`] = ['Current price must be greater than 0'];
        }
        if (!holding.target_price || holding.target_price <= 0) {
          errors[`holdings[${index}].target_price`] = ['Target price is required'];
        }
      });
    }
  } else {
    // Draft validation - only portfolio_name is required
    if (!data.portfolio_name || !data.portfolio_name.trim()) {
      errors.portfolio_name = ['Portfolio name is required'];
    }
  }

  // Validate optional fields if provided
  if (data.risk_profile && !VALID_RISK_PROFILES.includes(data.risk_profile)) {
    errors.risk_profile = [`Risk profile must be one of: ${VALID_RISK_PROFILES.join(', ')}`];
  }

  if (data.strategy_type && !VALID_STRATEGY_TYPES.includes(data.strategy_type)) {
    errors.strategy_type = [`Strategy type must be one of: ${VALID_STRATEGY_TYPES.join(', ')}`];
  }

  if (data.investment_horizon && !VALID_INVESTMENT_HORIZONS.includes(data.investment_horizon)) {
    errors.investment_horizon = [`Investment horizon must be one of: ${VALID_INVESTMENT_HORIZONS.join(', ')}`];
  }

  if (data.expected_rate_of_return !== undefined && data.expected_rate_of_return !== null) {
    if (data.expected_rate_of_return < MIN_RATE_OF_RETURN || data.expected_rate_of_return > MAX_RATE_OF_RETURN) {
      errors.expected_rate_of_return = [`Expected rate of return must be between ${MIN_RATE_OF_RETURN} and ${MAX_RATE_OF_RETURN}`];
    }
  }

  return errors;
};

// Format portfolio document for response
const formatPortfolioResponse = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    portfolio_name: data.portfolio_name,
    client_name: data.client_name,
    client_age: data.client_age || null,
    risk_profile: data.risk_profile || null,
    strategy_type: data.strategy_type || null,
    benchmark: data.benchmark || null,
    objective: data.objective || null,
    initial_capital: data.initial_capital || 0,
    investment_horizon: data.investment_horizon || null,
    expected_rate_of_return: data.expected_rate_of_return || null,
    commentary: data.commentary || null,
    allocated_amount: data.allocated_amount || 0,
    allocation_percent: data.allocation_percent || 0,
    estimated_returns: data.estimated_returns || 0,
    holdings_count: data.holdings_count || 0,
    holdings: data.holdings || [],
    status: data.status || 'active',
    created_at: data.created_at?.toDate?.()?.toISOString() || null,
    updated_at: data.updated_at?.toDate?.()?.toISOString() || null,
    archived_at: data.archived_at?.toDate?.()?.toISOString() || null,
    archive_reason: data.archive_reason || null
  };
};

// POST /api/portfolios - Save active portfolio
const savePortfolio = async (req, res) => {
  try {
    const db = getFirestore();
    const portfolioData = req.body;

    // Validate portfolio data
    const validationErrors = validatePortfolio(portfolioData, false);
    if (Object.keys(validationErrors).length > 0) {
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Calculate allocations
    const { allocatedAmount, allocationPercent, holdings } = calculateAllocations(
      portfolioData.holdings,
      portfolioData.initial_capital
    );

    // Calculate estimated returns
    const estimatedReturns = calculateEstimatedReturns(
      portfolioData.initial_capital,
      portfolioData.expected_rate_of_return,
      portfolioData.investment_horizon
    );

    // Add IDs to holdings
    const holdingsWithIds = holdings.map(holding => ({
      id: holding.id || uuidv4(),
      ...holding
    }));

    // Create portfolio document
    const portfolioId = `portfolio_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const portfolioDoc = {
      portfolio_name: portfolioData.portfolio_name.trim(),
      client_name: portfolioData.client_name.trim(),
      client_age: portfolioData.client_age || null,
      risk_profile: portfolioData.risk_profile || null,
      strategy_type: portfolioData.strategy_type || null,
      benchmark: portfolioData.benchmark || null,
      objective: portfolioData.objective || null,
      initial_capital: portfolioData.initial_capital,
      investment_horizon: portfolioData.investment_horizon || null,
      expected_rate_of_return: portfolioData.expected_rate_of_return || null,
      commentary: portfolioData.commentary || null,
      allocated_amount: allocatedAmount,
      allocation_percent: allocationPercent,
      estimated_returns: estimatedReturns,
      holdings_count: holdingsWithIds.length,
      holdings: holdingsWithIds,
      status: 'active',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('portfolios').doc(portfolioId).set(portfolioDoc);

    // Fetch the created document
    const createdDoc = await db.collection('portfolios').doc(portfolioId).get();
    const responseData = formatPortfolioResponse(createdDoc);

    res.status(200).json({
      status: 'success',
      message: 'Portfolio saved successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error in savePortfolio:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// POST /api/portfolios/drafts - Save draft portfolio
const saveDraft = async (req, res) => {
  try {
    const db = getFirestore();
    const portfolioData = req.body;

    // Validate draft data (relaxed validation)
    const validationErrors = validatePortfolio(portfolioData, true);
    if (Object.keys(validationErrors).length > 0) {
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Calculate allocations if holdings exist
    let allocatedAmount = 0;
    let allocationPercent = 0;
    let holdingsWithIds = [];
    
    if (portfolioData.holdings && Array.isArray(portfolioData.holdings) && portfolioData.holdings.length > 0) {
      const { allocatedAmount: amt, allocationPercent: pct, holdings } = calculateAllocations(
        portfolioData.holdings,
        portfolioData.initial_capital || 0
      );
      allocatedAmount = amt;
      allocationPercent = pct;
      holdingsWithIds = holdings.map(holding => ({
        id: holding.id || uuidv4(),
        ...holding
      }));
    }

    // Create draft document
    const draftId = `draft_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const draftDoc = {
      portfolio_name: portfolioData.portfolio_name.trim(),
      client_name: portfolioData.client_name || null,
      client_age: portfolioData.client_age || null,
      risk_profile: portfolioData.risk_profile || null,
      strategy_type: portfolioData.strategy_type || null,
      benchmark: portfolioData.benchmark || null,
      objective: portfolioData.objective || null,
      initial_capital: portfolioData.initial_capital || 0,
      investment_horizon: portfolioData.investment_horizon || null,
      expected_rate_of_return: portfolioData.expected_rate_of_return || null,
      commentary: portfolioData.commentary || null,
      allocated_amount: allocatedAmount,
      allocation_percent: allocationPercent,
      estimated_returns: 0,
      holdings_count: holdingsWithIds.length,
      holdings: holdingsWithIds,
      status: 'draft',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('portfolios').doc(draftId).set(draftDoc);

    // Fetch the created document
    const createdDoc = await db.collection('portfolios').doc(draftId).get();
    const responseData = formatPortfolioResponse(createdDoc);

    res.status(200).json({
      status: 'success',
      message: 'Draft saved successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error in saveDraft:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// PUT /api/portfolios/:portfolio_id - Update portfolio/draft
const updatePortfolio = async (req, res) => {
  try {
    const db = getFirestore();
    const { portfolio_id } = req.params;
    const portfolioData = req.body;

    // Check if portfolio exists
    const portfolioRef = db.collection('portfolios').doc(portfolio_id);
    const portfolioDoc = await portfolioRef.get();

    if (!portfolioDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found'
      });
    }

    const existingData = portfolioDoc.data();
    const isDraft = existingData.status === 'draft';

    // Validate based on status
    const validationErrors = validatePortfolio(portfolioData, isDraft);
    if (Object.keys(validationErrors).length > 0) {
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Merge with existing data
    const updatedData = {
      ...existingData,
      ...portfolioData
    };

    // Recalculate allocations if holdings are provided
    if (portfolioData.holdings !== undefined) {
      const { allocatedAmount, allocationPercent, holdings } = calculateAllocations(
        portfolioData.holdings,
        updatedData.initial_capital || existingData.initial_capital || 0
      );
      updatedData.allocated_amount = allocatedAmount;
      updatedData.allocation_percent = allocationPercent;
      updatedData.holdings = holdings.map(holding => ({
        id: holding.id || uuidv4(),
        ...holding
      }));
      updatedData.holdings_count = updatedData.holdings.length;
    }

    // Recalculate estimated returns if relevant fields changed
    if (portfolioData.initial_capital !== undefined || 
        portfolioData.expected_rate_of_return !== undefined || 
        portfolioData.investment_horizon !== undefined) {
      updatedData.estimated_returns = calculateEstimatedReturns(
        updatedData.initial_capital,
        updatedData.expected_rate_of_return,
        updatedData.investment_horizon
      );
    }

    // Update document
    updatedData.updated_at = admin.firestore.FieldValue.serverTimestamp();
    
    // Clean up undefined values
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key] === undefined) {
        delete updatedData[key];
      }
    });

    await portfolioRef.update(updatedData);

    // Fetch updated document
    const updatedDoc = await portfolioRef.get();
    const responseData = formatPortfolioResponse(updatedDoc);

    res.status(200).json({
      status: 'success',
      message: 'Portfolio updated successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error in updatePortfolio:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /api/portfolios - Get all portfolios (with optional status filter)
const getAllPortfolios = async (req, res) => {
  try {
    const db = getFirestore();
    const {
      page = 1,
      limit = 20,
      sort_by = 'updated_at',
      sort_order = 'desc',
      search,
      status // Optional: filter by status (active, draft, archived)
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = db.collection('portfolios');

    // Apply status filter if provided
    if (status && ['active', 'draft', 'archived'].includes(status)) {
      query = query.where('status', '==', status);
    }

    // Apply search filter if provided
    if (search && search.trim()) {
      // Note: Firestore doesn't support full-text search natively
      // This is a simplified approach - you might want to use Algolia or similar for production
      query = query.where('portfolio_name', '>=', search.trim())
                   .where('portfolio_name', '<=', search.trim() + '\uf8ff');
    }

    // Get total count (before pagination)
    const allDocs = await query.get();
    const totalItems = allDocs.size;

    // Apply sorting and pagination
    // Note: Firestore doesn't support offset() directly
    // For page-based pagination, we fetch all and paginate in memory
    // For production with large datasets, consider cursor-based pagination
    const allSnapshot = await query.orderBy(sort_by, sort_order).get();
    const allPortfolios = allSnapshot.docs.map(doc => ({ doc, data: doc.data() }));
    
    // Apply pagination in memory
    const startIndex = offset;
    const endIndex = offset + limitNum;
    const paginatedDocs = allPortfolios.slice(startIndex, endIndex);

    const portfolios = paginatedDocs.map(({ doc, data }) => {
      return {
        id: doc.id,
        portfolio_name: data.portfolio_name,
        client_name: data.client_name,
        initial_capital: data.initial_capital || 0,
        allocated_amount: data.allocated_amount || 0,
        allocation_percent: data.allocation_percent || 0,
        holdings_count: data.holdings_count || 0,
        estimated_returns: data.estimated_returns || 0,
        investment_horizon: data.investment_horizon || null,
        expected_rate_of_return: data.expected_rate_of_return || null,
        strategy_type: data.strategy_type || null,
        risk_profile: data.risk_profile || null,
        status: data.status,
        last_updated: data.updated_at?.toDate?.()?.toISOString() || null,
        created_at: data.created_at?.toDate?.()?.toISOString() || null
      };
    });

    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        portfolios,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Error in getAllPortfolios:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /api/portfolios/active - Get active portfolios
const getActivePortfolios = async (req, res) => {
  try {
    const db = getFirestore();
    const {
      page = 1,
      limit = 20,
      sort_by = 'updated_at',
      sort_order = 'desc',
      search
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = db.collection('portfolios').where('status', '==', 'active');

    // Apply search filter if provided
    if (search && search.trim()) {
      // Note: Firestore doesn't support full-text search natively
      // This is a simplified approach - you might want to use Algolia or similar for production
      query = query.where('portfolio_name', '>=', search.trim())
                   .where('portfolio_name', '<=', search.trim() + '\uf8ff');
    }

    // Get total count (before pagination)
    const allDocs = await query.get();
    const totalItems = allDocs.size;

    // Apply sorting and pagination
    // Note: Firestore doesn't support offset() directly
    // For page-based pagination, we fetch all and paginate in memory
    // For production with large datasets, consider cursor-based pagination
    const allSnapshot = await query.orderBy(sort_by, sort_order).get();
    const allPortfolios = allSnapshot.docs.map(doc => ({ doc, data: doc.data() }));
    
    // Apply pagination in memory
    const startIndex = offset;
    const endIndex = offset + limitNum;
    const paginatedDocs = allPortfolios.slice(startIndex, endIndex);

    const portfolios = paginatedDocs.map(({ doc, data }) => {
      return {
        id: doc.id,
        portfolio_name: data.portfolio_name,
        client_name: data.client_name,
        initial_capital: data.initial_capital || 0,
        allocated_amount: data.allocated_amount || 0,
        allocation_percent: data.allocation_percent || 0,
        holdings_count: data.holdings_count || 0,
        estimated_returns: data.estimated_returns || 0,
        investment_horizon: data.investment_horizon || null,
        expected_rate_of_return: data.expected_rate_of_return || null,
        strategy_type: data.strategy_type || null,
        risk_profile: data.risk_profile || null,
        status: data.status,
        last_updated: data.updated_at?.toDate?.()?.toISOString() || null,
        created_at: data.created_at?.toDate?.()?.toISOString() || null
      };
    });

    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        portfolios,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Error in getActivePortfolios:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /api/portfolios/drafts - Get draft portfolios
const getDraftPortfolios = async (req, res) => {
  try {
    const db = getFirestore();
    const {
      page = 1,
      limit = 20,
      sort_by = 'updated_at',
      sort_order = 'desc',
      search
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = db.collection('portfolios').where('status', '==', 'draft');

    // Apply search filter if provided
    if (search && search.trim()) {
      query = query.where('portfolio_name', '>=', search.trim())
                   .where('portfolio_name', '<=', search.trim() + '\uf8ff');
    }

    // Get total count
    const allDocs = await query.get();
    const totalItems = allDocs.size;

    // Apply sorting and pagination
    // Note: Firestore doesn't support offset() directly
    // For page-based pagination, we fetch all and paginate in memory
    const allSnapshot = await query.orderBy(sort_by, sort_order).get();
    const allPortfolios = allSnapshot.docs.map(doc => ({ doc, data: doc.data() }));
    
    // Apply pagination in memory
    const startIndex = offset;
    const endIndex = offset + limitNum;
    const paginatedDocs = allPortfolios.slice(startIndex, endIndex);

    const portfolios = paginatedDocs.map(({ doc, data }) => {
      return {
        id: doc.id,
        portfolio_name: data.portfolio_name,
        client_name: data.client_name,
        initial_capital: data.initial_capital || 0,
        allocated_amount: data.allocated_amount || 0,
        allocation_percent: data.allocation_percent || 0,
        holdings_count: data.holdings_count || 0,
        estimated_returns: data.estimated_returns || 0,
        investment_horizon: data.investment_horizon || null,
        expected_rate_of_return: data.expected_rate_of_return || null,
        strategy_type: data.strategy_type || null,
        risk_profile: data.risk_profile || null,
        status: data.status,
        last_updated: data.updated_at?.toDate?.()?.toISOString() || null,
        created_at: data.created_at?.toDate?.()?.toISOString() || null
      };
    });

    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        portfolios,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Error in getDraftPortfolios:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /api/portfolios/archived - Get archived portfolios
const getArchivedPortfolios = async (req, res) => {
  try {
    const db = getFirestore();
    const {
      page = 1,
      limit = 20,
      sort_by = 'updated_at',
      sort_order = 'desc',
      search
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = db.collection('portfolios').where('status', '==', 'archived');

    // Apply search filter if provided
    if (search && search.trim()) {
      query = query.where('portfolio_name', '>=', search.trim())
                   .where('portfolio_name', '<=', search.trim() + '\uf8ff');
    }

    // Get total count
    const allDocs = await query.get();
    const totalItems = allDocs.size;

    // Apply sorting and pagination
    // Note: Firestore doesn't support offset() directly
    // For page-based pagination, we fetch all and paginate in memory
    const allSnapshot = await query.orderBy(sort_by, sort_order).get();
    const allPortfolios = allSnapshot.docs.map(doc => ({ doc, data: doc.data() }));
    
    // Apply pagination in memory
    const startIndex = offset;
    const endIndex = offset + limitNum;
    const paginatedDocs = allPortfolios.slice(startIndex, endIndex);

    const portfolios = paginatedDocs.map(({ doc, data }) => {
      return {
        id: doc.id,
        portfolio_name: data.portfolio_name,
        client_name: data.client_name,
        initial_capital: data.initial_capital || 0,
        allocated_amount: data.allocated_amount || 0,
        allocation_percent: data.allocation_percent || 0,
        holdings_count: data.holdings_count || 0,
        estimated_returns: data.estimated_returns || 0,
        investment_horizon: data.investment_horizon || null,
        expected_rate_of_return: data.expected_rate_of_return || null,
        strategy_type: data.strategy_type || null,
        risk_profile: data.risk_profile || null,
        status: data.status,
        last_updated: data.updated_at?.toDate?.()?.toISOString() || null,
        created_at: data.created_at?.toDate?.()?.toISOString() || null
      };
    });

    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      status: 'success',
      data: {
        portfolios,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_items: totalItems,
          items_per_page: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Error in getArchivedPortfolios:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /api/portfolios/:portfolio_id - Get portfolio by ID
const getPortfolioById = async (req, res) => {
  try {
    const db = getFirestore();
    const { portfolio_id } = req.params;

    const portfolioRef = db.collection('portfolios').doc(portfolio_id);
    const portfolioDoc = await portfolioRef.get();

    if (!portfolioDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found'
      });
    }

    const responseData = formatPortfolioResponse(portfolioDoc);

    res.status(200).json({
      status: 'success',
      data: responseData
    });
  } catch (error) {
    console.error('Error in getPortfolioById:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// PATCH /api/portfolios/:portfolio_id/archive - Archive portfolio
const archivePortfolio = async (req, res) => {
  try {
    const db = getFirestore();
    const { portfolio_id } = req.params;
    const { archive_reason } = req.body;

    const portfolioRef = db.collection('portfolios').doc(portfolio_id);
    const portfolioDoc = await portfolioRef.get();

    if (!portfolioDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found'
      });
    }

    await portfolioRef.update({
      status: 'archived',
      archived_at: admin.firestore.FieldValue.serverTimestamp(),
      archive_reason: archive_reason || null,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await portfolioRef.get();
    const responseData = formatPortfolioResponse(updatedDoc);

    res.status(200).json({
      status: 'success',
      message: 'Portfolio archived successfully',
      data: {
        id: responseData.id,
        status: responseData.status,
        archived_at: responseData.archived_at
      }
    });
  } catch (error) {
    console.error('Error in archivePortfolio:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// PATCH /api/portfolios/:portfolio_id/unarchive - Unarchive portfolio
const unarchivePortfolio = async (req, res) => {
  try {
    const db = getFirestore();
    const { portfolio_id } = req.params;

    const portfolioRef = db.collection('portfolios').doc(portfolio_id);
    const portfolioDoc = await portfolioRef.get();

    if (!portfolioDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found'
      });
    }

    const existingData = portfolioDoc.data();
    if (existingData.status !== 'archived') {
      return res.status(400).json({
        status: 'error',
        message: 'Portfolio is not archived'
      });
    }

    await portfolioRef.update({
      status: 'active',
      archived_at: admin.firestore.FieldValue.delete(),
      archive_reason: admin.firestore.FieldValue.delete(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await portfolioRef.get();
    const responseData = formatPortfolioResponse(updatedDoc);

    res.status(200).json({
      status: 'success',
      message: 'Portfolio unarchived successfully',
      data: {
        id: responseData.id,
        status: responseData.status
      }
    });
  } catch (error) {
    console.error('Error in unarchivePortfolio:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// DELETE /api/portfolios/:portfolio_id - Delete portfolio
const deletePortfolio = async (req, res) => {
  try {
    const db = getFirestore();
    const { portfolio_id } = req.params;

    const portfolioRef = db.collection('portfolios').doc(portfolio_id);
    const portfolioDoc = await portfolioRef.get();

    if (!portfolioDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Portfolio not found'
      });
    }

    // Allow deletion of any portfolio regardless of status
    await portfolioRef.delete();

    res.status(200).json({
      status: 'success',
      message: 'Portfolio deleted successfully'
    });
  } catch (error) {
    console.error('Error in deletePortfolio:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
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
};

