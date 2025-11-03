const { getFirestore } = require('../config/firebase');

// Get notification history
const getNotificationHistory = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { limit = 50 } = req.query;
    
    const notificationsRef = db.collection('notification_history').doc(userId).collection('notifications');
    const snapshot = await notificationsRef.orderBy('sent_at', 'desc').limit(parseInt(limit)).get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        target_id: data.target_id,
        ticker: data.ticker,
        target_price: data.target_price,
        current_price: data.current_price,
        alert_type: data.alert_type,
        watchlist_id: data.watchlist_id,
        watchlist_name: data.watchlist_name,
        sent_at: data.sent_at,
        status: data.status
      });
    });
    
    res.status(200).json({
      status: 'success',
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error in getNotificationHistory:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get specific notification by ID
const getNotificationById = async (req, res) => {
  try {
    const db = getFirestore();
    const userId = 'user123'; // Using hardcoded user for now
    const { id } = req.params;
    
    const notificationRef = db.collection('notification_history').doc(userId).collection('notifications').doc(id);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }
    
    const data = notificationDoc.data();
    
    res.status(200).json({
      status: 'success',
      data: {
        id: notificationDoc.id,
        target_id: data.target_id,
        ticker: data.ticker,
        target_price: data.target_price,
        current_price: data.current_price,
        alert_type: data.alert_type,
        watchlist_id: data.watchlist_id,
        watchlist_name: data.watchlist_name,
        sent_at: data.sent_at,
        status: data.status
      }
    });
  } catch (error) {
    console.error('Error in getNotificationById:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  getNotificationHistory,
  getNotificationById
};
