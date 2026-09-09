import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Droplets, Wind, Eye, Gauge, Sunrise, Sunset } from 'lucide-react'
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
    { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%` },
    { icon: Wind, label: 'Wind', value: `${weather.windSpeed} km/h ${weather.windDirection}` },
    { icon: Eye, label: 'Visibility', value: `${weather.visibility} km` },
    { icon: Gauge, label: 'Pressure', value: `${weather.pressure} hPa` },
  ]

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
          <span className="sky-rain">
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
            {weather.location}
            <span>{weather.region}</span>
          </p>

          <motion.div
            className="sky-temp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {weather.temperature}
            <span className="sky-temp-unit">°C</span>
          </motion.div>

          <p className="sky-condition">{weather.condition}</p>
          <p className="sky-feels">
            Feels like {weather.feelsLike}° · H {weather.high}° / L {weather.low}°
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
            <span className="sky-arc-label">{isDay ? 'Daylight' : 'Night'}</span>
          </div>
          <div className="sky-sun-times">
            <span>
              <Sunrise size={13} strokeWidth={2.2} /> {weather.sunrise}
            </span>
            <span>
              <Sunset size={13} strokeWidth={2.2} /> {weather.sunset}
            </span>
          </div>
        </div>
      </div>

      <div className="sky-stats">
        {stats.map((s) => (
          <div className="sky-stat" key={s.label}>
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
