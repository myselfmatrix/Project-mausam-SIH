/*
  The last resort, when the live service cannot answer at all.

  This exists for one failure that is outside our control: Open-Meteo's limit
  is a daily quota counted per IP, and on shared hosting it can be spent by
  traffic that was never ours. When that happens and we hold nothing cached
  for the requested place, the alternative to this file is a dead page.

  Two rules govern what is in here.

  First, nothing is invented. These are real responses recorded from the live
  API, not numbers written to look plausible. A forecast is a web of values
  that constrain each other - feels-like follows from temperature and
  humidity, the AQI sub-indices have to produce the reported AQI, a tide
  height has to match its phase - and hand-written figures fail the first
  cross-check anyone makes. Recorded readings are internally consistent
  because they actually happened.

  Second, the app never claims they are current. Every response built here is
  flagged, the source is reported as `sample` rather than `live` or `cached`,
  and the interface carries a banner saying so for as long as it is showing
  one. A fallback that is indistinguishable from a live reading is worse than
  no fallback at all: it turns an outage into a wrong answer.
*/

const READINGS = require('./sampleReadings.json');

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km, for picking the closest recorded place. */
function distanceKm(aLat, aLon, bLat, bLon) {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/*
  Pick by distance, but only among places of the same kind.

  A coastal recording carries tide, wave height and sea temperature. Handing
  those to someone in Lucknow would put a tide table on a city four hundred
  kilometres inland, which is exactly the error the whole availability system
  exists to prevent. Inland requests therefore only ever match inland
  recordings, and coastal ones coastal.
*/
function nearestReading(lat, lon, wantCoastal) {
  const pool = READINGS.places.filter((p) => Boolean(p.weather.isCoastal) === wantCoastal);
  const candidates = pool.length ? pool : READINGS.places;

  let best = candidates[0];
  let bestKm = Infinity;
  for (const place of candidates) {
    const km = distanceKm(lat, lon, place.lat, place.lon);
    if (km < bestKm) {
      bestKm = km;
      best = place;
    }
  }
  return { reading: best, km: Math.round(bestKm) };
}

const pad = (n) => String(n).padStart(2, '0');

/** "14:00" -> minutes since midnight. */
const minutesOf = (clock) => {
  if (typeof clock !== 'string' || !clock.includes(':')) return null;
  const [h, m] = clock.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/*
  Move a recording onto today's clock.

  The readings were captured at some hour on some day, and their hourly strip,
  daily strip and "updated at" all carry those original stamps. Served as-is,
  the dashboard would show a twelve-hour strip beginning at a time that has
  already passed and a seven-day forecast starting last week - which reads as
  broken rather than as a fallback.

  Only the labels move. Every value stays exactly as it was recorded, so what
  the tiles show is still a real reading; it is placed against the current
  clock rather than restated as current.
*/
function rebaseToNow(weather) {
  const now = new Date();
  const out = { ...weather };

  out.updatedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  if (Array.isArray(weather.hourlyForecast)) {
    out.hourlyForecast = weather.hourlyForecast.map((hour, i) => {
      const at = new Date(now.getTime() + i * 3600 * 1000);
      return { ...hour, time: `${pad(at.getHours())}:00` };
    });
  }

  if (Array.isArray(weather.dailyForecast)) {
    out.dailyForecast = weather.dailyForecast.map((day, i) => {
      const at = new Date(now.getTime() + i * 86400 * 1000);
      return {
        ...day,
        date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
        // `day` is a catalog slug the client translates, so "Today" has to
        // stay a slug rather than become a weekday name here.
        day: i === 0 ? 'Today' : at.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    });
  }

  /*
    Day or night is decided by the current clock against the recorded sunrise
    and sunset, not by what it was when the reading was taken. Otherwise a
    sample captured at noon would light the sky panel at midnight.
  */
  const rise = minutesOf(weather.sunrise);
  const set = minutesOf(weather.sunset);
  const mins = now.getHours() * 60 + now.getMinutes();
  if (rise !== null && set !== null) out.isDay = mins >= rise && mins <= set;

  return out;
}

/**
 * A complete, real weather payload for `place`, drawn from the nearest
 * recording of the same kind and moved onto today's clock.
 *
 * @returns `{ weather, source }` where `source` names the recorded place and
 *          how far away it is, so the interface can say what it is showing
 *          rather than leaving the user to assume it is theirs.
 */
function sampleFor(place, { coastal = null } = {}) {
  const lat = Number(place?.lat);
  const lon = Number(place?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  /*
    Coastal or not, inferred from the point itself.

    The caller usually cannot tell us: the marine service has failed too, or
    this is a coordinate we have never seen. Proximity to a recording we know
    is coastal is a crude test, but it errs in the safe direction - a coastal
    place mistaken for an inland one simply loses its tide tile, whereas the
    reverse puts a tide table on a landlocked city.
  */
  const COASTAL_RADIUS_KM = 80;
  let wantCoastal;
  if (coastal !== null) {
    wantCoastal = Boolean(coastal);
  } else {
    const nearestCoast = READINGS.places
      .filter((p) => p.weather.isCoastal)
      .reduce((best, p) => {
        const km = distanceKm(lat, lon, p.lat, p.lon);
        return km < best ? km : best;
      }, Infinity);
    wantCoastal = nearestCoast <= COASTAL_RADIUS_KM;
  }
  const { reading, km } = nearestReading(lat, lon, wantCoastal);
  if (!reading) return null;

  const weather = rebaseToNow(reading.weather);

  return {
    weather: {
      ...weather,
      // The place is the user's; only the readings are borrowed.
      location: place.name || weather.location,
      region: place.region || '',
      coordinates: { lat, lon },
      isSample: true,
    },
    source: {
      recordedAt: READINGS.capturedAt,
      recordedFor: reading.weather.location,
      distanceKm: km,
    },
  };
}

module.exports = { sampleFor, SAMPLE_PLACES: READINGS.places.map((p) => p.weather.location) };
