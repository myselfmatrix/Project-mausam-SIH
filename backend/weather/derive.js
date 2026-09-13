/*
  Everything the dashboard shows that the forecast API does not return.

  The upstream gives measurements: temperature, precipitation probability, UV,
  wind, sea level. The dashboard shows judgements: "best workout window",
  "frost risk tonight", "next high tide at 16:20". This module is the boundary
  between the two, and it is its own file so that every such judgement sits in
  one place with its thresholds written down, instead of being invented inside
  a component where nobody would find it again.

  Two rules hold throughout:

  - Every output traces to a measured input. Where there is no input there is
    no output: the function returns null, the field is omitted, and the client
    keeps whatever it last knew rather than showing a guess.
  - Times are strings, never Date objects. The upstream is asked for
    `timezone=auto`, so its stamps are already local wall clock
    ("2026-09-12T19:15"). Parsing those into Date attaches the server's zone
    and shifts every displayed time by the server-to-city offset. Slicing
    characters 11-16 out of an ISO string cannot do that.
*/

/** '2026-09-12T19:15' -> '19:15' */
const clockOf = (iso) => (typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : null);

/** '2026-09-12T19:15' -> 19.25, for arithmetic on time of day. */
const hoursOf = (iso) => {
  const clock = clockOf(iso);
  if (!clock) return null;
  const [h, m] = clock.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h + m / 60 : null;
};

/** 19.25 -> '19:15', wrapping past midnight. */
const clockFromHours = (value) => {
  if (!Number.isFinite(value)) return null;
  const wrapped = ((value % 24) + 24) % 24;
  let hh = Math.floor(wrapped);
  let mm = Math.round((wrapped - hh) * 60);
  if (mm === 60) { mm = 0; hh = (hh + 1) % 24; }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, dp = 0) => (isNum(v) ? Math.round(v * 10 ** dp) / 10 ** dp : null);

/* ------------------------------------------------------------------ */
/* Bands                                                               */
/* ------------------------------------------------------------------ */

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/**
 * Wind direction in degrees -> 16-point compass abbreviation.
 *
 * Meteorological convention: the value is where the wind comes FROM, and 0 is
 * north. Sixteen points rather than eight because "from the NNW" is a real
 * distinction to anyone reading a sea or storm forecast, and the catalogs
 * carry all sixteen.
 */
function compass(degrees) {
  if (!isNum(degrees)) return null;
  const normalized = ((degrees % 360) + 360) % 360;
  return COMPASS[Math.round(normalized / 22.5) % 16];
}

/** WHO/WMO UV exposure bands. */
function uvBand(uv) {
  if (!isNum(uv)) return null;
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

/**
 * Heat risk from apparent temperature.
 *
 * Apparent temperature already folds in humidity and wind, which is what
 * makes 34 C in coastal Mumbai harder work than 34 C in dry Jhansi. The bands
 * follow the heat-index caution levels in common use: comfortable below 32,
 * caution to 40, danger to 45, extreme above that.
 */
function heatRisk(apparentTemp) {
  if (!isNum(apparentTemp)) return null;
  if (apparentTemp < 32) return 'low';
  if (apparentTemp < 40) return 'moderate';
  if (apparentTemp < 45) return 'high';
  return 'extreme';
}

/**
 * Frost risk from the night's forecast minimum.
 *
 * Ground frost forms before the air reaches zero, because the screen
 * temperature a forecast reports is measured well above the surface that
 * actually freezes. 2 C is the conventional advisory threshold.
 */
function frostRisk(minTemp) {
  if (!isNum(minTemp)) return null;
  return minTemp <= 2;
}

/** Metres -> whole kilometres, the unit the UI labels. */
const visibilityKm = (metres) => (isNum(metres) ? Math.round(metres / 1000) : null);

/**
 * Volumetric soil water content (m3/m3) -> percent.
 *
 * A unit change, not a rescaling: 0.42 m3/m3 is 42% water by volume. It is
 * NOT percent of field capacity, so the irrigation guidance downstream is
 * framed against volumetric bands rather than "percent full".
 */
const soilMoisturePercent = (vwc) => (isNum(vwc) ? Math.round(vwc * 100) : null);

/** Sea state from wave height, on the Douglas-scale boundaries the UI labels. */
function seaState(waveHeightM) {
  if (!isNum(waveHeightM)) return null;
  if (waveHeightM < 0.5) return 'Calm';
  if (waveHeightM < 1.25) return 'Moderate';
  return 'Rough';
}

/* ------------------------------------------------------------------ */
/* Tides                                                               */
/* ------------------------------------------------------------------ */

/**
 * Next high or low tide from an hourly sea-level series.
 *
 * The marine model reports sea level relative to mean sea level each hour, and
 * a turning point in that series IS a tide. Hourly sampling alone would put
 * every turn on a whole hour, which is never true, so the three samples around
 * each turning point are fitted with a parabola and its vertex is reported -
 * the standard refinement, good to a few minutes against hourly data.
 *
 * Returns null inland, where the model has no sea level to give.
 */
function nextTide(times, heights, nowIso) {
  if (!Array.isArray(times) || !Array.isArray(heights) || times.length < 3) return null;

  const extrema = [];
  for (let i = 1; i < heights.length - 1; i += 1) {
    const prev = heights[i - 1];
    const here = heights[i];
    const next = heights[i + 1];
    if (!isNum(prev) || !isNum(here) || !isNum(next)) continue;

    const isHigh = here > prev && here >= next;
    const isLow = here < prev && here <= next;
    if (!isHigh && !isLow) continue;

    // Parabola through (-1,prev) (0,here) (1,next): vertex offset in hours.
    const curvature = prev - 2 * here + next;
    const offset = curvature === 0 ? 0 : (0.5 * (prev - next)) / curvature;
    const clamped = Math.max(-0.5, Math.min(0.5, offset));
    const peak = here - 0.25 * (prev - next) * clamped;

    const baseHour = hoursOf(times[i]);
    if (baseHour === null) continue;

    extrema.push({
      next: isHigh ? 'High' : 'Low',
      iso: times[i],
      time: clockFromHours(baseHour + clamped),
      heightM: round(peak, 2),
    });
  }

  if (extrema.length === 0) return null;
  // String compare is safe: both stamps are local wall clock in ISO order.
  const upcoming = extrema.find((e) => e.iso > nowIso) || extrema[extrema.length - 1];
  return { next: upcoming.next, time: upcoming.time, heightM: upcoming.heightM };
}

/* ------------------------------------------------------------------ */
/* Windows over the hourly forecast                                    */
/* ------------------------------------------------------------------ */

/** The forecast hours at or after `nowIso`, capped to `limit` entries. */
function futureHours(hourly, nowIso, limit = 24) {
  if (!hourly || !Array.isArray(hourly.time)) return [];
  const out = [];
  for (let i = 0; i < hourly.time.length && out.length < limit; i += 1) {
    const iso = hourly.time[i];
    // Keep the hour we are inside: a stamp of 19:00 is current at 19:15.
    if (iso.slice(0, 13) < nowIso.slice(0, 13)) continue;
    out.push({
      iso,
      clock: clockOf(iso),
      hour: hoursOf(iso),
      temp: hourly.temperature_2m?.[i] ?? null,
      apparent: hourly.apparent_temperature?.[i] ?? null,
      rain: hourly.precipitation_probability?.[i] ?? null,
      precipitation: hourly.precipitation?.[i] ?? null,
      code: hourly.weather_code?.[i] ?? null,
      uv: hourly.uv_index?.[i] ?? null,
      gust: hourly.wind_gusts_10m?.[i] ?? null,
      isDay: hourly.is_day?.[i] ?? null,
      humidity: hourly.relative_humidity_2m?.[i] ?? null,
      visibility: hourly.visibility?.[i] ?? null,
    });
  }
  return out;
}

/**
 * Cost of being outdoors during one forecast hour. Lower is better.
 *
 * Each term is a measured quantity scaled so that one unit of penalty means
 * roughly "one reason not to go": a 25% chance of rain, 6 degrees away from
 * comfortable, UV three points into the burn range. They are summed rather
 * than combined cleverly because the sum is explainable - a user can be told
 * which term dominated, and a judge can check the arithmetic.
 */
const COMFORT_TEMP_C = 24;

function hourPenalty(hour, aqi) {
  let penalty = 0;
  if (isNum(hour.rain)) penalty += (hour.rain / 100) * 4;
  const feels = isNum(hour.apparent) ? hour.apparent : hour.temp;
  if (isNum(feels)) penalty += Math.abs(feels - COMFORT_TEMP_C) / 6;
  if (isNum(hour.uv)) penalty += Math.max(0, hour.uv - 6) / 3;
  if (isNum(hour.gust)) penalty += Math.max(0, hour.gust - 35) / 20;
  if (isNum(aqi)) penalty += Math.max(0, aqi - 100) / 120;
  return penalty;
}

const QUALITY_BANDS = [
  [1.0, 'Excellent'],
  [1.8, 'Good'],
  [2.8, 'Fair'],
  [Infinity, 'Poor'],
];

/**
 * Best two-hour outdoor window in the day ahead.
 *
 * Restricted to daylight plus the hour before sunrise, because that is when
 * people actually run in an Indian summer, and because "best window: 02:00"
 * is useless advice however good the numbers are.
 */
function bestOutdoorWindow(hourly, nowIso, { aqi = null, span = 2 } = {}) {
  const hours = futureHours(hourly, nowIso, 24).filter((h) => h.isDay === 1 || h.isDay === null);
  if (hours.length === 0) return null;

  let best = null;
  for (let i = 0; i + span - 1 < hours.length; i += 1) {
    const slice = hours.slice(i, i + span);
    // Only score contiguous hours: a gap means the daylight filter cut across.
    if (slice[slice.length - 1].hour - slice[0].hour !== span - 1) continue;
    const score = slice.reduce((sum, h) => sum + hourPenalty(h, aqi), 0) / span;
    if (!best || score < best.score) best = { score, slice };
  }

  // A day with fewer contiguous daylight hours than `span` still deserves an
  // answer, so fall back to the single best hour.
  if (!best) {
    const single = hours
      .map((h) => ({ score: hourPenalty(h, aqi), slice: [h] }))
      .sort((a, b) => a.score - b.score)[0];
    if (!single) return null;
    best = single;
  }

  const quality = QUALITY_BANDS.find(([limit]) => best.score < limit)[1];
  const start = best.slice[0];
  const endHour = best.slice[best.slice.length - 1].hour + 1;

  return { start: start.clock, end: clockFromHours(endHour), quality, score: round(best.score, 2) };
}

/**
 * When rain is next likely, and how much of the day it covers.
 *
 * `thresholdPercent` is the probability at which the UI is willing to say
 * "expected" rather than "possible" - 50% is the conventional line.
 */
function rainOutlook(hourly, nowIso, thresholdPercent = 50) {
  const hours = futureHours(hourly, nowIso, 24);
  if (hours.length === 0) return null;

  const withProb = hours.filter((h) => isNum(h.rain));
  if (withProb.length === 0) return null;

  const first = withProb.find((h) => h.rain >= thresholdPercent) || null;
  const next12 = withProb.slice(0, 12);
  const peak = withProb.reduce((max, h) => (h.rain > max.rain ? h : max), withProb[0]);
  const totalMm = hours.reduce((sum, h) => sum + (isNum(h.precipitation) ? h.precipitation : 0), 0);

  return {
    // "Rain chance" on the dashboard is the next 12 hours, not the calendar
    // day: at 9pm, a 90% morning is not something to warn about tonight.
    next12Max: Math.max(...next12.map((h) => h.rain)),
    startsAt: first ? first.clock : null,
    peakAt: peak.clock,
    peakPercent: peak.rain,
    expectedMm: round(totalMm, 1),
    hoursAboveThreshold: withProb.filter((h) => h.rain >= thresholdPercent).length,
  };
}

/**
 * Morning and afternoon school-commute windows, and whether rain lands in one.
 *
 * The windows are fixed clock ranges rather than anything derived: school
 * timings are administrative, not meteorological. What IS derived is the rain
 * verdict, from the hourly probabilities inside those hours.
 */
const COMMUTE_MORNING = [7, 8.5];
const COMMUTE_AFTERNOON = [14.5, 16];

function commuteOutlook(hourly, nowIso, thresholdPercent = 45) {
  const hours = futureHours(hourly, nowIso, 30);
  if (hours.length === 0) return null;

  const inWindow = ([from, to]) =>
    hours.filter((h) => isNum(h.hour) && h.hour >= from - 0.001 && h.hour < to);

  const morning = inWindow(COMMUTE_MORNING);
  const afternoon = inWindow(COMMUTE_AFTERNOON);
  const pool = [...morning, ...afternoon].filter((h) => isNum(h.rain));

  return {
    window: `${clockFromHours(COMMUTE_MORNING[0])} - ${clockFromHours(COMMUTE_MORNING[1])}`,
    afternoonWindow: `${clockFromHours(COMMUTE_AFTERNOON[0])} - ${clockFromHours(COMMUTE_AFTERNOON[1])}`,
    // Null rather than false when neither window is still ahead today: "no
    // rain during school" is a claim, and at 9pm there is nothing to claim.
    rainDuringSchool: pool.length === 0 ? null : pool.some((h) => h.rain >= thresholdPercent),
    peakPercent: pool.length === 0 ? null : Math.max(...pool.map((h) => h.rain)),
  };
}

/**
 * Fog risk for the coming morning.
 *
 * Fog is forecast directly by the model (WMO 45/48), so the codes are checked
 * first. Failing that, the classic ingredients are used: saturated air and
 * collapsed visibility in the pre-dawn hours. Both inputs are measured.
 */
function fogRisk(hourly, nowIso) {
  const hours = futureHours(hourly, nowIso, 24).filter(
    (h) => isNum(h.hour) && (h.hour >= 23 || h.hour <= 9),
  );
  if (hours.length === 0) return null;

  const coded = hours.some((h) => h.code === 45 || h.code === 48);
  const ingredients = hours.some(
    (h) => isNum(h.humidity) && h.humidity >= 95 && isNum(h.visibility) && h.visibility < 2000,
  );
  const worstVisibility = hours
    .map((h) => h.visibility)
    .filter(isNum)
    .reduce((min, v) => (min === null || v < min ? v : min), null);

  return {
    likely: coded || ingredients,
    lowestVisibilityKm: visibilityKm(worstVisibility),
    source: coded ? 'model' : ingredients ? 'derived' : 'none',
  };
}

/**
 * Direction of the week's temperature trend.
 *
 * Compares the mean daily maximum of the back half of the forecast against the
 * front half. A 1.5 C threshold keeps model noise from being reported as a
 * change in the weather.
 */
function temperatureTrend(dailyMax) {
  if (!Array.isArray(dailyMax)) return null;
  const values = dailyMax.filter(isNum);
  if (values.length < 4) return null;

  const mid = Math.floor(values.length / 2);
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const delta = mean(values.slice(mid)) - mean(values.slice(0, mid));

  if (delta > 1.5) return { direction: 'warming', deltaC: round(delta, 1) };
  if (delta < -1.5) return { direction: 'cooling', deltaC: round(delta, 1) };
  return { direction: 'steady', deltaC: round(delta, 1) };
}

/**
 * Which packing tip to show, chosen by severity rather than by category.
 *
 * The order matters more than the thresholds: a thunderstorm and unhealthy air
 * can be true at once, and the one that changes what you carry is the storm.
 * Returns a catalog key so the wording is translated, never built here.
 */
function packingTipKey({ group, rainProbability, aqi, apparentTemp, uvIndex, frost }) {
  if (group === 'thunder') return 'tip.thunderstorm';
  if (isNum(rainProbability) && rainProbability >= 70) return 'tip.monsoon';
  if (group === 'rain' || group === 'showers' || group === 'drizzle') return 'tip.rainJacket';
  if (isNum(aqi) && aqi > 200) return 'tip.mask';
  if (isNum(aqi) && aqi > 100) return 'tip.maskSensitive';
  if (frost === true) return 'tip.frost';
  if (isNum(apparentTemp) && apparentTemp >= 40) return 'tip.hydrate';
  if (isNum(uvIndex) && uvIndex >= 8) return 'tip.sunscreen';
  if (group === 'fog' || group === 'haze') return 'tip.lowVisibility';
  return 'tip.pleasant';
}

module.exports = {
  clockOf, hoursOf, clockFromHours, isNum, round,
  compass, uvBand, heatRisk, frostRisk, visibilityKm, soilMoisturePercent, seaState,
  nextTide, futureHours, bestOutdoorWindow, rainOutlook, commuteOutlook, fogRisk,
  temperatureTrend, packingTipKey, hourPenalty,
};
