const express = require('express');
const router = express.Router();
const {
  getCurrentWeather, getBulkWeather, getPersonalizedWeather, getWeatherByLocation, cacheStats,
  getNationalAlerts,
} = require('../controllers/weatherController');

/*
  Literal paths first.

  `/:location` matches any single segment, so declared after it these would be
  swallowed - a routing bug that presents as "the weather for a city called
  current", which is confusing enough to be worth the comment.
*/
router.get('/current', getCurrentWeather);
router.get('/bulk', getBulkWeather);
router.get('/personalized/data', getPersonalizedWeather);
router.get('/alerts/national', getNationalAlerts);
router.get('/_cache', cacheStats);
router.get('/:location', getWeatherByLocation);

module.exports = router;
