import { motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck, Target, Zap } from 'lucide-react'
import Logo from './brand/Logo'
import AtmosphereScene from './three/LazyAtmosphere'
import LanguageSwitcher from './ui/LanguageSwitcher'
import { useTranslation } from '../i18n/useTranslation'
import './AuthLayout.css'

const PERKS = [
  { icon: Target, key: 'auth.perkPersonas' },
  { icon: Zap, key: 'auth.perkInsights' },
  { icon: ShieldCheck, key: 'auth.perkAlerts' },
]

const EASE = [0.22, 1, 0.36, 1]

export default function AuthLayout({ children, onBackHome }) {
  const { t } = useTranslation()

  return (
    <div className="auth-shell night-surface">
      <div className="atmos-backdrop" />
      <div className="aurora" aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className="auth-scene" aria-hidden="true">
        <AtmosphereScene density="lite" interactive={false} />
      </div>

      <button type="button" className="auth-back" onClick={onBackHome}>
        <ArrowLeft size={15} /> {t('auth.backToHome')}
      </button>

      {/* Someone who needs another language needs it before they can read the
          form, not after signing in. */}
      <div className="auth-lang">
        <LanguageSwitcher />
      </div>

      <div className="auth-grid">
        <motion.div
          className="auth-story"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <Logo size={34} />

          <h2 className="auth-story-title">
            {(() => {
              const [before = '', after = ''] = t('hero.title').split('{accent}')
              return (
                <>
                  {before}
                  <span className="serif-accent">{t('hero.titleAccent')}</span>
                  {after}
                </>
              )
            })()}
          </h2>

          <ul className="auth-perks">
            {PERKS.map((p, i) => (
              <motion.li
                key={p.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.09, duration: 0.42, ease: EASE }}
              >
                <span className="auth-perk-icon">
                  <p.icon size={15} strokeWidth={2.2} />
                </span>
                {t(p.key)}
              </motion.li>
            ))}
          </ul>

          <p className="auth-story-note">{t('auth.storyNote')}</p>
        </motion.div>

        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Compact brand lockup — only shows once the story column drops away */}
          <div className="auth-card-brand">
            <Logo size={30} />
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  )
}
