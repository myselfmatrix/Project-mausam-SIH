import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import { post } from './services/api'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [userId, setUserId] = useState(null)
  const [userPersona, setUserPersona] = useState('health')

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId')
    if (savedUserId) {
      setUserId(savedUserId)
      const onboarded = localStorage.getItem('mausam_onboarded')
      setCurrentPage(onboarded ? 'dashboard' : 'onboarding')
    }
  }, [])

  const handleHomeGetStarted = () => {
    setCurrentPage('signup')
  }

  const handleHomeSignIn = () => {
    setCurrentPage('login')
  }

  const handleLoginSuccess = () => {
    setUserId(localStorage.getItem('userId'))
    const onboarded = localStorage.getItem('mausam_onboarded')
    setCurrentPage(onboarded ? 'dashboard' : 'onboarding')
  }

  const handleSignupSuccess = () => {
    const savedUserId = localStorage.getItem('userId')
    setUserId(savedUserId)
    setCurrentPage('login')
  }

  const handlePersonaSelect = (persona) => {
    setUserPersona(persona)
  }

  // Runs once, after the user finishes the first-login onboarding flow.
  // Mirrors DashboardPage's handlePersonaChange: update local state
  // immediately, sync the chosen persona to the backend in the background,
  // and never block navigation on the network call.
  const handleOnboardingComplete = async (personaId) => {
    handlePersonaSelect(personaId)
    localStorage.setItem('mausam_onboarded', '1')
    setCurrentPage('dashboard')
    try {
      await post('/users/persona', { userId, persona: personaId })
    } catch (err) {
      console.error('Failed to sync persona:', err)
    }
  }

  return (
    <>
      {currentPage === 'home' && (
        <HomePage onGetStarted={handleHomeGetStarted} onSignIn={handleHomeSignIn} />
      )}
      {currentPage === 'login' && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onSwitchToSignup={() => setCurrentPage('signup')}
          onBackHome={() => setCurrentPage('home')}
        />
      )}
      {currentPage === 'signup' && (
        <SignupPage
          onSignupSuccess={handleSignupSuccess}
          onSwitchToLogin={() => setCurrentPage('login')}
          onBackHome={() => setCurrentPage('home')}
        />
      )}
      {currentPage === 'onboarding' && userId && (
        <OnboardingPage onComplete={handleOnboardingComplete} />
      )}
      {currentPage === 'dashboard' && userId && (
        <DashboardPage
          userId={userId}
          userName={localStorage.getItem('userName')}
          userEmail={localStorage.getItem('userEmail')}
          userPersona={userPersona}
          onPersonaSelect={handlePersonaSelect}
        />
      )}
    </>
  )
}

export default App
