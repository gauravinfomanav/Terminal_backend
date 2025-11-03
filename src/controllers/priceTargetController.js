const { getFirestore } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const priceMonitoringService = require('../services/priceMonitoringService');

// Create a new price target
const createPriceTarget = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { ticker, target_price, alert_type, is_active, watchlist_id } = req.body;
    
    // Validate required fields
    if (!ticker || !target_price || !alert_type) {
      return res.status(400).json({
        status: 'error',
        message: 'Ticker, target_price, and alert_type are required'
      });
    }
    
    // Validate watchlist_id
    if (!watchlist_id) {
      return res.status(400).json({
        status: 'error',
        message: 'watchlist_id is required'
      });
    }
    
    // Validate alert_type
    if (!['above', 'below'].includes(alert_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Alert type must be either "above" or "below"'
      });
    }
    
    // Validate target_price
    if (typeof target_price !== 'number' || target_price <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Target price must be a positive number'
      });
    }
    
    // Verify that the watchlist exists
    const watchlistRef = db.collection('watchlists').doc(watchlist_id);
    const watchlistDoc = await watchlistRef.get();
    
    if (!watchlistDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Watchlist not found'
      });
    }
    
    // Generate unique target ID
    const targetId = uuidv4();
    
    // Check if target already exists for this ticker in this watchlist
    const existingTargetRef = db.collection('price_targets').doc(userId).collection('targets');
    const existingSnapshot = await existingTargetRef
      .where('ticker', '==', ticker.toUpperCase())
      .where('watchlist_id', '==', watchlist_id)
      .where('is_active', '==', true)
      .get();
    
    if (!existingSnapshot.empty) {
      return res.status(409).json({
        status: 'error',
        message: `Active price target already exists for ${ticker.toUpperCase()} in this watchlist`
      });
    }
    
    // Store price target in Firestore
    const targetRef = db.collection('price_targets').doc(userId).collection('targets').doc(targetId);
    await targetRef.set({
      target_id: targetId,
      ticker: ticker.toUpperCase(),
      target_price: target_price,
      alert_type: alert_type,
      watchlist_id: watchlist_id,
      watchlist_name: watchlistDoc.data().name, // Store watchlist name for easy reference
      is_active: is_active !== undefined ? is_active : true,
      created_at: new Date(),
      last_updated: new Date(),
      triggered: false,
      triggered_at: null,
      current_price: 0 // Will be updated by monitoring service
    });
    
    // Subscribe to the new ticker for real-time price updates
    await priceMonitoringService.subscribeToNewTicker(ticker.toUpperCase());

    res.status(201).json({
      status: 'success',
      message: 'Price target created successfully',
      data: {
        target_id: targetId,
        ticker: ticker.toUpperCase(),
        target_price: target_price,
        alert_type: alert_type,
        watchlist_id: watchlist_id,
        watchlist_name: watchlistDoc.data().name,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error in createPriceTarget:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get all price targets for user
const getUserPriceTargets = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { watchlist_id } = req.query; // Optional filter by watchlist
    
    let targetsRef = db.collection('price_targets').doc(userId).collection('targets');
    
    // If watchlist_id is provided, filter by watchlist
    if (watchlist_id) {
      targetsRef = targetsRef.where('watchlist_id', '==', watchlist_id);
    }
    
    const snapshot = await targetsRef.where('is_active', '==', true).orderBy('created_at', 'desc').get();
    
    const targets = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      targets.push({
        target_id: data.target_id,
        ticker: data.ticker,
        target_price: data.target_price,
        alert_type: data.alert_type,
        watchlist_id: data.watchlist_id,
        watchlist_name: data.watchlist_name,
        is_active: data.is_active,
        created_at: data.created_at,
        last_updated: data.last_updated,
        triggered: data.triggered,
        triggered_at: data.triggered_at,
        current_price: data.current_price
      });
    });
    
    res.status(200).json({
      status: 'success',
      data: targets,
      count: targets.length,
      filter: watchlist_id ? `watchlist: ${watchlist_id}` : 'all watchlists'
    });
  } catch (error) {
    console.error('Error in getUserPriceTargets:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get price targets for a specific watchlist
const getWatchlistPriceTargets = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { watchlistId } = req.params;
    
    // Verify that the watchlist exists
    const watchlistRef = db.collection('watchlists').doc(watchlistId);
    const watchlistDoc = await watchlistRef.get();
    
    if (!watchlistDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Watchlist not found'
      });
    }
    
    const targetsRef = db.collection('price_targets').doc(userId).collection('targets');
    const snapshot = await targetsRef
      .where('watchlist_id', '==', watchlistId)
      .where('is_active', '==', true)
      .orderBy('created_at', 'desc')
      .get();
    
    const targets = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      targets.push({
        target_id: data.target_id,
        ticker: data.ticker,
        target_price: data.target_price,
        alert_type: data.alert_type,
        watchlist_id: data.watchlist_id,
        watchlist_name: data.watchlist_name,
        is_active: data.is_active,
        created_at: data.created_at,
        last_updated: data.last_updated,
        triggered: data.triggered,
        triggered_at: data.triggered_at,
        current_price: data.current_price
      });
    });
    
    res.status(200).json({
      status: 'success',
      data: targets,
      count: targets.length,
      watchlist: {
        id: watchlistId,
        name: watchlistDoc.data().name
      }
    });
  } catch (error) {
    console.error('Error in getWatchlistPriceTargets:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get specific price target by ID
const getPriceTargetById = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { id } = req.params;
    
    const targetRef = db.collection('price_targets').doc(userId).collection('targets').doc(id);
    const targetDoc = await targetRef.get();
    
    if (!targetDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Price target not found'
      });
    }
    
    const data = targetDoc.data();
    
    res.status(200).json({
      status: 'success',
      data: {
        target_id: data.target_id,
        ticker: data.ticker,
        target_price: data.target_price,
        alert_type: data.alert_type,
        watchlist_id: data.watchlist_id,
        watchlist_name: data.watchlist_name,
        is_active: data.is_active,
        created_at: data.created_at,
        last_updated: data.last_updated,
        triggered: data.triggered,
        triggered_at: data.triggered_at,
        current_price: data.current_price
      }
    });
  } catch (error) {
    console.error('Error in getPriceTargetById:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update price target
const updatePriceTarget = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { id } = req.params;
    const { target_price, alert_type, is_active } = req.body;
    
    const targetRef = db.collection('price_targets').doc(userId).collection('targets').doc(id);
    const targetDoc = await targetRef.get();
    
    if (!targetDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Price target not found'
      });
    }
    
    const updateData = {
      last_updated: new Date()
    };
    
    if (target_price !== undefined) {
      if (typeof target_price !== 'number' || target_price <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Target price must be a positive number'
        });
      }
      updateData.target_price = target_price;
    }
    
    if (alert_type !== undefined) {
      if (!['above', 'below'].includes(alert_type)) {
        return res.status(400).json({
          status: 'error',
          message: 'Alert type must be either "above" or "below"'
        });
      }
      updateData.alert_type = alert_type;
    }
    
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }
    
    await targetRef.update(updateData);
    
    res.status(200).json({
      status: 'success',
      message: 'Price target updated successfully',
      data: {
        target_id: id,
        ...updateData
      }
    });
  } catch (error) {
    console.error('Error in updatePriceTarget:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete price target
const deletePriceTarget = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { id } = req.params;
    
    const targetRef = db.collection('price_targets').doc(userId).collection('targets').doc(id);
    const targetDoc = await targetRef.get();
    
    if (!targetDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Price target not found'
      });
    }
    
    // Soft delete - mark as inactive instead of hard delete
    await targetRef.update({
      is_active: false,
      deleted_at: new Date()
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Price target deleted successfully',
      data: {
        target_id: id
      }
    });
  } catch (error) {
    console.error('Error in deletePriceTarget:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  createPriceTarget,
  getUserPriceTargets,
  getWatchlistPriceTargets,
  getPriceTargetById,
  updatePriceTarget,
  deletePriceTarget
};
