import { useId } from 'react'
import './Logo.css'

/**
 * The MAUSAM mark: Earth, with its atmosphere drawn as a thin ring around it.
 *
 * It used to be a generic ringed planet, which read as Saturn and had nothing
 * to do with the globe on the homepage. This is the same subject as that
 * globe, reduced to what survives at favicon size: an ocean, a few
 * recognisable landmasses, a lit limb and a shadowed one.
 *
 * Rendered as inline SVG (not an <img>) so the intro sequence can animate the
 * individual paths and so it inherits currentColor on hover. The class names
 * are unchanged from the previous mark - `logo-ring-back` and
 * `logo-ring-front` are now the two halves of the atmosphere rather than an
 * orbit - so the draw-in animation in Logo.css keeps working.
 */
export function LogoMark({ size = 32, animated = false, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const oceanId = `ocean-${uid}`
  const ringId = `ring-${uid}`
  const clipId = `clip-${uid}`

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
        <linearGradient id={oceanId} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" className="lg-stop-cyan" />
          <stop offset="55%" className="lg-stop-blue" />
          <stop offset="100%" className="lg-stop-deep" />
        </linearGradient>
        <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" className="lg-stop-cyan" />
          <stop offset="100%" className="lg-stop-blue" />
        </linearGradient>
        {/* Keeps the continents on the sphere rather than floating past its
            edge, which is what makes the disc read as round. */}
        <clipPath id={clipId}>
          <circle cx="24" cy="24" r="13" />
        </clipPath>
      </defs>

      {/* back half of the atmosphere */}
      <g>
        <path
          className="logo-ring-back"
          d="M24 8.4a15.6 15.6 0 0 0 0 31.2"
          stroke={`url(#${ringId})`}
          strokeOpacity="0.4"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </g>

      <circle className="logo-planet" cx="24" cy="24" r="13" fill={`url(#${oceanId})`} />

      {/* Landmasses — abstract, but placed so the silhouette reads as Earth
          rather than as spots: a broad northern mass, a narrower southern one
          trailing from it, and a wedge to the east. */}
      <g className="logo-land" clipPath={`url(#${clipId})`}>
        <path d="M13.2 18.4c2.1-1.9 4.6-2.4 6.6-1.4 1.7.9 1.9 2.6.8 3.6-1 .9-2.7.8-3.6 1.7-1 1-.6 2.4-2 2.8-1.6.4-3-1.1-3.1-2.9-.1-1.5.6-2.8 1.3-3.8z" />
        <path d="M21.6 25.6c1.5-.6 3 .2 3.4 1.7.5 1.8-.6 3.3-1 5-.4 1.8-.2 3.9-1.6 4.7-1.3.7-2.7-.4-3.1-2-.5-2 .3-4 .8-5.9.3-1.3.4-2.9 1.5-3.5z" />
        <path d="M29.4 14.6c2.4-.9 5.2-.3 6.6 1.4 1.2 1.4.8 3.3-.6 4-1.5.8-3.3.2-4.9.7-1.4.5-2.6 1.9-4 1.4-1.3-.5-1.6-2.2-.9-3.4.8-1.5 2.3-3.5 3.8-4.1z" />
        <path d="M30.4 26.8c1.6-.5 3.3.6 3.5 2.2.2 1.6-1.1 2.8-2.5 3.2-1.3.4-2.9.1-3.5-1.1-.7-1.4.6-3.7 2.5-4.3z" />
      </g>

      {/* terminator — the shadowed limb, keeps the disc from reading flat */}
      <path
        className="logo-terminator"
        d="M24 11a13 13 0 0 1 0 26 16.8 16.8 0 0 0 0-26z"
        fillOpacity="0.3"
      />

      {/* front half of the atmosphere, crossing the lit limb */}
      <g>
        <path
          className="logo-ring-front"
          d="M24 8.4a15.6 15.6 0 0 1 0 31.2"
          stroke={`url(#${ringId})`}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </g>

      <circle className="logo-satellite" cx="24" cy="6.6" r="2.1" />
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
