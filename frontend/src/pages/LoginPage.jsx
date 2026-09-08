import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, AlertCircle } from 'lucide-react'
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
      <h1 className="auth-title">Log in to Mausam</h1>
      <p className="auth-subtitle">Pick up right where your sky left off.</p>

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
              <AlertCircle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="submit" className="auth-submit" disabled={loading} data-cursor-hover>
          {loading ? <span className="auth-spinner" /> : 'Log In'}
        </button>
      </form>

      <p className="auth-switch">
        New to Mausam?{' '}
        <button type="button" className="auth-switch-link" onClick={onSwitchToSignup}>
          Create an account
        </button>
      </p>
    </AuthLayout>
  )
}
