import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { PERSONAS } from '../../../data/personaData'
import { INTERESTS } from '../../../data/interestData'
import { useTranslation } from '../../../i18n/useTranslation'
import { usePreferences } from '../../../preferences/PreferencesProvider'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }

export default function PersonalizeTab({ activePersonaId, onPersonaChange }) {
  const { t } = useTranslation()
  // Local-only for this prototype — wire to /api/users/preferences once that
  // endpoint exists; it currently only stores a single `persona` field.
  const { interests, setPreference } = usePreferences()

  /*
    Stored, not just highlighted.

    These chips used to toggle local state that nothing ever read, so the
    selection looked saved and did nothing. They now drive which advisories
    raise the unread badge, and survive a reload.
  */
  const toggleInterest = (interest) => {
    setPreference(
      'interests',
      interests.includes(interest)
        ? interests.filter((i) => i !== interest)
        : [...interests, interest],
    )
  }

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>{t('personalize.title')}</h1>
        <p>{t('personalize.subtitle')}</p>
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        {t('personalize.whatMatters')}
      </motion.p>
      <motion.div className="persona-select-grid" variants={stagger}>
        {PERSONAS.map((p) => (
          <motion.button
            key={p.id}
            type="button"
            className={`persona-select-card ${activePersonaId === p.id ? 'is-selected' : ''}`}
            onClick={() => onPersonaChange(p.id)}
            variants={fadeUp}
          >
            <span className="persona-select-icon">
              <p.icon size={19} strokeWidth={2} />
            </span>
            <span>
              <p className="persona-select-title">{t(p.titleKey)}</p>
              <p className="persona-select-desc">{t(p.descKey)}</p>
            </span>
            {activePersonaId === p.id && <Check size={18} color="var(--color-brand-600)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
          </motion.button>
        ))}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        {t('personalize.notifyMe')}
      </motion.p>
      <motion.div className="interest-chip-grid" variants={fadeUp}>
        {INTERESTS.map((interest) => (
          <button
            key={interest.id}
            type="button"
            className={`interest-chip ${interests.includes(interest.id) ? 'is-selected' : ''}`}
            onClick={() => toggleInterest(interest.id)}
          >
            {t(interest.labelKey)}
          </button>
        ))}
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">{t('personalize.quietHours')}</p>
        <div className="settings-row">
          <div>
            <p className="settings-row-label">{t('personalize.pauseNonCritical')}</p>
            <p className="settings-row-desc">{t('personalize.quietWindow')}</p>
          </div>
          <input className="form-input" type="time" defaultValue="22:00" style={{ width: 110 }} />
        </div>
      </motion.div>
    </motion.div>
  )
}
