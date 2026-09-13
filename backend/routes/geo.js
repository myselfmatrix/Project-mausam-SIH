const express = require('express');
const router = express.Router();
const {
  searchPlaces, reverseGeocode, locateByIp, popularPlaces, nearestPlace, geoStats,
} = require('../controllers/geoController');

/*
  All public: choosing a location happens before sign-up (onboarding) as well
  as after it, and none of these expose anything account-specific.

  Order matters only in that every path here is a literal, so there is no
  parameterised route to shadow.
*/
router.get('/search', searchPlaces);
router.get('/reverse', reverseGeocode);
router.get('/ip', locateByIp);
router.get('/popular', popularPlaces);
router.get('/nearest', nearestPlace);
router.get('/_stats', geoStats);

module.exports = router;
