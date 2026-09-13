import { useCallback, useEffect, useRef, useState } from 'react'

/*
  Browser geolocation, with every outcome named.

  The Geolocation API has more failure modes than it looks, and they need
  different words in the UI: a user who denied permission has to be told how
  to undo that, a user whose GPS timed out just needs to try again, and a user
  on an insecure origin cannot use it at all no matter what they tap. Lumping
  those into one "location unavailable" is what makes location features feel
  broken, so each is a distinct status here.

  Statuses:
    idle        nothing asked for yet
    unsupported no Geolocation API, or the page is not on a secure origin
    locating    request in flight, the browser may be showing its prompt
    granted     coordinates in hand
    denied      the user said no, or has previously said no
    unavailable the device could not get a fix (no GPS, no wifi positioning)
    timeout     the fix took longer than we were willing to wait
*/

/*
  Geolocation is gated on a secure context, and on http:// the call fails in a
  way that looks like a denial. Checking first lets the UI say "needs HTTPS"
  instead of blaming the user for a permission they never refused.
  localhost counts as secure, so development is unaffected.
*/
const isSupported = () =>
  typeof navigator !== 'undefined' &&
  'geolocation' in navigator &&
  (typeof window === 'undefined' || window.isSecureContext !== false)

const OPTIONS = {
  enableHighAccuracy: true,
  // Long enough for a cold GPS fix indoors, short enough that the button does
  // not appear stuck. The local city list is the fallback beyond this.
  timeout: 12000,
  // A fix from the last two minutes is fine: nobody changes weather region in
  // that time, and reusing it makes the button feel instant on a second tap.
  maximumAge: 120000,
}

export function useGeolocation() {
  const [state, setState] = useState({
    status: 'idle',
    coords: null,
    accuracy: null,
    error: null,
  })
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
    }
  }, [])

  /*
    Permissions API, where available, tells us the answer before we ask.

    This matters for a detail that is otherwise invisible: if permission is
    already denied, calling getCurrentPosition() shows no prompt and simply
    fails, so a user tapping the button would see nothing happen. Knowing in
    advance lets the button explain itself instead.
  */
  useEffect(() => {
    if (!isSupported()) {
      setState((s) => ({ ...s, status: 'unsupported' }))
      return undefined
    }
    if (!navigator.permissions?.query) return undefined

    let permission
    const onChange = () => {
      if (!mounted.current || !permission) return
      if (permission.state === 'denied') setState((s) => ({ ...s, status: 'denied' }))
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!mounted.current) return
        permission = result
        if (result.state === 'denied') setState((s) => ({ ...s, status: 'denied' }))
        result.addEventListener('change', onChange)
      })
      // Not every browser supports querying this permission; not knowing is
      // fine, the request itself still works.
      .catch(() => {})

    return () => permission?.removeEventListener('change', onChange)
  }, [])

  const request = useCallback(
    () =>
      new Promise((resolve) => {
        if (!isSupported()) {
          setState({ status: 'unsupported', coords: null, accuracy: null, error: 'unsupported' })
          resolve(null)
          return
        }

        setState((s) => ({ ...s, status: 'locating', error: null }))

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = {
              lat: Math.round(position.coords.latitude * 1e4) / 1e4,
              lon: Math.round(position.coords.longitude * 1e4) / 1e4,
            }
            if (mounted.current) {
              setState({
                status: 'granted',
                coords,
                accuracy: Math.round(position.coords.accuracy),
                error: null,
              })
            }
            resolve(coords)
          },
          (error) => {
            const status =
              error.code === error.PERMISSION_DENIED
                ? 'denied'
                : error.code === error.TIMEOUT
                  ? 'timeout'
                  : 'unavailable'
            if (mounted.current) {
              setState({ status, coords: null, accuracy: null, error: error.message || status })
            }
            resolve(null)
          },
          OPTIONS,
        )
      }),
    [],
  )

  const reset = useCallback(
    () => setState({ status: 'idle', coords: null, accuracy: null, error: null }),
    [],
  )

  return {
    ...state,
    request,
    reset,
    isSupported: state.status !== 'unsupported',
    isLocating: state.status === 'locating',
  }
}
