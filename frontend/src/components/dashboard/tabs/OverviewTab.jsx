import { useState } from 'react'
import { motion } from 'framer-motion'
import AlertBanner from '../AlertBanner'
import MetricCard from '../MetricCard'
import ComfortScore from '../ComfortScore'
import CustomizeDashboard from '../CustomizeDashboard'
import { getComfortScore } from '../../../utils/personalization'
import { getMetric } from '../../../data/metricDefs'
import useDashboardLayout from '../../../hooks/useDashboardLayout'
import { formatTime, getGreeting } from '../../../utils/format'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

export default function OverviewTab({ weather, persona, userName, topAlert, onViewAlerts }) {
  const [customizeMode, setCustomizeMode] = useState(false)
  const comfort = getComfortScore(persona.id, weather)
  const layout = useDashboardLayout(persona.id)

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>
          {getGreeting()}
          {userName ? `, ${userName}` : ''}.
        </h1>
        <p>
          Here's what matters for your <strong>{persona.title.toLowerCase()}</strong> today.
        </p>
      </motion.div>

      {topAlert && (
        <motion.div variants={fadeUp}>
          <AlertBanner alert={topAlert} onViewAll={onViewAlerts} />
        </motion.div>
      )}

      <motion.div className="hero-card" variants={fadeUp}>
        <div className="hero-card-top">
          <div>
            <p className="hero-location">
              {weather.location}, {weather.region}
            </p>
            <div className="hero-temp">
              {weather.temperature}
              <span>°C</span>
            </div>
            <p className="hero-condition">{weather.condition}</p>
            <p className="hero-sub">Feels like {weather.feelsLike}°</p>
          </div>
          <div className="hero-range">
            <div className="hero-range-values">
              <span>H: {weather.high}°</span>
              <span>L: {weather.low}°</span>
            </div>
            <span className="hero-updated">Updated {formatTime(weather.updatedAt)}</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <ComfortScore
          title={`${persona.label} comfort score`}
          score={comfort.score}
          label={comfort.label}
          status={comfort.status}
          factors={comfort.factors}
        />
      </motion.div>

      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p className="section-label" style={{ margin: 0 }}>
          Prioritized for you — {persona.title}
        </p>
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
