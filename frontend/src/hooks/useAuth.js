import { useState } from 'react'
import { post, setToken } from '../services/api'

// Both endpoints return the same shape: { token, userId, name, email, ... }
function persistSession(data) {
  setToken(data.token)
  localStorage.setItem('userId', data.userId)
  if (data.name) localStorage.setItem('userName', data.name)
  if (data.email) localStorage.setItem('userEmail', data.email)
}

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (endpoint, payload) => {
    setLoading(true)
    setError(null)
    try {
      const data = await post(endpoint, payload)
      persistSession(data)
      setUser(data)
      return data
    } catch (err) {
      // err.message now carries the server's own wording.
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    error,
    clearError: () => setError(null),
    // Signup returns a token too, so the account is signed in immediately —
    // no round trip back through the login form.
    signup: (name, email, password) => run('/auth/signup', { name, email, password }),
    login: (email, password) => run('/auth/login', { email, password }),
  }
}
