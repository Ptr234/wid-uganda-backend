const express = require('express');
const router = express.Router();

// Placeholder routes for clients
router.get('/', (req, res) => {
  res.json({ message: 'Clients endpoint - coming soon' });
});

module.exports = router;