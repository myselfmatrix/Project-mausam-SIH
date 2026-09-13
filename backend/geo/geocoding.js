/*
  Turning place names into coordinates, and coordinates back into place names.

  Two different services, because no free one does both well:

  - Forward search uses Open-Meteo's geocoding index. It is keyless, fast, and
    - the reason it was chosen here - it answers in the language you ask for.
    A `language=ta` search returns "சென்னை" with its state and country also in
    Tamil, which means the location picker is translated by the data itself
    rather than by a catalog that would have to list every city on earth.

  - Reverse lookup uses OpenStreetMap's Nominatim, which Open-Meteo does not
    offer. Nominatim is run on donated infrastructure under a usage policy:
    identify yourself, and no more than one request per second. Both are
    honoured below - the identifying header lives in services/httpJson.js, and
    the one-per-second limit is enforced by a queue rather than trusted to
    luck, because exceeding it gets the whole project's IP blocked.

  Reverse lookups also have a local fallback (data/indianCities.js). The GPS
  path is the one place a user is actively waiting on a network call, so it
  must not be the one place that can leave them staring at an error.
*/

const { fetchJson, buildUrl, HttpError } = require('../services/httpJson');
const { createCache } = require('../services/cache');
const { nearestCity } = require('../data/indianCities');

/*
  Former and informal names, mapped to what the index answers to.

  Many Indian cities were officially renamed, and the geocoding index carries
  only the current name - so a search for "Bangalore" finds nothing in
  Karnataka and offers a village called Bangalore Town in Sindh instead. Since
  a great many people still type the old name (and "Vizag", and "Trichy"), the
  query is rewritten before it goes upstream.

  This is a lookup of names to names, not a claim about which name is correct:
  the result is always displayed under the city's current official name.
*/
const QUERY_ALIASES = {
  bangalore: 'Bengaluru', bombay: 'Mumbai', calcutta: 'Kolkata', madras: 'Chennai',
  poona: 'Pune', mysore: 'Mysuru', mangalore: 'Mangaluru', belgaum: 'Belagavi',
  hubli: 'Hubballi', allahabad: 'Prayagraj', tuticorin: 'Thoothukudi',
  trivandrum: 'Thiruvananthapuram', cochin: 'Kochi', baroda: 'Vadodara',
  gurgaon: 'Gurugram', simla: 'Shimla', pondicherry: 'Puducherry', panaji: 'Panjim',
  cawnpore: 'Kanpur', benares: 'Varanasi', banaras: 'Varanasi', kashi: 'Varanasi',
  vizag: 'Visakhapatnam', waltair: 'Visakhapatnam', trichy: 'Tiruchirappalli',
  ooty: 'Udhagamandalam', kanyakumari: 'Kanniyakumari', gauhati: 'Guwahati',
  jubbulpore: 'Jabalpur', ahmedabad: 'Ahmedabad', orissa: 'Bhubaneswar',
};

/* The index still files Goa's capital under its Portuguese spelling. The city
   has been Panaji for decades, so the label is corrected on the way out. */
const DISPLAY_NAMES = { Panjim: 'Panaji' };

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const IP_URL = 'https://ipwho.is/';

// Place names change far more slowly than the weather, so these TTLs are long.
const searchCache = createCache({ ttl: 24 * 60 * 60 * 1000, max: 1200, name: 'geo-search' });
const reverseCache = createCache({ ttl: 7 * 24 * 60 * 60 * 1000, max: 800, name: 'geo-reverse' });
const ipCache = createCache({ ttl: 60 * 60 * 1000, max: 200, name: 'geo-ip' });

/*
  Nominatim's usage policy allows one request per second from an application.

  This serialises every reverse lookup through a single promise chain with a
  minimum gap, so bursts queue instead of arriving together. Slightly over a
  second, to stay clear of the limit rather than exactly on it.
*/
const NOMINATIM_MIN_GAP_MS = 1100;
let nominatimChain = Promise.resolve();
let lastNominatimAt = 0;

function throughNominatimQueue(task) {
  const queued = nominatimChain.then(async () => {
    const wait = Math.max(0, NOMINATIM_MIN_GAP_MS - (Date.now() - lastNominatimAt));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastNominatimAt = Date.now();
    return task();
  });
  // Keep the chain alive after a rejection, or one failure stalls every
  // subsequent lookup for the lifetime of the process.
  nominatimChain = queued.then(() => undefined, () => undefined);
  return queued;
}

const round = (value, dp) => Math.round(value * 10 ** dp) / 10 ** dp;

/* ------------------------------------------------------------------ */
/* Forward search                                                      */
/* ------------------------------------------------------------------ */

/*
  GeoNames feature codes starting PPL are populated places. Filtering to them
  is what stops a search for "Mysuru" from offering an airport and a toll gate
  named after the city above the city itself.
*/
const isPopulatedPlace = (result) =>
  typeof result.feature_code === 'string' && result.feature_code.startsWith('PPL');

/** The upstream's result shape -> the one shape the app passes around. */
function toPlace(result) {
  return {
    id: `om-${result.id}`,
    name: DISPLAY_NAMES[result.name] || result.name,
    region: result.admin1 || '',
    district: result.admin2 || '',
    country: result.country || '',
    countryCode: result.country_code || '',
    lat: round(result.latitude, 4),
    lon: round(result.longitude, 4),
    timezone: result.timezone || null,
    elevation: result.elevation ?? null,
    population: result.population || 0,
    featureCode: result.feature_code || null,
  };
}

const stripAccents = (value) =>
  String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const hasLatin = (value) => /[a-z]/i.test(value);

/*
  Ranking.

  The upstream is relevance-sorted, but its relevance is global and ours is
  not: a search for "luck" puts Lutsk in Ukraine first and Lucknow seventh,
  which is the wrong answer for this product. So results are re-scored on
  three signals, and the weights below are what make the common cases come out
  right.

  - How well the name matches what was typed. Worth the most when it applies,
    but see `comparable` below - it often cannot.
  - How significant the place is, as log10 of population. Logarithmic because
    the interesting distinction is village / town / city / metro, not the
    linear gap between six and seven million.
  - Whether the place is in India. A Ministry of Earth Sciences product serves
    Indian users, so ties break towards India - deliberately a small thumb on
    the scale (+1.2, against up to ~7 from population) so that London still
    comes first when someone searches for London.
  - The upstream's own position, lightly, as a tiebreaker between places this
    scoring cannot separate.

  `comparable` is the subtle part. Names come back in the requested language,
  so a Latin query cannot be string-matched against a Devanagari name - and
  scoring it as "no match" once demoted चेन्नई below a village called
  Chennaikan Koppal, because the village's name happens to be transliterated.
  Name similarity is therefore only scored when the query and the name are in
  the same script, which also means a user typing चेन्नई gets an exact match.
*/
const MATCH_EXACT = 1;
const MATCH_PREFIX = 0.6;
const MATCH_CONTAINS = 0.25;
const MATCH_WEIGHT = 2.2;
const INDIA_BONUS = 1.2;
const POSITION_PENALTY = 0.25;

function scorePlace(place, needle, position) {
  const name = stripAccents(place.name);
  const comparable = hasLatin(needle) === hasLatin(name);

  let match = 0;
  if (comparable) {
    if (name === needle) match = MATCH_EXACT;
    else if (name.startsWith(needle)) match = MATCH_PREFIX;
    else if (name.includes(needle)) match = MATCH_CONTAINS;
  }

  return (
    match * MATCH_WEIGHT +
    Math.log10((place.population || 0) + 10) +
    (place.countryCode === 'IN' ? INDIA_BONUS : 0) -
    position * POSITION_PENALTY
  );
}

/**
 * Searches for places matching `query`.
 *
 * Returns the best `count` matches, re-ranked as described above.
 */
async function search(query, { lang = 'en', count = 8, countryCode = null } = {}) {
  const raw = String(query || '').trim();
  if (raw.length < 2) return [];

  // A former name is rewritten to the current one before the request, so both
  // spellings share a cache entry as well as a result set.
  const trimmed = QUERY_ALIASES[stripAccents(raw)] || raw;
  const key = `${stripAccents(trimmed)}|${lang}|${count}|${countryCode || ''}`;

  const { value } = await searchCache.wrap(key, async () => {
    const data = await fetchJson(
      buildUrl(SEARCH_URL, {
        name: trimmed,
        // Over-fetch so there is something left to rank after filtering.
        count: Math.min(Math.max(count * 3, 20), 100),
        language: lang,
        format: 'json',
        countryCode: countryCode || undefined,
      }),
    );

    const results = Array.isArray(data.results) ? data.results : [];
    const places = results.filter(isPopulatedPlace).map(toPlace);

    // Same place, two index entries: keep the better-populated one, and
    // remember where the upstream had ranked it.
    const byCoord = new Map();
    places.forEach((place, position) => {
      const coordKey = `${round(place.lat, 2)},${round(place.lon, 2)}`;
      const existing = byCoord.get(coordKey);
      if (!existing || place.population > existing.place.population) {
        byCoord.set(coordKey, { place, position });
      }
    });

    const needle = stripAccents(trimmed);
    const scored = [...byCoord.values()].map(({ place, position }) => ({
      place,
      score: scorePlace(place, needle, position),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.place);
  });

  return value.slice(0, count);
}

/* ------------------------------------------------------------------ */
/* Reverse lookup                                                      */
/* ------------------------------------------------------------------ */

/*
  Nominatim returns an address broken into administrative levels, and which
  level holds "the name of this place" depends on where you are: a metro is
  `city`, a small town is `town` or `village`, an unincorporated area may only
  have a `suburb` or a `county`. Walking the levels from most specific to least
  gives the name a person would actually use.
*/
const NAME_LEVELS = ['city', 'town', 'village', 'municipality', 'suburb', 'city_district', 'county', 'state_district'];
const REGION_LEVELS = ['state', 'region', 'state_district', 'county'];

const pickLevel = (address, levels) => {
  for (const level of levels) {
    if (address?.[level]) return address[level];
  }
  return '';
};

/** Formats coordinates as a readable label: the last-resort place name. */
const coordinateLabel = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

/**
 * Coordinates -> a named place.
 *
 * Resolution order, and every step matters:
 *
 *  1. Nominatim, which knows about villages and suburbs the city list cannot.
 *  2. The bundled Indian city list, if Nominatim is unreachable or has nothing
 *     - "near Kanpur, 12 km" is a useful answer.
 *  3. Formatted coordinates, which is honest and never fails.
 *
 * `source` travels with the result so the UI can be explicit about a fallback
 * instead of presenting an approximation as an exact address.
 */
async function reverse(lat, lon, { lang = 'en' } = {}) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError('Valid lat and lon are required', 400);
  }

  // ~110 m buckets: fine enough to name a neighbourhood, coarse enough that a
  // stationary phone re-reading its GPS never issues a second request.
  const key = `${round(latitude, 3)},${round(longitude, 3)}|${lang}`;

  const { value } = await reverseCache.wrap(key, async () => {
    try {
      const data = await throughNominatimQueue(() =>
        fetchJson(
          buildUrl(REVERSE_URL, {
            format: 'jsonv2',
            lat: latitude,
            lon: longitude,
            // zoom 12 is roughly city/town level. Higher returns a street
            // address, which is more precision than a weather app should show
            // - and more than the ~11 km forecast grid can justify.
            zoom: 12,
            addressdetails: 1,
            'accept-language': lang,
          }),
          // One retry, not the default two: the caller is a user waiting on a
          // GPS reading, and the local fallback is better than a long wait.
          { retries: 1, timeout: 6000, headers: { 'Accept-Language': lang } },
        ),
      );

      const address = data?.address || {};
      const name = pickLevel(address, NAME_LEVELS) || data?.name || '';
      if (name) {
        return {
          name,
          region: pickLevel(address, REGION_LEVELS),
          country: address.country || '',
          countryCode: (address.country_code || '').toUpperCase(),
          lat: round(latitude, 4),
          lon: round(longitude, 4),
          postcode: address.postcode || '',
          source: 'nominatim',
          precise: true,
        };
      }
    } catch {
      // Fall through to the local list. A failed reverse lookup is a naming
      // problem, not a weather problem: the forecast for these coordinates is
      // already on its way and does not need a name to be correct.
    }

    const near = nearestCity(latitude, longitude);
    if (near) {
      return {
        name: near.name,
        region: near.region,
        country: 'India',
        countryCode: 'IN',
        lat: round(latitude, 4),
        lon: round(longitude, 4),
        source: 'nearest-city',
        precise: false,
        distanceKm: near.distanceKm,
      };
    }

    return {
      name: coordinateLabel(latitude, longitude),
      region: '',
      country: '',
      countryCode: '',
      lat: round(latitude, 4),
      lon: round(longitude, 4),
      source: 'coordinates',
      precise: false,
    };
  });

  return value;
}

/* ------------------------------------------------------------------ */
/* IP fallback                                                         */
/* ------------------------------------------------------------------ */

/**
 * A coarse location from the caller's IP address.
 *
 * Only ever a fallback for a denied or unavailable GPS permission, and only
 * accurate to a city at best - a mobile network can place a user in a
 * different state entirely. It is returned with `accuracy: 'city'` so the UI
 * presents it as a suggestion to confirm, never as "your location".
 */
async function fromIp(ip) {
  const key = ip || 'self';

  const { value } = await ipCache.wrap(key, async () => {
    const url = ip && ip !== 'self' ? `${IP_URL}${encodeURIComponent(ip)}` : IP_URL;
    const data = await fetchJson(url, { retries: 1, timeout: 5000 });
    if (!data || data.success === false) throw new HttpError('IP lookup failed', 502);
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
      throw new HttpError('IP lookup returned no coordinates', 502);
    }
    return {
      name: data.city || data.region || data.country || 'Unknown',
      region: data.region || '',
      country: data.country || '',
      countryCode: data.country_code || '',
      lat: round(data.latitude, 4),
      lon: round(data.longitude, 4),
      timezone: data.timezone?.id || null,
      source: 'ip',
      accuracy: 'city',
      precise: false,
    };
  });

  return value;
}

const geoStats = () => ({
  search: searchCache.stats(),
  reverse: reverseCache.stats(),
  ip: ipCache.stats(),
});

module.exports = { search, reverse, fromIp, geoStats, coordinateLabel };
