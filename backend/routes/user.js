const express = require('express');
const router = express.Router();
const {
  getProfile,
  updatePersona,
  updateLanguage,
  getLocations,
  addLocation,
  replaceLocations,
  removeLocation,
  setActiveLocation,
} = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// Everything below here is account data — all of it needs a valid session.
router.use(requireAuth());

router.get('/profile', getProfile);

// The client saves the persona with POST; PUT is kept because it is the more
// correct verb for a full replace and older callers may still use it.
router.post('/persona', updatePersona);
router.put('/persona', updatePersona);

router.post('/language', updateLanguage);
router.put('/language', updateLanguage);

/*
  `/locations/active` is declared before `/locations/:id` so the literal wins:
  otherwise DELETE-style id matching would treat "active" as an id.
*/
router.get('/locations', getLocations);
router.post('/locations', addLocation);
router.put('/locations/active', setActiveLocation);
router.post('/locations/active', setActiveLocation);
router.put('/locations', replaceLocations);
router.delete('/locations/:id', removeLocation);

module.exports = router;
