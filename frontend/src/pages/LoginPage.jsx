import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AuthLayout from '../components/AuthLayout'
import FloatingLabelInput from '../components/FloatingLabelInput'
import './AuthPage.css'

export default function LoginPage({ onLoginSuccess, onSwitchToSignup, onBackHome }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      onLoginSuccess()
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <AuthLayout onBackHome={onBackHome}>
      <span className="auth-eyebrow">Welcome back</span>
      <h1 className="auth-title">Sign in to MAUSAM</h1>
      <p className="auth-subtitle">
        Your personalized forecast is where you left it.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <FloatingLabelInput
          id="login-email"
          type="email"
          name="email"
          label="Email address"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <FloatingLabelInput
          id="login-password"
          type="password"
          name="password"
          label="Password"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

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
          {loading ? <span className="auth-spinner" /> : <>Sign in <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="auth-switch">
        New to MAUSAM?{' '}
        <button type="button" className="auth-switch-link" onClick={onSwitchToSignup}>
          Create an account
        </button>
      </p>
    </AuthLayout>
  )
}
