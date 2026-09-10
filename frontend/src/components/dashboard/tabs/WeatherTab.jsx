import { motion } from 'framer-motion'
import { CloudRain, Droplets, Wind, Eye, Gauge, Sun } from 'lucide-react'
import MetricCard from '../MetricCard'
import { HOURLY_FORECAST, DAILY_FORECAST } from '../../../data/weatherData'

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
  const maxHigh = Math.max(...DAILY_FORECAST.map((d) => d.high))
  const minLow = Math.min(...DAILY_FORECAST.map((d) => d.low))
  const range = Math.max(maxHigh - minLow, 1)

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>Weather</h1>
        <p>
          Full forecast for {weather.location}, {weather.region}
        </p>
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        Current conditions
      </motion.p>
      <motion.div className="metric-grid" variants={stagger}>
        {[
          { icon: Gauge, label: 'Air Quality', value: `${weather.aqi} AQI`, caption: weather.aqiCategory },
          { icon: Sun, label: 'UV Index', value: weather.uvIndex, caption: 'Peak around midday' },
          { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%`, caption: 'Relative humidity' },
          { icon: Wind, label: 'Wind', value: `${weather.windSpeed} km/h`, caption: `From the ${weather.windDirection}` },
          { icon: Eye, label: 'Visibility', value: `${weather.visibility} km`, caption: 'Current' },
          { icon: CloudRain, label: 'Rain Chance', value: `${weather.rainProbability}%`, caption: 'Next 12 hours' },
        ].map((m) => (
          <motion.div key={m.label} variants={fadeUp}>
            <MetricCard {...m} />
          </motion.div>
        ))}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        Hourly forecast
      </motion.p>
      <motion.div className="hourly-strip" variants={fadeUp}>
        {(weather.hourlyForecast || HOURLY_FORECAST).map((h) => (
          <div className="hourly-item" key={h.time}>
            <span className="hourly-item-time">{h.time}</span>
            <span className="hourly-item-temp">{h.temp}°</span>
            <span className="hourly-item-rain">
              <CloudRain size={12} /> {h.rain}%
            </span>
          </div>
        ))}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        7-day trend
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
              <span className="trend-bar-label">{d.day}</span>
            </div>
          )
        })}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        7-day forecast
      </motion.p>
      <motion.div className="daily-list" variants={fadeUp}>
        {DAILY_FORECAST.map((d) => (
          <div className="daily-row" key={d.day}>
            <span className="daily-row-day">{d.day}</span>
            <span className="daily-row-condition">{d.condition}</span>
            <span className="daily-row-rain">{d.rain}%</span>
            <span className="daily-row-range">
              <span className="low">{d.low}°</span> {d.high}°
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
