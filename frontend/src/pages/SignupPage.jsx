import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AuthLayout from '../components/AuthLayout'
import FloatingLabelInput from '../components/FloatingLabelInput'
import './AuthPage.css'

export default function SignupPage({ onSignupSuccess, onSwitchToLogin, onBackHome }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signup, loading, error } = useAuth()

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
      <span className="auth-eyebrow">Get started free</span>
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-subtitle">One minute of setup, a lifetime of weather that fits you.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <FloatingLabelInput
          id="signup-name"
          type="text"
          name="name"
          label="Full name"
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <FloatingLabelInput
          id="signup-email"
          type="email"
          name="email"
          label="Email address"
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
            label="Password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
          />
          <p className="auth-hint">At least 6 characters</p>
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
              <AlertCircle size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="submit" className="auth-submit" disabled={loading} data-cursor-hover>
          {loading ? <span className="auth-spinner" /> : 'Create Account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="auth-switch-link" onClick={onSwitchToLogin}>
          Log in
        </button>
      </p>
    </AuthLayout>
  )
}
