import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Droplets, Wind, Eye, Gauge, Sunrise, Sunset } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
import { usePreferences } from '../../preferences/PreferencesProvider'
import { speedUnitKey } from '../../utils/units'
import { tCity, tCondition, tRegion, tWindDirection } from '../../i18n/vocab'
import './SkyPanel.css'

/* Maps a condition string onto one of five sky treatments. */
function skyTheme(condition = '') {
  const c = condition.toLowerCase()
  if (c.includes('thunder')) return 'storm'
  if (c.includes('rain') || c.includes('drizzle')) return 'rain'
  if (c.includes('partly')) return 'partly'
  if (c.includes('cloud') || c.includes('haz') || c.includes('fog') || c.includes('mist')) return 'cloudy'
  return 'clear'
}

/** "05:52" → minutes since midnight. */
function toMinutes(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Where the sun (or moon) sits on its arc right now, 0–1 across the sky.
 * Returns `isDay` so the caller can swap the disc and the palette.
 */
function solarPosition(sunrise, sunset, now = new Date()) {
  const rise = toMinutes(sunrise)
  const set = toMinutes(sunset)
  const mins = now.getHours() * 60 + now.getMinutes()
  if (rise == null || set == null || set <= rise) return { progress: 0.5, isDay: true }

  if (mins >= rise && mins <= set) {
    return { progress: (mins - rise) / (set - rise), isDay: true }
  }
  // Night: run the moon along the same arc across the hours of darkness.
  const nightLength = 1440 - (set - rise)
  const elapsed = mins > set ? mins - set : mins + (1440 - set)
  return { progress: elapsed / nightLength, isDay: false }
}

export default function SkyPanel({ weather }) {
  const { t, n } = useTranslation()
  const { tempUnit, speedUnit } = usePreferences()
  const theme = skyTheme(weather.condition)
  const [{ progress, isDay }, setSolar] = useState(() =>
    solarPosition(weather.sunrise, weather.sunset),
  )

  // Re-derive every minute so the disc actually tracks the day.
  useEffect(() => {
    const id = setInterval(() => {
      setSolar(solarPosition(weather.sunrise, weather.sunset))
    }, 60_000)
    return () => clearInterval(id)
  }, [weather.sunrise, weather.sunset])

  // Parabolic arc: highest at midday, lowest at each end. Kept inside a band
  // near the top of the panel — a full 0–100% sweep drives the disc into the
  // sunrise/sunset widget in the bottom-right and off the panel edges.
  const discX = 7 + progress * 86
  const discY = 9 + (1 - Math.sin(progress * Math.PI)) * 40

  const stats = [
    { key: 'humidity', label: t('sky.humidity'), value: `${n(weather.humidity)}%` },
    { key: 'wind', label: t('sky.wind'), value: `${n(weather.windSpeed)} ${t(speedUnitKey(speedUnit))} ${tWindDirection(t, weather.windDirection)}` },
    { key: 'visibility', label: t('sky.visibility'), value: `${n(weather.visibility)} km` },
    { key: 'pressure', label: t('sky.pressure'), value: `${n(weather.pressure)} hPa` },
  ].map((s, i) => ({ ...s, icon: [Droplets, Wind, Eye, Gauge][i] }))

  return (
    <section className={`sky sky-${theme} ${isDay ? 'is-day' : 'is-night'}`}>
      {/* ---- Atmosphere layers ---- */}
      <div className="sky-canvas" aria-hidden="true">
        <span className="sky-gradient" />
        <span className="sky-stars" />

        <span
          className="sky-disc"
          style={{ left: `${discX}%`, top: `${discY}%` }}
        >
          <span className="sky-disc-core" />
          <span className="sky-disc-glow" />
        </span>

        <span className="sky-cloud sky-cloud-1" />
        <span className="sky-cloud sky-cloud-2" />
        <span className="sky-cloud sky-cloud-3" />

        {(theme === 'rain' || theme === 'storm') && (
          <span className="sky-rain-layer">
            {Array.from({ length: 28 }).map((_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  animationDelay: `${(i % 9) * 0.19}s`,
                  animationDuration: `${0.65 + (i % 5) * 0.09}s`,
                }}
              />
            ))}
          </span>
        )}

        {theme === 'storm' && <span className="sky-flash" />}
        <span className="sky-haze" />
      </div>

      {/* ---- Readout ---- */}
      <div className="sky-body">
        <div className="sky-main">
          <p className="sky-place">
            {tCity(t, weather.location)}
            <span>{tRegion(t, weather.region)}</span>
          </p>

          <motion.div
            className="sky-temp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {n(weather.temperature)}
            <span className="sky-temp-unit">°{tempUnit}</span>
          </motion.div>

          <p className="sky-condition">{tCondition(t, weather.condition)}</p>
          <p className="sky-feels">
            {t('sky.feelsLike', { feelsLike: weather.feelsLike, high: weather.high, low: weather.low })}
          </p>
        </div>

        <div className="sky-sun">
          <div className="sky-sun-arc">
            <svg viewBox="0 0 120 62" preserveAspectRatio="none" aria-hidden="true">
              <path className="sky-arc-track" d="M4 58 Q60 -6 116 58" />
              <path
                className="sky-arc-fill"
                d="M4 58 Q60 -6 116 58"
                pathLength="1"
                style={{ strokeDasharray: 1, strokeDashoffset: 1 - progress }}
              />
            </svg>
            <span className="sky-arc-label">{isDay ? t('sky.daylight') : t('sky.night')}</span>
          </div>
          <div className="sky-sun-times">
            <span>
              <Sunrise size={13} strokeWidth={2.2} /> {n(weather.sunrise)}
            </span>
            <span>
              <Sunset size={13} strokeWidth={2.2} /> {n(weather.sunset)}
            </span>
          </div>
        </div>
      </div>

      <div className="sky-stats">
        {stats.map((s) => (
          <div className="sky-stat" key={s.key}>
            <s.icon size={15} strokeWidth={2} />
            <span className="sky-stat-meta">
              <span className="sky-stat-label">{s.label}</span>
              <span className="sky-stat-value">{s.value}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
