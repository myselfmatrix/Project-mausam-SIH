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
const UV_LABEL = { safe: 'Low', caution: 'Moderate', warning: 'High', critical: 'Very High' }
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
const tempTrendLabel = () => {
  const [today, ...rest] = DAILY_FORECAST
  const avgRest = rest.reduce((sum, d) => sum + d.high, 0) / rest.length
  if (avgRest - today.high >= 1.5) return 'Warming through the week'
  if (today.high - avgRest >= 1.5) return 'Cooling through the week'
  return 'Fairly steady this week'
}

// Registry of every metric a dashboard card can show. Personas (see
// personaData.js) reference these by key, in priority order — that ordering
// is the entire "personalization" story for this prototype. getStatus/
// getPenalty are optional; when present, getPenalty feeds the comfort score.
export const METRIC_DEFS = {
  temperature: {
    icon: Thermometer,
    label: 'Temperature',
    getValue: (w) => `${w.temperature}°`,
    getCaption: (w) => `Feels like ${w.feelsLike}° · H:${w.high}° L:${w.low}°`,
    getStatus: (w) => HEAT_STATUS[w.heatRiskLevel],
    getPenalty: (w) => HEAT_PENALTY[w.heatRiskLevel],
  },
  workoutWindow: {
    icon: Dumbbell,
    label: 'Best Workout Window',
    getValue: (w) => `${w.workoutWindow.start} – ${w.workoutWindow.end}`,
    getCaption: (w) => `${w.workoutWindow.quality} conditions`,
    getStatus: (w) => (w.workoutWindow.quality === 'Great' ? 'safe' : 'info'),
  },
  uvIndex: {
    icon: Sun,
    label: 'UV Index',
    getValue: (w) => `${w.uvIndex}`,
    getCaption: (w) => UV_LABEL[uvStatus(w.uvIndex)],
    getStatus: (w) => uvStatus(w.uvIndex),
    getPenalty: (w) => uvPenalty(w.uvIndex),
  },
  heatRisk: {
    icon: Flame,
    label: 'Heat Risk',
    getValue: (w) => w.heatRiskLevel[0].toUpperCase() + w.heatRiskLevel.slice(1),
    getCaption: () => 'Based on temperature & humidity',
    getStatus: (w) => HEAT_STATUS[w.heatRiskLevel],
    getPenalty: (w) => HEAT_PENALTY[w.heatRiskLevel],
  },
  windSpeed: {
    icon: Wind,
    label: 'Wind Speed',
    getValue: (w) => `${w.windSpeed} km/h`,
    getCaption: (w) => `From the ${w.windDirection}`,
    getStatus: (w) => windStatus(w.windSpeed),
    getPenalty: (w) => windPenalty(w.windSpeed),
  },
  rainProbability: {
    icon: CloudRain,
    label: 'Rain Chance',
    getValue: (w) => `${w.rainProbability}%`,
    getCaption: () => 'Next 12 hours',
    getStatus: (w) => rainStatus(w.rainProbability),
    getPenalty: (w) => rainPenalty(w.rainProbability),
  },
  sunriseSunset: {
    icon: Sunrise,
    label: 'Sunrise / Sunset',
    getValue: (w) => `${w.sunrise} / ${w.sunset}`,
    getCaption: () => 'Local time',
  },
  aqi: {
    icon: Gauge,
    label: 'Air Quality',
    getValue: (w) => `${w.aqi} AQI`,
    getCaption: (w) => w.aqiCategory,
    getStatus: (w) => aqiStatus(w.aqi),
    getPenalty: (w) => aqiPenalty(w.aqi),
  },
  humidity: {
    icon: Droplets,
    label: 'Humidity',
    getValue: (w) => `${w.humidity}%`,
    getCaption: () => 'Relative humidity',
    getStatus: (w) => humidityStatus(w.humidity),
    getPenalty: (w) => humidityPenalty(w.humidity),
  },
  destinationWeather: {
    icon: Plane,
    label: 'At Your Destination',
    getValue: (w) => w.destination.city,
    getCaption: (w) => w.destination.condition,
    getStatus: (w) => (w.destination.severeAlert ? 'critical' : 'info'),
  },
  packingTip: {
    icon: Briefcase,
    label: 'Packing Tip',
    getValue: () => 'Suggestion',
    getCaption: (w) => w.packingTip,
    getStatus: () => 'info',
  },
  schoolCommute: {
    icon: School,
    label: 'School Commute Window',
    getValue: (w) => w.schoolCommuteWindow,
    getCaption: (w) => (w.rainDuringSchool ? 'Rain likely during this window' : 'Clear during this window'),
    getStatus: (w) => (w.rainDuringSchool ? 'caution' : 'safe'),
  },
  rainDuringSchool: {
    icon: CloudRain,
    label: 'Rain During School Hours',
    getValue: (w) => (w.rainDuringSchool ? 'Likely' : 'Unlikely'),
    getCaption: (w) => w.schoolCommuteWindow,
    getStatus: (w) => (w.rainDuringSchool ? 'warning' : 'safe'),
  },
  visibility: {
    icon: Eye,
    label: 'Visibility',
    getValue: (w) => `${w.visibility} km`,
    getCaption: () => 'On your usual route',
    getStatus: (w) => visibilityStatus(w.visibility),
  },
  fog: {
    icon: CloudFog,
    label: 'Fog Risk',
    getValue: (w) => (w.visibility < 3 ? 'High' : w.visibility < 6 ? 'Moderate' : 'Low'),
    getCaption: () => 'Early morning risk',
    getStatus: (w) => (w.visibility < 3 ? 'warning' : w.visibility < 6 ? 'caution' : 'safe'),
  },
  rainTiming: {
    icon: Clock,
    label: 'Rain Expected',
    getValue: () => {
      const hit = firstRainyHour()
      return hit ? `Around ${hit.time}` : 'Not expected'
    },
    getCaption: () => 'Based on hourly forecast',
    getStatus: () => (firstRainyHour() ? 'caution' : 'safe'),
  },
  storm: {
    icon: CloudLightning,
    label: 'Storm Risk',
    getValue: (w) => (w.condition.toLowerCase().includes('thunder') ? 'Active' : 'Low'),
    getCaption: () => 'Today',
    getStatus: (w) => (w.condition.toLowerCase().includes('thunder') ? 'critical' : 'safe'),
  },
  rainfallPrediction: {
    icon: CloudRain,
    label: 'Rainfall Prediction',
    getValue: (w) => `${w.rainProbability}% chance`,
    getCaption: () => 'Next 24 hours',
    getStatus: (w) => rainStatus(w.rainProbability),
  },
  soilMoisture: {
    icon: Sprout,
    label: 'Soil Moisture',
    getValue: (w) => `${w.soilMoisture}%`,
    getCaption: (w) => (w.soilMoisture < 25 ? 'Irrigation recommended' : w.soilMoisture > 75 ? 'Waterlogging risk' : 'Adequate'),
    getStatus: (w) => soilStatus(w.soilMoisture),
  },
  frost: {
    icon: Snowflake,
    label: 'Frost Risk',
    getValue: (w) => (w.frostRisk ? 'Risk tonight' : 'No risk'),
    getCaption: () => 'Overnight low',
    getStatus: (w) => (w.frostRisk ? 'warning' : 'safe'),
  },
  temperatureTrend: {
    icon: TrendingUp,
    label: '7-Day Trend',
    getValue: () => tempTrendLabel(),
    getCaption: () => 'Compared to today',
  },
  irrigationGuidance: {
    icon: Droplet,
    label: 'Irrigation Guidance',
    getValue: (w) => (w.soilMoisture < 25 ? 'Irrigate today' : 'Skip today'),
    getCaption: (w) => `Soil moisture at ${w.soilMoisture}%`,
    getStatus: (w) => (w.soilMoisture < 25 ? 'caution' : 'safe'),
  },
  tide: {
    icon: Waves,
    label: 'Next Tide',
    getValue: (w) => `${w.tide.next} · ${w.tide.time}`,
    getCaption: (w) => (w.tide.heightM ? `${w.tide.heightM} m` : null),
  },
  waveHeight: {
    icon: Waves,
    label: 'Wave Height',
    getValue: (w) => `${w.waveHeightM} m`,
    getCaption: () => 'Current conditions',
    getStatus: (w) => (w.waveHeightM > 1.5 ? 'warning' : 'safe'),
  },
  seaConditions: {
    icon: LifeBuoy,
    label: 'Sea Conditions',
    getValue: (w) => (w.waveHeightM > 1.5 ? 'Rough' : w.waveHeightM > 0.8 ? 'Moderate' : 'Calm'),
    getCaption: () => 'Swim & surf safety',
    getStatus: (w) => (w.waveHeightM > 1.5 ? 'warning' : w.waveHeightM > 0.8 ? 'caution' : 'safe'),
  },
  waterTemperature: {
    icon: Thermometer,
    label: 'Water Temperature',
    getValue: (w) => (w.waterTemperature != null ? `${w.waterTemperature}°` : 'N/A'),
    getCaption: () => 'Sea surface',
  },
  outdoorComfort: {
    icon: Smile,
    label: 'Outdoor Comfort',
    getValue: (w) => (w.rainProbability > 50 || w.heatRiskLevel === 'high' ? 'Fair' : 'Great'),
    getCaption: () => 'For outdoor gatherings',
    getStatus: (w) => (w.rainProbability > 50 || w.heatRiskLevel === 'high' ? 'caution' : 'safe'),
  },
}

export function getMetric(key) {
  return METRIC_DEFS[key]
}
