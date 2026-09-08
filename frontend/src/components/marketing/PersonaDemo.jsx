import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PERSONAS } from '../../data/personaData'
import { getWeather } from '../../data/weatherData'
import { getPriorityMetrics } from '../../utils/personalization'
import MetricCard from '../dashboard/MetricCard'
import './PersonaDemo.css'

// The core proof-of-concept for SIH26076: same underlying weather, a
// different prioritized set of cards per persona. Pulls from the same
// data/personalization engine the real dashboard uses — not a mockup.
export default function PersonaDemo() {
  const [activeId, setActiveId] = useState('fitness')
  const weather = getWeather()
  const active = PERSONAS.find((p) => p.id === activeId)
  const metrics = getPriorityMetrics(activeId).slice(0, 4)

  return (
    <div className="persona-demo">
      <div className="persona-demo-tabs">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`persona-demo-tab ${activeId === p.id ? 'is-active' : ''}`}
            onClick={() => setActiveId(p.id)}
          >
            <p.icon size={15} strokeWidth={2} />
            {p.label}
          </button>
        ))}
      </div>

      <div className="persona-demo-panel">
        <p className="persona-demo-caption">
          Same weather in {weather.location} — reordered for a <strong>{active.title.toLowerCase()}</strong>
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeId}
            className="persona-demo-grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {metrics.map((m) => (
              <MetricCard
                key={m.key}
                icon={m.icon}
                label={m.label}
                value={m.getValue(weather)}
                caption={m.getCaption ? m.getCaption(weather) : null}
                status={m.getStatus ? m.getStatus(weather) : null}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
