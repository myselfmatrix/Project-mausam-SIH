import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { PERSONAS } from '../../../data/personaData'
import './Tabs.css'

const INTEREST_OPTIONS = [
  'Weather alerts', 'Air quality', 'UV', 'Rain', 'Travel',
  'Outdoor activity', 'Commute', 'Agriculture', 'Marine conditions',
]

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }

export default function PersonalizeTab({ activePersonaId, onPersonaChange }) {
  // Local-only for this prototype — wire to /api/users/preferences once that
  // endpoint exists; it currently only stores a single `persona` field.
  const [interests, setInterests] = useState(['Weather alerts', 'Rain'])

  const toggleInterest = (interest) => {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]))
  }

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>Personalize MAUSAM</h1>
        <p>Tell us what matters, and your dashboard reorders itself around it.</p>
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        What's important to you?
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
              <p className="persona-select-title">{p.title}</p>
              <p className="persona-select-desc">{p.description}</p>
            </span>
            {activePersonaId === p.id && <Check size={18} color="var(--color-brand-600)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
          </motion.button>
        ))}
      </motion.div>

      <motion.p className="section-label" variants={fadeUp}>
        Notify me about
      </motion.p>
      <motion.div className="interest-chip-grid" variants={fadeUp}>
        {INTEREST_OPTIONS.map((interest) => (
          <button
            key={interest}
            type="button"
            className={`interest-chip ${interests.includes(interest) ? 'is-selected' : ''}`}
            onClick={() => toggleInterest(interest)}
          >
            {interest}
          </button>
        ))}
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">Quiet hours</p>
        <div className="settings-row">
          <div>
            <p className="settings-row-label">Pause non-critical alerts</p>
            <p className="settings-row-desc">10:00 PM – 7:00 AM</p>
          </div>
          <input className="form-input" type="time" defaultValue="22:00" style={{ width: 110 }} />
        </div>
      </motion.div>
    </motion.div>
  )
}
