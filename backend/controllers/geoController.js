/*
  Place lookup endpoints for the location picker.

  Everything here is a thin, validated wrapper over geo/geocoding.js. The
  wrapping matters for two reasons:

  - It keeps the upstreams' contact details and rate-limit obligations on the
    server. A browser calling Nominatim directly would send one request per
    user with no shared queue and no shared cache, which is exactly what its
    usage policy forbids.
  - It lets one server-side cache serve every user. The tenth person to search
    "Lucknow" today costs nothing.
*/

const geo = require('../geo/geocoding');
const { POPULAR_CITIES, nearestCity } = require('../data/indianCities');
const { LANGUAGE_CODES, DEFAULT_LANGUAGE } = require('../i18n/languages');

/** Falls back to English rather than rejecting an unknown language code. */
const safeLang = (value) => {
  const code = String(value || '').toLowerCase().slice(0, 5);
  return LANGUAGE_CODES.includes(code) ? code : DEFAULT_LANGUAGE;
};

const parseCoord = (value, limit) => {
  const num = Number(value);
  if (!Number.isFinite(num) || Math.abs(num) > limit) return null;
  return num;
};

/** GET /api/geo/search?q=&lang=&count=&country= */
exports.searchPlaces = async (req, res) => {
  const { q, lang, count, country } = req.query;
  const query = String(q || '').trim();

  // Below two characters every index on earth returns noise, so this is
  // answered without a request rather than forwarded.
  if (query.length < 2) {
    return res.json({ query, results: [], reason: 'query-too-short' });
  }

  try {
    const results = await geo.search(query, {
      lang: safeLang(lang),
      count: Math.min(Math.max(Number(count) || 8, 1), 20),
      countryCode: country ? String(country).toUpperCase().slice(0, 2) : null,
    });
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ query, results });
  } catch (error) {
    // A failed search is an empty search, not a broken page: the picker still
    // has saved locations, popular cities and the GPS button.
    console.error('[geo] search failed:', error.message);
    res.status(200).json({ query, results: [], error: 'Search is unavailable right now' });
  }
};

/** GET /api/geo/reverse?lat=&lon=&lang= */
exports.reverseGeocode = async (req, res) => {
  const lat = parseCoord(req.query.lat, 90);
  const lon = parseCoord(req.query.lon, 180);

  if (lat === null || lon === null) {
    return res.status(400).json({ error: 'lat must be within +/-90 and lon within +/-180' });
  }

  try {
    const place = await geo.reverse(lat, lon, { lang: safeLang(req.query.lang) });
    res.set('Cache-Control', 'public, max-age=86400');
    res.json({ place });
  } catch (error) {
    console.error('[geo] reverse failed:', error.message);
    // geo.reverse has its own fallbacks, so reaching here means something
    // unexpected broke. Answer with coordinates rather than an error, because
    // the forecast for this point is perfectly obtainable without a name.
    res.json({
      place: {
        name: geo.coordinateLabel(lat, lon),
        region: '', country: '', countryCode: '',
        lat, lon, source: 'coordinates', precise: false,
      },
    });
  }
};

/*
  Client IPs that carry no location information.

  In development the request comes from the loopback interface, and on a LAN
  from a private range; asking a geolocation service about either returns
  nothing useful. Passing 'self' instead makes the service resolve the
  server's own public address, which during local development is the same
  network the user is on - the honest approximation, and the only one
  available.
*/
const UNROUTABLE = /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd|169\.254\.)/i;

/** GET /api/geo/ip - coarse fallback when GPS is denied or unavailable. */
exports.locateByIp = async (req, res) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const candidate = forwarded || req.ip || '';
  const ip = !candidate || UNROUTABLE.test(candidate) ? 'self' : candidate;

  try {
    const place = await geo.fromIp(ip);
    res.json({ place });
  } catch (error) {
    console.error('[geo] ip lookup failed:', error.message);
    res.status(503).json({ error: 'Could not determine your approximate location' });
  }
};

/**
 * GET /api/geo/popular?lang=
 *
 * The picker's opening screen, served from the bundled list so it is instant
 * and cannot fail.
 *
 * Names come back in English and the client translates them through its own
 * catalogs. That is deliberate, and it replaced asking the geocoder to
 * localise them: the geocoder's Hindi index files Mumbai under बम्बई, the
 * name it had before 1995, so the chips disagreed with the मुंबई shown
 * everywhere else in the app. For eight fixed cities the app's own names are
 * both correct and current; the geocoder still supplies localised names for
 * the arbitrary places a search can turn up, which no catalog could cover.
 *
 * `lang` is echoed so the client can tell which language a cached response
 * was built for.
 */
exports.popularPlaces = (req, res) => {
  const results = POPULAR_CITIES.map((c) => ({
    name: c.name,
    region: c.region,
    country: 'India',
    countryCode: 'IN',
    lat: c.lat,
    lon: c.lon,
    population: c.population,
  }));

  res.set('Cache-Control', 'public, max-age=86400');
  res.json({ results, lang: safeLang(req.query.lang) });
};

/** GET /api/geo/nearest?lat=&lon= - offline nearest-city, no network. */
exports.nearestPlace = (req, res) => {
  const lat = parseCoord(req.query.lat, 90);
  const lon = parseCoord(req.query.lon, 180);
  if (lat === null || lon === null) {
    return res.status(400).json({ error: 'lat must be within +/-90 and lon within +/-180' });
  }
  res.json({ place: nearestCity(lat, lon) });
};

exports.geoStats = (req, res) => res.json(geo.geoStats());
