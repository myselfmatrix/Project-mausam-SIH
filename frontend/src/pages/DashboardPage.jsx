import { useState } from 'react'
import { post } from '../services/api'
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
      await post('/users/persona', { userId, persona: newPersona })
    } catch (err) {
      console.error('Failed to update persona:', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    window.location.reload()
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
        <DashboardSidebar activeTab={activeTab} onSelect={setActiveTab} />

        <main className="dshell-main">
          {activeTab === 'overview' && (
            <OverviewTab
              weather={weather}
              persona={persona}
              userName={userName}
              topAlert={topAlert}
              onViewAlerts={() => setActiveTab('alerts')}
            />
          )}
          {activeTab === 'weather' && <WeatherTab weather={weather} />}
          {activeTab === 'locations' && <LocationsTab />}
          {activeTab === 'alerts' && <AlertsTab />}
          {activeTab === 'personalize' && (
            <PersonalizeTab activePersonaId={userPersona} onPersonaChange={handlePersonaChange} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab userName={userName} userEmail={userEmail} onLogout={handleLogout} />
          )}
        </main>
      </div>

      <MobileNav activeTab={activeTab} onSelect={setActiveTab} />
    </div>
  )
}
