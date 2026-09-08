const express = require('express');
const router = express.Router();
const { getProfile, updatePersona, getLocations, addLocation } = require('../controllers/userController');

router.get('/profile', getProfile);
router.put('/persona', updatePersona);
router.get('/locations', getLocations);
router.post('/locations', addLocation);

module.exports = router;
