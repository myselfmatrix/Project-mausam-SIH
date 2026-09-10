import { useEffect, useState, useCallback } from 'react'
import { get } from '../services/api'
import { getWeather } from '../data/weatherData'

/**
 * Fetches weather from backend with location and optional persona.
 *
 * `weather` starts populated with local mock data (never null) so the
 * dashboard renders instantly instead of blanking on first paint — `isLoading`
 * then tells the widgets a fresher fetch is in flight, for a subtle "updating"
 * treatment rather than a full skeleton swap. On failure the mock stays put
 * and `error` carries the reason, so the UI degrades to "slightly stale" data
 * instead of "broken".
 */
export function useWeather(location = 'Lucknow', personaId = null) {
  const [state, setState] = useState(() => ({
    weather: getWeather(location),
    isLoading: true,
    error: null,
    retryCount: 0,
    isLive: false,
  }))

  const fetchWeather = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }))
    try {
      // Build query — if personaId is provided, include it for persona-aware insights later.
      const query = `?location=${encodeURIComponent(location)}${personaId ? `&personaType=${personaId}` : ''}`
      const data = await get(`/weather/personalized/data${query}`)

      // Backend returns { weather: {..., hourlyForecast: [...]} } — merge over
      // the current state rather than replacing it. The live endpoint only
      // models current conditions + hourly forecast; persona-linked fields
      // (workoutWindow, tide, destination, packingTip...) aren't live yet and
      // must keep falling back to the richer mock instead of going undefined
      // and breaking every metric/comfort-score calc that reads them.
      setState((s) => ({
        ...s,
        weather: { ...s.weather, ...data.weather },
        isLoading: false,
        error: null,
        retryCount: 0,
        isLive: true,
      }))
    } catch (err) {
      // Keep whatever was already on screen (live or mock) — never regress to nothing.
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err.message || 'Failed to load weather',
        retryCount: s.retryCount + 1,
      }))
    }
  }, [location, personaId])

  useEffect(() => {
    fetchWeather()
    // Refresh every 10 minutes in production; for demo, leave interval off.
    // const interval = setInterval(fetchWeather, 10 * 60 * 1000)
    // return () => clearInterval(interval)
  }, [fetchWeather])

  const retry = useCallback(() => {
    fetchWeather()
  }, [fetchWeather])

  return {
    weather: state.weather,
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
    isLive: state.isLive,
    retry,
  }
}
