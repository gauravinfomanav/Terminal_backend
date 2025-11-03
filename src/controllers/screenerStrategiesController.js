const { getFirestore } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// Helper function to clean filters (remove null, empty, "any" values)
const cleanFilters = (filters) => {
  if (!filters || typeof filters !== 'object') {
    return {};
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(filters)) {
    // Skip null, undefined, empty strings, and "any"
    if (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      value !== 'any' &&
      !(Array.isArray(value) && value.length === 0)
    ) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// POST /api/screener/strategies - Create a new strategy
const createStrategy = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { name, description, filters, sortBy, isDefault } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Strategy name is required (1-100 characters)'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Strategy name must be 100 characters or less'
      });
    }

    if (description && description.length > 500) {
      return res.status(400).json({
        status: 'error',
        message: 'Description must be 500 characters or less'
      });
    }

    if (!filters || typeof filters !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Filters object is required'
      });
    }

    // Clean filters (remove null/empty/"any" values)
    const cleanedFilters = cleanFilters(filters);

    // If isDefault is true, unset previous default
    if (isDefault === true) {
      const strategiesRef = db
        .collection('screener_strategies')
        .doc(userId)
        .collection('strategies');
      
      const existingDefaults = await strategiesRef
        .where('isDefault', '==', true)
        .get();
      
      const batch = db.batch();
      existingDefaults.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    // Generate unique strategy ID
    const strategyId = `strategy_${uuidv4()}`;
    const now = new Date();

    // Store strategy in Firestore
    const strategyRef = db
      .collection('screener_strategies')
      .doc(userId)
      .collection('strategies')
      .doc(strategyId);

    const strategyData = {
      id: strategyId,
      userId: userId,
      name: name.trim(),
      description: description ? description.trim() : null,
      filters: cleanedFilters,
      sortBy: sortBy || null,
      isDefault: isDefault === true,
      createdAt: now,
      updatedAt: now
    };

    await strategyRef.set(strategyData);

    res.status(201).json({
      status: 'success',
      message: 'Strategy saved successfully',
      data: strategyData
    });
  } catch (error) {
    console.error('Error in createStrategy:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /api/screener/strategies - Get all strategies for user
const getAllStrategies = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const {
      includeDefault = true,
      limit = 50,
      offset = 0
    } = req.query;

    const strategiesRef = db
      .collection('screener_strategies')
      .doc(userId)
      .collection('strategies');

    let query = strategiesRef;

    // Apply default filter if needed
    if (includeDefault === 'false' || includeDefault === false) {
      query = query.where('isDefault', '==', false);
    }

    // Fetch all strategies (Firestore doesn't support offset, so we'll paginate in memory)
    // Order by createdAt descending
    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const total = snapshot.size;
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);

    const allStrategies = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allStrategies.push({
        id: data.id,
        name: data.name,
        description: data.description,
        filters: data.filters,
        sortBy: data.sortBy,
        isDefault: data.isDefault,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        resultsCount: data.resultsCount || null
      });
    });

    // Sort by default first, then by creation date
    allStrategies.sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1; // Default strategies first
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // Then by creation date (newest first)
    });

    // Apply pagination in memory
    const strategies = allStrategies.slice(offsetNum, offsetNum + limitNum);

    res.status(200).json({
      status: 'success',
      data: strategies,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + strategies.length < total
      }
    });
  } catch (error) {
    console.error('Error in getAllStrategies:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET /api/screener/strategies/:strategyId - Get single strategy by ID
const getStrategyById = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { strategyId } = req.params;

    if (!strategyId) {
      return res.status(400).json({
        status: 'error',
        message: 'Strategy ID is required'
      });
    }

    const strategyRef = db
      .collection('screener_strategies')
      .doc(userId)
      .collection('strategies')
      .doc(strategyId);

    const strategyDoc = await strategyRef.get();

    if (!strategyDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Strategy not found'
      });
    }

    const data = strategyDoc.data();

    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        filters: data.filters,
        sortBy: data.sortBy,
        isDefault: data.isDefault,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        userId: data.userId
      }
    });
  } catch (error) {
    console.error('Error in getStrategyById:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// DELETE /api/screener/strategies/:strategyId - Delete a strategy
const deleteStrategy = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { strategyId } = req.params;

    if (!strategyId) {
      return res.status(400).json({
        status: 'error',
        message: 'Strategy ID is required'
      });
    }

    const strategyRef = db
      .collection('screener_strategies')
      .doc(userId)
      .collection('strategies')
      .doc(strategyId);

    const strategyDoc = await strategyRef.get();

    if (!strategyDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Strategy not found'
      });
    }

    const data = strategyDoc.data();

    // Verify ownership
    if (data.userId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    await strategyRef.delete();

    res.status(200).json({
      status: 'success',
      message: 'Strategy deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteStrategy:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  createStrategy,
  getAllStrategies,
  getStrategyById,
  deleteStrategy
};

