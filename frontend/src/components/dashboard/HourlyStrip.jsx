import { useId, useMemo } from 'react'
import { CloudRain } from 'lucide-react'
import { HOURLY_FORECAST } from '../../data/weatherData'
import './HourlyStrip.css'

const STEP = 76 // px between hours
const CHART_H = 92
const PAD_Y = 14

/**
 * Turns points into a smooth path using Catmull-Rom converted to cubic
 * beziers. A polyline reads as a chart of samples; a curve reads as weather.
 */
function smoothPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export default function HourlyStrip({ hours = HOURLY_FORECAST }) {
  const uid = useId().replace(/:/g, '')

  const { points, linePath, areaPath, width, nowIndex } = useMemo(() => {
    const temps = hours.map((h) => h.temp)
    const min = Math.min(...temps)
    const max = Math.max(...temps)
    const span = max - min || 1
    const w = (hours.length - 1) * STEP

    const pts = hours.map((h, i) => ({
      x: i * STEP,
      // Invert: higher temperature sits higher on the chart.
      y: PAD_Y + (1 - (h.temp - min) / span) * (CHART_H - PAD_Y * 2),
    }))

    const line = smoothPath(pts)
    const area = `${line} L ${w} ${CHART_H} L 0 ${CHART_H} Z`

    // Mark the forecast hour closest to the current wall-clock hour.
    const nowHour = new Date().getHours()
    let best = 0
    let bestDist = Infinity
    hours.forEach((h, i) => {
      const dist = Math.abs(parseInt(h.time, 10) - nowHour)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })

    return { points: pts, linePath: line, areaPath: area, width: w, nowIndex: best }
  }, [hours])

  return (
    <section className="hourly surface">
      <header className="hourly-head">
        <h3>Next 12 hours</h3>
        <span className="hourly-legend">
          <span className="hourly-legend-temp" /> Temperature
          <span className="hourly-legend-rain" /> Rain chance
        </span>
      </header>

      <div className="hourly-scroll">
        <div className="hourly-inner" style={{ width: width + STEP }}>
          <svg
            className="hourly-chart"
            viewBox={`0 0 ${width} ${CHART_H}`}
            preserveAspectRatio="none"
            style={{ width, height: CHART_H, marginLeft: STEP / 2 }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="hourly-area-top" />
                <stop offset="100%" className="hourly-area-bottom" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#area-${uid})`} />
            <path className="hourly-line" d={linePath} />
            {points.map((p, i) => (
              <circle
                key={i}
                className={`hourly-dot ${i === nowIndex ? 'is-now' : ''}`}
                cx={p.x}
                cy={p.y}
                r={i === nowIndex ? 4.5 : 2.5}
              />
            ))}
          </svg>

          <div className="hourly-cols">
            {hours.map((h, i) => (
              <div
                className={`hourly-col ${i === nowIndex ? 'is-now' : ''}`}
                key={h.time}
                style={{ width: STEP }}
              >
                <span className="hourly-temp">{h.temp}°</span>
                <span className="hourly-bar-track" title={`${h.rain}% chance of rain`}>
                  <span className="hourly-bar" style={{ height: `${Math.max(h.rain, 3)}%` }} />
                </span>
                <span className="hourly-rain">
                  <CloudRain size={11} strokeWidth={2.2} />
                  {h.rain}%
                </span>
                <span className="hourly-time">{i === nowIndex ? 'Now' : h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
