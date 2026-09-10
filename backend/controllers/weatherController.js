// Realistic weather data shaped to match frontend expectations.
// Each location carries everything: base weather, hourly forecast, persona-specific insights.
const WEATHER_DB = {
  Lucknow: {
    location: 'Lucknow',
    region: 'Uttar Pradesh',
    updatedAt: '2026-09-09T08:30:00',
    temperature: 29,
    feelsLike: 32,
    high: 34,
    low: 24,
    condition: 'Partly Cloudy',
    humidity: 68,
    uvIndex: 7,
    aqi: 142,
    aqiCategory: 'Poor',
    windSpeed: 14,
    windDirection: 'NW',
    visibility: 6,
    pressure: 1008,
    rainProbability: 65,
    sunrise: '05:52',
    sunset: '18:34',
    hourlyForecast: [
      { time: '09:00', temp: 29, rain: 10, condition: 'Cloudy' },
      { time: '10:00', temp: 30, rain: 15, condition: 'Cloudy' },
      { time: '11:00', temp: 32, rain: 20, condition: 'Partly Cloudy' },
      { time: '12:00', temp: 33, rain: 25, condition: 'Partly Cloudy' },
      { time: '13:00', temp: 34, rain: 35, condition: 'Cloudy' },
      { time: '14:00', temp: 33, rain: 45, condition: 'Rain' },
      { time: '15:00', temp: 31, rain: 65, condition: 'Rain' },
      { time: '16:00', temp: 29, rain: 70, condition: 'Thunderstorm' },
      { time: '17:00', temp: 28, rain: 55, condition: 'Rain' },
      { time: '18:00', temp: 27, rain: 30, condition: 'Cloudy' },
      { time: '19:00', temp: 26, rain: 15, condition: 'Clear' },
      { time: '20:00', temp: 25, rain: 10, condition: 'Clear' },
    ],
  },
  Mumbai: {
    location: 'Mumbai',
    region: 'Maharashtra',
    updatedAt: '2026-09-09T08:30:00',
    temperature: 27,
    feelsLike: 31,
    high: 29,
    low: 25,
    condition: 'Thunderstorms',
    humidity: 86,
    uvIndex: 4,
    aqi: 78,
    aqiCategory: 'Moderate',
    windSpeed: 22,
    windDirection: 'SW',
    visibility: 3,
    pressure: 999,
    rainProbability: 92,
    sunrise: '06:22',
    sunset: '18:48',
    hourlyForecast: [
      { time: '09:00', temp: 27, rain: 80, condition: 'Thunderstorm' },
      { time: '10:00', temp: 26, rain: 85, condition: 'Thunderstorm' },
      { time: '11:00', temp: 26, rain: 90, condition: 'Heavy Rain' },
      { time: '12:00', temp: 25, rain: 95, condition: 'Heavy Rain' },
      { time: '13:00', temp: 25, rain: 92, condition: 'Thunderstorm' },
      { time: '14:00', temp: 26, rain: 88, condition: 'Thunderstorm' },
      { time: '15:00', temp: 27, rain: 80, condition: 'Rain' },
      { time: '16:00', temp: 28, rain: 70, condition: 'Rain' },
      { time: '17:00', temp: 28, rain: 60, condition: 'Cloudy' },
      { time: '18:00', temp: 28, rain: 45, condition: 'Cloudy' },
      { time: '19:00', temp: 27, rain: 30, condition: 'Partly Cloudy' },
      { time: '20:00', temp: 26, rain: 20, condition: 'Clear' },
    ],
  },
  Delhi: {
    location: 'Delhi',
    region: 'NCT',
    updatedAt: '2026-09-09T08:30:00',
    temperature: 33,
    feelsLike: 36,
    high: 37,
    low: 26,
    condition: 'Hazy Sun',
    humidity: 45,
    uvIndex: 9,
    aqi: 198,
    aqiCategory: 'Unhealthy',
    windSpeed: 9,
    windDirection: 'W',
    visibility: 4,
    pressure: 1005,
    rainProbability: 15,
    sunrise: '05:48',
    sunset: '18:41',
    hourlyForecast: [
      { time: '09:00', temp: 32, rain: 5, condition: 'Hazy' },
      { time: '10:00', temp: 33, rain: 5, condition: 'Hazy Sun' },
      { time: '11:00', temp: 34, rain: 8, condition: 'Hazy Sun' },
      { time: '12:00', temp: 35, rain: 10, condition: 'Partly Cloudy' },
      { time: '13:00', temp: 36, rain: 12, condition: 'Hazy Sun' },
      { time: '14:00', temp: 37, rain: 15, condition: 'Hazy Sun' },
      { time: '15:00', temp: 37, rain: 18, condition: 'Partly Cloudy' },
      { time: '16:00', temp: 36, rain: 20, condition: 'Cloudy' },
      { time: '17:00', temp: 34, rain: 15, condition: 'Cloudy' },
      { time: '18:00', temp: 32, rain: 10, condition: 'Partly Cloudy' },
      { time: '19:00', temp: 30, rain: 8, condition: 'Clear' },
      { time: '20:00', temp: 28, rain: 5, condition: 'Clear' },
    ],
  },
  Jhansi: {
    location: 'Jhansi',
    region: 'Uttar Pradesh',
    updatedAt: '2026-09-09T08:30:00',
    temperature: 31,
    feelsLike: 33,
    high: 36,
    low: 23,
    condition: 'Sunny',
    humidity: 38,
    uvIndex: 8,
    aqi: 95,
    aqiCategory: 'Moderate',
    windSpeed: 11,
    windDirection: 'NW',
    visibility: 9,
    pressure: 1006,
    rainProbability: 10,
    sunrise: '05:50',
    sunset: '18:36',
    hourlyForecast: [
      { time: '09:00', temp: 31, rain: 2, condition: 'Sunny' },
      { time: '10:00', temp: 33, rain: 2, condition: 'Sunny' },
      { time: '11:00', temp: 34, rain: 5, condition: 'Sunny' },
      { time: '12:00', temp: 35, rain: 5, condition: 'Clear' },
      { time: '13:00', temp: 36, rain: 8, condition: 'Sunny' },
      { time: '14:00', temp: 36, rain: 10, condition: 'Sunny' },
      { time: '15:00', temp: 35, rain: 10, condition: 'Clear' },
      { time: '16:00', temp: 34, rain: 8, condition: 'Clear' },
      { time: '17:00', temp: 32, rain: 5, condition: 'Clear' },
      { time: '18:00', temp: 30, rain: 5, condition: 'Clear' },
      { time: '19:00', temp: 27, rain: 2, condition: 'Clear' },
      { time: '20:00', temp: 25, rain: 0, condition: 'Clear' },
    ],
  },
  Noida: {
    location: 'Noida',
    region: 'Uttar Pradesh',
    updatedAt: '2026-09-09T08:30:00',
    temperature: 32,
    feelsLike: 35,
    high: 36,
    low: 27,
    condition: 'Hazy Sun',
    humidity: 48,
    uvIndex: 8,
    aqi: 205,
    aqiCategory: 'Unhealthy',
    windSpeed: 10,
    windDirection: 'W',
    visibility: 3,
    pressure: 1004,
    rainProbability: 15,
    sunrise: '05:49',
    sunset: '18:40',
    hourlyForecast: [
      { time: '09:00', temp: 31, rain: 5, condition: 'Hazy' },
      { time: '10:00', temp: 32, rain: 8, condition: 'Hazy Sun' },
      { time: '11:00', temp: 34, rain: 10, condition: 'Hazy Sun' },
      { time: '12:00', temp: 35, rain: 12, condition: 'Hazy Sun' },
      { time: '13:00', temp: 36, rain: 15, condition: 'Hazy Sun' },
      { time: '14:00', temp: 36, rain: 15, condition: 'Hazy Sun' },
      { time: '15:00', temp: 35, rain: 18, condition: 'Cloudy' },
      { time: '16:00', temp: 34, rain: 20, condition: 'Cloudy' },
      { time: '17:00', temp: 32, rain: 15, condition: 'Hazy Sun' },
      { time: '18:00', temp: 30, rain: 10, condition: 'Hazy' },
      { time: '19:00', temp: 29, rain: 8, condition: 'Hazy' },
      { time: '20:00', temp: 28, rain: 5, condition: 'Clear' },
    ],
  },
  London: {
    location: 'London',
    region: 'United Kingdom',
    updatedAt: '2026-09-09T08:30:00',
    temperature: 16,
    feelsLike: 14,
    high: 18,
    low: 12,
    condition: 'Light Rain',
    humidity: 82,
    uvIndex: 2,
    aqi: 34,
    aqiCategory: 'Good',
    windSpeed: 19,
    windDirection: 'SW',
    visibility: 7,
    pressure: 1012,
    rainProbability: 80,
    sunrise: '06:45',
    sunset: '19:20',
    hourlyForecast: [
      { time: '09:00', temp: 15, rain: 70, condition: 'Light Rain' },
      { time: '10:00', temp: 15, rain: 75, condition: 'Light Rain' },
      { time: '11:00', temp: 16, rain: 80, condition: 'Light Rain' },
      { time: '12:00', temp: 16, rain: 82, condition: 'Rain' },
      { time: '13:00', temp: 17, rain: 78, condition: 'Light Rain' },
      { time: '14:00', temp: 17, rain: 75, condition: 'Light Rain' },
      { time: '15:00', temp: 17, rain: 70, condition: 'Light Rain' },
      { time: '16:00', temp: 16, rain: 65, condition: 'Cloudy' },
      { time: '17:00', temp: 16, rain: 60, condition: 'Cloudy' },
      { time: '18:00', temp: 15, rain: 55, condition: 'Light Rain' },
      { time: '19:00', temp: 14, rain: 50, condition: 'Cloudy' },
      { time: '20:00', temp: 13, rain: 45, condition: 'Cloudy' },
    ],
  },
};

const getMockWeather = (location = 'Lucknow') => {
  const data = WEATHER_DB[location];
  if (data) return data;
  // Unknown city — fall back to representative conditions but keep the
  // requested name so the response doesn't silently relabel itself.
  return { ...WEATHER_DB.Lucknow, location, region: '' };
};

exports.getWeatherByLocation = async (req, res) => {
  try {
    const { location } = req.params;
    if (!location) {
      return res.status(400).json({ error: 'Location required' });
    }
    // Simulate network latency for realistic load-state testing on the frontend.
    await new Promise((r) => setTimeout(r, Math.random() * 200 + 100));
    const weather = getMockWeather(location);
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPersonalizedWeather = async (req, res) => {
  try {
    const { location = 'Lucknow' } = req.query;
    await new Promise((r) => setTimeout(r, Math.random() * 200 + 100));

    const weather = getMockWeather(location);
    // personaType (also in req.query) will drive server-side insight text once
    // that copy is written; today the client derives persona framing itself.
    res.json({ weather });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
