/*
  The upstream client: Open-Meteo's forecast, air-quality and marine APIs.

  Open-Meteo was chosen over the alternatives for one reason that matters to a
  deployed project: it needs no API key and imposes no per-key quota, so there
  is no secret to leak, no free tier to exhaust mid-demo, and nothing to
  configure before the app works on a clean machine. It publishes ECMWF, GFS
  and ICON model output, and for India it carries the IMD-relevant variables
  this app reads.

  Three separate hosts are involved, so each is cached on its own clock:
  forecast output refreshes hourly, air quality hourly, marine every few
  hours. The TTLs below sit just under those publication intervals - long
  enough to stop re-asking for identical data, short enough that "live" is
  honest.
*/

const { fetchJson, buildUrl } = require('../services/httpJson');
const { createCache } = require('../services/cache');

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

const forecastCache = createCache({ ttl: 10 * 60 * 1000, name: 'forecast' });
const airQualityCache = createCache({ ttl: 20 * 60 * 1000, name: 'air-quality' });
const marineCache = createCache({ ttl: 30 * 60 * 1000, name: 'marine' });
const bulkCache = createCache({ ttl: 10 * 60 * 1000, name: 'bulk' });

/*
  Coordinates are rounded to two decimals for both the request and the cache
  key. That is about 1.1 km, well inside the ~11 km grid the models actually
  resolve, so the answer is identical - while GPS jitter of a few metres stops
  producing a cache miss and a fresh upstream call on every single reading.
*/
const gridKey = (value) => Math.round(Number(value) * 100) / 100;

const CURRENT_FIELDS = [
  'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
  'precipitation', 'rain', 'weather_code', 'cloud_cover', 'pressure_msl',
  'surface_pressure', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
  'visibility', 'uv_index',
];

const HOURLY_FIELDS = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
  'precipitation_probability', 'precipitation', 'weather_code', 'uv_index',
  'wind_speed_10m', 'wind_gusts_10m', 'visibility', 'is_day',
  // Root-zone moisture: what a crop actually draws on, not the surface film
  // that dries out within an hour of sunrise.
  'soil_moisture_3_to_9cm', 'soil_temperature_6cm',
];

const DAILY_FIELDS = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min',
  'apparent_temperature_max', 'apparent_temperature_min', 'sunrise', 'sunset',
  'uv_index_max', 'precipitation_sum', 'precipitation_probability_max',
  'wind_speed_10m_max', 'daylight_duration',
];

const POLLUTANT_FIELDS = [
  'pm2_5', 'pm10', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide',
  'ozone', 'ammonia',
];

/*
  Pollen, requested on the same call as the pollutants.

  Open-Meteo's pollen comes from CAMS, whose pollen model covers Europe only:
  for any Indian coordinate every one of these returns null. We ask anyway and
  show the tile only where the data exists, which is the honest handling of a
  parameter the brief names but no provider covers for India. The alternative
  - inventing a number, or quietly dropping the requirement - is worse in
  opposite directions.
*/
const POLLEN_FIELDS = [
  'alder_pollen', 'birch_pollen', 'grass_pollen', 'mugwort_pollen',
  'olive_pollen', 'ragweed_pollen',
];

/**
 * Forecast for one point: current conditions, 7 days hourly, 7 days daily.
 *
 * `timezone=auto` is essential rather than cosmetic - it makes every stamp in
 * the response local wall clock for that city, which is what the UI displays
 * and what weather/derive.js relies on to avoid timezone arithmetic.
 */
async function getForecast(lat, lon) {
  const latitude = gridKey(lat);
  const longitude = gridKey(lon);
  const key = `${latitude},${longitude}`;

  return forecastCache.wrap(key, () =>
    fetchJson(
      buildUrl(FORECAST_URL, {
        latitude,
        longitude,
        current: CURRENT_FIELDS,
        hourly: HOURLY_FIELDS,
        daily: DAILY_FIELDS,
        timezone: 'auto',
        forecast_days: 7,
        past_days: 1,
      }),
    ),
  );
}

/**
 * Pollutant concentrations for one point, with two past days of hourly data.
 *
 * The history is not decoration: CPCB's index is defined on 24-hour and
 * 8-hour averages, so without past hours there is no Indian AQI to compute.
 */
async function getAirQuality(lat, lon) {
  const latitude = gridKey(lat);
  const longitude = gridKey(lon);
  const key = `${latitude},${longitude}`;

  return airQualityCache.wrap(key, () =>
    fetchJson(
      buildUrl(AIR_QUALITY_URL, {
        latitude,
        longitude,
        current: [...POLLUTANT_FIELDS, ...POLLEN_FIELDS, 'us_aqi', 'european_aqi', 'dust', 'aerosol_optical_depth'],
        hourly: POLLUTANT_FIELDS,
        past_days: 2,
        forecast_days: 1,
        timezone: 'auto',
      }),
    ),
  );
}

/**
 * Sea state for one point.
 *
 * The marine model only covers water, and it answers for an inland request
 * with nulls rather than an error - which is the behaviour we want, since
 * "there is no sea here" is a fact about Lucknow, not a failure. Callers get
 * null fields and drop the marine section.
 */
async function getMarine(lat, lon) {
  const latitude = gridKey(lat);
  const longitude = gridKey(lon);
  const key = `${latitude},${longitude}`;

  return marineCache.wrap(key, () =>
    fetchJson(
      buildUrl(MARINE_URL, {
        latitude,
        longitude,
        current: ['wave_height', 'wave_direction', 'wave_period', 'sea_surface_temperature', 'sea_level_height_msl'],
        hourly: ['sea_level_height_msl', 'wave_height'],
        forecast_days: 2,
        timezone: 'auto',
      }),
    ),
  );
}

/**
 * Current conditions for many points in a single request.
 *
 * The saved-locations grid needs a temperature for every card. Requesting them
 * one at a time is N round trips and N cache entries; Open-Meteo accepts
 * comma-separated coordinate lists and returns an array in the same order, so
 * the whole grid costs one call.
 */
async function getBulkCurrent(points) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const latitudes = points.map((p) => gridKey(p.lat));
  const longitudes = points.map((p) => gridKey(p.lon));
  const key = latitudes.map((lat, i) => `${lat},${longitudes[i]}`).join('|');

  const { value, fresh, fetchedAt } = await bulkCache.wrap(key, () =>
    fetchJson(
      buildUrl(FORECAST_URL, {
        latitude: latitudes,
        longitude: longitudes,
        current: ['temperature_2m', 'apparent_temperature', 'weather_code', 'is_day', 'relative_humidity_2m'],
        daily: ['precipitation_probability_max', 'temperature_2m_max', 'temperature_2m_min'],
        forecast_days: 1,
        timezone: 'auto',
      }),
    ),
  );

  // A single-point request answers with an object, several with an array.
  // Normalising here keeps every caller on one shape.
  const list = Array.isArray(value) ? value : [value];
  return { list, fresh, fetchedAt };
}

const cacheStats = () => ({
  forecast: forecastCache.stats(),
  airQuality: airQualityCache.stats(),
  marine: marineCache.stats(),
  bulk: bulkCache.stats(),
});

module.exports = { getForecast, getAirQuality, getMarine, getBulkCurrent, cacheStats, gridKey };
