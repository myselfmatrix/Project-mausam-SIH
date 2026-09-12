import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PERSONAS } from '../../data/personaData'
import { getWeather } from '../../data/weatherData'
import { getPriorityMetrics, getComfortScore } from '../../utils/personalization'
import MetricCard from '../dashboard/MetricCard'
import { useTranslation } from '../../i18n/useTranslation'
import { tCity, tCondition } from '../../i18n/vocab'
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
  const { t, n } = useTranslation()
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
            <span className="story-panel-eyebrow">{t('story.yourHomepage')}</span>
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
                {t(persona.titleKey)}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={`story-score status-${comfort.status}`}>
            <span className="story-score-value">{n(comfort.score)}</span>
            <span className="story-score-meta">
              <strong>{t(comfort.labelKey)}</strong>
              <span>{t('story.comfortFor', { location: tCity(t, weather.location) })}</span>
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
                  label={t(m.labelKey)}
                  value={m.getValue(weather, t, n)}
                  caption={m.getCaption ? m.getCaption(weather, t, n) : null}
                  status={m.getStatus ? m.getStatus(weather) : null}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          <p className="story-panel-foot">
            {t('story.foot', {
              temperature: n(weather.temperature),
              condition: tCondition(t, weather.condition),
            })}
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
            <span className="story-block-index">{n(String(i + 1).padStart(2, '0'))}</span>
            <span className="story-block-icon">
              <p.icon size={20} strokeWidth={2} />
            </span>
            <h3>{t(p.titleKey)}</h3>
            <p>{t(p.descKey)}</p>
            <ul className="story-block-priorities">
              {getPriorityMetrics(p.id)
                .slice(0, 4)
                .map((m) => (
                  <li key={m.key}>{t(m.labelKey)}</li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
