const express = require('express');
const router = express.Router();

// Get weather for location
router.get('/:location', (req, res) => {
  res.json({ 
    location: req.params.location,
    message: 'Weather data endpoint'
  });
});

// Get personalized weather by persona
router.get('/persona/:personaType', (req, res) => {
  res.json({
    persona: req.params.personaType,
    message: 'Personalized weather endpoint'
  });
});

module.exports = router;
