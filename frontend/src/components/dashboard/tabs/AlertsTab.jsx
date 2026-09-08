import { useState } from 'react'
import { motion } from 'framer-motion'
import { ALERTS, ALERT_CATEGORIES } from '../../../data/alertData'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AlertsTab() {
  const [alerts, setAlerts] = useState(ALERTS)
  const [category, setCategory] = useState('All')

  const filtered = category === 'All' ? alerts : alerts.filter((a) => a.category === category)

  const markRead = (id) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>Alerts</h1>
        <p>Everything that could affect your day, in one place.</p>
      </motion.div>

      <motion.div className="alerts-filter-row" variants={fadeUp}>
        {ALERT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`filter-chip ${category === c ? 'is-active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </motion.div>

      <motion.div className="alerts-list" variants={stagger}>
        {filtered.length === 0 && (
          <motion.p variants={fadeUp} style={{ color: 'var(--color-text-muted)' }}>
            No alerts in this category right now.
          </motion.p>
        )}
        {filtered.map((a) => (
          <motion.div
            key={a.id}
            className={`alert-card status-${a.severity} ${!a.read ? 'is-unread' : ''}`}
            variants={fadeUp}
            onClick={() => markRead(a.id)}
          >
            {!a.read && <span className="alert-card-dot" />}
            <div className="alert-card-body">
              <div className="alert-card-top-row">
                <span className="alert-card-category">{a.category}</span>
                <span className="alert-card-time">{timeAgo(a.timestamp)}</span>
              </div>
              <p className="alert-card-what">{a.what}</p>
              <p className="alert-card-meta">{a.when}</p>
              <p className="alert-card-meta">{a.why}</p>
              <p className="alert-card-action">{a.action}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
