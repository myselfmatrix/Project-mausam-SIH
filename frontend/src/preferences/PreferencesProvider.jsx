import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { TEMP_UNITS, SPEED_UNITS } from '../utils/units'

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
    }
  } catch {
    return DEFAULTS
  }
}

const PreferencesContext = createContext(null)

export default function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Storage blocked — the choice just will not survive a reload.
    }
  }, [prefs])

  const setPreference = useCallback((key, value) => {
    setPrefs((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const value = useMemo(() => ({ ...prefs, setPreference }), [prefs, setPreference])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>')
  return ctx
}
