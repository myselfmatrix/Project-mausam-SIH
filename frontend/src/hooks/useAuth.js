import { useState } from 'react'
import { post } from '../services/api'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const signup = async (name, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await post('/auth/signup', { name, email, password })
      setUser(data)
      localStorage.setItem('userId', data.userId)
      localStorage.setItem('userName', name)
      localStorage.setItem('userEmail', email)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await post('/auth/login', { email, password })
      setUser(data)
      localStorage.setItem('userId', data.userId)
      if (data.name) localStorage.setItem('userName', data.name)
      if (data.email) localStorage.setItem('userEmail', data.email)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, error, signup, login }
}
