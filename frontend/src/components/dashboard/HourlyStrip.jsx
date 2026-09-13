import { useId, useMemo } from 'react'
import { CloudRain } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
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

export default function HourlyStrip({ hours }) {
  const { t, n } = useTranslation()
  const uid = useId().replace(/:/g, '')

  /*
    No hours means the forecast has not arrived yet.

    This used to default to a fixed sample series, which drew a plausible
    curve for weather nobody had measured. Now it draws nothing, and the
    parent shows a skeleton for the moment before data lands.

    Filtering happens inside the memo rather than outside it because a new
    array on every render would make the memo re-run every time - it would
    look memoised and never be.
  */
  const { safeHours, points, linePath, areaPath, width, nowIndex } = useMemo(() => {
    const safe = Array.isArray(hours) ? hours.filter((h) => Number.isFinite(h?.temp)) : []
    if (safe.length < 2) {
      return { safeHours: safe, points: [], linePath: '', areaPath: '', width: 0, nowIndex: 0 }
    }

    const temps = safe.map((h) => h.temp)
    const min = Math.min(...temps)
    const max = Math.max(...temps)
    const span = max - min || 1
    const w = (safe.length - 1) * STEP

    const pts = safe.map((h, i) => ({
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
    safe.forEach((h, i) => {
      const dist = Math.abs(parseInt(h.time, 10) - nowHour)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })

    return { safeHours: safe, points: pts, linePath: line, areaPath: area, width: w, nowIndex: best }
  }, [hours])

  // A one-point series has no curve and a zero-width viewBox, so there is
  // nothing to lay out until at least two hours have arrived.
  if (safeHours.length < 2) return null

  return (
    <section className="hourly surface">
      <header className="hourly-head">
        <h3>{t('hourly.title')}</h3>
        <span className="hourly-legend">
          <span className="hourly-legend-temp" /> {t('hourly.legendTemp')}
          <span className="hourly-legend-rain" /> {t('hourly.legendRain')}
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
            {safeHours.map((h, i) => (
              <div
                className={`hourly-col ${i === nowIndex ? 'is-now' : ''}`}
                key={h.time}
                style={{ width: STEP }}
              >
                <span className="hourly-temp">{n(h.temp)}°</span>
                <span className="hourly-bar-track" title={t('hourly.rainTitle', { percent: h.rain })}>
                  <span className="hourly-bar" style={{ height: `${Math.max(h.rain, 3)}%` }} />
                </span>
                <span className="hourly-rain">
                  <CloudRain size={11} strokeWidth={2.2} />
                  {n(h.rain)}%
                </span>
                <span className="hourly-time">{i === nowIndex ? t('hourly.now') : n(h.time)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
