import { useEffect, useRef, useState } from 'react'
import { get } from '../services/api'

/*
  Keep the dashboard on wherever the device actually is.

  Distinct from the "use my location" button, which answers "where am I?"
  once. This answers it continuously, so a forecast read on a train or on the
  way to another district follows the traveller instead of describing the city
  they left. It is off by default and switched on in Settings: a page that
  quietly tracks you is not a feature anyone asked for.
*/

// Below this, refetching buys nothing. The forecast model's own grid is
// several kilometres wide and coordinates are rounded to two decimals
// upstream, so a shorter threshold would re-request an identical answer -
// while GPS jitter alone would trip it every few seconds when standing still.
const MOVE_THRESHOLD_KM = 3

// Reverse geocoding is rate-limited to one request a second by Nominatim's
// usage policy, and a name is worth far less than the reading itself.
const MIN_GAP_MS = 30_000

const EARTH_RADIUS_KM = 6371
const toRad = (deg) => (deg * Math.PI) / 180

export function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * @param enabled  whether to watch at all.
 * @param onPlace  called with `{name, region, lat, lon}` when the device has
 *                 moved far enough to be somewhere else.
 */
export function useFollowLocation(enabled, onPlace) {
  const [status, setStatus] = useState('idle')
  const lastAppliedRef = useRef(null)
  const lastAtRef = useRef(0)
  // Held in a ref so a caller passing a fresh closure each render does not
  // tear down and restart the watch - which on some browsers re-prompts.
  const onPlaceRef = useRef(onPlace)
  onPlaceRef.current = onPlace

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      return undefined
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return undefined
    }

    let cancelled = false
    setStatus('locating')

    const handle = async (position) => {
      if (cancelled) return
      const coords = {
        lat: Math.round(position.coords.latitude * 1e4) / 1e4,
        lon: Math.round(position.coords.longitude * 1e4) / 1e4,
      }
      setStatus('following')

      const last = lastAppliedRef.current
      if (last && distanceKm(last, coords) < MOVE_THRESHOLD_KM) return
      if (Date.now() - lastAtRef.current < MIN_GAP_MS) return

      lastAppliedRef.current = coords
      lastAtRef.current = Date.now()

      /*
        Apply the coordinates first, name second.

        The forecast only needs latitude and longitude, so waiting on the
        reverse lookup would delay real data for a label. If the lookup fails
        the dashboard still moves; it just shows coordinates until the next
        one succeeds.
      */
      onPlaceRef.current?.({ ...coords, name: null, region: null })
      try {
        const data = await get(`/geo/reverse?lat=${coords.lat}&lon=${coords.lon}`)
        if (cancelled || !data?.place) return
        onPlaceRef.current?.({
          lat: coords.lat,
          lon: coords.lon,
          name: data.place.name || null,
          region: data.place.region || '',
        })
      } catch {
        // Keep the coordinates we already applied.
      }
    }

    const fail = (error) => {
      if (cancelled) return
      setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')
    }

    const id = navigator.geolocation.watchPosition(handle, fail, {
      enableHighAccuracy: true,
      // A stale fix up to a minute old is fine for weather and saves the
      // radio a great deal of work.
      maximumAge: 60_000,
      timeout: 20_000,
    })

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(id)
    }
  }, [enabled])

  return { status }
}

export default useFollowLocation
