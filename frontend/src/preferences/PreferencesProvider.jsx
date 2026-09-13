import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { TEMP_UNITS, SPEED_UNITS } from '../utils/units'
import { put, getToken } from '../services/api'

/*
  Display preferences that belong to the device, not the account.

  Units are a reading preference rather than profile data: the same person
  wants °C on their phone in Pune and may want °F on a shared laptop abroad,
  and neither choice is worth a round trip to the server to apply. They are
  stored locally and read synchronously on the first render, so the dashboard
  never paints in Celsius and then flips.
*/

const STORAGE_KEY = 'mausam_prefs_v1'

const DEFAULTS = {
  // Metric, because this is an Indian weather product. The toggle exists for
  // visitors who think in °F, not because the default is in doubt.
  tempUnit: 'C',
  speedUnit: 'km/h',
  // Whether the dashboard should keep following the device's position as it
  // moves, rather than staying on the place that was picked once.
  followLocation: false,
  /*
    What the user wants to be notified about.

    These decide which advisories count toward the unread badge - never which
    ones are shown. A hazard stays visible in the alert centre whatever is
    selected here, and anything at warning or critical severity notifies
    regardless, because an interest list is a statement about attention, not
    a waiver of danger.
  */
  interests: ['weatherAlerts', 'rain'],
  // Cuts the dashboard to essentials on a slow or metered connection.
  dataSaver: false,
}

/** Whether this device has ever stored a choice of its own. */
const hasLocalChoice = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

const read = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      tempUnit: TEMP_UNITS.includes(parsed?.tempUnit) ? parsed.tempUnit : DEFAULTS.tempUnit,
      speedUnit: SPEED_UNITS.includes(parsed?.speedUnit) ? parsed.speedUnit : DEFAULTS.speedUnit,
      followLocation: Boolean(parsed?.followLocation),
      interests: Array.isArray(parsed?.interests) ? parsed.interests : DEFAULTS.interests,
      dataSaver: Boolean(parsed?.dataSaver),
    }
  } catch {
    return DEFAULTS
  }
}

const PreferencesContext = createContext(null)

export default function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(read)
  // Whether this device had its own stored choice when the app started, which
  // decides whether the account's copy is allowed to overwrite it below.
  const deviceHadChoice = useRef(hasLocalChoice())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Storage blocked — the choice just will not survive a reload.
    }
  }, [prefs])

  /*
    Adopt the account's settings only on a device that has none of its own.

    A fresh sign-in should arrive already in °F if that is how this person
    reads weather. But a device that has been used has the more recent
    intention, and pulling the account copy over it would undo a change the
    user made moments ago on this very screen.
  */
  const adoptFromAccount = useCallback((remote) => {
    if (!remote || deviceHadChoice.current) return
    deviceHadChoice.current = true
    setPrefs((prev) => ({
      ...prev,
      tempUnit: TEMP_UNITS.includes(remote.tempUnit) ? remote.tempUnit : prev.tempUnit,
      speedUnit: SPEED_UNITS.includes(remote.speedUnit) ? remote.speedUnit : prev.speedUnit,
      dataSaver: Boolean(remote.dataSaver),
      followLocation: Boolean(remote.followLocation),
      interests: Array.isArray(remote.interests) ? remote.interests : prev.interests,
    }))
  }, [])

  const setPreference = useCallback((key, value) => {
    setPrefs((prev) => {
      if (prev[key] === value) return prev
      const next = { ...prev, [key]: value }
      /*
        Push to the account in the background.

        Never awaited and never surfaced: the setting is already applied
        locally and stored, so a failed sync costs only its presence on the
        next device - not the change the user just made.
      */
      if (getToken()) put('/users/preferences', { [key]: value }).catch(() => {})
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ ...prefs, setPreference, adoptFromAccount }),
    [prefs, setPreference, adoptFromAccount],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>')
  return ctx
}
