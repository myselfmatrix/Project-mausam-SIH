/*
  Derived weather alerts.

  There is no public IMD warning feed we can consume, so nothing here claims
  to be an IMD bulletin. These are OUR advisories, computed from the same
  live forecast the dashboard already shows, and the UI labels them as
  derived. That distinction matters: an official warning carries legal and
  operational weight we are not entitled to borrow.

  What we do borrow is IMD's published *thresholds*, because a number is only
  meaningful against the scale a user's country actually uses. Rainfall bands
  are IMD's 24-hour categories and air quality is CPCB's, so "heavy rainfall"
  here means what it means on an Indian forecast, not what it would mean on
  an American one.

  Every alert carries four parts - what, when, why, action. The action is the
  point. "Heavy rainfall expected" is a fact; "leave 20 minutes earlier or
  wait until 19:30" is a decision, and a weather app that stops at the fact
  has handed the user the work it was supposed to do.
*/

// IMD 24-hour rainfall categories, in mm.
const RAIN_MM = {
  extremelyHeavy: 204.5,
  veryHeavy: 115.6,
  heavy: 64.5,
  moderate: 15.6,
};

// CPCB AQI category floors.
const AQI = { severe: 401, veryPoor: 301, poor: 201, moderate: 101 };

// Apparent temperature, °C. IMD declares heat waves on departure from normal,
// which needs a climatology we do not carry; feels-like is the honest proxy
// and is what the user experiences anyway.
const HEAT_C = { severe: 45, high: 40, elevated: 36 };

// Gusts, km/h. 62 km/h is the squall threshold; 88 is gale force.
const GUST_KMH = { gale: 88, squall: 62, strong: 45 };

const VISIBILITY_KM = { dense: 1, moderate: 3 };
const WAVE_M = { high: 3, rough: 2, moderate: 1.5 };
const UV = { extreme: 11, veryHigh: 8 };

const STORM_CODES = new Set([95, 96, 99]);

const SEVERITY_RANK = { critical: 4, warning: 3, caution: 2, info: 1 };

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Today's total rainfall, taking the larger of the two estimates we hold. */
function rainfallToday(weather) {
  const fromHourly = isNum(weather.rainExpectedMm) ? weather.rainExpectedMm : null;
  const fromDaily = isNum(weather.dailyForecast?.[0]?.rainfallMm)
    ? weather.dailyForecast[0].rainfallMm
    : null;
  if (fromHourly === null && fromDaily === null) return null;
  return Math.max(fromHourly ?? 0, fromDaily ?? 0);
}

/**
 * One alert.
 *
 * `personas` lists who this matters *most* to and is used for ordering, not
 * filtering - a gale is a gale whether or not you are a commuter, and hiding
 * a hazard because it is off-persona is exactly the failure mode the brief
 * warns about.
 */
function alert(id, severity, category, personas, parts) {
  return {
    id,
    severity,
    category,
    personas,
    derived: true,
    whatKey: `alert.${parts.key}.what`,
    whyKey: `alert.${parts.key}.why`,
    // Some hazards share a description but not a remedy. Air quality is the
    // clear case: the same AQI asks for a mask when PM2.5 is dominant and for
    // staying out of afternoon sun when ozone is, and a mask does nothing at
    // all for ozone. So the action may be chosen separately from the what.
    actionKey: parts.actionKey || `alert.${parts.key}.action`,
    params: parts.params || {},
    whenKey: parts.whenKey || 'alert.when.today',
    whenParams: parts.whenParams || {},
  };
}

/* ---- Individual hazard rules ---- */

function rainAlerts(weather, out) {
  const mm = rainfallToday(weather);
  if (mm === null) return;

  const when = {
    whenKey: weather.rainStartsAt ? 'alert.when.fromTime' : 'alert.when.today',
    whenParams: weather.rainStartsAt ? { from: weather.rainStartsAt } : {},
  };
  const params = { mm: Math.round(mm), peak: weather.rainPeakAt || weather.rainStartsAt || null };

  if (mm >= RAIN_MM.extremelyHeavy) {
    out.push(alert('rain-extreme', 'critical', 'weather', ['commuter', 'parent', 'travel', 'gardener'], {
      key: 'rainExtreme', params, ...when,
    }));
  } else if (mm >= RAIN_MM.veryHeavy) {
    out.push(alert('rain-very-heavy', 'critical', 'weather', ['commuter', 'parent', 'travel'], {
      key: 'rainVeryHeavy', params, ...when,
    }));
  } else if (mm >= RAIN_MM.heavy) {
    out.push(alert('rain-heavy', 'warning', 'weather', ['commuter', 'parent', 'event'], {
      key: 'rainHeavy', params, ...when,
    }));
  } else if (mm >= RAIN_MM.moderate) {
    out.push(alert('rain-moderate', 'caution', 'commute', ['commuter', 'event', 'fitness'], {
      key: 'rainModerate', params, ...when,
    }));
  }
}

function stormAlert(weather, out) {
  if (!STORM_CODES.has(weather.conditionCode)) return;
  out.push(alert('storm', 'warning', 'weather', ['commuter', 'parent', 'travel', 'event', 'beach'], {
    key: 'storm',
    params: {},
  }));
}

function heatAlerts(weather, out) {
  const feels = isNum(weather.feelsLike) ? weather.feelsLike : weather.temperature;
  if (!isNum(feels)) return;
  const params = { feelsLike: Math.round(feels), high: weather.high };

  if (feels >= HEAT_C.severe) {
    out.push(alert('heat-severe', 'critical', 'health', ['health', 'fitness', 'gardener', 'parent'], {
      key: 'heatSevere', params, whenKey: 'alert.when.peakHours',
    }));
  } else if (feels >= HEAT_C.high) {
    out.push(alert('heat-high', 'warning', 'health', ['health', 'fitness', 'parent'], {
      key: 'heatHigh', params, whenKey: 'alert.when.peakHours',
    }));
  } else if (feels >= HEAT_C.elevated) {
    out.push(alert('heat-elevated', 'caution', 'health', ['health', 'fitness'], {
      key: 'heatElevated', params, whenKey: 'alert.when.peakHours',
    }));
  }
}

function aqiAlerts(weather, out) {
  if (!isNum(weather.aqi)) return;
  const params = {
    aqi: weather.aqi,
    category: weather.aqiCategory || '',
    pollutant: weather.aqiDominantLabel || '',
  };
  const dominant = weather.aqiDominantPollutant;
  const actionKey =
    dominant === 'o3'
      ? 'alert.aqiAction.ozone'
      : dominant === 'pm2_5' || dominant === 'pm10'
        ? 'alert.aqiAction.particulate'
        : 'alert.aqiAction.other';

  if (weather.aqi >= AQI.severe) {
    out.push(alert('aqi-severe', 'critical', 'health', ['health', 'fitness', 'parent'], {
      key: 'aqiSevere', params, actionKey,
    }));
  } else if (weather.aqi >= AQI.veryPoor) {
    out.push(alert('aqi-very-poor', 'warning', 'health', ['health', 'fitness', 'parent'], {
      key: 'aqiVeryPoor', params, actionKey,
    }));
  } else if (weather.aqi >= AQI.poor) {
    out.push(alert('aqi-poor', 'caution', 'health', ['health', 'fitness'], {
      key: 'aqiPoor', params, actionKey,
    }));
  }
}

function windAlert(weather, out) {
  const gust = isNum(weather.windGust) ? weather.windGust : weather.windSpeed;
  if (!isNum(gust)) return;
  const params = { gust: Math.round(gust) };

  if (gust >= GUST_KMH.gale) {
    out.push(alert('wind-gale', 'critical', 'weather', ['commuter', 'travel', 'beach', 'event'], {
      key: 'windGale', params,
    }));
  } else if (gust >= GUST_KMH.squall) {
    out.push(alert('wind-squall', 'warning', 'weather', ['commuter', 'event', 'beach'], {
      key: 'windSquall', params,
    }));
  }
}

function fogAlert(weather, out) {
  const vis = isNum(weather.fogLowestVisibilityKm)
    ? weather.fogLowestVisibilityKm
    : weather.visibility;
  if (!isNum(vis) || !weather.fogLikely) return;
  const params = { visibility: vis };

  if (vis < VISIBILITY_KM.dense) {
    out.push(alert('fog-dense', 'warning', 'commute', ['commuter', 'parent', 'travel'], {
      key: 'fogDense', params, whenKey: 'alert.when.earlyMorning',
    }));
  } else if (vis < VISIBILITY_KM.moderate) {
    out.push(alert('fog', 'caution', 'commute', ['commuter', 'parent'], {
      key: 'fog', params, whenKey: 'alert.when.earlyMorning',
    }));
  }
}

function uvAlert(weather, out) {
  const uv = isNum(weather.uvIndexMax) ? weather.uvIndexMax : weather.uvIndex;
  if (!isNum(uv) || uv < UV.veryHigh) return;
  const params = { uv: Math.round(uv) };
  out.push(
    uv >= UV.extreme
      ? alert('uv-extreme', 'warning', 'health', ['health', 'fitness', 'beach', 'gardener'], {
          key: 'uvExtreme', params, whenKey: 'alert.when.peakHours',
        })
      : alert('uv-high', 'caution', 'health', ['health', 'fitness', 'beach'], {
          key: 'uvHigh', params, whenKey: 'alert.when.peakHours',
        }),
  );
}

function coldAlert(weather, out) {
  if (!weather.frostRisk && !(isNum(weather.low) && weather.low <= 4)) return;
  out.push(alert('frost', 'warning', 'agriculture', ['gardener', 'health'], {
    key: 'frost',
    params: { low: weather.low },
    whenKey: 'alert.when.overnight',
  }));
}

function marineAlerts(weather, out) {
  if (!weather.isCoastal || !isNum(weather.waveHeightM)) return;
  const params = { wave: weather.waveHeightM, seaState: weather.seaState || '' };

  if (weather.waveHeightM >= WAVE_M.high) {
    out.push(alert('wave-high', 'critical', 'marine', ['beach', 'travel'], { key: 'waveHigh', params }));
  } else if (weather.waveHeightM >= WAVE_M.rough) {
    out.push(alert('wave-rough', 'warning', 'marine', ['beach'], { key: 'waveRough', params }));
  } else if (weather.waveHeightM >= WAVE_M.moderate) {
    out.push(alert('wave-moderate', 'caution', 'marine', ['beach'], { key: 'waveModerate', params }));
  }
}

// Rain is only worth a parent's attention at a probability they would
// actually act on. `rainDuringSchool` is true for any trace at all, which put
// "send a raincoat" on screen at a 20% chance - advice noisy enough to teach
// people to ignore the next one.
const SCHOOL_RAIN_MIN_PERCENT = 50;

function schoolAlert(weather, out) {
  if (!weather.rainDuringSchool || !weather.schoolCommuteWindow) return;
  if (!isNum(weather.rainProbability) || weather.rainProbability < SCHOOL_RAIN_MIN_PERCENT) return;
  out.push(alert('school-rain', 'caution', 'commute', ['parent'], {
    key: 'schoolRain',
    params: { window: weather.schoolCommuteWindow, rain: weather.rainProbability },
    whenKey: 'alert.when.range',
    whenParams: { range: weather.schoolCommuteWindow },
  }));
}

/*
  Sowing guidance.

  The only alert here that is good news, and it is deliberate: an alert
  centre that speaks up exclusively about danger trains people to dread
  opening it. A farmer needs the green light as much as the warning.
*/
function sowingAlert(weather, out) {
  const moisture = weather.soilMoisture;
  const rain = weather.rainProbability;
  if (!isNum(moisture) || !isNum(rain)) return;
  if (moisture < 25 || moisture > 60 || rain > 60) return;
  if (isNum(weather.feelsLike) && weather.feelsLike >= HEAT_C.high) return;

  out.push(alert('sowing', 'info', 'agriculture', ['gardener'], {
    key: 'sowing',
    params: { moisture, rain },
    whenKey: 'alert.when.next3Days',
  }));
}


/*
  Advisories that are not warnings.

  Without these the banner is silent for any persona that happens to have no
  hazard today, and since the banner picks the worst thing on the board, a
  beachgoer would be shown a commuter's fog. These fire from the same live
  data and carry the one thing that persona actually plans around, so on a
  calm day the dashboard still tells each user something they can act on
  rather than something meant for someone else.

  All are `info`, the lowest severity, so they can never displace a real
  hazard - severity is sorted before persona relevance.
*/

function outdoorWindowAlert(weather, out) {
  const w = weather.workoutWindow;
  if (!w || !w.start || !w.end) return;
  // A window we would not recommend is not worth announcing as one.
  if (w.quality === 'Poor') return;
  out.push(alert('outdoor-window', 'info', 'weather', ['fitness', 'event'], {
    key: 'outdoorWindow',
    params: { start: w.start, end: w.end, quality: w.quality || '' },
    whenKey: 'alert.when.range',
    whenParams: { range: `${w.start} - ${w.end}` },
  }));
}

function tideInfoAlert(weather, out) {
  const tide = weather.tide;
  if (!weather.isCoastal || !tide || !tide.next || !tide.time) return;
  out.push(alert('tide-info', 'info', 'marine', ['beach', 'travel'], {
    key: 'tideInfo',
    params: { next: tide.next, time: tide.time, height: tide.heightM },
    whenKey: 'alert.when.fromTime',
    whenParams: { from: tide.time },
  }));
}

function cleanAirAlert(weather, out) {
  // Only worth saying where bad air is the norm and today is not: below the
  // CPCB "Moderate" floor, with a real reading behind it.
  if (!isNum(weather.aqi) || weather.aqi > AQI.moderate) return;
  out.push(alert('air-good', 'info', 'health', ['health', 'fitness', 'parent'], {
    key: 'airGood',
    params: { aqi: weather.aqi, category: weather.aqiCategory || '' },
  }));
}


/**
 * Everything the current conditions warrant, worst first.
 *
 * @param weather the normalized weather object the dashboard renders.
 * @returns array of alert descriptors; empty when nothing is worth saying,
 *          which the UI must render as a calm "all clear" rather than a gap.
 */
function buildAlerts(weather) {
  if (!weather || typeof weather !== 'object') return [];
  const out = [];

  rainAlerts(weather, out);
  stormAlert(weather, out);
  heatAlerts(weather, out);
  aqiAlerts(weather, out);
  windAlert(weather, out);
  fogAlert(weather, out);
  uvAlert(weather, out);
  coldAlert(weather, out);
  marineAlerts(weather, out);
  schoolAlert(weather, out);
  sowingAlert(weather, out);

  // Lowest severity, added last: they fill a quiet board, never crowd a busy one.
  outdoorWindowAlert(weather, out);
  tideInfoAlert(weather, out);
  cleanAirAlert(weather, out);

  return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

module.exports = { buildAlerts, RAIN_MM, AQI, HEAT_C, GUST_KMH };
