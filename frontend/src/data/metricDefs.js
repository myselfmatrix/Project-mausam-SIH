import {
  Thermometer,
  Dumbbell,
  Sun,
  Flame,
  Wind,
  CloudRain,
  Sunrise,
  Gauge,
  Droplets,
  Plane,
  Briefcase,
  School,
  Eye,
  CloudFog,
  Clock,
  CloudLightning,
  Sprout,
  Snowflake,
  TrendingUp,
  Droplet,
  Waves,
  LifeBuoy,
  Smile,
  Flower2,
  TrafficCone,
} from 'lucide-react'
import {
  tAqiCategory,
  tCity,
  tCondition,
  tHeatLevel,
  tQuality,
  tTide,
  tWindDirection,
} from '../i18n/vocab'

const HEAT_STATUS = { low: 'safe', moderate: 'caution', high: 'warning', extreme: 'critical' }
const HEAT_PENALTY = { low: 0, moderate: 1, high: 2.5, extreme: 4 }

/*
  Banding, with one guard that matters more than it looks.

  A missing reading is not a reading of zero, and it is not a reading of
  "worst". Without the finite check below, an unavailable AQI would fall
  through every band to the last one - so a city whose air-quality upstream
  happened to be down would be presented as severely polluted, and its comfort
  score docked accordingly. Returning null lets the caller drop the tile
  instead of inventing a verdict.
*/
const tier = (value, steps) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  for (const [limit, status] of steps) {
    if (value <= limit) return status
  }
  return steps[steps.length - 1][1]
}

/** True when every named field carries a usable value. */
const has = (w, ...fields) =>
  fields.every((f) => w?.[f] !== null && w?.[f] !== undefined && !Number.isNaN(w?.[f]))

const uvStatus = (uv) => tier(uv, [[2, 'safe'], [5, 'caution'], [7, 'warning'], [11, 'critical']])
const uvPenalty = (uv) => tier(uv, [[2, 0], [5, 0.5], [7, 1.5], [11, 3]])
const UV_KEY = { safe: 'uv.low', caution: 'uv.moderate', warning: 'uv.high', critical: 'uv.veryHigh' }
/* CPCB's six categories, since the AQI the backend computes is India's:
   Good / Satisfactory / Moderate / Poor / Very Poor / Severe, with boundaries
   at 50/100/200/300/400. The mock these replaced used the US EPA's 150 and
   200 breaks, which would have labelled 180 - solidly "Moderate" on the
   Indian scale - as unhealthy. */
const aqiStatus = (aqi) => tier(aqi, [[50, 'safe'], [100, 'info'], [200, 'caution'], [300, 'warning'], [500, 'critical']])
const aqiPenalty = (aqi) => tier(aqi, [[50, 0], [100, 0.5], [200, 1.5], [300, 2.5], [400, 3.5], [500, 4]])
const rainStatus = (pct) => tier(pct, [[20, 'safe'], [50, 'info'], [70, 'caution'], [100, 'warning']])
const rainPenalty = (pct) => tier(pct, [[20, 0], [50, 1], [70, 2], [100, 3.5]])
const windStatus = (kmh) => tier(kmh, [[15, 'safe'], [30, 'info'], [45, 'caution'], [200, 'warning']])
const windPenalty = (kmh) => tier(kmh, [[15, 0], [30, 0.5], [45, 1.5], [200, 3]])
const visibilityStatus = (km) => (km >= 8 ? 'safe' : km >= 5 ? 'info' : km >= 2 ? 'caution' : 'warning')
const humidityStatus = (pct) => (pct <= 60 ? 'safe' : pct <= 80 ? 'caution' : 'warning')
const humidityPenalty = (pct) => (pct <= 60 ? 0 : pct <= 80 ? 1 : 2)
const soilStatus = (pct) => (pct < 25 ? 'warning' : pct > 75 ? 'caution' : 'safe')

/* Both of these used to be derived here from a fixed sample series. They now
   come from the live hourly and daily forecast, computed in
   backend/weather/derive.js where the thresholds are documented. */
const TREND_KEY = {
  warming: 'metric.trendWarming',
  cooling: 'metric.trendCooling',
  steady: 'metric.trendSteady',
}

/*
  Registry of every metric a dashboard card can show. Personas (see
  personaData.js) reference these by key, in priority order — that ordering is
  the entire "personalization" story for this prototype. getStatus/getPenalty
  are optional; when present, getPenalty feeds the comfort score.

  getValue/getCaption take the translator as a second argument, because most of
  what they return is prose ("Rain likely during this window", "Irrigate
  today") rather than a number with a unit, and the digit formatter as a third,
  because the rest is numbers that have to render in the reader's own script.
  Status and penalty never take either — those are pure maths and must not vary
  by language.
*/
export const METRIC_DEFS = {
  temperature: {
    icon: Thermometer,
    labelKey: 'metric.temperature',
    getValue: (w, t, n) => `${n(w.temperature)}°`,
    getCaption: (w, t) =>
      t('metric.temperatureCaption', { feelsLike: w.feelsLike, high: w.high, low: w.low }),
    getStatus: (w) => HEAT_STATUS[w.heatRiskLevel],
    getPenalty: (w) => HEAT_PENALTY[w.heatRiskLevel],
  },
  workoutWindow: {
    icon: Dumbbell,
    labelKey: 'metric.workoutWindow',
    isAvailable: (w) => Boolean(w.workoutWindow?.start),
    getValue: (w, t, n) => `${n(w.workoutWindow.start)} – ${n(w.workoutWindow.end)}`,
    getCaption: (w, t) =>
      t('metric.workoutWindowCaption', { quality: tQuality(t, w.workoutWindow.quality) }),
    getStatus: (w) => (w.workoutWindow.quality === 'Great' ? 'safe' : 'info'),
  },
  uvIndex: {
    icon: Sun,
    labelKey: 'metric.uvIndex',
    isAvailable: (w) => has(w, 'uvIndex'),
    getValue: (w, t, n) => n(w.uvIndex),
    getCaption: (w, t) => t(UV_KEY[uvStatus(w.uvIndex)]),
    getStatus: (w) => uvStatus(w.uvIndex),
    getPenalty: (w) => uvPenalty(w.uvIndex),
  },
  heatRisk: {
    icon: Flame,
    labelKey: 'metric.heatRisk',
    isAvailable: (w) => Boolean(w.heatRiskLevel),
    getValue: (w, t) => tHeatLevel(t, w.heatRiskLevel),
    getCaption: (w, t) => t('metric.heatRiskCaption'),
    getStatus: (w) => HEAT_STATUS[w.heatRiskLevel],
    getPenalty: (w) => HEAT_PENALTY[w.heatRiskLevel],
  },
  windSpeed: {
    icon: Wind,
    labelKey: 'metric.windSpeed',
    getValue: (w, t, n) => `${n(w.windSpeed)} ${t(w.speedUnitKey || 'units.kmh')}`,
    getCaption: (w, t) =>
      t('metric.windSpeedCaption', { direction: tWindDirection(t, w.windDirection) }),
    getStatus: (w) => windStatus(w.windSpeed),
    getPenalty: (w) => windPenalty(w.windSpeed),
  },
  rainProbability: {
    icon: CloudRain,
    labelKey: 'metric.rainProbability',
    getValue: (w, t, n) => `${n(w.rainProbability)}%`,
    getCaption: (w, t) => t('metric.rainProbabilityCaption'),
    getStatus: (w) => rainStatus(w.rainProbability),
    getPenalty: (w) => rainPenalty(w.rainProbability),
  },
  sunriseSunset: {
    icon: Sunrise,
    labelKey: 'metric.sunriseSunset',
    getValue: (w, t, n) => `${n(w.sunrise)} / ${n(w.sunset)}`,
    getCaption: (w, t) => t('metric.sunriseSunsetCaption'),
  },
  /*
    Commute impact.

    The brief asks commuters for weather "integrated with traffic updates".
    We have no traffic feed, so this deliberately does not claim to know the
    road is busy - it reports what the weather alone adds to a journey, and
    the caption names the factor responsible so the estimate can be argued
    with rather than taken on faith.
  */
  commuteDelay: {
    icon: TrafficCone,
    labelKey: 'metric.commuteDelay',
    isAvailable: (w) => Boolean(w?.commuteDelay),
    getValue: (w, t, n) =>
      w.commuteDelay.minutes > 0
        ? t('commuteDelay.value', { minutes: n(w.commuteDelay.minutes) })
        : t('commuteDelay.clear'),
    getCaption: (w, t) =>
      w.commuteDelay.reasons?.length
        ? t(`commuteDelay.reason.${w.commuteDelay.reasons[0]}`)
        : t('commuteDelay.note'),
    getStatus: (w) =>
      ({ clear: 'safe', slight: 'info', significant: 'caution', severe: 'warning' })[
        w?.commuteDelay?.level
      ] || null,
    getPenalty: (w) => {
      const m = w?.commuteDelay?.minutes
      if (typeof m !== 'number') return null
      return Math.min(2, m / 15)
    },
  },

  /*
    Pollen.

    Named directly in the problem statement, and the only metric here whose
    data does not exist for India: Open-Meteo's pollen model is CAMS Europe,
    which returns null for every Indian coordinate. `isAvailable` is what
    makes that honest - the tile appears wherever the provider actually has a
    reading and stays away where it does not, instead of showing a zero that
    would read as "no pollen today".
  */
  pollen: {
    icon: Flower2,
    labelKey: 'metric.pollen',
    isAvailable: (w) => Boolean(w?.pollen?.band),
    getValue: (w, t) => t(`pollen.band.${w.pollen.band}`),
    getCaption: (w, t, n) =>
      t('pollen.caption', {
        species: t(`pollen.species.${w.pollen.species}`),
        value: n(w.pollen.value),
      }),
    getStatus: (w) =>
      ({ low: 'safe', moderate: 'info', high: 'caution', veryHigh: 'warning' })[w?.pollen?.band] ||
      null,
    getPenalty: (w) =>
      ({ low: 0, moderate: 0.4, high: 1.1, veryHigh: 2 })[w?.pollen?.band] ?? null,
  },
  aqi: {
    icon: Gauge,
    labelKey: 'metric.aqi',
    isAvailable: (w) => has(w, 'aqi'),
    getValue: (w, t, n) => `${n(w.aqi)} AQI`,
    /* Naming the pollutant that produced the number is the difference between
       "the air is bad" and something actionable: ozone means stay in at
       midday, PM2.5 means wear a mask. The backend computes which sub-index
       won, so it costs nothing to say. */
    getCaption: (w, t) =>
      w.aqiDominantLabel
        ? t('metric.aqiDominant', {
          category: tAqiCategory(t, w.aqiCategory),
          pollutant: w.aqiDominantLabel,
        })
        : tAqiCategory(t, w.aqiCategory),
    getStatus: (w) => aqiStatus(w.aqi),
    getPenalty: (w) => aqiPenalty(w.aqi),
  },
  humidity: {
    icon: Droplets,
    labelKey: 'metric.humidity',
    getValue: (w, t, n) => `${n(w.humidity)}%`,
    getCaption: (w, t) => t('metric.humidityCaption'),
    getStatus: (w) => humidityStatus(w.humidity),
    getPenalty: (w) => humidityPenalty(w.humidity),
  },
  destinationWeather: {
    icon: Plane,
    labelKey: 'metric.destinationWeather',
    isAvailable: (w) => Boolean(w.destination?.city),
    getValue: (w, t) => tCity(t, w.destination.city),
    getCaption: (w, t) => tCondition(t, w.destination.condition),
    getStatus: (w) => (w.destination.severeAlert ? 'critical' : 'info'),
  },
  packingTip: {
    icon: Briefcase,
    labelKey: 'metric.packingTip',
    isAvailable: (w) => Boolean(w.packingTipKey || w.packingTip),
    getValue: (w, t) => t('metric.packingTipValue'),
    // The seed data carries the key; the English sentence stays as the
    // fallback for any location that hasn't been keyed.
    getCaption: (w, t) => t(w.packingTipKey || '', null, w.packingTip),
    getStatus: () => 'info',
  },
  schoolCommute: {
    icon: School,
    labelKey: 'metric.schoolCommute',
    isAvailable: (w) => Boolean(w.schoolCommuteWindow),
    getValue: (w, t, n) => n(w.schoolCommuteWindow),
    getCaption: (w, t) =>
      t(w.rainDuringSchool ? 'metric.schoolCommuteRain' : 'metric.schoolCommuteClear'),
    getStatus: (w) => (w.rainDuringSchool ? 'caution' : 'safe'),
  },
  rainDuringSchool: {
    icon: CloudRain,
    labelKey: 'metric.rainDuringSchool',
    isAvailable: (w) => w.rainDuringSchool !== null && w.rainDuringSchool !== undefined,
    getValue: (w, t) => t(w.rainDuringSchool ? 'value.likely' : 'value.unlikely'),
    getCaption: (w, t, n) => n(w.schoolCommuteWindow),
    getStatus: (w) => (w.rainDuringSchool ? 'warning' : 'safe'),
  },
  visibility: {
    icon: Eye,
    labelKey: 'metric.visibility',
    isAvailable: (w) => has(w, 'visibility'),
    getValue: (w, t, n) => `${n(w.visibility)} km`,
    getCaption: (w, t) => t('metric.visibilityCaption'),
    getStatus: (w) => visibilityStatus(w.visibility),
  },
  fog: {
    icon: CloudFog,
    labelKey: 'metric.fog',
    isAvailable: (w) => has(w, 'visibility'),
    getValue: (w, t) =>
      t(w.visibility < 3 ? 'value.high' : w.visibility < 6 ? 'value.moderate' : 'value.low'),
    getCaption: (w, t) => t('metric.fogCaption'),
    getStatus: (w) => (w.visibility < 3 ? 'warning' : w.visibility < 6 ? 'caution' : 'safe'),
  },
  rainTiming: {
    icon: Clock,
    labelKey: 'metric.rainTiming',
    getValue: (w, t, n) =>
      w.rainStartsAt
        ? t('metric.rainTimingAround', { time: n(w.rainStartsAt) })
        : t('metric.rainTimingNone'),
    getCaption: (w, t) => t('metric.rainTimingCaption'),
    getStatus: (w) => (w.rainStartsAt ? 'caution' : 'safe'),
  },
  storm: {
    icon: CloudLightning,
    labelKey: 'metric.storm',
    /* Keyed off the forecast's condition group rather than by searching the
       condition text for "thunder": the group is a machine value that will
       not change, whereas the text is display copy. */
    getValue: (w, t) => t(w.conditionGroup === 'thunder' ? 'value.active' : 'value.low'),
    getCaption: (w, t) => t('metric.stormCaption'),
    getStatus: (w) => (w.conditionGroup === 'thunder' ? 'critical' : 'safe'),
  },
  rainfallPrediction: {
    icon: CloudRain,
    labelKey: 'metric.rainfallPrediction',
    getValue: (w, t) => t('metric.rainfallPredictionValue', { percent: w.rainProbability }),
    getCaption: (w, t) => t('metric.rainfallPredictionCaption'),
    getStatus: (w) => rainStatus(w.rainProbability),
  },
  soilMoisture: {
    icon: Sprout,
    labelKey: 'metric.soilMoisture',
    isAvailable: (w) => has(w, 'soilMoisture'),
    getValue: (w, t, n) => `${n(w.soilMoisture)}%`,
    getCaption: (w, t) =>
      t(
        w.soilMoisture < 25
          ? 'metric.soilIrrigate'
          : w.soilMoisture > 75
            ? 'metric.soilWaterlogging'
            : 'metric.soilAdequate',
      ),
    getStatus: (w) => soilStatus(w.soilMoisture),
  },
  frost: {
    icon: Snowflake,
    labelKey: 'metric.frost',
    isAvailable: (w) => w.frostRisk !== null && w.frostRisk !== undefined,
    getValue: (w, t) => t(w.frostRisk ? 'metric.frostRisk' : 'metric.frostNone'),
    getCaption: (w, t) => t('metric.frostCaption'),
    getStatus: (w) => (w.frostRisk ? 'warning' : 'safe'),
  },
  temperatureTrend: {
    icon: TrendingUp,
    labelKey: 'metric.temperatureTrend',
    isAvailable: (w) => Boolean(TREND_KEY[w.temperatureTrend]),
    getValue: (w, t) => t(TREND_KEY[w.temperatureTrend] || 'metric.trendSteady'),
    getCaption: (w, t) => t('metric.temperatureTrendCaption'),
  },
  irrigationGuidance: {
    icon: Droplet,
    labelKey: 'metric.irrigationGuidance',
    isAvailable: (w) => has(w, 'soilMoisture'),
    getValue: (w, t) => t(w.soilMoisture < 25 ? 'metric.irrigateToday' : 'metric.irrigateSkip'),
    getCaption: (w, t) => t('metric.irrigationCaption', { percent: w.soilMoisture }),
    getStatus: (w) => (w.soilMoisture < 25 ? 'caution' : 'safe'),
  },
  tide: {
    icon: Waves,
    labelKey: 'metric.tide',
    isAvailable: (w) => Boolean(w.tide?.next),
    getValue: (w, t, n) => `${tTide(t, w.tide.next)} · ${n(w.tide.time)}`,
    getCaption: (w, t, n) => (w.tide.heightM ? `${n(w.tide.heightM)} m` : null),
  },
  waveHeight: {
    icon: Waves,
    labelKey: 'metric.waveHeight',
    isAvailable: (w) => has(w, 'waveHeightM'),
    getValue: (w, t, n) => `${n(w.waveHeightM)} m`,
    getCaption: (w, t) => t('metric.waveHeightCaption'),
    getStatus: (w) => (w.waveHeightM > 1.5 ? 'warning' : 'safe'),
  },
  seaConditions: {
    icon: LifeBuoy,
    labelKey: 'metric.seaConditions',
    isAvailable: (w) => has(w, 'waveHeightM'),
    getValue: (w, t) =>
      t(w.waveHeightM > 1.5 ? 'value.rough' : w.waveHeightM > 0.8 ? 'value.moderate' : 'value.calm'),
    getCaption: (w, t) => t('metric.seaConditionsCaption'),
    getStatus: (w) => (w.waveHeightM > 1.5 ? 'warning' : w.waveHeightM > 0.8 ? 'caution' : 'safe'),
  },
  waterTemperature: {
    icon: Thermometer,
    labelKey: 'metric.waterTemperature',
    isAvailable: (w) => has(w, 'waterTemperature'),
    getValue: (w, t, n) =>
      w.waterTemperature != null ? `${n(w.waterTemperature)}°` : t('common.na'),
    getCaption: (w, t) => t('metric.waterTemperatureCaption'),
  },
  outdoorComfort: {
    icon: Smile,
    labelKey: 'metric.outdoorComfort',
    getValue: (w, t) =>
      t(w.rainProbability > 50 || w.heatRiskLevel === 'high' ? 'value.fair' : 'value.great'),
    getCaption: (w, t) => t('metric.outdoorComfortCaption'),
    getStatus: (w) => (w.rainProbability > 50 || w.heatRiskLevel === 'high' ? 'caution' : 'safe'),
  },
}

export function getMetric(key) {
  return METRIC_DEFS[key]
}
