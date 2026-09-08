const express = require('express');
const router = express.Router();

// Login route
router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint' });
});

// Signup route
router.post('/signup', (req, res) => {
  res.json({ message: 'Signup endpoint' });
});

module.exports = router;
