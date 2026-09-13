import { useEffect, useRef, useState } from 'react'
import { get } from '../services/api'

/*
  Live advisories from a spread of Indian cities, for the landing page.

  The marketing pages used to render a fixture of invented alerts. They were
  convincing, which was the problem: a visitor could not tell them from real
  ones, and neither could a screenshot. These are the same derived advisories
  the dashboard shows, for real cities, right now.

  Failure is silent and returns an empty list. The marquee is decorative, and
  an error message where a visitor expected a product is worse than nothing.
*/
export function useNationalAlerts() {
  const [alerts, setAlerts] = useState([])
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    get('/weather/alerts/national')
      .then((data) => {
        if (!mounted.current) return
        setAlerts(Array.isArray(data?.alerts) ? data.alerts : [])
      })
      .catch(() => {
        // Decorative surface: leave it empty rather than shouting.
      })
  }, [])

  return alerts
}

export default useNationalAlerts
