import { useCallback, useEffect, useRef, useState } from 'react'
import { get, post, put } from '../services/api'
import { bulkConditions, isSamePlace } from '../services/geo'
import { SEED_LOCATIONS } from '../data/locationData'

/*
  The user's saved locations, and the live conditions for each.

  Storage is local-first: the list lives in localStorage and is the source of
  truth for rendering, so the picker opens instantly and keeps working while
  signed out or offline. When a session exists the list is also pushed to the
  account, which is what makes it survive a new device.

  Conditions are fetched separately and never stored. A saved location is a
  coordinate the user cares about; its temperature is a fact about right now,
  and caching that in localStorage is how apps end up cheerfully displaying
  yesterday's weather.
*/

const STORAGE_KEY = 'mausam_saved_locations'

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((l) => l && Number.isFinite(l.lat) && Number.isFinite(l.lon))
  } catch {
    // Corrupt or blocked storage: fall back to the seeds rather than crash.
    return null
  }
}

const writeStored = (locations) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations))
  } catch {
    // Storage blocked - the list just will not survive a reload.
  }
}

const withId = (location) => ({
  id: location.id || `loc-${Math.random().toString(36).slice(2, 10)}`,
  ...location,
})

export function useSavedLocations({ isAuthenticated = false } = {}) {
  const [locations, setLocations] = useState(() => (readStored() || SEED_LOCATIONS).map(withId))
  const [conditions, setConditions] = useState({})
  const [isLoadingConditions, setLoadingConditions] = useState(false)
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

  /*
    On sign-in, the account's list wins.

    The device may hold the seeds (a fresh browser) while the account holds
    what the user actually curated, so adopting the server's list is right -
    but only when it has something in it, or signing in on a new phone would
    wipe a list the user had just built there while signed out.
  */
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false

    get('/users/locations')
      .then((data) => {
        if (cancelled || !mounted.current) return
        const remote = Array.isArray(data?.locations) ? data.locations : []
        if (remote.length > 0) {
          const adopted = remote.map(withId)
          setLocations(adopted)
          writeStored(adopted)
        } else if (locations.length > 0) {
          // Account is empty and the device is not: seed the account.
          put('/users/locations', { locations }).catch(() => {})
        }
      })
      .catch(() => {
        // Offline or expired session: the local list is already on screen.
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  /** Applies a change locally first, then mirrors it to the account. */
  const commit = useCallback(
    (next, remote) => {
      setLocations(next)
      writeStored(next)
      if (isAuthenticated && remote) remote().catch(() => {})
    },
    [isAuthenticated],
  )

  const addLocation = useCallback(
    (place) => {
      if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return false
      let added = false
      setLocations((current) => {
        if (current.some((l) => isSamePlace(l, place))) return current
        const entry = withId({
          name: place.name,
          region: place.region || '',
          country: place.country || '',
          countryCode: place.countryCode || '',
          label: place.label || '',
          labelKey: place.label ? '' : place.labelKey || 'locationCategory.saved',
          lat: place.lat,
          lon: place.lon,
          timezone: place.timezone || '',
        })
        const next = [...current, entry]
        writeStored(next)
        added = true
        if (isAuthenticated) post('/users/locations', entry).catch(() => {})
        return next
      })
      return added
    },
    [isAuthenticated],
  )

  const removeLocation = useCallback(
    (id) => {
      setLocations((current) => {
        const target = current.find((l) => l.id === id)
        const next = current.filter((l) => l.id !== id)
        writeStored(next)
        /*
          Ids differ between the device and the account: a location saved
          while signed out has a locally generated id the server never saw.
          Deleting by id would silently miss those, so the whole list is
          replaced instead - it is at most 25 rows.
        */
        if (isAuthenticated && target) put('/users/locations', { locations: next }).catch(() => {})
        return next
      })
    },
    [isAuthenticated],
  )

  const relabelLocation = useCallback(
    (id, label) => {
      setLocations((current) => {
        const next = current.map((l) => (l.id === id ? { ...l, label, labelKey: '' } : l))
        writeStored(next)
        if (isAuthenticated) put('/users/locations', { locations: next }).catch(() => {})
        return next
      })
    },
    [isAuthenticated],
  )

  /** Live conditions for every saved location, in a single request. */
  const refreshConditions = useCallback(async () => {
    if (locations.length === 0) {
      setConditions({})
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoadingConditions(true)

    const results = await bulkConditions(locations, { signal: controller.signal })
    if (!mounted.current || controller.signal.aborted) return

    // Keyed by coordinate rather than by index: the request may return fewer
    // rows than were asked for, and lining those up by position would show
    // one city's temperature on another city's card.
    const next = {}
    for (const row of results) {
      next[`${Number(row.lat).toFixed(2)},${Number(row.lon).toFixed(2)}`] = row
    }
    setConditions(next)
    setLoadingConditions(false)
  }, [locations])

  useEffect(() => {
    refreshConditions()
  }, [refreshConditions])

  const conditionFor = useCallback(
    (place) =>
      place && Number.isFinite(place.lat)
        ? conditions[`${Number(place.lat).toFixed(2)},${Number(place.lon).toFixed(2)}`] || null
        : null,
    [conditions],
  )

  return {
    locations,
    addLocation,
    removeLocation,
    relabelLocation,
    replaceLocations: (next) => commit(next.map(withId), () => put('/users/locations', { locations: next })),
    conditionFor,
    isLoadingConditions,
    refreshConditions,
  }
}
