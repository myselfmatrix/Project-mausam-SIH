/*
  Upstream responses -> the payload the dashboard already reads.

  Three APIs answer in three shapes, none of which match the field names the
  components were written against. Rather than teach twenty components about
  `relative_humidity_2m` and `precipitation_probability`, the translation
  happens once, here.

  The rule that matters is how absence is expressed, because the client merges
  each response over the data it already holds. Two different kinds of absence
  therefore need two different signals:

    undefined - "no answer available": the upstream section failed or was not
                requested. The key is dropped, the merge leaves the previous
                value alone, and the user keeps seeing the last real reading
                rather than a blank.

    null      - "the answer is nothing": the section ran and there is no tide
                here, no rain expected, no AQI publishable. The key is sent,
                the merge clears the old value, and Lucknow does not inherit
                Mumbai's high tide when you switch cities.

  Conflating the two is the subtle bug this file is arranged to avoid: strip
  both and stale readings bleed across locations; send both and a momentary
  upstream hiccup empties the dashboard.
*/

const { describeCode } = require('./wmo');
const { computeCpcbAqi } = require('./aqi');
const D = require('./derive');

/**
 * Drops keys that are `undefined`, keeping `null`.
 *
 * See the note at the top of the file: undefined means "unavailable, keep what
 * you had", null means "nothing to report, clear it".
 */
function compact(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * 'YYYY-MM-DD' -> 'Mon'.
 *
 * Built from the date's components through Date.UTC rather than by parsing the
 * string, because `new Date('2026-09-12')` is midnight UTC and would report
 * the previous weekday for anywhere east of Greenwich - which is all of India.
 */
function weekdayOf(dateStr) {
  if (typeof dateStr !== 'string' || dateStr.length < 10) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * Index of today in the daily arrays.
 *
 * The forecast request asks for one past day so the hourly series covers
 * "earlier today", which means daily[0] is yesterday. Everything user-facing
 * has to start from the day the city is actually in.
 */
function todayIndex(daily, nowIso) {
  if (!daily || !Array.isArray(daily.time)) return 0;
  const today = nowIso.slice(0, 10);
  const found = daily.time.findIndex((d) => d.slice(0, 10) === today);
  return found === -1 ? 0 : found;
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function currentSection(forecast, nowIso) {
  const c = forecast.current || {};
  const sky = describeCode(c.weather_code, {
    isDay: c.is_day === 1,
    visibilityM: c.visibility,
    precipitation: c.precipitation,
  });

  return {
    updatedAt: c.time || nowIso,
    isDay: c.is_day === 1,
    temperature: D.round(c.temperature_2m),
    feelsLike: D.round(c.apparent_temperature),
    condition: sky.condition,
    conditionCode: sky.code,
    conditionGroup: sky.group,
    conditionDerived: sky.hazeDerived || undefined,
    humidity: D.round(c.relative_humidity_2m),
    cloudCover: D.round(c.cloud_cover),
    uvIndex: D.round(c.uv_index, 1),
    uvBand: D.uvBand(c.uv_index),
    windSpeed: D.round(c.wind_speed_10m),
    windGust: D.round(c.wind_gusts_10m),
    windDirection: D.compass(c.wind_direction_10m),
    windDirectionDegrees: D.round(c.wind_direction_10m),
    visibility: D.visibilityKm(c.visibility),
    pressure: D.round(c.pressure_msl),
    precipitationNow: D.round(c.precipitation, 1),
  };
}

function dailySection(forecast, nowIso) {
  const daily = forecast.daily;
  if (!daily || !Array.isArray(daily.time)) return { fields: {}, list: [] };

  const start = todayIndex(daily, nowIso);
  const at = (field, offset = 0) => daily[field]?.[start + offset] ?? null;

  const list = [];
  for (let i = start; i < daily.time.length && list.length < 7; i += 1) {
    const date = daily.time[i];
    const sky = describeCode(daily.weather_code?.[i], { isDay: true });
    list.push(
      compact({
        date,
        day: i === start ? 'Today' : weekdayOf(date),
        high: D.round(daily.temperature_2m_max?.[i]),
        low: D.round(daily.temperature_2m_min?.[i]),
        rain: D.round(daily.precipitation_probability_max?.[i]),
        rainfallMm: D.round(daily.precipitation_sum?.[i], 1),
        uvMax: D.round(daily.uv_index_max?.[i], 1),
        windMax: D.round(daily.wind_speed_10m_max?.[i]),
        condition: sky.condition,
        conditionGroup: sky.group,
      }),
    );
  }

  const daylightSeconds = at('daylight_duration');
  const trend = D.temperatureTrend(daily.temperature_2m_max?.slice(start));

  return {
    fields: {
      high: D.round(at('temperature_2m_max')),
      low: D.round(at('temperature_2m_min')),
      sunrise: D.clockOf(at('sunrise')),
      sunset: D.clockOf(at('sunset')),
      daylightHours: D.isNum(daylightSeconds) ? D.round(daylightSeconds / 3600, 1) : null,
      uvIndexMax: D.round(at('uv_index_max'), 1),
      frostRisk: D.frostRisk(at('temperature_2m_min')),
      temperatureTrend: trend ? trend.direction : null,
      temperatureTrendDeltaC: trend ? trend.deltaC : null,
    },
    list,
  };
}

function hourlySection(forecast, nowIso) {
  const hours = D.futureHours(forecast.hourly, nowIso, 12);
  return hours.map((h) =>
    compact({
      time: h.clock,
      temp: D.round(h.temp),
      feelsLike: D.round(h.apparent),
      rain: D.round(h.rain),
      uv: D.round(h.uv, 1),
      isDay: h.isDay === 1,
      condition: describeCode(h.code, {
        isDay: h.isDay !== 0,
        visibilityM: h.visibility,
        precipitation: h.precipitation,
      }).condition,
    }),
  );
}

/** Root-zone soil moisture and temperature, read at the current hour. */
function soilSection(forecast, nowIso) {
  const hourly = forecast.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return {};
  const index = hourly.time.findIndex((t) => t.slice(0, 13) >= nowIso.slice(0, 13));
  if (index === -1) return {};
  return {
    soilMoisture: D.soilMoisturePercent(hourly.soil_moisture_3_to_9cm?.[index]),
    soilTemperature: D.round(hourly.soil_temperature_6cm?.[index]),
  };
}

/**
 * Air quality, on India's scale.
 *
 * `aqi`/`aqiCategory` are the CPCB figures the UI shows. The US AQI is kept
 * alongside under its own name rather than substituted in when CPCB can't be
 * computed: they are different scales, and silently swapping one for the other
 * would make 73 mean two different things on the same dial.
 */
function airQualitySection(airQuality) {
  if (!airQuality) return {};
  const cpcb = computeCpcbAqi(airQuality.hourly);
  const current = airQuality.current || {};

  return compact({
    aqi: cpcb ? cpcb.aqi : null,
    aqiCategory: cpcb ? cpcb.category : null,
    aqiScale: cpcb ? cpcb.scale : null,
    aqiAdvisoryKey: cpcb ? cpcb.advisoryKey : null,
    aqiDominantPollutant: cpcb ? cpcb.dominantPollutant : null,
    aqiDominantLabel: cpcb ? cpcb.dominantLabel : null,
    aqiPollutants: cpcb ? cpcb.pollutants : null,
    aqiHoursUsed: cpcb ? cpcb.hoursUsed : null,
    aqiUs: D.round(current.us_aqi),
    aqiEuropean: D.round(current.european_aqi),
    pm25: D.round(current.pm2_5, 1),
    pm10: D.round(current.pm10, 1),
    dust: D.round(current.dust, 1),
  });
}

/**
 * Sea state, tides and water temperature - coastal points only.
 *
 * The marine model answers for an inland request with nulls, so an absent
 * wave height is the signal that there is no sea here. Everything in this
 * section then stays absent too, which is why `isCoastal` is computed from the
 * data rather than from a guess about the coordinates.
 */
function marineSection(marine, nowIso) {
  if (!marine) return {};
  const c = marine.current || {};
  const hasSea = D.isNum(c.wave_height) || D.isNum(c.sea_surface_temperature);

  /* Inland: the model answered, and the answer is "there is no sea here". So
     every marine field is sent as an explicit null to clear whatever coastal
     city was on screen before this one. */
  if (!hasSea) {
    return {
      isCoastal: false,
      waveHeightM: null,
      wavePeriodS: null,
      waveDirection: null,
      seaState: null,
      waterTemperature: null,
      seaLevelM: null,
      tide: null,
    };
  }

  const tide = D.nextTide(marine.hourly?.time, marine.hourly?.sea_level_height_msl, nowIso);

  return compact({
    isCoastal: true,
    waveHeightM: D.round(c.wave_height, 2),
    wavePeriodS: D.round(c.wave_period, 1),
    waveDirection: D.compass(c.wave_direction),
    seaState: D.seaState(c.wave_height),
    waterTemperature: D.round(c.sea_surface_temperature),
    seaLevelM: D.round(c.sea_level_height_msl, 2),
    tide,
  });
}

/**
 * Guidance derived from the forecast series: outdoor window, rain timing,
 * commute verdict, fog risk, packing tip.
 *
 * Kept separate from the measurements above so it is obvious which numbers are
 * observations and which are this app's interpretation of them.
 */
function guidanceSection(forecast, nowIso, { aqi, conditionGroup, feelsLike, uvIndex, frostRisk }) {
  const hourly = forecast.hourly;
  const window = D.bestOutdoorWindow(hourly, nowIso, { aqi });
  const rain = D.rainOutlook(hourly, nowIso);
  const commute = D.commuteOutlook(hourly, nowIso);
  const fog = D.fogRisk(hourly, nowIso);

  return compact({
    workoutWindow: window ? { start: window.start, end: window.end, quality: window.quality } : null,
    rainProbability: rain ? rain.next12Max : null,
    rainStartsAt: rain ? rain.startsAt : null,
    rainPeakAt: rain ? rain.peakAt : null,
    rainPeakPercent: rain ? rain.peakPercent : null,
    rainExpectedMm: rain ? rain.expectedMm : null,
    schoolCommuteWindow: commute ? commute.window : null,
    schoolCommuteAfternoonWindow: commute ? commute.afternoonWindow : null,
    rainDuringSchool: commute ? commute.rainDuringSchool : null,
    fogLikely: fog ? fog.likely : null,
    fogLowestVisibilityKm: fog ? fog.lowestVisibilityKm : null,
    fogSource: fog ? fog.source : null,
    packingTipKey: D.packingTipKey({
      group: conditionGroup,
      rainProbability: rain ? rain.next12Max : null,
      aqi,
      apparentTemp: feelsLike,
      uvIndex,
      frost: frostRisk,
    }),
  });
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

/**
 * Builds the dashboard payload.
 *
 * `place` carries the resolved name/region/coordinates; `forecast` is
 * required, `airQuality` and `marine` are optional and simply contribute
 * nothing when absent. That asymmetry is deliberate: without a forecast there
 * is no weather to show, but air quality being briefly unavailable should cost
 * the user one tile, not the page.
 */
function buildWeatherPayload({ place, forecast, airQuality, marine }) {
  if (!forecast || !forecast.current) {
    throw new Error('Forecast data is required to build a weather payload');
  }

  const nowIso = forecast.current.time || new Date().toISOString().slice(0, 16);

  const current = currentSection(forecast, nowIso);
  const daily = dailySection(forecast, nowIso);
  const soil = soilSection(forecast, nowIso);
  const air = airQualitySection(airQuality);
  const sea = marineSection(marine, nowIso);

  const heatBase = D.isNum(current.feelsLike) ? current.feelsLike : current.temperature;
  const guidance = guidanceSection(forecast, nowIso, {
    aqi: air.aqi ?? null,
    conditionGroup: current.conditionGroup,
    feelsLike: heatBase,
    uvIndex: current.uvIndex,
    frostRisk: daily.fields.frostRisk,
  });

  return compact({
    location: place.name,
    region: place.region || '',
    country: place.country || null,
    countryCode: place.countryCode || null,
    coordinates: { lat: place.lat, lon: place.lon },
    timezone: forecast.timezone || place.timezone || null,
    elevation: D.round(forecast.elevation),

    ...current,
    ...daily.fields,
    ...soil,
    ...air,
    ...sea,
    ...guidance,

    heatRiskLevel: D.heatRisk(heatBase),
    hourlyForecast: hourlySection(forecast, nowIso),
    dailyForecast: daily.list,
  });
}

/** One-line summary per point, for the saved-locations grid. */
function buildSummary(place, entry) {
  if (!entry || !entry.current) return null;
  const c = entry.current;
  const sky = describeCode(c.weather_code, { isDay: c.is_day === 1 });

  return compact({
    name: place.name,
    region: place.region || '',
    lat: place.lat,
    lon: place.lon,
    temperature: D.round(c.temperature_2m),
    feelsLike: D.round(c.apparent_temperature),
    humidity: D.round(c.relative_humidity_2m),
    condition: sky.condition,
    conditionGroup: sky.group,
    isDay: c.is_day === 1,
    high: D.round(entry.daily?.temperature_2m_max?.[0]),
    low: D.round(entry.daily?.temperature_2m_min?.[0]),
    rainProbability: D.round(entry.daily?.precipitation_probability_max?.[0]),
    timezone: entry.timezone || null,
    updatedAt: c.time || null,
  });
}

module.exports = { buildWeatherPayload, buildSummary, compact, weekdayOf, todayIndex };
