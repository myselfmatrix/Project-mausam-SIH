import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '../brand/Logo'
import './IntroSequence.css'

const WORD = 'MAUSAM'
const DURATION = 3000

// Cycles under the progress bar. Each line names something the product
// actually does, so the wait reads as the system waking up.
const STATUS_LINES = [
  'Reading the sky',
  'Mapping eight personas',
  'Prioritising your day',
]

/**
 * Opening sequence: the mark draws itself, the wordmark rises behind a mask,
 * radar pings sweep outward, then the screen splits like a shutter to reveal
 * the app. Skippable on any input — a demo audience should never feel held
 * hostage by an animation.
 */
export default function IntroSequence({ onDone }) {
  const [phase, setPhase] = useState('play')
  const [statusIndex, setStatusIndex] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      setPhase('exit')
      // Let the curtains finish travelling before unmounting.
      window.setTimeout(onDone, 780)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(finish, reduced ? 400 : DURATION)

    const cycle = reduced
      ? null
      : window.setInterval(() => {
          setStatusIndex((i) => (i + 1) % STATUS_LINES.length)
        }, 620)

    window.addEventListener('pointerdown', finish)
    window.addEventListener('keydown', finish)
    return () => {
      window.clearTimeout(timer)
      if (cycle) window.clearInterval(cycle)
      window.removeEventListener('pointerdown', finish)
      window.removeEventListener('keydown', finish)
    }
  }, [onDone])

  const exiting = phase === 'exit'

  return (
    <div className={`intro ${exiting ? 'is-exiting' : ''}`} role="presentation">
      {/* Shutter halves. They carry the background, so when they part the app
          underneath is revealed rather than cross-faded. */}
      <div className="intro-panel intro-panel-top">
        <div className="intro-veil" />
        <div className="intro-grid" />
      </div>
      <div className="intro-panel intro-panel-bottom">
        <div className="intro-veil" />
        <div className="intro-grid" />
      </div>

      <span className="intro-seam" />

      <div className="intro-stage">
        <div className="intro-mark">
          {/* Radar pings — the meteorological gesture, and it gives the mark
              somewhere to arrive from. */}
          <span className="intro-ping" style={{ animationDelay: '0.55s' }} />
          <span className="intro-ping" style={{ animationDelay: '1.25s' }} />
          <span className="intro-ping" style={{ animationDelay: '1.95s' }} />
          <span className="intro-mark-halo" />
          <LogoMark size={104} animated />
        </div>

        <h1 className="intro-word" aria-label="Mausam">
          {WORD.split('').map((letter, i) => (
            <span className="intro-letter-mask" key={`${letter}-${i}`}>
              <span className="intro-letter" style={{ animationDelay: `${0.82 + i * 0.06}s` }}>
                {letter}
              </span>
            </span>
          ))}
        </h1>

        <p className="intro-tagline">Weather that understands you</p>

        <div className="intro-progress">
          <span className="intro-progress-fill" />
        </div>

        <p className="intro-status" key={statusIndex}>
          {STATUS_LINES[statusIndex]}
          <span className="intro-status-dots" aria-hidden="true" />
        </p>
      </div>

      <span className="intro-skip">Tap anywhere to skip</span>
    </div>
  )
}
