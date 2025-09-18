const { getFirestore } = require('../config/firebase');

// Get all watchlists
const getAllWatchlists = async (req, res) => {
  try {
    const db = getFirestore();
    
    // Get all watchlists for user123
    const watchlistsRef = db.collection('watchlists').where('user_id', '==', 'user123');
    const snapshot = await watchlistsRef.get();
    
    const watchlists = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get stock count for each watchlist
      const stocksRef = db.collection('watchlists').doc(doc.id).collection('stocks');
      const stocksSnapshot = await stocksRef.get();
      
      watchlists.push({
        id: doc.id,
        name: data.name,
        date_created: data.date_created,
        stock_count: stocksSnapshot.size
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: watchlists,
      count: watchlists.length
    });
  } catch (error) {
    console.error('Error in getAllWatchlists:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create a new watchlist
const createWatchlist = async (req, res) => {
  try {
    const db = getFirestore();
    
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Watchlist name is required'
      });
    }
    
    // Generate unique watchlist ID
    const watchlistId = `watchlist_${Date.now()}`;
    
    // Create watchlist directly in the main collection
    const watchlistRef = db.collection('watchlists').doc(watchlistId);
    await watchlistRef.set({
      user_id: 'user123',
      name,
      date_created: new Date(),
      stock_count: 0
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Watchlist created successfully',
      data: {
        id: watchlistId,
        name,
        date_created: new Date(),
        stock_count: 0
      }
    });
  } catch (error) {
    console.error('Error in createWatchlist:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get stocks in a specific watchlist
const getWatchlistStocks = async (req, res) => {
  try {
    const db = getFirestore();
    const { watchlistId } = req.params;
    
    // Check if watchlist exists
    const watchlistRef = db.collection('watchlists').doc(watchlistId);
    const watchlistDoc = await watchlistRef.get();
    
    if (!watchlistDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Watchlist not found'
      });
    }
    
    // Get stocks from specific watchlist
    const stocksRef = db.collection('watchlists').doc(watchlistId).collection('stocks');
    const snapshot = await stocksRef.get();
    
    const stocks = [];
    snapshot.forEach(doc => {
      stocks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      status: 'success',
      data: stocks,
      count: stocks.length
    });
  } catch (error) {
    console.error('Error in getWatchlistStocks:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Add stock to a specific watchlist
const addStockToWatchlist = async (req, res) => {
  try {
    const db = getFirestore();
    const { watchlistId } = req.params;
    const { ticker, current_price } = req.body;
    
    if (!ticker) {
      return res.status(400).json({
        status: 'error',
        message: 'Ticker is required'
      });
    }
    
    // Check if watchlist exists
    const watchlistRef = db.collection('watchlists').doc(watchlistId);
    const watchlistDoc = await watchlistRef.get();
    
    if (!watchlistDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Watchlist not found'
      });
    }
    
    // Add stock to watchlist
    const stockRef = db.collection('watchlists').doc(watchlistId).collection('stocks').doc(ticker.toUpperCase());
    await stockRef.set({
      ticker: ticker.toUpperCase(),
      current_price: current_price || 0,
      date_added: new Date()
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Stock added to watchlist',
      data: {
        ticker: ticker.toUpperCase(),
        current_price: current_price || 0,
        date_added: new Date()
      }
    });
  } catch (error) {
    console.error('Error in addStockToWatchlist:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Remove stock from a specific watchlist
const removeStockFromWatchlist = async (req, res) => {
  try {
    const db = getFirestore();
    const { watchlistId, ticker } = req.params;
    
    // Remove stock from watchlist
    const stockRef = db.collection('watchlists').doc(watchlistId).collection('stocks').doc(ticker.toUpperCase());
    const doc = await stockRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Stock not found in watchlist'
      });
    }
    
    await stockRef.delete();
    
    res.status(200).json({
      status: 'success',
      message: 'Stock removed from watchlist',
      data: {
        ticker: ticker.toUpperCase()
      }
    });
  } catch (error) {
    console.error('Error in removeStockFromWatchlist:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  getAllWatchlists,
  createWatchlist,
  getWatchlistStocks,
  addStockToWatchlist,
  removeStockFromWatchlist
};