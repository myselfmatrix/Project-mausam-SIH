const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'mausam_token'

/* ------------------------------------------------------------------ */
/* Session token                                                       */
/* ------------------------------------------------------------------ */

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // storage blocked — the session just won't survive a reload
  }
}

export const clearSession = () => {
  try {
    for (const key of [TOKEN_KEY, 'userId', 'userName', 'userEmail']) {
      localStorage.removeItem(key)
    }
  } catch {
    // nothing we can do; the in-memory state is cleared by the caller
  }
}

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export const apiCall = async (endpoint, options = {}) => {
  const token = getToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (err) {
    /*
      An abort is the caller changing its mind, not a failure.

      The location search fires on every keystroke and cancels the previous
      request; if those cancellations came back as "cannot reach the server",
      typing a city name would paint an error under the search box for every
      letter. Rethrowing the AbortError unchanged lets callers ignore it.
    */
    if (err?.name === 'AbortError') throw err

    // fetch only rejects for network-level failures, so anything else here is
    // genuinely "the server isn't reachable" rather than an error status.
    throw new ApiError(
      'Cannot reach the server. Make sure the backend is running on ' + API_BASE_URL + '.',
      0,
    )
  }

  // Read as text first: error responses aren't guaranteed to be JSON, and a
  // 204 has no body at all.
  const raw = await response.text()
  let body = null
  if (raw) {
    try {
      body = JSON.parse(raw)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    // The API answers with { error }. Surfacing that instead of statusText is
    // the difference between "Email or password is incorrect." and the
    // useless "API Error: Unauthorized".
    const message =
      body?.error ||
      body?.message ||
      (raw && raw.length < 200 ? raw : '') ||
      `Request failed (${response.status})`
    throw new ApiError(message, response.status, body)
  }

  return body
}

export const get = (endpoint, options) => apiCall(endpoint, options)
export const post = (endpoint, data) =>
  apiCall(endpoint, { method: 'POST', body: JSON.stringify(data) })
export const put = (endpoint, data) =>
  apiCall(endpoint, { method: 'PUT', body: JSON.stringify(data) })
export const del = (endpoint) => apiCall(endpoint, { method: 'DELETE' })
