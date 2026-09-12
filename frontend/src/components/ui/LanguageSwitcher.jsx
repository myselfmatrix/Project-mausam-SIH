import { useEffect, useRef, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
import { getLanguage } from '../../i18n/languages'
import './LanguageSwitcher.css'

/**
 * Regional-language selector.
 *
 * Every option is written in its own script: someone who reads only Kannada
 * can't be expected to find their language in a list that says "Kannada". The
 * trigger shows the active language the same way, with the code as a compact
 * stand-in once there isn't room for the full name.
 */
export default function LanguageSwitcher({ className = '', align = 'right' }) {
  const { language, setLanguage, languages } = useTranslation()
  const [open, setOpen] = useState(false)
  const [drop, setDrop] = useState('down')
  const rootRef = useRef(null)
  const active = getLanguage(language)

  /*
    Pick a direction and a height from the space actually available.

    The switcher sits in the top bar on most screens (room below) and a few
    pixels off the bottom of the mobile drawer (room only above). Eight rows
    don't always fit either way on a short phone, so the menu is also capped
    to what's there and scrolls inside — a list clipped by the viewport edge
    silently hides languages, which is the one failure this control can't
    afford.
  */
  useEffect(() => {
    if (!open || !rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const gap = 16
    const below = window.innerHeight - rect.bottom - gap
    const above = rect.top - gap
    const up = below < 280 && above > below
    setDrop(up ? 'up' : 'down')
    rootRef.current.style.setProperty('--lang-menu-max', `${Math.max(up ? above : below, 160)}px`)
  }, [open])

  // Close on an outside click or Escape — a dropdown that can only be
  // dismissed by choosing something is a trap.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (code) => {
    setLanguage(code)
    setOpen(false)
  }

  return (
    <div className={`lang ${className}`} ref={rootRef}>
      <button
        type="button"
        className={`lang-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${active.englishName} — change language`}
        title={active.englishName}
      >
        <Globe size={15} strokeWidth={2.1} />
        <span className="lang-trigger-label">{active.label}</span>
        <span className="lang-trigger-code">{active.code.toUpperCase()}</span>
      </button>

      {open && (
        <ul
          className={`lang-menu lang-menu-${align} lang-menu-${drop}`}
          role="listbox"
          aria-label="Language"
        >
          {languages.map((l) => {
            const selected = l.code === language
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`lang-option ${selected ? 'is-selected' : ''}`}
                  onClick={() => choose(l.code)}
                  lang={l.code}
                >
                  <span className="lang-option-native">{l.label}</span>
                  <span className="lang-option-english">{l.englishName}</span>
                  {selected && <Check size={14} strokeWidth={2.6} className="lang-option-check" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
