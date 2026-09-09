import { useId } from 'react'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import './ComfortGauge.css'

const R = 54
const CIRC = 2 * Math.PI * R
// Leave a gap at the bottom so the ring reads as a gauge, not a pie chart.
const SWEEP = 0.75

/**
 * Comfort score as a 270° gauge plus the factors that produced it.
 *
 * The breakdown matters as much as the number: the whole pitch is that this is
 * a rule-based score you can trace, so the penalties are shown, not hidden.
 */
export default function ComfortGauge({ title, score, label, status, factors = [] }) {
  const uid = useId().replace(/:/g, '')
  const progress = Math.max(0, Math.min(1, score / 10))

  // Penalties are relative to the largest one, so the bars stay readable
  // whether the day is mildly or severely uncomfortable.
  const worst = factors.reduce((max, f) => Math.max(max, f.penalty), 0) || 1

  return (
    <section className={`gauge status-${status}`}>
      <div className="gauge-dial">
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <defs>
            <linearGradient id={`g-${uid}`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" className="gauge-stop-a" />
              <stop offset="100%" className="gauge-stop-b" />
            </linearGradient>
          </defs>
          {/* rotate so the gap sits at the bottom */}
          <g transform="rotate(135 70 70)">
            <circle
              className="gauge-track"
              cx="70"
              cy="70"
              r={R}
              strokeDasharray={`${CIRC * SWEEP} ${CIRC}`}
            />
            <motion.circle
              className="gauge-fill"
              cx="70"
              cy="70"
              r={R}
              stroke={`url(#g-${uid})`}
              strokeDasharray={`${CIRC * SWEEP} ${CIRC}`}
              initial={{ strokeDashoffset: CIRC * SWEEP }}
              animate={{ strokeDashoffset: CIRC * SWEEP * (1 - progress) }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </g>
        </svg>

        <div className="gauge-readout">
          <motion.strong
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {score}
          </motion.strong>
          <span>out of 10</span>
        </div>
      </div>

      <div className="gauge-info">
        <p className="gauge-title">{title}</p>
        <p className="gauge-label">{label}</p>

        {factors.length > 0 ? (
          <ul className="gauge-factors">
            {factors.map((f) => (
              <li key={f.label}>
                <span className="gauge-factor-head">
                  <span className="gauge-factor-name">{f.label}</span>
                  <span className="gauge-factor-cost">
                    {f.penalty > 0 ? `−${f.penalty.toFixed(1)}` : 'no impact'}
                  </span>
                </span>
                <span className="gauge-factor-track">
                  <motion.span
                    className="gauge-factor-bar"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: f.penalty / worst }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="gauge-empty">Nothing is working against you right now.</p>
        )}

        <p className="gauge-note">
          <Info size={12} strokeWidth={2.4} />
          Rule-based: 10 minus the weighted penalties above.
        </p>
      </div>
    </section>
  )
}
