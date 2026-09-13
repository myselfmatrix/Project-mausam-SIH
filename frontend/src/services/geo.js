import { get } from './api'

/*
  Place lookup, as the UI needs it.

  Every call goes to our own backend rather than to a geocoding service
  directly. That is not indirection for its own sake: the upstreams' rate
  limits are per-IP, their usage policies require an identifying contact, and
  their responses are worth caching across users. All three belong on the
  server, so this module's only job is to shape requests and to make sure a
  lookup failure never becomes an exception the picker has to catch.
*/

const encode = (value) => encodeURIComponent(String(value ?? ''))

/**
 * Searches for places by name.
 *
 * Returns `[]` for anything the backend could not answer, including a failed
 * request. A location picker whose search box can throw is a location picker
 * that breaks while you are typing in it, and the screen always has other
 * ways to choose - saved places, popular cities, GPS.
 */
export async function searchPlaces(query, { lang = 'en', count = 8, signal } = {}) {
  const trimmed = String(query || '').trim()
  if (trimmed.length < 2) return []

  try {
    const data = await get(`/geo/search?q=${encode(trimmed)}&lang=${encode(lang)}&count=${count}`, { signal })
    return Array.isArray(data?.results) ? data.results : []
  } catch (err) {
    // A superseded request must not be reported as "no matches" - the caller
    // is already waiting on a newer one.
    if (err?.name === 'AbortError') throw err
    return []
  }
}

/**
 * Names a coordinate.
 *
 * The backend has its own fallbacks (a city list, then formatted
 * coordinates), so this resolving to null means the request itself failed.
 * Callers treat that as "unnamed point", never as "no location" - the
 * forecast for those coordinates is perfectly obtainable without a name.
 */
export async function reverseGeocode(lat, lon, { lang = 'en', signal } = {}) {
  try {
    const data = await get(`/geo/reverse?lat=${encode(lat)}&lon=${encode(lon)}&lang=${encode(lang)}`, { signal })
    return data?.place || null
  } catch {
    return null
  }
}

/** The picker's opening set of suggestions, with names in `lang`. */
export async function popularPlaces({ lang = 'en', signal } = {}) {
  try {
    const data = await get(`/geo/popular?lang=${encode(lang)}`, { signal })
    return Array.isArray(data?.results) ? data.results : []
  } catch {
    return []
  }
}

/**
 * A coarse location from the caller's IP.
 *
 * Only ever offered as something to confirm: IP geolocation can be a whole
 * state out, so the UI must not present this as "your location".
 */
export async function locateByIp({ signal } = {}) {
  try {
    const data = await get('/geo/ip', { signal })
    return data?.place || null
  } catch {
    return null
  }
}

/**
 * Current conditions for many places in one request.
 *
 * The saved-locations grid needs a temperature per card; this is what keeps
 * that one request instead of one per card.
 */
export async function bulkConditions(places, { signal } = {}) {
  const usable = (places || []).filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon)).slice(0, 25)
  if (usable.length === 0) return []

  const points = usable.map((p) => `${p.lat},${p.lon}`).join(';')
  const names = usable.map((p) => p.name || '').join(';')
  const regions = usable.map((p) => p.region || '').join(';')

  try {
    const data = await get(
      `/weather/bulk?points=${encode(points)}&names=${encode(names)}&regions=${encode(regions)}`,
      { signal },
    )
    return Array.isArray(data?.results) ? data.results : []
  } catch {
    return []
  }
}

/** Distance in kilometres, for "12 km away" labels. */
export function distanceKm(a, b) {
  if (!a || !b) return null
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10
}

/** A stable key for a place, used for React keys and duplicate checks. */
export const placeKey = (place) =>
  place ? `${Number(place.lat).toFixed(3)},${Number(place.lon).toFixed(3)}` : ''

/** Two places within ~1 km are the same place. */
export const isSamePlace = (a, b) =>
  Boolean(a && b) && Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01
