import { motion } from 'framer-motion'
import { ShieldCheck, Target, Zap } from 'lucide-react'
import './AuthLayout.css'

const PERKS = [
  { icon: Target, text: '8 personas, one weather feed — tuned to how you live' },
  { icon: Zap, text: 'Prioritized insights, not just raw numbers' },
  { icon: ShieldCheck, text: 'Clear, color-coded alerts you can act on' },
]

export default function AuthLayout({ children, onBackHome }) {
  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel-brand">
        <div className="auth-brand-content">
          <button type="button" className="auth-logo" onClick={onBackHome}>
            <span className="auth-logo-mark">M</span> MAUSAM
          </button>

          <motion.h2
            className="auth-brand-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Weather that understands what matters to you.
          </motion.h2>

          <ul className="auth-perks">
            {PERKS.map((p, i) => (
              <motion.li
                key={p.text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              >
                <span className="auth-perk-icon">
                  <p.icon size={16} strokeWidth={2} />
                </span>
                {p.text}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <div className="auth-panel auth-panel-form">
        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
