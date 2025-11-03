const express = require('express');
const router = express.Router();

// Placeholder FCM routes. Implement controller logic later.
router.post('/register-token', (req, res) => {
  return res.status(501).json({ status: 'error', message: 'Not implemented yet' });
});

router.get('/tokens', (req, res) => {
  return res.status(501).json({ status: 'error', message: 'Not implemented yet' });
});

router.put('/tokens/:tokenId', (req, res) => {
  return res.status(501).json({ status: 'error', message: 'Not implemented yet' });
});

router.delete('/tokens/:tokenId', (req, res) => {
  return res.status(501).json({ status: 'error', message: 'Not implemented yet' });
});

module.exports = router;



