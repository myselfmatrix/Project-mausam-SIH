import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { warmTextures } from '../three/textureUrls'
import { useTranslation } from '../../i18n/useTranslation'
import './IntroSequence.css'

/*
  Opening sequence.

  The screen opens just off Earth's limb with the planet turning fast, pulls
  back until it settles into the hero's exact camera framing, then flies the
  whole canvas into the hero's globe slot and cross-fades. The homepage isn't
  touched: its globe simply stays hidden until ours has landed on top of it.

  Skippable on any input — a demo audience should never feel held hostage by
  an animation.
*/

// three.js is a ~600KB chunk, so the globe loads as its own. The wordmark and
// the veil paint immediately; the planet fades in the moment the chunk lands.
const IntroGlobe = lazy(() => import('./IntroGlobe'))

const WORD = 'MAUSAM'

const DWELL = 560 // beat held once the camera has settled
const HARD_CAP = 7500 // absolute ceiling, whatever the network is doing
const NO_GLOBE_HOLD = 2400 // CSS-only fallback has nothing to wait for
const EXIT_FLIGHT = 900 // canvas travelling into the hero's box
const EXIT_FADE = 380 // cross-fade once it has landed

// Cycles under the progress line. Each names something the product actually
// does, so the wait reads as the system waking up.
const STATUS_KEYS = ['intro.statusSky', 'intro.statusPersonas', 'intro.statusPrioritise']

// Local copy rather than an import from globeParts, which would drag three.js
// into the main bundle and undo the lazy chunk above.
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    )
  } catch {
    return false
  }
}

/*
  Where the hero parks its globe, in terms this overlay can animate to.

  Both canvases use the same camera, so a sphere of radius 1 covers the same
  fraction of either canvas's height. Matching heights therefore matches the
  planets: scale is simply target height over viewport height.
*/
function measureHandoff() {
  const host = document.querySelector('.hero-scene')
  if (!host) return null
  // The child carries the mobile crop transform; getBoundingClientRect on it
  // reports the box as actually drawn.
  const rect = (host.firstElementChild || host).getBoundingClientRect()
  if (rect.height < 80) return null

  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  // Off-screen targets only: flying the opening shot past the viewport edge
  // would look like a dropped frame rather than a hand-off.
  if (cy < window.innerHeight * 0.04 || cy > window.innerHeight * 0.96) return null

  // The hero dims its globe on phones, where it sits behind the copy. Landing
  // at full brightness and then snapping down at the cross-fade would undo
  // the whole point of matching, so the flight fades to the same value.
  const opacity = Number(getComputedStyle(host).opacity)

  return {
    dx: cx - window.innerWidth / 2,
    dy: cy - window.innerHeight / 2,
    scale: rect.height / window.innerHeight,
    opacity: Number.isFinite(opacity) ? opacity : 1,
  }
}

export default function IntroSequence({ onDone }) {
  const [phase, setPhase] = useState('play') // play -> exit -> reveal
  const [statusIndex, setStatusIndex] = useState(0)
  const [armed, setArmed] = useState(false)
  // State rather than a classList.add: the exit re-render rewrites className
  // wholesale, and would drop an imperatively-added class.
  const [handoff, setHandoff] = useState(false)
  const [webgl] = useState(supportsWebGL)
  const { t } = useTranslation()
  const rootRef = useRef(null)
  const doneRef = useRef(false)
  const timersRef = useRef([])

  const after = useCallback((ms, fn) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }, [])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true

    const root = document.documentElement
    const target = webgl ? measureHandoff() : null
    if (target && rootRef.current) {
      rootRef.current.style.setProperty('--fx', `${target.dx}px`)
      rootRef.current.style.setProperty('--fy', `${target.dy}px`)
      rootRef.current.style.setProperty('--fs', String(target.scale))
      rootRef.current.style.setProperty('--fo', String(target.opacity))
    }

    // Batched into one render, so the transform and the class that enables it
    // land on the same frame.
    setHandoff(Boolean(target))
    setPhase('exit')

    // The hero's globe is uncovered only once ours has arrived on top of it,
    // so what looks like a hand-off is a cross-fade between two identical
    // pictures.
    after(EXIT_FLIGHT, () => {
      root.classList.remove('intro-on')
      root.classList.add('intro-reveal')
      setPhase('reveal')
    })
    after(EXIT_FLIGHT + EXIT_FADE, onDone)
    // Deliberately untracked: this one has to outlive the unmount, and all it
    // does is drop a class that only carries a transition.
    window.setTimeout(
      () => document.documentElement.classList.remove('intro-reveal'),
      EXIT_FLIGHT + EXIT_FADE + 800,
    )
  }, [after, onDone, webgl])

  // Hide the hero's globe for as long as the intro owns the screen.
  useEffect(() => {
    // Decode the maps while the 3D chunk is still on the wire, so the planet
    // is ready the moment the canvas can use it.
    warmTextures()
    const root = document.documentElement
    root.classList.add('intro-on')
    const timers = timersRef.current
    return () => {
      root.classList.remove('intro-on')
      timers.forEach(window.clearTimeout)
    }
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setArmed(true)
      after(420, finish)
      return undefined
    }

    // Nothing will report a settled camera if there's no camera.
    if (!webgl) {
      setArmed(true)
      after(NO_GLOBE_HOLD, finish)
    }
    // Backstop for a failed chunk, a dead GPU, or a texture set that never
    // arrives.
    after(HARD_CAP, finish)

    const cycle = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_KEYS.length)
    }, 640)

    window.addEventListener('pointerdown', finish)
    window.addEventListener('keydown', finish)
    return () => {
      window.clearInterval(cycle)
      window.removeEventListener('pointerdown', finish)
      window.removeEventListener('keydown', finish)
    }
  }, [after, finish, webgl])

  const handleSettled = useCallback(() => after(DWELL, finish), [after, finish])
  // Textures that land mid-exit must not fade the canvas back in behind the
  // hand-off.
  const handleReady = useCallback(() => {
    if (!doneRef.current) setArmed(true)
  }, [])

  return (
    <div
      ref={rootRef}
      className={[
        'intro',
        phase !== 'play' ? 'is-exiting' : '',
        phase === 'reveal' ? 'is-revealed' : '',
        armed ? 'is-armed' : '',
        handoff ? 'has-handoff' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="presentation"
    >
      <div className="intro-sky" />

      {webgl ? (
        <Suspense fallback={null}>
          <IntroGlobe onReady={handleReady} onSettled={handleSettled} />
        </Suspense>
      ) : (
        <div className="intro-canvas">
          <div className="atmos-fallback" aria-hidden="true" />
        </div>
      )}

      <div className="intro-vignette" />

      <div className="intro-copy">
        <h1 className="intro-word" aria-label="Mausam">
          {WORD.split('').map((letter, i) => (
            <span className="intro-letter-mask" key={`${letter}-${i}`}>
              <span className="intro-letter" style={{ animationDelay: `${0.34 + i * 0.07}s` }}>
                {letter}
              </span>
            </span>
          ))}
        </h1>
        <span className="intro-rule" />
        <p className="intro-tagline">{t('intro.tagline')}</p>
      </div>

      <div className="intro-foot">
        <div className="intro-progress">
          <span className="intro-progress-fill" />
        </div>
        <p className="intro-status" key={statusIndex}>
          {t(STATUS_KEYS[statusIndex])}
          <span className="intro-status-dots" aria-hidden="true" />
        </p>
        <span className="intro-skip">{t('intro.skip')}</span>
      </div>
    </div>
  )
}
