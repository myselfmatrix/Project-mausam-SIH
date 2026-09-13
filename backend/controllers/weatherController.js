/*
  Live weather endpoints.

  Every response is built from real model output fetched at request time - see
  weather/openMeteo.js for the upstreams and weather/normalize.js for the
  shape. There is no sample data behind these handlers.

  The controller's own job is resilience. Three upstreams are involved and any
  of them can be slow or briefly down, so they are fetched concurrently with
  Promise.allSettled and each is allowed to fail on its own:

    forecast     required - without it there is no weather, so its failure is
                            the only one that produces an error status
    air quality  optional - its absence costs the AQI tile
    marine       optional - its absence costs the tide and wave tiles

  Partial success is therefore the normal, expected outcome rather than an
  edge case, and `meta.sources` tells the client exactly which sections are
  real, which are cached, and which are missing.
*/

const om = require('../weather/openMeteo');
const { buildAlerts } = require('../weather/alerts');
const { createCache } = require('../services/cache');
const geo = require('../geo/geocoding');
const { buildWeatherPayload, buildSummary } = require('../weather/normalize');
const { LANGUAGE_CODES, DEFAULT_LANGUAGE } = require('../i18n/languages');

const safeLang = (value) => {
  const code = String(value || '').toLowerCase().slice(0, 5);
  return LANGUAGE_CODES.includes(code) ? code : DEFAULT_LANGUAGE;
};

const parseCoord = (value, limit) => {
  const num = Number(value);
  if (!Number.isFinite(num) || Math.abs(num) > limit) return null;
  return num;
};

/** Unwraps an allSettled entry from a cache.wrap() call. */
function settled(result) {
  if (result.status !== 'fulfilled' || !result.value) {
    return { data: null, fresh: false, error: result.reason?.message || 'unavailable' };
  }
  return { data: result.value.value, fresh: result.value.fresh, fetchedAt: result.value.fetchedAt, error: null };
}

/**
 * Fetches and assembles one location's full weather.
 *
 * Shared by every entry point below, so a request by name and a request by
 * coordinate produce byte-identical payloads.
 */
async function loadWeather(place) {
  const [forecastResult, airResult, marineResult] = await Promise.allSettled([
    om.getForecast(place.lat, place.lon),
    om.getAirQuality(place.lat, place.lon),
    om.getMarine(place.lat, place.lon),
  ]);

  const forecast = settled(forecastResult);
  const air = settled(airResult);
  const marine = settled(marineResult);

  if (!forecast.data) {
    const error = new Error(forecast.error || 'Forecast upstream unavailable');
    error.status = 503;
    throw error;
  }

  const weather = buildWeatherPayload({
    place,
    forecast: forecast.data,
    airQuality: air.data,
    marine: marine.data,
  });

  /*
    Alerts ride along with the weather rather than living on their own
    endpoint. They are computed from exactly this payload, so a separate
    request could return advisories derived from a different fetch than the
    numbers on screen - a warning that disagrees with the tile beside it.
  */
  return {
    weather,
    alerts: buildAlerts(weather),
    meta: {
      // 'live' means fetched now, 'cached' means served from a previous
      // successful fetch because this one failed. The distinction is surfaced
      // in the UI, so it must not be blurred here.
      sources: {
        forecast: forecast.fresh ? 'live' : 'cached',
        airQuality: air.data ? (air.fresh ? 'live' : 'cached') : 'unavailable',
        marine: marine.data ? (marine.fresh ? 'live' : 'cached') : 'unavailable',
      },
      provider: 'Open-Meteo (ECMWF / GFS / ICON)',
      aqiScale: weather.aqiScale || null,
      fetchedAt: new Date().toISOString(),
      degraded: !forecast.fresh || !air.data || !marine.data,
    },
  };
}

/**
 * Resolves whatever the client sent into a place with coordinates.
 *
 * Coordinates are preferred when present - they are what the user actually
 * picked, and geocoding a name back into coordinates would quietly move them
 * to the centre of the nearest city. A name alone is geocoded, which is the
 * path the older `/api/weather/:location` callers still take.
 */
async function resolvePlace({ lat, lon, name, region, lang }) {
  const latitude = parseCoord(lat, 90);
  const longitude = parseCoord(lon, 180);

  if (latitude !== null && longitude !== null) {
    if (name) {
      return { name: String(name).slice(0, 80), region: region ? String(region).slice(0, 80) : '', lat: latitude, lon: longitude };
    }
    // Coordinates with no label: name them, but never fail for want of a name.
    try {
      const place = await geo.reverse(latitude, longitude, { lang });
      return { ...place, lat: latitude, lon: longitude };
    } catch {
      return { name: geo.coordinateLabel(latitude, longitude), region: '', lat: latitude, lon: longitude };
    }
  }

  const query = String(name || '').trim();
  if (!query) {
    const error = new Error('Provide either lat and lon, or a location name');
    error.status = 400;
    throw error;
  }

  const [hit] = await geo.search(query, { lang, count: 1 });
  if (!hit) {
    const error = new Error(`Could not find a place called "${query}"`);
    error.status = 404;
    throw error;
  }
  return hit;
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

/** GET /api/weather/current?lat=&lon=&name=&region=&lang= */
exports.getCurrentWeather = async (req, res) => {
  try {
    const lang = safeLang(req.query.lang);
    const place = await resolvePlace({ ...req.query, lang });
    const { weather, meta } = await loadWeather(place);
    // Half the forecast TTL: a client refreshing sooner than this would get
    // the same numbers anyway.
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ weather, meta });
  } catch (error) {
    const status = error.status || 500;
    console.error('[weather] current failed:', error.message);
    res.status(status).json({ error: error.message });
  }
};

/**
 * GET /api/weather/bulk?points=lat,lon;lat,lon&names=A;B
 *
 * One upstream request for every saved location, because the locations grid
 * needs a live temperature per card and fetching them one card at a time is a
 * request per card on every visit.
 */
exports.getBulkWeather = async (req, res) => {
  try {
    const raw = String(req.query.points || '').trim();
    if (!raw) return res.json({ results: [] });

    const names = String(req.query.names || '').split(';');
    const regions = String(req.query.regions || '').split(';');

    const points = raw
      .split(';')
      .map((pair, index) => {
        const [latPart, lonPart] = pair.split(',');
        const lat = parseCoord(latPart, 90);
        const lon = parseCoord(lonPart, 180);
        if (lat === null || lon === null) return null;
        return {
          lat,
          lon,
          name: (names[index] || '').slice(0, 80),
          region: (regions[index] || '').slice(0, 80),
        };
      })
      .filter(Boolean)
      // Generous enough for any realistic saved list, low enough that a
      // crafted URL cannot turn one request into an enormous upstream one.
      .slice(0, 25);

    if (points.length === 0) {
      return res.status(400).json({ error: 'points must be lat,lon pairs separated by semicolons' });
    }

    const { list, fresh } = await om.getBulkCurrent(points);
    const results = points
      .map((place, index) => buildSummary(place, list[index]))
      .filter(Boolean);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({ results, meta: { source: fresh ? 'live' : 'cached', count: results.length } });
  } catch (error) {
    console.error('[weather] bulk failed:', error.message);
    res.status(503).json({ error: 'Could not load conditions for those locations' });
  }
};

/**
 * GET /api/weather/personalized/data?location=&lat=&lon=&personaType=
 *
 * The shape the dashboard has always called, kept so the client contract is
 * unchanged: `{ weather }`, with the persona echoed back.
 */
exports.getPersonalizedWeather = async (req, res) => {
  try {
    const lang = safeLang(req.query.lang);
    const place = await resolvePlace({
      lat: req.query.lat,
      lon: req.query.lon,
      name: req.query.location || req.query.name,
      region: req.query.region,
      lang,
    });
    const { weather, alerts, meta } = await loadWeather(place);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ weather, alerts, meta, persona: req.query.personaType || null });
  } catch (error) {
    const status = error.status || 500;
    console.error('[weather] personalized failed:', error.message);
    res.status(status).json({ error: error.message });
  }
};

/** GET /api/weather/:location - by name, for older callers and shareable URLs. */
exports.getWeatherByLocation = async (req, res) => {
  try {
    const lang = safeLang(req.query.lang);
    const place = await resolvePlace({ name: req.params.location, lang });
    const { weather, meta } = await loadWeather(place);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ ...weather, meta });
  } catch (error) {
    const status = error.status || 500;
    console.error('[weather] by-name failed:', error.message);
    res.status(status).json({ error: error.message });
  }
};

exports.cacheStats = (req, res) => res.json(om.cacheStats());

/*
  GET /api/weather/alerts/national

  Live advisories from a spread of Indian cities, for the landing page.

  The cities are fixed and chosen to span hazard types - the Gangetic plain
  for winter smog and fog, the west coast for monsoon rain and sea state, the
  desert and the Deccan for heat, the Himalaya for cold. That spread is the
  point: whatever the season, some of these are carrying something real, so
  the marquee shows live advisories rather than a fixture of invented ones.

  One shared 15-minute cache covers the whole set, and each city underneath it
  hits the same per-source caches the dashboard uses, so a visitor almost
  never triggers an upstream fetch of their own.
*/
const NATIONAL_CITIES = [
  { name: 'Delhi', region: 'Delhi', lat: 28.6139, lon: 77.209 },
  { name: 'Mumbai', region: 'Maharashtra', lat: 19.076, lon: 72.8777 },
  { name: 'Chennai', region: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { name: 'Kolkata', region: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { name: 'Jaipur', region: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
  { name: 'Leh', region: 'Ladakh', lat: 34.1526, lon: 77.5771 },
];

const nationalCache = createCache({ ttl: 15 * 60 * 1000, max: 1, name: 'alerts-national' });

exports.getNationalAlerts = async (req, res) => {
  try {
    const { value } = await nationalCache.wrap('national', async () => {
      const settledCities = await Promise.allSettled(
        NATIONAL_CITIES.map((place) => loadWeather(place)),
      );

      const out = [];
      settledCities.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const place = NATIONAL_CITIES[index];
        for (const entry of result.value.alerts || []) {
          out.push({ ...entry, id: `${place.name}-${entry.id}`, place: place.name, region: place.region });
        }
      });
      return out;
    });

    res.set('Cache-Control', 'public, max-age=600');
    res.json({ alerts: value, meta: { cities: NATIONAL_CITIES.length } });
  } catch (error) {
    // The marquee is decorative; an empty list costs the visitor nothing.
    console.error('[weather] national alerts failed:', error.message);
    res.json({ alerts: [], meta: { cities: 0 } });
  }
};
