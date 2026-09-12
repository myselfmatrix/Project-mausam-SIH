import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AuthLayout from '../components/AuthLayout'
import FloatingLabelInput from '../components/FloatingLabelInput'
import { useTranslation } from '../i18n/useTranslation'
import './AuthPage.css'

export default function SignupPage({ onSignupSuccess, onSwitchToLogin, onBackHome }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signup, loading, error } = useAuth()
  const { t } = useTranslation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await signup(name, email, password)
      onSignupSuccess()
    } catch (err) {
      console.error('Signup failed:', err)
    }
  }

  return (
    <AuthLayout onBackHome={onBackHome}>
      <span className="auth-eyebrow">{t('auth.signupEyebrow')}</span>
      <h1 className="auth-title">{t('auth.signupTitle')}</h1>
      <p className="auth-subtitle">{t('auth.signupSubtitle')}</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <FloatingLabelInput
          id="signup-name"
          type="text"
          name="name"
          label={t('auth.fieldName')}
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <FloatingLabelInput
          id="signup-email"
          type="email"
          name="email"
          label={t('auth.fieldEmail')}
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <div>
          <FloatingLabelInput
            id="signup-password"
            type="password"
            name="password"
            label={t('auth.fieldPassword')}
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
          />
          <p className="auth-hint">{t('auth.signupHint')}</p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              className="auth-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AlertCircle size={15} />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="submit" className="btn btn-primary btn-lg btn-block auth-submit" disabled={loading}>
          {loading ? <span className="auth-spinner" /> : <>{t('auth.signupSubmit')} <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="auth-switch">
        {t('auth.signupSwitchPrompt')}{' '}
        <button type="button" className="auth-switch-link" onClick={onSwitchToLogin}>
          {t('auth.signupSwitchAction')}
        </button>
      </p>
    </AuthLayout>
  )
}
