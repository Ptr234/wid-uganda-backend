const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Uploads endpoint - coming soon' });
});

module.exports = router;