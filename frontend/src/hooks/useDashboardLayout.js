import { useEffect, useState } from 'react'
import { getPriorityMetrics } from '../utils/personalization'

// Widget show/hide/pin/reorder state for the Overview tab, keyed per persona
// and persisted to localStorage. No backend endpoint exists for layout yet —
// swap the persist()/load() bodies for a real /api/users/layout call later.
export default function useDashboardLayout(personaId) {
  const storageKey = `mausam_layout_${personaId}`
  const defaultOrder = getPriorityMetrics(personaId).map((m) => m.key)

  const [order, setOrder] = useState(defaultOrder)
  const [hidden, setHidden] = useState([])
  const [pinned, setPinned] = useState([])

  useEffect(() => {
    const freshDefault = getPriorityMetrics(personaId).map((m) => m.key)
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      setOrder(saved?.order?.length ? saved.order : freshDefault)
      setHidden(saved?.hidden || [])
      setPinned(saved?.pinned || [])
    } catch {
      setOrder(freshDefault)
      setHidden([])
      setPinned([])
    }
    // Re-derive whenever the active persona changes — each persona has its
    // own storage key, so this intentionally does not depend on order/hidden/pinned.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaId])

  const persist = (next) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // localStorage unavailable — layout just won't survive reload, that's fine
    }
  }

  // Reorders within the same pin group only (pinned items only swap with
  // other pinned items, unpinned with unpinned) — pinned cards always
  // render first, so crossing the boundary is done via the pin toggle,
  // not the move arrows.
  const moveWidget = (key, direction) => {
    setOrder((prev) => {
      const isPinned = pinned.includes(key)
      const group = prev.filter((k) => !hidden.includes(k) && pinned.includes(k) === isPinned)
      const groupIdx = group.indexOf(key)
      const targetKey = group[groupIdx + direction]
      if (!targetKey) return prev
      const next = [...prev]
      const i1 = next.indexOf(key)
      const i2 = next.indexOf(targetKey)
      ;[next[i1], next[i2]] = [next[i2], next[i1]]
      persist({ order: next, hidden, pinned })
      return next
    })
  }

  const toggleHidden = (key) => {
    setHidden((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      persist({ order, hidden: next, pinned })
      return next
    })
  }

  const togglePinned = (key) => {
    setPinned((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      persist({ order, hidden, pinned: next })
      return next
    })
  }

  const resetLayout = () => {
    const freshDefault = getPriorityMetrics(personaId).map((m) => m.key)
    setOrder(freshDefault)
    setHidden([])
    setPinned([])
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // no-op
    }
  }

  const visible = order.filter((k) => !hidden.includes(k))
  const sortedKeys = [...visible.filter((k) => pinned.includes(k)), ...visible.filter((k) => !pinned.includes(k))]

  return { order, hidden, pinned, sortedKeys, moveWidget, toggleHidden, togglePinned, resetLayout }
}
