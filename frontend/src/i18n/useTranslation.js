import { useContext } from 'react'
import { I18nContext } from './context'

/**
 * Translation access for any component.
 *
 * Returns `t(key, vars)` plus the current language, the switcher's list, and
 * `setLanguage`. `t` is guaranteed to return a string — a key missing from the
 * active catalog falls back to English, and one missing from English falls
 * back to the key itself, so a typo shows up as a visible key rather than as
 * `undefined` rendered into the page.
 */
export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useTranslation must be used inside <I18nProvider>')
  }
  return ctx
}

export default useTranslation
