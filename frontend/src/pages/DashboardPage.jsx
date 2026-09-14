import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { post, put, clearSession, getToken } from '../services/api'
import { getPersona } from '../data/personaData'
import { DEFAULT_PLACE } from '../data/locationData'
import { useWeather } from '../hooks/useWeather'
import { useSavedLocations } from '../hooks/useSavedLocations'
import { useFollowLocation } from '../hooks/useFollowLocation'
import { usePreferences } from '../preferences/PreferencesProvider'
import { useTranslation } from '../i18n/useTranslation'
import LocationPicker from '../components/location/LocationPicker'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'
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

/*
  The chosen place is stored with its coordinates, not as a city name.

  The forecast API accepts nothing but latitude and longitude, so a stored
  name would have to be geocoded again on every load - which both costs a
  request and silently moves anyone who picked a specific point rather than a
  city centre. The key is versioned because the previous release stored a bare
  string here, and reading that as a place object would leave the dashboard
  with no coordinates at all.
*/
const PLACE_STORAGE_KEY = 'mausam_place_v2'

const readStoredPlace = () => {
  try {
    const raw = localStorage.getItem(PLACE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lon) ? parsed : null
  } catch {
    return null
  }
}

export default function DashboardPage({ userId, userName, userEmail, userPersona, userActiveLocation, onPersonaSelect }) {
  const { language } = useTranslation()
  const { followLocation, interests, dataSaver } = usePreferences()
  const [activeTab, setActiveTab] = useState('overview')
  const [place, setPlace] = useState(() => readStoredPlace() || userActiveLocation || DEFAULT_PLACE)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Which alerts this user has already seen. Derived alerts have stable ids
  // per hazard, so dismissing "heavy rain" keeps it dismissed across the
  // ten-minute refreshes for as long as that hazard actually persists.
  const [readIds, setReadIds] = useState(() => new Set())

  const isAuthenticated = Boolean(getToken())
  const persona = getPersona(userPersona)
  const { weather, alerts: liveAlerts, isLoading, error, retry, isLive, errorReason, sample } = useWeather(
    place,
    userPersona,
    language,
  )
  const saved = useSavedLocations({ isAuthenticated })
  /*
    Read state is forgotten when the place changes.

    Alert ids describe a hazard, not an occurrence - `rain-heavy` is the id in
    every city. Carrying the dismissal across a move would silently hide a
    genuine warning for the place the user just switched to.
  */
  useEffect(() => {
    setReadIds(new Set())
  }, [place?.lat, place?.lon])

  const alerts = useMemo(
    () => liveAlerts.map((a) => ({ ...a, read: readIds.has(a.id) })),
    [liveAlerts, readIds],
  )
  /*
    What raises the badge.

    An interest list narrows attention, it does not waive danger: anything at
    warning or critical severity notifies whether or not its category was
    selected. Everything remains visible in the alert centre either way - this
    only decides what interrupts.
  */
  const INTEREST_CATEGORY = {
    weatherAlerts: 'weather',
    airQuality: 'health',
    uv: 'health',
    rain: 'weather',
    travel: 'travel',
    outdoorActivity: 'weather',
    commute: 'commute',
    agriculture: 'agriculture',
    marine: 'marine',
  }
  const watchedCategories = new Set(interests.map((i) => INTEREST_CATEGORY[i]).filter(Boolean))
  const unreadAlerts = alerts.filter(
    (a) =>
      !a.read &&
      (a.severity === 'critical' || a.severity === 'warning' || watchedCategories.has(a.category)),
  )

  /*
    The banner: danger first, then whoever it is for.

    "Severe weather overrides personalization" is about severe weather, and
    only `warning` and `critical` qualify - a gale or a heat wave belongs on
    every persona's screen whether or not it is their subject. Below that
    line the override does not apply, and treating it as though it did was
    the bug: every ordinary day is made of `caution` and `info` advisories,
    so sorting purely by severity pinned the same "moderate rain" banner to
    all eight personas and a beachgoer never saw their own tide.

    So: dangers outrank everything, and among the rest the persona decides.
  */
  const SEVERITY_RANK = { critical: 4, warning: 3, caution: 2, info: 1 }
  const DANGER_RANK = { critical: 2, warning: 1 }

  const topAlert = useMemo(() => {
    if (!alerts.length) return null
    const danger = (a) => DANGER_RANK[a.severity] || 0
    const relevance = (a) => (a.personas?.includes(userPersona) ? 1 : 0)
    return [...alerts].sort(
      (a, b) =>
        danger(b) - danger(a) ||
        relevance(b) - relevance(a) ||
        (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0),
    )[0]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts, userPersona])

  /*
    The account's choice wins on a fresh device.

    Adopted only when this browser has no stored place of its own, so signing
    in does not yank someone away from the city they were just looking at.
  */
  useEffect(() => {
    if (!userActiveLocation || readStoredPlace()) return
    setPlace(userActiveLocation)
  }, [userActiveLocation])

  const handlePlaceChange = useCallback(
    (next) => {
      if (!next || !Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return
      setPlace(next)
      try {
        localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage blocked - the choice just will not survive a reload
      }
      // Non-blocking: the dashboard has already moved.
      if (getToken()) put('/users/locations/active', next).catch(() => {})
    },
    [],
  )

  /*
    When following is on, the device's position drives the place.

    It goes through the same handler as picking a city, so the choice is
    stored and synced exactly as a manual one is - which also means switching
    following off leaves the dashboard on the last place it followed to,
    rather than snapping back to somewhere the user has since left.
  */
  const { status: followStatus } = useFollowLocation(followLocation, handlePlaceChange)

  const handleMarkAlertRead = (id) => {
    setReadIds((prev) => new Set(prev).add(id))
  }

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
        alerts={alerts}
        onViewAlerts={() => setActiveTab('alerts')}
        onPersonaChange={handlePersonaChange}
        dataSaver={dataSaver}
        weatherLoading={isLoading}
        weatherError={error}
        weatherErrorReason={errorReason}
        weatherIsLive={isLive}
        weatherSample={sample}
        onRetryWeather={retry}
      />
    ),
    weather: <WeatherTab weather={weather} />,
    locations: (
      <LocationsTab
        activePlace={place}
        onSelectPlace={handlePlaceChange}
        onAddLocation={() => setPickerOpen(true)}
        saved={saved}
      />
    ),
    alerts: <AlertsTab alerts={alerts} onMarkRead={handleMarkAlertRead} />,
    personalize: (
      <PersonalizeTab
        activePersonaId={userPersona}
        onPersonaChange={handlePersonaChange}
        weather={weather}
      />
    ),
    settings: (
      <SettingsTab
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
        followStatus={followStatus}
      />
    ),
  }

  /*
    Nothing to show until the first forecast lands.

    The alternative - seeding the dashboard with sample readings - puts real
    looking numbers on screen for weather nobody measured, and there is no
    visual difference between those and the truth. A skeleton is honest for
    the second it lasts, and it keeps the layout from jumping when data
    arrives.
  */
  if (!weather) {
    return (
      <DashboardSkeleton
        place={place}
        error={error}
        reason={errorReason}
        onRetry={retry}
        onOpenPicker={() => setPickerOpen(true)}
      />
    )
  }

  return (
    <div className="dshell">
      <DashboardNavbar
        location={weather.location}
        region={weather.region}
        unreadCount={unreadAlerts.length}
        onOpenLocations={() => setPickerOpen(true)}
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

      <LocationPicker
        open={pickerOpen}
        activePlace={place}
        savedLocations={saved.locations}
        onSelect={(next) => {
          handlePlaceChange(next)
          setPickerOpen(false)
        }}
        onSave={saved.addLocation}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
