/*
  India's National Air Quality Index (CPCB).

  The air-quality upstream reports raw pollutant concentrations plus a US EPA
  AQI and a European AQI. Neither is the number an Indian user sees on a CPCB
  board or in the news: the scales, breakpoints and category names all differ,
  so the same air reads "73, Moderate" on the US scale and "43, Good" on
  India's. For a Ministry of Earth Sciences product the Indian index is the
  correct one, so it is computed here from the raw concentrations rather than
  taken from the upstream's convenience field.

  The method is CPCB's published one:

    1. Average each pollutant over its own prescribed window - 24 hours for
       PM2.5, PM10, NO2, SO2 and NH3; the worst rolling 8-hour mean for CO and
       O3, which are judged on peak exposure.
    2. Convert each average to a 0-500 sub-index by linear interpolation
       inside its breakpoint band.
    3. The AQI is the highest sub-index, and the pollutant that produced it is
       the dominant one.

  CPCB also requires at least three pollutants, one of which must be PM2.5 or
  PM10, before an AQI may be published - a figure derived from ozone alone
  says nothing about the particulate pollution that actually drives air
  quality across most of India. That rule is enforced below, and when it is
  not met this returns null so the UI can say "unavailable" instead of
  publishing a number CPCB would not.

  The US AQI is carried through separately for foreign locations, where it is
  the locally meaningful figure.
*/

/*
  Breakpoints, CPCB National AQI.

  `bands` are [concentrationLow, concentrationHigh] pairs aligned index-wise
  with AQI_BANDS. Concentrations are ug/m3 except CO, which CPCB specifies in
  mg/m3 (the upstream reports ug/m3, so it is scaled before use).
*/
const AQI_BANDS = [
  [0, 50],
  [51, 100],
  [101, 200],
  [201, 300],
  [301, 400],
  [401, 500],
];

const POLLUTANTS = {
  pm2_5: {
    label: 'PM2.5',
    key: 'pm25',
    window: 24,
    unit: 'ug/m3',
    bands: [[0, 30], [30, 60], [60, 90], [90, 120], [120, 250], [250, 380]],
  },
  pm10: {
    label: 'PM10',
    key: 'pm10',
    window: 24,
    unit: 'ug/m3',
    bands: [[0, 50], [50, 100], [100, 250], [250, 350], [350, 430], [430, 510]],
  },
  nitrogen_dioxide: {
    label: 'NO2',
    key: 'no2',
    window: 24,
    unit: 'ug/m3',
    bands: [[0, 40], [40, 80], [80, 180], [180, 280], [280, 400], [400, 520]],
  },
  sulphur_dioxide: {
    label: 'SO2',
    key: 'so2',
    window: 24,
    unit: 'ug/m3',
    bands: [[0, 40], [40, 80], [80, 380], [380, 800], [800, 1600], [1600, 2400]],
  },
  ammonia: {
    label: 'NH3',
    key: 'nh3',
    window: 24,
    unit: 'ug/m3',
    bands: [[0, 200], [200, 400], [400, 800], [800, 1200], [1200, 1800], [1800, 2400]],
  },
  ozone: {
    label: 'O3',
    key: 'o3',
    window: 8,
    rolling: true,
    unit: 'ug/m3',
    bands: [[0, 50], [50, 100], [100, 168], [168, 208], [208, 748], [748, 1000]],
  },
  carbon_monoxide: {
    label: 'CO',
    key: 'co',
    window: 8,
    rolling: true,
    unit: 'mg/m3',
    scale: 1 / 1000,
    bands: [[0, 1], [1, 2], [2, 10], [10, 17], [17, 34], [34, 50]],
  },
};

/* CPCB's six categories. `advisoryKey` points at health guidance in the
   translation catalogs, so the wording is localised rather than built here. */
const CATEGORIES = [
  { max: 50, label: 'Good', advisoryKey: 'aqiAdvisory.good' },
  { max: 100, label: 'Satisfactory', advisoryKey: 'aqiAdvisory.satisfactory' },
  { max: 200, label: 'Moderate', advisoryKey: 'aqiAdvisory.moderate' },
  { max: 300, label: 'Poor', advisoryKey: 'aqiAdvisory.poor' },
  { max: 400, label: 'Very Poor', advisoryKey: 'aqiAdvisory.veryPoor' },
  { max: Infinity, label: 'Severe', advisoryKey: 'aqiAdvisory.severe' },
];

/* Data-completeness floors: two thirds of each window, rounded up. CPCB will
   not publish a daily mean built from two readings, and neither will this.
   Deliberately not relaxed to fit whatever data arrived - the request asks for
   two past days, so a short series means something is wrong upstream and
   "unavailable" is the honest answer. */
const MIN_HOURS = { 24: 16, 8: 6 };

/* Every pollutant is assessed over the last day. For PM2.5/PM10/NO2/SO2/NH3
   that day IS the averaging window; for CO and O3 the averaging window is 8
   hours and CPCB wants the worst such window within the day, which is why the
   lookback and the averaging width are two different numbers. */
const LOOKBACK_HOURS = 24;

function categoryFor(aqi) {
  return CATEGORIES.find((c) => aqi <= c.max) || CATEGORIES[CATEGORIES.length - 1];
}

/** Mean of the finite values in `values`, or null if too few to be meaningful. */
function meanOf(values, minCount) {
  const usable = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (usable.length < minCount) return null;
  return usable.reduce((sum, v) => sum + v, 0) / usable.length;
}

/**
 * Worst rolling 8-hour mean in the window.
 *
 * CO and ozone are short-exposure pollutants: an ozone peak at 3pm is the
 * health event, and averaging it against a clean night would hide it.
 */
function worstRollingMean(values, windowSize, minCount) {
  // Without a full window there is no 8-hour mean to report. Returning a
  // shorter average instead would be a different statistic wearing the same
  // label, so the pollutant is skipped and the index is built from the rest.
  if (values.length < windowSize) return null;

  let worst = null;
  for (let end = values.length; end >= windowSize; end -= 1) {
    const mean = meanOf(values.slice(end - windowSize, end), minCount);
    if (mean !== null && (worst === null || mean > worst)) worst = mean;
  }
  return worst;
}

/** Linear interpolation of a concentration into its 0-500 sub-index. */
function subIndexFor(concentration, bands) {
  for (let i = 0; i < bands.length; i += 1) {
    const [cLow, cHigh] = bands[i];
    const [iLow, iHigh] = AQI_BANDS[i];
    if (concentration <= cHigh) {
      const span = cHigh - cLow;
      if (span <= 0) return iLow;
      return Math.round(iLow + ((iHigh - iLow) * (concentration - cLow)) / span);
    }
  }
  // Past the top breakpoint the index is capped: CPCB's scale ends at 500 and
  // nobody acts differently on "worse than Severe".
  return 500;
}

/**
 * Computes the CPCB AQI from hourly pollutant series.
 *
 * `hourly` arrives in the upstream's shape - `{ time: [...], pm2_5: [...] }`,
 * oldest first. Only readings up to `now` are used: the upstream returns
 * forecast hours too, and an AQI is a statement about air already breathed.
 *
 * Returns null when CPCB's minimum-pollutant rule is not met.
 */
function computeCpcbAqi(hourly, now = new Date()) {
  if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0) return null;

  const firstFuture = hourly.time.findIndex((t) => new Date(t).getTime() > now.getTime());
  const cutoffIndex = firstFuture === -1 ? hourly.time.length : firstFuture;
  if (cutoffIndex === 0) return null;

  const subIndices = [];

  for (const [field, spec] of Object.entries(POLLUTANTS)) {
    const series = hourly[field];
    if (!Array.isArray(series)) continue;

    const window = series.slice(Math.max(0, cutoffIndex - LOOKBACK_HOURS), cutoffIndex);
    if (window.length === 0) continue;

    const minCount = MIN_HOURS[spec.window] || Math.ceil(spec.window * 0.75);
    const raw = spec.rolling
      ? worstRollingMean(window, spec.window, minCount)
      : meanOf(window, minCount);
    if (raw === null) continue;

    const concentration = raw * (spec.scale || 1);
    subIndices.push({
      pollutant: spec.key,
      label: spec.label,
      unit: spec.unit,
      // CPCB reports to one decimal; more digits imply precision the model
      // does not have.
      concentration: Math.round(concentration * 10) / 10,
      windowHours: spec.window,
      subIndex: subIndexFor(concentration, spec.bands),
    });
  }

  const hasParticulate = subIndices.some((s) => s.pollutant === 'pm25' || s.pollutant === 'pm10');
  if (subIndices.length < 3 || !hasParticulate) return null;

  subIndices.sort((a, b) => b.subIndex - a.subIndex);
  const dominant = subIndices[0];
  const category = categoryFor(dominant.subIndex);

  return {
    aqi: dominant.subIndex,
    category: category.label,
    advisoryKey: category.advisoryKey,
    dominantPollutant: dominant.pollutant,
    dominantLabel: dominant.label,
    scale: 'CPCB',
    pollutants: subIndices,
    hoursUsed: Math.min(cutoffIndex, 24),
  };
}

module.exports = { computeCpcbAqi, categoryFor, subIndexFor, POLLUTANTS, CATEGORIES };
