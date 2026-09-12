import { useState } from 'react'
import { motion } from 'framer-motion'
import { ALERT_CATEGORIES } from '../../../data/alertData'
import { useTranslation } from '../../../i18n/useTranslation'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }

function timeAgo(iso, t) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return t('time.justNow')
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  return t('time.daysAgo', { count: Math.floor(hours / 24) })
}

// `alerts`/`onMarkRead` are owned by DashboardPage (not local state) so that
// marking an alert read here actually decrements the unread badge shown in
// the sidebar and top nav, instead of only updating this tab's own copy.
export default function AlertsTab({ alerts, onMarkRead }) {
  const { t } = useTranslation()
  // Filtering compares category ids, never labels — the list must keep
  // working when the labels are in a different script.
  const [category, setCategory] = useState('all')

  const filtered = category === 'all' ? alerts : alerts.filter((a) => a.category === category)

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>{t('alertsTab.title')}</h1>
        <p>{t('alertsTab.subtitle')}</p>
      </motion.div>

      <motion.div className="alerts-filter-row" variants={fadeUp}>
        {ALERT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`filter-chip ${category === c.id ? 'is-active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {t(c.labelKey)}
          </button>
        ))}
      </motion.div>

      <motion.div className="alerts-list" variants={stagger}>
        {filtered.length === 0 && (
          <motion.p variants={fadeUp} style={{ color: 'var(--color-text-muted)' }}>
            {t('alertsTab.empty')}
          </motion.p>
        )}
        {filtered.map((a) => (
          <motion.div
            key={a.id}
            className={`alert-card status-${a.severity} ${!a.read ? 'is-unread' : ''}`}
            variants={fadeUp}
            onClick={() => onMarkRead(a.id)}
          >
            {!a.read && <span className="alert-card-dot" />}
            <div className="alert-card-body">
              <div className="alert-card-top-row">
                <span className="alert-card-category">{t(`alertCategory.${a.category}`)}</span>
                <span className="alert-card-time">{timeAgo(a.timestamp, t)}</span>
              </div>
              <p className="alert-card-what">{t(a.whatKey)}</p>
              <p className="alert-card-meta">{t(a.whenKey)}</p>
              <p className="alert-card-meta">{t(a.whyKey)}</p>
              <p className="alert-card-action">{t(a.actionKey)}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
