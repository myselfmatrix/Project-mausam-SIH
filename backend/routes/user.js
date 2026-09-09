const express = require('express');
const router = express.Router();
const { getProfile, updatePersona, getLocations, addLocation } = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// Everything below here is account data — all of it needs a valid session.
router.use(requireAuth());

router.get('/profile', getProfile);

// The client saves the persona with POST; PUT is kept because it is the more
// correct verb for a full replace and older callers may still use it.
router.post('/persona', updatePersona);
router.put('/persona', updatePersona);

router.get('/locations', getLocations);
router.post('/locations', addLocation);

module.exports = router;
