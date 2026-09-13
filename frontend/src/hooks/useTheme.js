import { useEffect, useState } from 'react'

const STORAGE_KEY = 'mausam_theme'

// Module-level fan-out so every toggle in the tree stays in sync without
// threading a context provider through the whole app.
const listeners = new Set()

function currentTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

let switchTimer = null

export function setTheme(next) {
  const root = document.documentElement

  /*
    Mark the switch so the colour transition in ui.css applies for its
    duration and no longer. A transition left on permanently would smear
    every ordinary hover and state change in the app; one that is never
    there makes the theme swap land as a hard cut.
  */
  root.classList.add('theme-switching')
  if (switchTimer) clearTimeout(switchTimer)
  switchTimer = setTimeout(() => root.classList.remove('theme-switching'), 300)

  root.setAttribute('data-theme', next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // storage blocked (private mode) — the theme still applies for this session
  }
  listeners.forEach((fn) => fn(next))
}

export default function useTheme() {
  const [theme, setLocal] = useState(currentTheme)

  useEffect(() => {
    listeners.add(setLocal)
    return () => listeners.delete(setLocal)
  }, [])

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme: () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'),
  }
}
