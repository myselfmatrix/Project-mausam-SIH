import { useId } from 'react'
import './Logo.css'

/**
 * The MAUSAM mark: a planet crossed by an orbital ring — atmosphere observed
 * from outside it. Rendered as inline SVG (not an <img>) so the intro sequence
 * can animate the individual paths and so it inherits currentColor on hover.
 *
 * `animated` exposes the stroke-draw classes in Logo.css, for contexts that
 * want the mark to draw itself in rather than simply appear.
 */
export function LogoMark({ size = 32, animated = false, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const planetId = `planet-${uid}`
  const ringId = `ring-${uid}`

  return (
    <svg
      className={`logo-mark ${animated ? 'is-animated' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Mausam"
    >
      <defs>
        {/* stop-color lives in Logo.css — var() inside a presentation
            attribute is unreliable across engines, a class is not. */}
        <linearGradient id={planetId} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" className="lg-stop-cyan" />
          <stop offset="55%" className="lg-stop-blue" />
          <stop offset="100%" className="lg-stop-violet" />
        </linearGradient>
        <linearGradient id={ringId} x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" className="lg-stop-violet" />
          <stop offset="50%" className="lg-stop-cyan" />
          <stop offset="100%" className="lg-stop-blue" />
        </linearGradient>
      </defs>

      {/* back half of the orbit */}
      <g transform="rotate(-24 24 24)">
        <path
          className="logo-ring-back"
          d="M43.5 24a19.5 7.4 0 0 0-39 0"
          stroke={`url(#${ringId})`}
          strokeOpacity="0.45"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </g>

      <circle className="logo-planet" cx="24" cy="24" r="10.6" fill={`url(#${planetId})`} />
      {/* terminator — the shadowed limb, keeps the disc from reading as a flat dot */}
      <path
        className="logo-terminator"
        d="M24 13.4a10.6 10.6 0 0 1 0 21.2 13.7 13.7 0 0 0 0-21.2z"
        fillOpacity="0.26"
      />

      {/* front half of the orbit, crossing over the planet */}
      <g transform="rotate(-24 24 24)">
        <path
          className="logo-ring-front"
          d="M4.5 24a19.5 7.4 0 0 0 39 0"
          stroke={`url(#${ringId})`}
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </g>

      <circle className="logo-satellite" cx="41.4" cy="16.4" r="2.5" />
    </svg>
  )
}

export default function Logo({ size = 30, wordmark = true, className = '', onClick, as = 'div' }) {
  const Tag = onClick ? 'button' : as
  return (
    <Tag
      className={`logo ${className}`}
      onClick={onClick}
      {...(onClick ? { type: 'button' } : {})}
    >
      <LogoMark size={size} />
      {wordmark && <span className="logo-word">MAUSAM</span>}
    </Tag>
  )
}
