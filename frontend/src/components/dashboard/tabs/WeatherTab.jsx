import { motion } from 'framer-motion'
import { CloudRain, Droplets, Wind, Eye, Gauge, Sun } from 'lucide-react'
import MetricCard from '../MetricCard'
import { useTranslation } from '../../../i18n/useTranslation'
import { usePreferences } from '../../../preferences/PreferencesProvider'
import { speedUnitKey } from '../../../utils/units'
import { tAqiCategory, tCity, tCondition, tDay, tRegion, tWindDirection } from '../../../i18n/vocab'

import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

/** A reading that is actually present, as opposed to absent or not a number. */
const has = (value) => value !== null && value !== undefined && !Number.isNaN(value)

export default function WeatherTab({ weather }) {
  const { t, n } = useTranslation()
  const { speedUnit } = usePreferences()

  /*
    Seven days of real forecast for this location.

    These sections used to render one fixed week for every city, with a
    comment admitting the 7-day data was not modelled per location. It is now
    the daily series the forecast API returns for these exact coordinates, so
    Leh and Chennai no longer share a temperature trend.
  */
  const hourly = Array.isArray(weather.hourlyForecast) ? weather.hourlyForecast : []
  const daily = Array.isArray(weather.dailyForecast) ? weather.dailyForecast : []
  const highs = daily.map((d) => d.high).filter(Number.isFinite)
  const lows = daily.map((d) => d.low).filter(Number.isFinite)
  const minLow = lows.length ? Math.min(...lows) : 0
  const range = Math.max((highs.length ? Math.max(...highs) : 1) - minLow, 1)

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
        {/*
          `has` gates each tile on its own reading.

          Air quality is the one that actually goes missing: CPCB will not
          publish an index from fewer than three pollutants, so `aqi` is
          absent for some locations, and without this the tile would read
          " AQI" with an empty number in front of it. The others are always
          present in a forecast, and are gated anyway so a future gap in one
          of them fails the same quiet way.
        */}
        {[
          { icon: Gauge, has: has(weather.aqi), label: t('metric.aqi'), value: `${n(weather.aqi)} AQI`, caption: tAqiCategory(t, weather.aqiCategory) },
          { icon: Sun, has: has(weather.uvIndex), label: t('metric.uvIndex'), value: n(weather.uvIndex), caption: t('weatherTab.peakMidday') },
          { icon: Droplets, has: has(weather.humidity), label: t('metric.humidity'), value: `${n(weather.humidity)}%`, caption: t('metric.humidityCaption') },
          { icon: Wind, has: has(weather.windSpeed), label: t('weatherTab.wind'), value: `${n(weather.windSpeed)} ${t(speedUnitKey(speedUnit))}`, caption: t('metric.windSpeedCaption', { direction: tWindDirection(t, weather.windDirection) }) },
          { icon: Eye, has: has(weather.visibility), label: t('metric.visibility'), value: `${n(weather.visibility)} km`, caption: t('weatherTab.currentCaption') },
          { icon: CloudRain, has: has(weather.rainProbability), label: t('metric.rainProbability'), value: `${n(weather.rainProbability)}%`, caption: t('metric.rainProbabilityCaption') },
        ].filter((m) => m.has).map(({ has: _has, ...m }) => (
          <motion.div key={m.label} variants={fadeUp}>
            <MetricCard {...m} />
          </motion.div>
        ))}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        {t('weatherTab.hourly')}
      </motion.p>
      <motion.div className="hourly-strip" variants={fadeUp}>
        {hourly.map((h) => (
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
        {daily.map((d) => {
          const heightPct = Math.max(((d.high - minLow) / range) * 100, 10)
          return (
            <div className="trend-bar-col" key={d.date || d.day}>
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
        {daily.map((d) => (
          <div className="daily-row" key={d.date || d.day}>
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
