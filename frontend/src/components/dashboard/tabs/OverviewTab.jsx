import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, MapPin } from 'lucide-react'
import AlertBanner from '../AlertBanner'
import MetricCard from '../MetricCard'
import ComfortGauge from '../ComfortGauge'
import SkyPanel from '../SkyPanel'
import HourlyStrip from '../HourlyStrip'
import CustomizeDashboard from '../CustomizeDashboard'
import { getComfortScore } from '../../../utils/personalization'
import { getMetric } from '../../../data/metricDefs'
import { PERSONAS } from '../../../data/personaData'
import useDashboardLayout from '../../../hooks/useDashboardLayout'
import { getGreeting } from '../../../utils/format'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const TODAY = new Date().toLocaleDateString([], {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export default function OverviewTab({
  weather,
  persona,
  userName,
  topAlert,
  onViewAlerts,
  onPersonaChange,
}) {
  const [customizeMode, setCustomizeMode] = useState(false)
  const comfort = getComfortScore(persona.id, weather)
  const layout = useDashboardLayout(persona.id)

  const firstName = userName ? userName.split(' ')[0] : ''

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.header className="ov-head" variants={fadeUp}>
        <div className="ov-head-text">
          <p className="ov-meta">
            <span>
              <CalendarDays size={13} strokeWidth={2.2} /> {TODAY}
            </span>
            <span>
              <MapPin size={13} strokeWidth={2.2} /> {weather.location}
            </span>
          </p>
          <h1>
            {getGreeting()}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="ov-sub">
            Here&apos;s what matters for your <strong>{persona.title.toLowerCase()}</strong> today.
          </p>
        </div>

        {/* Switching persona is the product's whole point, so it belongs on the
            home screen rather than only inside Personalize. */}
        {onPersonaChange && (
          <div className="ov-persona-switch">
            <span className="ov-persona-label">Viewing as</span>
            <div className="ov-persona-pills">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`ov-persona-pill ${p.id === persona.id ? 'is-active' : ''}`}
                  onClick={() => onPersonaChange(p.id)}
                  title={p.title}
                  aria-pressed={p.id === persona.id}
                >
                  <p.icon size={14} strokeWidth={2.2} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.header>

      {topAlert && (
        <motion.div variants={fadeUp}>
          <AlertBanner alert={topAlert} onViewAll={onViewAlerts} />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <SkyPanel weather={weather} />
      </motion.div>

      <motion.div className="ov-split" variants={fadeUp}>
        <ComfortGauge
          title={`${persona.label} comfort score`}
          score={comfort.score}
          label={comfort.label}
          status={comfort.status}
          factors={comfort.factors}
        />
        <HourlyStrip />
      </motion.div>

      <motion.div className="ov-section-bar" variants={fadeUp}>
        <p className="section-label">Prioritized for you — {persona.title}</p>
        <CustomizeDashboard
          active={customizeMode}
          onToggle={() => setCustomizeMode((v) => !v)}
          onReset={layout.resetLayout}
          hiddenKeys={layout.hidden}
          onUnhide={layout.toggleHidden}
        />
      </motion.div>

      <motion.div className="metric-grid" variants={stagger}>
        {layout.sortedKeys.map((key) => {
          const m = getMetric(key)
          if (!m) return null
          const isPinned = layout.pinned.includes(key)
          const group = layout.sortedKeys.filter((k) => layout.pinned.includes(k) === isPinned)
          const groupIdx = group.indexOf(key)
          return (
            <motion.div key={key} variants={fadeUp} layout>
              <MetricCard
                icon={m.icon}
                label={m.label}
                value={m.getValue(weather)}
                caption={m.getCaption ? m.getCaption(weather) : null}
                status={m.getStatus ? m.getStatus(weather) : null}
                customize={
                  customizeMode
                    ? {
                        isPinned,
                        onPin: () => layout.togglePinned(key),
                        onHide: () => layout.toggleHidden(key),
                        onMoveUp: () => layout.moveWidget(key, -1),
                        onMoveDown: () => layout.moveWidget(key, 1),
                        canMoveUp: groupIdx > 0,
                        canMoveDown: groupIdx < group.length - 1,
                      }
                    : null
                }
              />
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
