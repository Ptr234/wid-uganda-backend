const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Suppliers endpoint - coming soon' });
});

module.exports = router;