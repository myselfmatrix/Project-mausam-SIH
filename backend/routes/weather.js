const express = require('express');
const router = express.Router();
const { getWeatherByLocation, getPersonalizedWeather } = require('../controllers/weatherController');

router.get('/:location', getWeatherByLocation);
router.get('/personalized/data', getPersonalizedWeather);

module.exports = router;
