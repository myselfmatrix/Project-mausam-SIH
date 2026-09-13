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
          /*
            Two different empty states, because they mean different things.

            Nothing in this filter is a filtering result. Nothing anywhere is
            good news, and saying so plainly - with what we are actually
            watching - is the difference between an alert centre that looks
            broken and one that looks calm.
          */
          <motion.div className="alerts-empty" variants={fadeUp}>
            <p className="alerts-empty-title">
              {alerts.length === 0 ? t('alert.allClear') : t('alertsTab.empty')}
            </p>
            {alerts.length === 0 && <p className="alerts-empty-body">{t('alert.allClearBody')}</p>}
          </motion.div>
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
                <span className="alert-card-time">{t(`severity.${a.severity}`)}</span>
              </div>
              <p className="alert-card-what">{t(a.whatKey, a.params)}</p>
              <p className="alert-card-meta">{t(a.whenKey, a.whenParams)}</p>
              <p className="alert-card-meta">{t(a.whyKey, a.params)}</p>
              <p className="alert-card-action">{t(a.actionKey, a.params)}</p>
            </div>
          </motion.div>
        ))}
        {alerts.length > 0 && (
          <motion.p className="alerts-derived-note" variants={fadeUp}>
            {t('alert.derivedNote')}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  )
}
