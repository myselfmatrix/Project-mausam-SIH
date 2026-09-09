import { useEffect, useRef } from 'react'

/**
 * Pointer-reactive card: writes --rx/--ry (tilt degrees) and --mx/--my (cursor
 * position, %) onto the element and lets CSS decide what to do with them.
 *
 * Keeping the transform in CSS means a card can opt into tilt, spotlight, both
 * or neither without changing the JS — and it stays a single rAF-batched write
 * per frame instead of React state churn.
 *
 * Disabled for touch pointers (no hover to track) and for reduced-motion users.
 */
export default function useTilt({ max = 7, enabled = true } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const noHover = window.matchMedia('(hover: none)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (noHover || reduced) return

    let frame = 0
    let pending = null

    const apply = () => {
      frame = 0
      if (!pending) return
      const { px, py } = pending
      el.style.setProperty('--mx', `${px * 100}%`)
      el.style.setProperty('--my', `${py * 100}%`)
      el.style.setProperty('--ry', `${(px - 0.5) * 2 * max}deg`)
      el.style.setProperty('--rx', `${(0.5 - py) * 2 * max}deg`)
    }

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      pending = {
        px: (e.clientX - rect.left) / rect.width,
        py: (e.clientY - rect.top) / rect.height,
      }
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onEnter = () => el.classList.add('is-tilting')

    const onLeave = () => {
      el.classList.remove('is-tilting')
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
      el.style.setProperty('--mx', '50%')
      el.style.setProperty('--my', '50%')
    }

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [max, enabled])

  return ref
}
