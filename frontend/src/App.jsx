import { useCallback, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import IntroSequence from './components/intro/IntroSequence'
import { post, get, getToken } from './services/api'
import { usePreferences } from './preferences/PreferencesProvider'

// Cross-page transition. Kept short and subtle — this fires on every route
// change, so anything longer starts feeling like latency.
const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
}

/*
  The chosen persona, remembered on this device.

  It used to live only in component state seeded with 'health', and the
  profile fetch never read it back, so every reload silently returned the user
  to the health dashboard no matter what they had picked - and with the
  database unreachable there was nothing to restore it from at all. Reading it
  synchronously here also removes the flash of the wrong dashboard while the
  profile request is in flight.
*/
const PERSONA_STORAGE_KEY = 'mausam_persona'

const readStoredPersona = () => {
  try {
    return localStorage.getItem(PERSONA_STORAGE_KEY) || null
  } catch {
    return null
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [userId, setUserId] = useState(null)
  const [userPersona, setUserPersona] = useState(() => readStoredPersona() || 'health')
  /*
    The account's own last-used location, so signing in on a new device lands
    on the city the user actually cares about rather than the project default.
    Fetched rather than stored locally, because the point of it is to work on
    a device that has no local state.
  */
  const [userActiveLocation, setUserActiveLocation] = useState(null)
  const [showIntro, setShowIntro] = useState(true)
  const { adoptFromAccount } = usePreferences()

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId')
    // Both are required: a userId left behind from before tokens existed
    // would otherwise restore a session that every API call then rejects.
    if (savedUserId && getToken()) {
      setUserId(savedUserId)
      const onboarded = localStorage.getItem('mausam_onboarded')
      setCurrentPage(onboarded ? 'dashboard' : 'onboarding')
    }
  }, [])

  // Declared before the profile effect that calls it: as a const it would
  // otherwise be read from its own temporal dead zone on the line above.
  const handlePersonaSelect = useCallback((persona) => {
    setUserPersona(persona)
    try {
      localStorage.setItem(PERSONA_STORAGE_KEY, persona)
    } catch {
      // Storage blocked — the choice just will not survive a reload.
    }
  }, [])

  /*
    Pull the profile once there is a session.

    Non-blocking on purpose: the dashboard has a default place and a locally
    stored one, so a failed or slow profile fetch costs nothing visible.
  */
  useEffect(() => {
    if (!userId || !getToken()) return
    get('/users/profile')
      .then((data) => {
        const active = data?.activeLocation
        if (active && Number.isFinite(active.lat) && Number.isFinite(active.lon)) {
          setUserActiveLocation(active)
        }
        /*
          The account's persona wins only on a device that has none of its
          own - the same rule as the active location. Otherwise signing in
          would yank someone out of the dashboard they were just using.
        */
        if (data?.persona && !readStoredPersona()) handlePersonaSelect(data.persona)
        // Units and interests, for a device that has not set its own.
        adoptFromAccount(data?.preferences)
      })
      .catch(() => {})
  }, [userId, adoptFromAccount, handlePersonaSelect])

  const handleHomeGetStarted = () => setCurrentPage('signup')
  const handleHomeSignIn = () => setCurrentPage('login')

  const handleLoginSuccess = () => {
    setUserId(localStorage.getItem('userId'))
    const onboarded = localStorage.getItem('mausam_onboarded')
    setCurrentPage(onboarded ? 'dashboard' : 'onboarding')
  }

  // Signup returns a session token, so a new account goes straight into
  // onboarding. Sending someone back to a login form seconds after they chose
  // a password reads as "signup failed".
  const handleSignupSuccess = () => {
    setUserId(localStorage.getItem('userId'))
    setCurrentPage('onboarding')
  }

  const handleOnboardingComplete = async (personaId) => {
    handlePersonaSelect(personaId)
    localStorage.setItem('mausam_onboarded', '1')
    setCurrentPage('dashboard')
    try {
      // The account comes from the bearer token — no userId in the body.
      await post('/users/persona', { persona: personaId })
    } catch (err) {
      // Non-blocking: the persona is already applied locally, this is just
      // the server-side save.
      console.error('Failed to sync persona:', err)
    }
  }

  return (
    <>
      {/* The intro plays its own exit (the shutter split) and only calls
          onDone once the curtains have finished travelling, so it doesn't need
          an AnimatePresence wrapper to animate out. */}
      {showIntro && <IntroSequence onDone={() => setShowIntro(false)} />}

      <AnimatePresence mode="wait">
        <motion.div key={currentPage} {...pageTransition}>
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
              userActiveLocation={userActiveLocation}
              onPersonaSelect={handlePersonaSelect}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export default App
