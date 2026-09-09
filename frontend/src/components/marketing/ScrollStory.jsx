import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PERSONAS } from '../../data/personaData'
import { getWeather } from '../../data/weatherData'
import { getPriorityMetrics, getComfortScore } from '../../utils/personalization'
import MetricCard from '../dashboard/MetricCard'
import './ScrollStory.css'

/**
 * The product's core claim, demonstrated by scrolling rather than described.
 *
 * A sticky panel on the left holds one persona's dashboard; the column on the
 * right scrolls through every persona. As each block passes the middle of the
 * viewport the panel re-sorts — the same weather, re-prioritized, live.
 */
export default function ScrollStory() {
  const [activeIndex, setActiveIndex] = useState(0)
  const blockRefs = useRef([])
  const weather = getWeather()

  useEffect(() => {
    const nodes = blockRefs.current.filter(Boolean)
    if (!nodes.length) return

    // A thin band across the middle of the viewport: whichever block is
    // crossing it owns the panel. Far steadier than measuring scroll offsets.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number(entry.target.dataset.index))
          }
        })
      },
      { rootMargin: '-48% 0px -48% 0px', threshold: 0 },
    )

    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const persona = PERSONAS[activeIndex]
  const metrics = getPriorityMetrics(persona.id).slice(0, 4)
  const comfort = getComfortScore(persona.id, weather)

  return (
    <div className="story">
      <div className="story-sticky">
        <div className="story-panel surface">
          <div className="story-panel-head">
            <span className="story-panel-eyebrow">Your homepage</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={persona.id}
                className="story-panel-persona"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
              >
                <span className="story-panel-icon">
                  <persona.icon size={17} strokeWidth={2} />
                </span>
                {persona.title}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={`story-score status-${comfort.status}`}>
            <span className="story-score-value">{comfort.score}</span>
            <span className="story-score-meta">
              <strong>{comfort.label}</strong>
              <span>Comfort score for {weather.location}</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={persona.id}
              className="story-metrics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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

          <p className="story-panel-foot">
            {weather.temperature}°C · {weather.condition} · unchanged for everyone
          </p>
        </div>
      </div>

      <div className="story-blocks">
        {PERSONAS.map((p, i) => (
          <div
            key={p.id}
            data-index={i}
            ref={(el) => {
              blockRefs.current[i] = el
            }}
            className={`story-block ${i === activeIndex ? 'is-active' : ''}`}
          >
            <span className="story-block-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="story-block-icon">
              <p.icon size={20} strokeWidth={2} />
            </span>
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <ul className="story-block-priorities">
              {getPriorityMetrics(p.id)
                .slice(0, 4)
                .map((m) => (
                  <li key={m.key}>{m.label}</li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
