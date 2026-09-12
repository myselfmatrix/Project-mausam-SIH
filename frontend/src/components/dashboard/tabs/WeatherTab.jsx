import { motion } from 'framer-motion'
import { CloudRain, Droplets, Wind, Eye, Gauge, Sun } from 'lucide-react'
import MetricCard from '../MetricCard'
import { HOURLY_FORECAST, DAILY_FORECAST } from '../../../data/weatherData'
import { useTranslation } from '../../../i18n/useTranslation'
import { tAqiCategory, tCity, tCondition, tDay, tRegion, tWindDirection } from '../../../i18n/vocab'

// DAILY_FORECAST has no per-location variant yet (7-day data isn't modeled
// per city), so the trend/forecast sections stay global while current
// conditions and the hourly strip follow the selected location.
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

export default function WeatherTab({ weather }) {
  const { t, n } = useTranslation()
  const maxHigh = Math.max(...DAILY_FORECAST.map((d) => d.high))
  const minLow = Math.min(...DAILY_FORECAST.map((d) => d.low))
  const range = Math.max(maxHigh - minLow, 1)

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>{t('weatherTab.title')}</h1>
        <p>
          {t('weatherTab.subtitle', {
            location: tCity(t, weather.location),
            region: tRegion(t, weather.region),
          })}
        </p>
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        {t('weatherTab.current')}
      </motion.p>
      <motion.div className="metric-grid" variants={stagger}>
        {[
          { icon: Gauge, label: t('metric.aqi'), value: `${n(weather.aqi)} AQI`, caption: tAqiCategory(t, weather.aqiCategory) },
          { icon: Sun, label: t('metric.uvIndex'), value: n(weather.uvIndex), caption: t('weatherTab.peakMidday') },
          { icon: Droplets, label: t('metric.humidity'), value: `${n(weather.humidity)}%`, caption: t('metric.humidityCaption') },
          { icon: Wind, label: t('weatherTab.wind'), value: `${n(weather.windSpeed)} km/h`, caption: t('metric.windSpeedCaption', { direction: tWindDirection(t, weather.windDirection) }) },
          { icon: Eye, label: t('metric.visibility'), value: `${n(weather.visibility)} km`, caption: t('weatherTab.currentCaption') },
          { icon: CloudRain, label: t('metric.rainProbability'), value: `${n(weather.rainProbability)}%`, caption: t('metric.rainProbabilityCaption') },
        ].map((m) => (
          <motion.div key={m.label} variants={fadeUp}>
            <MetricCard {...m} />
          </motion.div>
        ))}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        {t('weatherTab.hourly')}
      </motion.p>
      <motion.div className="hourly-strip" variants={fadeUp}>
        {(weather.hourlyForecast || HOURLY_FORECAST).map((h) => (
          <div className="hourly-item" key={h.time}>
            <span className="hourly-item-time">{n(h.time)}</span>
            <span className="hourly-item-temp">{n(h.temp)}°</span>
            <span className="hourly-item-rain">
              <CloudRain size={12} /> {n(h.rain)}%
            </span>
          </div>
        ))}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        {t('weatherTab.trend')}
      </motion.p>
      <motion.div className="trend-chart" variants={fadeUp}>
        {DAILY_FORECAST.map((d) => {
          const heightPct = Math.max(((d.high - minLow) / range) * 100, 10)
          return (
            <div className="trend-bar-col" key={d.day}>
              <motion.div
                className="trend-bar"
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  background:
                    d.day === 'Today'
                      ? 'var(--color-accent)'
                      : 'color-mix(in srgb, var(--color-accent) 42%, transparent)',
                }}
              />
              <span className="trend-bar-label">{tDay(t, d.day)}</span>
            </div>
          )
        })}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        {t('weatherTab.forecast')}
      </motion.p>
      <motion.div className="daily-list" variants={fadeUp}>
        {DAILY_FORECAST.map((d) => (
          <div className="daily-row" key={d.day}>
            <span className="daily-row-day">{tDay(t, d.day)}</span>
            <span className="daily-row-condition">{tCondition(t, d.condition)}</span>
            <span className="daily-row-rain">{n(d.rain)}%</span>
            <span className="daily-row-range">
              <span className="low">{n(d.low)}°</span> {n(d.high)}°
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
