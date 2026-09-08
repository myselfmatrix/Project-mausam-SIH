import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [userId, setUserId] = useState(null)
  const [userPersona, setUserPersona] = useState('health')

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId')
    if (savedUserId) {
      setUserId(savedUserId)
      setCurrentPage('dashboard')
    }
  }, [])

  const handleHomeGetStarted = () => {
    setCurrentPage('signup')
  }

  const handleLoginSuccess = () => {
    setCurrentPage('dashboard')
  }

  const handleSignupSuccess = () => {
    const savedUserId = localStorage.getItem('userId')
    setUserId(savedUserId)
    setCurrentPage('login')
  }

  const handlePersonaSelect = (persona) => {
    setUserPersona(persona)
  }

  return (
    <>
      {currentPage === 'home' && (
        <HomePage onGetStarted={handleHomeGetStarted} />
      )}
      {currentPage === 'login' && (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
      {currentPage === 'signup' && (
        <SignupPage onSignupSuccess={handleSignupSuccess} />
      )}
      {currentPage === 'dashboard' && userId && (
        <DashboardPage
          userId={userId}
          userPersona={userPersona}
          onPersonaSelect={handlePersonaSelect}
        />
      )}
    </>
  )
}

export default App
