import { useEffect, useRef, useState } from 'react'

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Counts from 0 to `end` once the element scrolls into view.
 *
 * Returns [ref, value]. Attach the ref to whatever should trigger it — the
 * count doesn't start until it's actually on screen, and never replays.
 */
export default function useCountUp(end, { duration = 1600, decimals = 0 } = {}) {
  const ref = useRef(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(end)
      return
    }

    let frame = 0
    let start = 0

    const step = (now) => {
      if (!start) start = now
      const progress = Math.min((now - start) / duration, 1)
      const raw = easeOutExpo(progress) * end
      const factor = 10 ** decimals
      setValue(Math.round(raw * factor) / factor)
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        frame = requestAnimationFrame(step)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [end, duration, decimals])

  return [ref, value]
}
