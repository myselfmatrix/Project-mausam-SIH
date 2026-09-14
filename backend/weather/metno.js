/*
  Second forecast provider: MET Norway's Locationforecast API.

  Open-Meteo's daily quota is per IP and shared on free hosting, so it can run
  out from traffic that was never ours. Falling straight to a recorded sample
  the first time that happens is a bigger step down than it needs to be - for
  any place already visited we have a stale cache to lean on, but a place
  nobody has asked for yet has nothing. This sits in exactly that gap: a
  second, independent live source, tried only when Open-Meteo's forecast has
  no live answer AND no stale one to fall back on.

  Chosen for the same reason Open-Meteo was: no API key, no signup, no quota
  to exhaust mid-demo. In exchange it knows less than Open-Meteo does - no
  official UV index, no visibility distance, no air quality, no marine data -
  so it is reshaped into the exact object weather/normalize.js already reads
  from Open-Meteo and handed to the same pipeline. Whatever a field is short
  of, the null-safe metric layer already built for "no sensor here" (Leh has
  no tide, Lucknow has no AQI... only for reasons it fabricates nothing) drops
  that tile rather than filling it with something invented.

  One further simplification, deliberate rather than lazy: times are
  converted with a fixed +05:30 offset instead of a timezone-lookup library.
  This product is scoped to India end to end - the alert thresholds are IMD's,
  the AQI is CPCB's - and India runs a single timezone with no DST, so a fixed
  offset is exact for every place this app is built for, not an approximation
  standing in for a real lookup.
*/

const { fetchJson } = require('../services/httpJson');
const { createCache } = require('../services/cache');

const FORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const IST_OFFSET_MIN = 330; // UTC+5:30

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, dp = 0) => (isNum(v) ? Math.round(v * 10 ** dp) / 10 ** dp : null);
const msToKmh = (v) => (isNum(v) ? Math.round(v * 3.6) : null);

/*
  MET Norway's `symbol_code` names a scene ("lightrainshowers_day"), not a
  WMO code. weather/wmo.js already turns a WMO code into the condition text
  every screen reads, so the translation happens once, here, rather than
  teaching that module a second vocabulary.

  Suffix carries day/night/polar-twilight; stripped before the lookup and
  read separately for `is_day` below. An unmapped or absent symbol lands on
  3 (Overcast) - the one WMO code with no implication about rain, wind or
  visibility, so guessing it costs the least when the scene is unknown.
*/
const SYMBOL_TO_WMO = {
  clearsky: 0,
  fair: 1,
  partlycloudy: 2,
  cloudy: 3,
  fog: 45,
  lightrain: 61, lightrainshowers: 80,
  rain: 63, rainshowers: 81,
  heavyrain: 65, heavyrainshowers: 82,
  lightsleet: 61, lightsleetshowers: 80,
  sleet: 63, sleetshowers: 81,
  heavysleet: 65, heavysleetshowers: 82,
  lightsnow: 71, lightsnowshowers: 85,
  snow: 73, snowshowers: 85,
  heavysnow: 75, heavysnowshowers: 86,
  lightrainandthunder: 95, lightrainshowersandthunder: 95,
  rainandthunder: 95, rainshowersandthunder: 95,
  heavyrainandthunder: 96, heavyrainshowersandthunder: 96,
  lightsleetandthunder: 95, lightssleetshowersandthunder: 95,
  sleetandthunder: 95, sleetshowersandthunder: 95,
  heavysleetandthunder: 96, heavysleetshowersandthunder: 96,
  lightsnowandthunder: 95, lightssnowshowersandthunder: 95,
  snowandthunder: 96, snowshowersandthunder: 96,
  heavysnowandthunder: 99, heavysnowshowersandthunder: 99,
};

function wmoFromSymbol(symbolCode) {
  if (!symbolCode) return 3;
  const base = symbolCode.replace(/_(day|night|polartwilight)$/, '');
  return SYMBOL_TO_WMO[base] ?? 3;
}

function isDayFromSymbol(symbolCode, hour) {
  if (symbolCode?.endsWith('_night')) return false;
  if (symbolCode?.endsWith('_day')) return true;
  // Symbols with no day/night variant (plain "cloudy" looks the same either
  // way), or none available yet this far out - a clock check stands in.
  return hour >= 6 && hour < 18;
}

function toIst(utcIso) {
  return new Date(new Date(utcIso).getTime() + IST_OFFSET_MIN * 60000);
}

/** 'YYYY-MM-DDTHH:MM' in IST — the local-wall-clock shape derive.js expects. */
function istStamp(utcIso) {
  return toIst(utcIso).toISOString().slice(0, 16);
}

function istHour(utcIso) {
  return toIst(utcIso).getUTCHours();
}

/*
  A real derived quantity, not an invented one.

  MET Norway reports dry-bulb temperature and nothing that stands in for
  "feels like" - Open-Meteo computes its `apparent_temperature` the same way,
  from temperature, humidity and wind, it just does it upstream instead of
  here. Below 10°C this is the Environment Canada wind-chill formula; at
  27°C and above it is the NOAA Rothfusz heat-index regression - the same two
  published formulas most weather services use for this exact gap. Between
  those bands neither effect is large enough to matter and the reading is
  passed through unchanged.
*/
function feelsLike(tempC, rh, windMs) {
  if (!isNum(tempC)) return null;

  if (tempC <= 10 && isNum(windMs)) {
    const windKmh = windMs * 3.6;
    if (windKmh > 4.8) {
      return round(
        13.12 + 0.6215 * tempC - 11.37 * windKmh ** 0.16 + 0.3965 * tempC * windKmh ** 0.16,
      );
    }
  }

  if (tempC >= 27 && isNum(rh)) {
    const T = tempC;
    const R = rh;
    return round(
      -8.784695 + 1.61139411 * T + 2.338549 * R - 0.14611605 * T * R -
        0.012308094 * T * T - 0.016424828 * R * R + 0.002211732 * T * T * R +
        0.00072546 * T * R * R - 0.000003582 * T * T * R * R,
    );
  }

  return round(tempC);
}

/*
  Sunrise and sunset from the standard "Sunrise Equation" (Almanac for
  Computers, 1990 - the same algorithm behind most lightweight sunrise
  calculators). Met.no's forecast has no astronomical endpoint bundled with
  it; computing it directly avoids a second network call for what the daily
  strip needs on every one of its seven rows. Accurate to within a couple of
  minutes, which is closer than the hourly forecast grid it sits beside.
*/
function sunTimes(lat, lon, dateStr) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const epoch = Date.UTC(2000, 0, 1, 12, 0, 0);
  const dayNumber = Math.round((Date.parse(`${dateStr}T00:00:00Z`) - epoch) / 86400000);
  const lngHour = lon / 15;

  const solve = (isRise) => {
    const t = dayNumber + ((isRise ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634;
    L = ((L % 360) + 360) % 360;

    let RA = deg * Math.atan(0.91764 * Math.tan(L * rad));
    RA = ((RA % 360) + 360) % 360;
    RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
    RA /= 15;

    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    if (cosH > 1 || cosH < -1) return null; // sun never rises/sets — not a latitude this app serves

    const H = (isRise ? 360 - deg * Math.acos(cosH) : deg * Math.acos(cosH)) / 15;
    let UT = H + RA - 0.06571 * t - 6.622 - lngHour;
    return ((UT % 24) + 24) % 24;
  };

  const riseUt = solve(true);
  const setUt = solve(false);
  if (riseUt === null || setUt === null) return { sunrise: null, sunset: null, daylightSeconds: null };

  const clockAt = (utHours) => {
    const totalMin = ((Math.round(utHours * 60) + IST_OFFSET_MIN) % 1440 + 1440) % 1440;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return {
    sunrise: clockAt(riseUt),
    sunset: clockAt(setUt),
    daylightSeconds: Math.round((((setUt - riseUt) + 24) % 24) * 3600),
  };
}

const mode = (values) => {
  if (!values.length) return null;
  const counts = new Map();
  let best = values[0];
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) || 0) + 1;
    counts.set(v, c);
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
};

const avg = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

const cache = createCache({ ttl: 20 * 60 * 1000, graceFactor: 6, name: 'metno-forecast' });
const gridKey = (v) => Math.round(Number(v) * 100) / 100;

/*
  Reshapes MET Norway's timeseries into the exact {current, hourly, daily,
  timezone, elevation} object weather/normalize.js already reads from
  Open-Meteo. Nothing downstream needs to know which provider answered - the
  controller marks the source, this module only supplies the numbers.
*/
function reshape(json) {
  const series = json?.properties?.timeseries;
  if (!Array.isArray(series) || !series.length) return null;

  const first = series[0];
  const firstInst = first.data.instant.details;
  const firstSymbol =
    first.data.next_1_hours?.summary?.symbol_code || first.data.next_6_hours?.summary?.symbol_code;

  const current = {
    time: istStamp(first.time),
    temperature_2m: firstInst.air_temperature ?? null,
    apparent_temperature: feelsLike(firstInst.air_temperature, firstInst.relative_humidity, firstInst.wind_speed),
    relative_humidity_2m: firstInst.relative_humidity ?? null,
    is_day: isDayFromSymbol(firstSymbol, istHour(first.time)) ? 1 : 0,
    precipitation: first.data.next_1_hours?.details?.precipitation_amount ?? 0,
    rain: first.data.next_1_hours?.details?.precipitation_amount ?? 0,
    weather_code: wmoFromSymbol(firstSymbol),
    cloud_cover: firstInst.cloud_area_fraction ?? null,
    pressure_msl: firstInst.air_pressure_at_sea_level ?? null,
    surface_pressure: firstInst.air_pressure_at_sea_level ?? null,
    wind_speed_10m: msToKmh(firstInst.wind_speed),
    wind_direction_10m: firstInst.wind_from_direction ?? null,
    wind_gusts_10m: msToKmh(firstInst.wind_speed_of_gust),
    // Not in the compact product's vocabulary at all - left absent so the
    // visibility tile drops out, the same path a real sensor gap takes.
    visibility: null,
    // The clear-sky theoretical maximum, not the cloud-adjusted reading
    // Open-Meteo supplies - the closest thing MET Norway publishes to a UV
    // index, and still a real model output rather than a guess.
    uv_index: firstInst.ultraviolet_index_clear_sky ?? null,
  };

  const hourly = {
    time: [], temperature_2m: [], apparent_temperature: [], relative_humidity_2m: [],
    precipitation_probability: [], precipitation: [], weather_code: [], uv_index: [],
    wind_speed_10m: [], wind_gusts_10m: [], visibility: [], is_day: [],
    soil_moisture_3_to_9cm: [], soil_temperature_6cm: [],
  };

  for (const entry of series.slice(0, 48)) {
    const inst = entry.data.instant.details;
    const symbol =
      entry.data.next_1_hours?.summary?.symbol_code ||
      entry.data.next_6_hours?.summary?.symbol_code ||
      firstSymbol;

    hourly.time.push(istStamp(entry.time));
    hourly.temperature_2m.push(inst.air_temperature ?? null);
    hourly.apparent_temperature.push(feelsLike(inst.air_temperature, inst.relative_humidity, inst.wind_speed));
    hourly.relative_humidity_2m.push(inst.relative_humidity ?? null);
    hourly.precipitation_probability.push(
      round((entry.data.next_1_hours?.details?.probability_of_precipitation) ?? null),
    );
    hourly.precipitation.push(entry.data.next_1_hours?.details?.precipitation_amount ?? 0);
    hourly.weather_code.push(wmoFromSymbol(symbol));
    hourly.uv_index.push(inst.ultraviolet_index_clear_sky ?? null);
    hourly.wind_speed_10m.push(msToKmh(inst.wind_speed));
    hourly.wind_gusts_10m.push(msToKmh(inst.wind_speed_of_gust));
    hourly.visibility.push(null);
    hourly.is_day.push(isDayFromSymbol(symbol, istHour(entry.time)) ? 1 : 0);
    // No soil model in this feed - same absence Open-Meteo itself returns
    // for a coordinate outside its soil grid, so the sowing advisory that
    // reads these already treats a null here as "no data", not as zero.
    hourly.soil_moisture_3_to_9cm.push(null);
    hourly.soil_temperature_6cm.push(null);
  }

  /*
    Daily rows aren't a product MET Norway ships - Open-Meteo's `daily` block
    is a rollup Open-Meteo computes server-side from its own hourly model
    output, and this is the same rollup done here from MET Norway's hourly
    timeseries: bucket every entry by its IST calendar date, then take the
    max/min temperature and summed rainfall for each bucket.
  */
  const byDay = new Map();
  for (const entry of series) {
    const date = istStamp(entry.time).slice(0, 10);
    if (!byDay.has(date)) byDay.set(date, { temps: [], rain: 0, symbols: [], winds: [] });
    const bucket = byDay.get(date);
    const inst = entry.data.instant.details;
    if (isNum(inst.air_temperature)) bucket.temps.push(inst.air_temperature);
    if (isNum(inst.wind_speed)) bucket.winds.push(inst.wind_speed);
    const precip =
      entry.data.next_1_hours?.details?.precipitation_amount ??
      entry.data.next_6_hours?.details?.precipitation_amount;
    if (isNum(precip)) bucket.rain += precip;
    const symbol = entry.data.next_1_hours?.summary?.symbol_code || entry.data.next_6_hours?.summary?.symbol_code;
    if (symbol) bucket.symbols.push(symbol);
  }

  const daily = {
    time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [],
    apparent_temperature_max: [], apparent_temperature_min: [], sunrise: [], sunset: [],
    uv_index_max: [], precipitation_sum: [], precipitation_probability_max: [],
    wind_speed_10m_max: [], daylight_duration: [],
  };

  const lat = json.geometry?.coordinates?.[1];
  const lon = json.geometry?.coordinates?.[0];

  for (const [date, bucket] of [...byDay.entries()].slice(0, 7)) {
    const max = bucket.temps.length ? Math.max(...bucket.temps) : null;
    const min = bucket.temps.length ? Math.min(...bucket.temps) : null;
    const windAvg = avg(bucket.winds);
    const sun = isNum(lat) && isNum(lon) ? sunTimes(lat, lon, date) : { sunrise: null, sunset: null, daylightSeconds: null };

    daily.time.push(date);
    daily.weather_code.push(wmoFromSymbol(mode(bucket.symbols)));
    daily.temperature_2m_max.push(round(max));
    daily.temperature_2m_min.push(round(min));
    daily.apparent_temperature_max.push(isNum(max) ? feelsLike(max, 50, windAvg) : null);
    daily.apparent_temperature_min.push(isNum(min) ? feelsLike(min, 50, windAvg) : null);
    daily.sunrise.push(sun.sunrise);
    daily.sunset.push(sun.sunset);
    // No daily UV summary in this feed's vocabulary.
    daily.uv_index_max.push(null);
    daily.precipitation_sum.push(round(bucket.rain, 1));
    // MET Norway's precipitation is an amount, not a probability - there is
    // nothing honest to put here, so it stays absent rather than invented.
    daily.precipitation_probability_max.push(null);
    daily.wind_speed_10m_max.push(bucket.winds.length ? msToKmh(Math.max(...bucket.winds)) : null);
    daily.daylight_duration.push(sun.daylightSeconds);
  }

  return { current, hourly, daily, timezone: 'Asia/Kolkata', elevation: round(json.geometry?.coordinates?.[2]) };
}

/**
 * Forecast for one point from MET Norway, reshaped to match Open-Meteo's own
 * forecast response exactly. Returns null (never throws past this point) if
 * the reshape can't produce anything usable - callers treat that exactly
 * like "this provider also has nothing," which is what it means.
 */
async function getMetnoForecast(lat, lon) {
  const key = `${gridKey(lat)},${gridKey(lon)}`;
  const { value } = await cache.wrap(key, async () => {
    const json = await fetchJson(
      `${FORECAST_URL}?lat=${Number(lat).toFixed(4)}&lon=${Number(lon).toFixed(4)}`,
    );
    const shaped = reshape(json);
    if (!shaped) throw new Error('met.no: empty or unrecognised response');
    return shaped;
  });
  return value;
}

module.exports = { getMetnoForecast };
