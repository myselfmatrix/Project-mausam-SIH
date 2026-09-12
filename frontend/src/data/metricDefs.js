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
} from 'lucide-react'
import { HOURLY_FORECAST, DAILY_FORECAST } from './weatherData'
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

const tier = (value, steps) => {
  for (const [limit, status] of steps) {
    if (value <= limit) return status
  }
  return steps[steps.length - 1][1]
}

const uvStatus = (uv) => tier(uv, [[2, 'safe'], [5, 'caution'], [7, 'warning'], [11, 'critical']])
const uvPenalty = (uv) => tier(uv, [[2, 0], [5, 0.5], [7, 1.5], [11, 3]])
const UV_KEY = { safe: 'uv.low', caution: 'uv.moderate', warning: 'uv.high', critical: 'uv.veryHigh' }
const aqiStatus = (aqi) => tier(aqi, [[50, 'safe'], [100, 'info'], [150, 'caution'], [200, 'warning'], [500, 'critical']])
const aqiPenalty = (aqi) => tier(aqi, [[50, 0], [100, 0.5], [150, 1.5], [200, 2.5], [500, 4]])
const rainStatus = (pct) => tier(pct, [[20, 'safe'], [50, 'info'], [70, 'caution'], [100, 'warning']])
const rainPenalty = (pct) => tier(pct, [[20, 0], [50, 1], [70, 2], [100, 3.5]])
const windStatus = (kmh) => tier(kmh, [[15, 'safe'], [30, 'info'], [45, 'caution'], [200, 'warning']])
const windPenalty = (kmh) => tier(kmh, [[15, 0], [30, 0.5], [45, 1.5], [200, 3]])
const visibilityStatus = (km) => (km >= 8 ? 'safe' : km >= 5 ? 'info' : km >= 2 ? 'caution' : 'warning')
const humidityStatus = (pct) => (pct <= 60 ? 'safe' : pct <= 80 ? 'caution' : 'warning')
const humidityPenalty = (pct) => (pct <= 60 ? 0 : pct <= 80 ? 1 : 2)
const soilStatus = (pct) => (pct < 25 ? 'warning' : pct > 75 ? 'caution' : 'safe')

const firstRainyHour = () => HOURLY_FORECAST.find((h) => h.rain >= 50)
const tempTrendKey = () => {
  const [today, ...rest] = DAILY_FORECAST
  const avgRest = rest.reduce((sum, d) => sum + d.high, 0) / rest.length
  if (avgRest - today.high >= 1.5) return 'metric.trendWarming'
  if (today.high - avgRest >= 1.5) return 'metric.trendCooling'
  return 'metric.trendSteady'
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
    getValue: (w, t, n) => `${n(w.workoutWindow.start)} – ${n(w.workoutWindow.end)}`,
    getCaption: (w, t) =>
      t('metric.workoutWindowCaption', { quality: tQuality(t, w.workoutWindow.quality) }),
    getStatus: (w) => (w.workoutWindow.quality === 'Great' ? 'safe' : 'info'),
  },
  uvIndex: {
    icon: Sun,
    labelKey: 'metric.uvIndex',
    getValue: (w, t, n) => n(w.uvIndex),
    getCaption: (w, t) => t(UV_KEY[uvStatus(w.uvIndex)]),
    getStatus: (w) => uvStatus(w.uvIndex),
    getPenalty: (w) => uvPenalty(w.uvIndex),
  },
  heatRisk: {
    icon: Flame,
    labelKey: 'metric.heatRisk',
    getValue: (w, t) => tHeatLevel(t, w.heatRiskLevel),
    getCaption: (w, t) => t('metric.heatRiskCaption'),
    getStatus: (w) => HEAT_STATUS[w.heatRiskLevel],
    getPenalty: (w) => HEAT_PENALTY[w.heatRiskLevel],
  },
  windSpeed: {
    icon: Wind,
    labelKey: 'metric.windSpeed',
    getValue: (w, t, n) => `${n(w.windSpeed)} km/h`,
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
  aqi: {
    icon: Gauge,
    labelKey: 'metric.aqi',
    getValue: (w, t, n) => `${n(w.aqi)} AQI`,
    getCaption: (w, t) => tAqiCategory(t, w.aqiCategory),
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
    getValue: (w, t) => tCity(t, w.destination.city),
    getCaption: (w, t) => tCondition(t, w.destination.condition),
    getStatus: (w) => (w.destination.severeAlert ? 'critical' : 'info'),
  },
  packingTip: {
    icon: Briefcase,
    labelKey: 'metric.packingTip',
    getValue: (w, t) => t('metric.packingTipValue'),
    // The seed data carries the key; the English sentence stays as the
    // fallback for any location that hasn't been keyed.
    getCaption: (w, t) => t(w.packingTipKey || '', null, w.packingTip),
    getStatus: () => 'info',
  },
  schoolCommute: {
    icon: School,
    labelKey: 'metric.schoolCommute',
    getValue: (w, t, n) => n(w.schoolCommuteWindow),
    getCaption: (w, t) =>
      t(w.rainDuringSchool ? 'metric.schoolCommuteRain' : 'metric.schoolCommuteClear'),
    getStatus: (w) => (w.rainDuringSchool ? 'caution' : 'safe'),
  },
  rainDuringSchool: {
    icon: CloudRain,
    labelKey: 'metric.rainDuringSchool',
    getValue: (w, t) => t(w.rainDuringSchool ? 'value.likely' : 'value.unlikely'),
    getCaption: (w, t, n) => n(w.schoolCommuteWindow),
    getStatus: (w) => (w.rainDuringSchool ? 'warning' : 'safe'),
  },
  visibility: {
    icon: Eye,
    labelKey: 'metric.visibility',
    getValue: (w, t, n) => `${n(w.visibility)} km`,
    getCaption: (w, t) => t('metric.visibilityCaption'),
    getStatus: (w) => visibilityStatus(w.visibility),
  },
  fog: {
    icon: CloudFog,
    labelKey: 'metric.fog',
    getValue: (w, t) =>
      t(w.visibility < 3 ? 'value.high' : w.visibility < 6 ? 'value.moderate' : 'value.low'),
    getCaption: (w, t) => t('metric.fogCaption'),
    getStatus: (w) => (w.visibility < 3 ? 'warning' : w.visibility < 6 ? 'caution' : 'safe'),
  },
  rainTiming: {
    icon: Clock,
    labelKey: 'metric.rainTiming',
    getValue: (w, t) => {
      const hit = firstRainyHour()
      return hit ? t('metric.rainTimingAround', { time: hit.time }) : t('metric.rainTimingNone')
    },
    getCaption: (w, t) => t('metric.rainTimingCaption'),
    getStatus: () => (firstRainyHour() ? 'caution' : 'safe'),
  },
  storm: {
    icon: CloudLightning,
    labelKey: 'metric.storm',
    getValue: (w, t) =>
      t(w.condition.toLowerCase().includes('thunder') ? 'value.active' : 'value.low'),
    getCaption: (w, t) => t('metric.stormCaption'),
    getStatus: (w) => (w.condition.toLowerCase().includes('thunder') ? 'critical' : 'safe'),
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
    getValue: (w, t) => t(w.frostRisk ? 'metric.frostRisk' : 'metric.frostNone'),
    getCaption: (w, t) => t('metric.frostCaption'),
    getStatus: (w) => (w.frostRisk ? 'warning' : 'safe'),
  },
  temperatureTrend: {
    icon: TrendingUp,
    labelKey: 'metric.temperatureTrend',
    getValue: (w, t) => t(tempTrendKey()),
    getCaption: (w, t) => t('metric.temperatureTrendCaption'),
  },
  irrigationGuidance: {
    icon: Droplet,
    labelKey: 'metric.irrigationGuidance',
    getValue: (w, t) => t(w.soilMoisture < 25 ? 'metric.irrigateToday' : 'metric.irrigateSkip'),
    getCaption: (w, t) => t('metric.irrigationCaption', { percent: w.soilMoisture }),
    getStatus: (w) => (w.soilMoisture < 25 ? 'caution' : 'safe'),
  },
  tide: {
    icon: Waves,
    labelKey: 'metric.tide',
    getValue: (w, t, n) => `${tTide(t, w.tide.next)} · ${n(w.tide.time)}`,
    getCaption: (w, t, n) => (w.tide.heightM ? `${n(w.tide.heightM)} m` : null),
  },
  waveHeight: {
    icon: Waves,
    labelKey: 'metric.waveHeight',
    getValue: (w, t, n) => `${n(w.waveHeightM)} m`,
    getCaption: (w, t) => t('metric.waveHeightCaption'),
    getStatus: (w) => (w.waveHeightM > 1.5 ? 'warning' : 'safe'),
  },
  seaConditions: {
    icon: LifeBuoy,
    labelKey: 'metric.seaConditions',
    getValue: (w, t) =>
      t(w.waveHeightM > 1.5 ? 'value.rough' : w.waveHeightM > 0.8 ? 'value.moderate' : 'value.calm'),
    getCaption: (w, t) => t('metric.seaConditionsCaption'),
    getStatus: (w) => (w.waveHeightM > 1.5 ? 'warning' : w.waveHeightM > 0.8 ? 'caution' : 'safe'),
  },
  waterTemperature: {
    icon: Thermometer,
    labelKey: 'metric.waterTemperature',
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
