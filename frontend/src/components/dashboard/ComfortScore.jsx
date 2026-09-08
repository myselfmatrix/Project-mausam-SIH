import { motion } from 'framer-motion'
import './ComfortScore.css'

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ComfortScore({ title, score, label, status, factors = [] }) {
  const progress = score / 10

  return (
    <div className={`comfort-score status-${status}`}>
      <div className="comfort-score-ring">
        <svg viewBox="0 0 100 100">
          <circle className="ring-track" cx="50" cy="50" r={RADIUS} />
          <motion.circle
            className="ring-fill"
            cx="50"
            cy="50"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </svg>
        <div className="comfort-score-value">
          <strong>{score}</strong>
          <span>/10</span>
        </div>
      </div>

      <div className="comfort-score-info">
        <p className="comfort-score-title">{title}</p>
        <p className="comfort-score-label">{label}</p>
        {factors.length > 0 && (
          <p className="comfort-score-factor">Biggest factor: {factors[0].label}</p>
        )}
      </div>
    </div>
  )
}
