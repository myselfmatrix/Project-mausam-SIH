/*
  WMO 4677 present-weather codes -> the condition names this app displays.

  The forecast API reports conditions as an integer code, so this table is the
  single place that decides what the user reads. Every code the API documents
  is listed; an unlisted one falls back by numeric band rather than rendering
  a bare number.

  Condition strings stay in English here on purpose. They are the lookup input
  for the translation catalogs (i18n/vocab.js slugs "Light Rain" to
  condition.lightRain) and they fall back to the English text when a catalog
  has no entry — so a code nobody has translated yet still reads as weather
  instead of as a missing key.
*/

// group drives iconography and the rain/snow branch of derived guidance.
const CODES = {
  0: { day: 'Sunny', night: 'Clear', group: 'clear' },
  1: { day: 'Mainly Clear', night: 'Mainly Clear', group: 'clear' },
  2: { day: 'Partly Cloudy', night: 'Partly Cloudy', group: 'partly' },
  3: { day: 'Overcast', night: 'Overcast', group: 'cloudy' },
  45: { day: 'Fog', night: 'Fog', group: 'fog' },
  48: { day: 'Freezing Fog', night: 'Freezing Fog', group: 'fog' },
  51: { day: 'Light Drizzle', night: 'Light Drizzle', group: 'drizzle' },
  53: { day: 'Drizzle', night: 'Drizzle', group: 'drizzle' },
  55: { day: 'Heavy Drizzle', night: 'Heavy Drizzle', group: 'drizzle' },
  56: { day: 'Freezing Drizzle', night: 'Freezing Drizzle', group: 'drizzle' },
  57: { day: 'Heavy Freezing Drizzle', night: 'Heavy Freezing Drizzle', group: 'drizzle' },
  61: { day: 'Light Rain', night: 'Light Rain', group: 'rain' },
  63: { day: 'Rain', night: 'Rain', group: 'rain' },
  65: { day: 'Heavy Rain', night: 'Heavy Rain', group: 'rain' },
  66: { day: 'Freezing Rain', night: 'Freezing Rain', group: 'rain' },
  67: { day: 'Heavy Freezing Rain', night: 'Heavy Freezing Rain', group: 'rain' },
  71: { day: 'Light Snow', night: 'Light Snow', group: 'snow' },
  73: { day: 'Snow', night: 'Snow', group: 'snow' },
  75: { day: 'Heavy Snow', night: 'Heavy Snow', group: 'snow' },
  77: { day: 'Snow Grains', night: 'Snow Grains', group: 'snow' },
  80: { day: 'Light Showers', night: 'Light Showers', group: 'showers' },
  81: { day: 'Showers', night: 'Showers', group: 'showers' },
  82: { day: 'Violent Showers', night: 'Violent Showers', group: 'showers' },
  85: { day: 'Light Snow Showers', night: 'Light Snow Showers', group: 'snow' },
  86: { day: 'Snow Showers', night: 'Snow Showers', group: 'snow' },
  95: { day: 'Thunderstorm', night: 'Thunderstorm', group: 'thunder' },
  96: { day: 'Thunderstorm with Hail', night: 'Thunderstorm with Hail', group: 'thunder' },
  99: { day: 'Severe Thunderstorm', night: 'Severe Thunderstorm', group: 'thunder' },
};

/* A code outside the table still has to render as something sensible. WMO
   groups codes into contiguous bands by precipitation type, so the band's
   representative code is a safe stand-in.

   Ordered by ascending upper bound and matched on the first bound that covers
   the code, so each band claims only its own range. (Descending order looks
   equivalent and is not: the thunderstorm band's bound is the highest, so it
   would swallow every unlisted code below it.) */
// Each representative is its band's moderate member, not its lightest: an
// unlisted 64 sits between "Rain" and "Heavy Rain", so reporting "Light Rain"
// would understate it.
const FALLBACK_BANDS = [
  [3, 0],   // 0-3   clear .. overcast
  [48, 45], // 45-48 fog
  [57, 53], // 51-57 drizzle
  [67, 63], // 61-67 rain
  [77, 73], // 71-77 snow
  [82, 81], // 80-82 rain showers
  [86, 86], // 85-86 snow showers
  [99, 95], // 95-99 thunderstorm
];

const fallbackFor = (code) => {
  for (const [upper, representative] of FALLBACK_BANDS) {
    if (code <= upper) return CODES[representative];
  }
  // Above every documented band — thunderstorm is the most severe thing the
  // table describes, and over-warning beats under-warning.
  return CODES[95];
};

/*
  Haze: visible in India for much of the year, absent from the code table.

  WMO 4677 has haze codes (04-05) but the forecast model doesn't emit them —
  it reports a clear or lightly-clouded sky while visibility sits at three
  kilometres. Calling that "Sunny" is wrong in the way a user notices
  immediately, so a clear-sky code with suppressed visibility and no
  precipitation is reported as hazy. Both inputs are measured values; the
  threshold is the only judgement, and it is the conventional one (haze below
  5 km, mist/fog handled by the model's own 45/48 codes).
*/
const HAZE_VISIBILITY_M = 5000;

function isHazy({ code, visibilityM, precipitation }) {
  if (visibilityM === null || visibilityM === undefined) return false;
  if (precipitation > 0.1) return false;
  return visibilityM < HAZE_VISIBILITY_M && code <= 3;
}

/**
 * Resolves a WMO code to `{ condition, group, code }`.
 *
 * `isDay` picks between the day and night wording for codes where it matters
 * ("Sunny" at 3pm, "Clear" at 3am). `visibilityM` and `precipitation` are
 * optional and only used to detect haze.
 */
function describeCode(code, { isDay = true, visibilityM = null, precipitation = 0 } = {}) {
  const numeric = Number(code);

  /* No code at all means the model had nothing to say, which is not the same
     as a clear sky. Returning a null condition lets the controller omit the
     field entirely so the client keeps the last value it knew, instead of the
     app cheerfully reporting sunshine it never measured. */
  if (code === null || code === undefined || !Number.isFinite(numeric)) {
    return { code: null, condition: null, group: 'unknown', hazeDerived: false };
  }

  const entry = CODES[numeric] || fallbackFor(numeric);

  if (isHazy({ code: numeric, visibilityM, precipitation })) {
    return {
      code: numeric,
      condition: isDay ? 'Hazy Sun' : 'Hazy',
      group: 'haze',
      hazeDerived: true,
    };
  }

  return {
    code: Number.isFinite(numeric) ? numeric : 0,
    condition: isDay ? entry.day : entry.night,
    group: entry.group,
    hazeDerived: false,
  };
}

/** Every condition string this module can emit — used to verify catalogs. */
function allConditions() {
  const out = new Set(['Hazy Sun', 'Hazy']);
  for (const entry of Object.values(CODES)) {
    out.add(entry.day);
    out.add(entry.night);
  }
  return [...out];
}

const isWetGroup = (group) => ['drizzle', 'rain', 'showers', 'thunder', 'snow'].includes(group);

module.exports = { describeCode, allConditions, isWetGroup, WMO_CODES: CODES };
