import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { post, clearSession } from '../services/api'
import { getPersona } from '../data/personaData'
import { getWeather, DEFAULT_LOCATION } from '../data/weatherData'
import { ALERTS } from '../data/alertData'
import DashboardNavbar from '../components/layout/DashboardNavbar'
import DashboardSidebar from '../components/layout/DashboardSidebar'
import MobileNav from '../components/layout/MobileNav'
import OverviewTab from '../components/dashboard/tabs/OverviewTab'
import WeatherTab from '../components/dashboard/tabs/WeatherTab'
import LocationsTab from '../components/dashboard/tabs/LocationsTab'
import AlertsTab from '../components/dashboard/tabs/AlertsTab'
import PersonalizeTab from '../components/dashboard/tabs/PersonalizeTab'
import SettingsTab from '../components/dashboard/tabs/SettingsTab'
import '../components/layout/Layout.css'
import './DashboardPage.css'

// Short enough that switching tabs still feels instant.
const tabMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
}

// Weather comes from local mock data (data/weatherData.js) by design for
// this frontend-first prototype — swap getWeather() for a real fetch to
// /api/weather/personalized/data (already implemented server-side) once
// live conditions are wired up, without touching any tab component.
export default function DashboardPage({ userId, userName, userEmail, userPersona, onPersonaSelect }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [location] = useState(DEFAULT_LOCATION)

  const persona = getPersona(userPersona)
  const weather = getWeather(location)
  const unreadAlerts = ALERTS.filter((a) => !a.read)
  const topAlert = ALERTS.find((a) => a.severity === 'critical' || a.severity === 'warning') || ALERTS[0]

  const handlePersonaChange = async (newPersona) => {
    if (newPersona === userPersona) return
    onPersonaSelect(newPersona)
    try {
      // The account comes from the bearer token — no userId in the body.
      await post('/users/persona', { persona: newPersona })
    } catch (err) {
      // Non-blocking: the persona is already applied locally.
      console.error('Failed to update persona:', err)
    }
  }

  const handleLogout = () => {
    clearSession()
    window.location.reload()
  }

  const tabs = {
    overview: (
      <OverviewTab
        weather={weather}
        persona={persona}
        userName={userName}
        topAlert={topAlert}
        onViewAlerts={() => setActiveTab('alerts')}
        onPersonaChange={handlePersonaChange}
      />
    ),
    weather: <WeatherTab weather={weather} />,
    locations: <LocationsTab />,
    alerts: <AlertsTab />,
    personalize: (
      <PersonalizeTab activePersonaId={userPersona} onPersonaChange={handlePersonaChange} />
    ),
    settings: <SettingsTab userName={userName} userEmail={userEmail} onLogout={handleLogout} />,
  }

  return (
    <div className="dshell">
      <DashboardNavbar
        location={weather.location}
        unreadCount={unreadAlerts.length}
        onOpenLocations={() => setActiveTab('locations')}
        onOpenAlerts={() => setActiveTab('alerts')}
        onLogout={handleLogout}
      />

      <div className="dshell-body">
        <DashboardSidebar
          activeTab={activeTab}
          onSelect={setActiveTab}
          userName={userName}
          userEmail={userEmail}
          persona={persona}
          unreadCount={unreadAlerts.length}
        />

        <main className="dshell-main">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} {...tabMotion}>
              {tabs[activeTab]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileNav activeTab={activeTab} onSelect={setActiveTab} />
    </div>
  )
}
