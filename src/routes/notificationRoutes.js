const express = require('express');
const router = express.Router();
const { getNotificationHistory, getNotificationById } = require('../controllers/notificationController');

// GET /notifications - Get notification history
router.get('/', getNotificationHistory);

// GET /notifications/:id - Get specific notification
router.get('/:id', getNotificationById);

module.exports = router;



