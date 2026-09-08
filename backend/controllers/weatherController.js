const axios = require('axios');

// Mock weather data for now
const getMockWeather = (location) => {
  return {
    location,
    temperature: 28,
    feelsLike: 31,
    humidity: 65,
    windSpeed: 12,
    condition: 'Partly Cloudy',
    aqi: 65,
    uvIndex: 7,
    sunrise: '06:30',
    sunset: '18:45',
    visibility: 10,
    pressure: 1013
  };
};

exports.getWeatherByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    if (!location) {
      return res.status(400).json({ error: 'Location required' });
    }

    const weather = getMockWeather(location);
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPersonalizedWeather = async (req, res) => {
  try {
    const { personaType, location } = req.query;
    if (!personaType || !location) {
      return res.status(400).json({ error: 'Persona and location required' });
    }

    const weather = getMockWeather(location);

    // Personalize based on persona
    const personaData = {
      health: {
        focus: ['aqi', 'uvIndex', 'humidity'],
        recommendation: 'Air quality is good. UV index is high, wear sunscreen.'
      },
      fitness: {
        focus: ['temperature', 'windSpeed', 'sunrise', 'sunset'],
        recommendation: 'Great weather for outdoor activities. Best running hours: 6-7 AM.'
      },
      beach: {
        focus: ['temperature', 'humidity', 'windSpeed'],
        recommendation: 'Perfect beach weather! Moderate waves expected.'
      },
      travel: {
        focus: ['temperature', 'condition', 'visibility'],
        recommendation: 'Safe conditions for travel.'
      },
      parent: {
        focus: ['temperature', 'condition', 'aqi'],
        recommendation: 'Safe for kids to play outside. No rain expected.'
      },
      gardener: {
        focus: ['humidity', 'temperature', 'pressure'],
        recommendation: 'Good conditions for planting. Soil moisture is adequate.'
      },
      commuter: {
        focus: ['visibility', 'windSpeed', 'condition'],
        recommendation: 'Clear visibility. Safe commuting conditions.'
      },
      event: {
        focus: ['condition', 'temperature', 'humidity'],
        recommendation: 'Excellent weather for outdoor events!'
      }
    };

    res.json({
      weather,
      persona: personaType,
      ...personaData[personaType]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
