import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { get } from '../services/api'
import { usePreferences } from '../preferences/PreferencesProvider'
import { convertWeather, convertAlerts } from '../utils/units'

/*
  Live weather for one place.

  There is no sample data behind this hook. `weather` is null until the first
  response arrives, and the dashboard shows a skeleton for that moment -
  which is a deliberate choice over the alternative of seeding it with
  plausible-looking numbers. Seeded numbers are indistinguishable from real
  ones on screen, so for the second or two before the fetch lands the user is
  reading fiction, and a screenshot taken in that window is simply wrong.

  After the first success, responses are MERGED over what is already held
  rather than replacing it. The backend omits fields it could not obtain and
  sends explicit nulls for fields it determined to be nothing (see
  backend/weather/normalize.js), so merging is what lets a brief air-quality
  outage cost the AQI tile alone instead of blanking the page.
*/

// Model output updates hourly; the server caches for ten minutes. Refreshing
// on this cadence keeps a long-open tab current without asking for numbers
// that cannot have changed.
const REFRESH_MS = 10 * 60 * 1000

const query = (place, personaId, lang) => {
  const params = new URLSearchParams()
  if (Number.isFinite(place?.lat) && Number.isFinite(place?.lon)) {
    params.set('lat', String(place.lat))
    params.set('lon', String(place.lon))
    if (place.name) params.set('name', place.name)
    if (place.region) params.set('region', place.region)
  } else if (place?.name) {
    params.set('location', place.name)
  }
  if (personaId) params.set('personaType', personaId)
  if (lang) params.set('lang', lang)
  return params.toString()
}

/**
 * @param place    `{ name, region, lat, lon }` - coordinates preferred, name
 *                 alone accepted and geocoded server-side.
 * @param personaId echoed to the API for persona-aware insight copy.
 * @param lang     language for names that come back from the API.
 */
export function useWeather(place, personaId = null, lang = 'en') {
  const { tempUnit, speedUnit } = usePreferences()
  const [state, setState] = useState({
    weather: null,
    alerts: [],
    meta: null,
    // Which place the held `weather` actually describes, so a refresh can be
    // told apart from a move.
    placeId: null,
    isLoading: true,
    error: null,
    retryCount: 0,
  })

  // Identity of the place, so the effect re-runs when the place changes but
  // not when the caller happens to pass a new object for the same place.
  const placeId = place ? `${place.lat},${place.lon},${place.name || ''}` : ''
  const abortRef = useRef(null)
  const mounted = useRef(true)

  /*
    Re-arm on every mount, not just the first.

    This flag gates "is this component still around to receive the result?".
    Setting it only in the cleanup makes it a one-way latch: React remounts a
    component without remaking the ref, so once anything unmounts this hook -
    StrictMode's deliberate mount/unmount/remount in development, a route
    leaving and returning - the flag stays false and every later response is
    discarded on arrival. The request succeeds, the state never updates, and
    the UI waits on a load that already finished.
  */
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      abortRef.current?.abort()
    }
  }, [])

  const fetchWeather = useCallback(
    async ({ background = false } = {}) => {
      if (!place || (!place.name && !Number.isFinite(place?.lat))) return

      // A location change mid-flight must not have its response applied after
      // the new one's: cancel the old request rather than racing it.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      // A background refresh keeps the current reading on screen; only a
      // foreground load is allowed to show a spinner.
      if (!background) setState((s) => ({ ...s, isLoading: true, error: null }))

      try {
        const data = await get(`/weather/personalized/data?${query(place, personaId, lang)}`, {
          signal: controller.signal,
        })
        if (!mounted.current || controller.signal.aborted) return

        /*
          Merge across refreshes of the SAME place; replace when the place
          changed.

          Merging is what lets a brief air-quality outage cost the AQI tile
          alone. But the field a failed section omits is exactly the field
          that would survive a move, so merging across a location change
          leaves the previous city's readings sitting in tiles that now
          claim to describe the new one - the reading is real, just from the
          wrong place, which is the worst kind of wrong to show.
        */
        setState((s) => ({
          weather:
            s.weather && s.placeId === placeId ? { ...s.weather, ...data.weather } : data.weather,
          // Alerts are recomputed from scratch on every response and are
          // never merged: an alert that has stopped applying must disappear,
          // and merging would keep yesterday's storm warning on screen.
          alerts: Array.isArray(data.alerts) ? data.alerts : [],
          meta: data.meta || null,
          placeId,
          isLoading: false,
          error: null,
          retryCount: 0,
        }))
      } catch (err) {
        if (err?.name === 'AbortError' || !mounted.current) return
        // Whatever is on screen stays there. Losing a refresh should never
        // cost the user the reading they already had.
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err.message || 'Failed to load weather',
          retryCount: s.retryCount + 1,
        }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeId, personaId, lang],
  )

  useEffect(() => {
    fetchWeather()
    const timer = setInterval(() => fetchWeather({ background: true }), REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchWeather])

  /*
    Refresh when the tab comes back to the foreground.

    A phone left on the dashboard overnight would otherwise show yesterday
    evening's weather the moment it is unlocked, and the interval above would
    not have fired while the tab was hidden.
  */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchWeather({ background: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchWeather])

  const retry = useCallback(() => fetchWeather(), [fetchWeather])

  /*
    Units are applied here rather than in each component.

    Held state stays metric, which keeps it comparable with the thresholds
    the alert engine and the metric bands are written against; only what is
    handed out is converted. Switching units therefore re-renders from the
    same reading instead of re-fetching it.
  */
  const weather = useMemo(
    () => convertWeather(state.weather, { tempUnit, speedUnit }),
    [state.weather, tempUnit, speedUnit],
  )
  const alerts = useMemo(
    () => convertAlerts(state.alerts, { tempUnit, speedUnit }),
    [state.alerts, tempUnit, speedUnit],
  )

  return {
    weather,
    alerts,
    meta: state.meta,
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
    // "Live" means the last fetch reached the upstream. A cached or degraded
    // response says so, and the dashboard badge reflects it honestly.
    isLive: Boolean(state.weather) && !state.error && state.meta?.degraded !== true,
    sources: state.meta?.sources || null,
    retry,
  }
}
