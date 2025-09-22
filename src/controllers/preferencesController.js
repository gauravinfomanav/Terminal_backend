const { getFirestore } = require('../config/firebase');

// Get user preferences including default watchlist
const getUserPreferences = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // For now, using hardcoded user ID
    
    const preferencesRef = db.collection('user_preferences').doc(userId);
    const preferencesDoc = await preferencesRef.get();
    
    if (!preferencesDoc.exists) {
      // Return default preferences if none exist
      return res.status(200).json({
        status: 'success',
        data: {
          user_id: userId,
          default_watchlist_id: null,
          date_set: null,
          last_updated: null
        }
      });
    }
    
    const preferences = preferencesDoc.data();
    
    res.status(200).json({
      status: 'success',
      data: preferences
    });
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Set default watchlist
const setDefaultWatchlist = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // For now, using hardcoded user ID
    const { watchlist_id } = req.body;
    
    if (!watchlist_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Watchlist ID is required'
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
    
    // Update or create user preferences
    const preferencesRef = db.collection('user_preferences').doc(userId);
    await preferencesRef.set({
      user_id: userId,
      default_watchlist_id: watchlist_id,
      date_set: new Date(),
      last_updated: new Date()
    }, { merge: true });
    
    res.status(200).json({
      status: 'success',
      message: 'Default watchlist set successfully',
      data: {
        user_id: userId,
        default_watchlist_id: watchlist_id,
        date_set: new Date(),
        last_updated: new Date()
      }
    });
  } catch (error) {
    console.error('Error in setDefaultWatchlist:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Remove default watchlist (set to null)
const removeDefaultWatchlist = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // For now, using hardcoded user ID
    
    const preferencesRef = db.collection('user_preferences').doc(userId);
    await preferencesRef.set({
      user_id: userId,
      default_watchlist_id: null,
      last_updated: new Date()
    }, { merge: true });
    
    res.status(200).json({
      status: 'success',
      message: 'Default watchlist removed successfully',
      data: {
        user_id: userId,
        default_watchlist_id: null,
        last_updated: new Date()
      }
    });
  } catch (error) {
    console.error('Error in removeDefaultWatchlist:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  getUserPreferences,
  setDefaultWatchlist,
  removeDefaultWatchlist
};
