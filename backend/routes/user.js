const express = require('express');
const router = express.Router();

// Get user profile
router.get('/profile', (req, res) => {
  res.json({ message: 'User profile endpoint' });
});

// Update user preferences
router.put('/preferences', (req, res) => {
  res.json({ message: 'Update preferences endpoint' });
});

// Get user saved locations
router.get('/locations', (req, res) => {
  res.json({ message: 'User locations endpoint' });
});

module.exports = router;
