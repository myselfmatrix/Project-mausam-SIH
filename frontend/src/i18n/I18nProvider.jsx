import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { get, put, getToken } from '../services/api'
import { I18nContext } from './context'
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  detectLanguage,
  getLanguage,
  normalizeLanguage,
} from './languages'
import { toNumerals } from './numerals'
import { createTranslator } from './translate'
import EN_NESTED from './en.json'

/*
  Translation runtime.

  The backend owns the catalogs; this owns the choosing, caching and applying.
  Three layers of fallback, so the UI is never left showing raw keys:

    active catalog  ->  bundled English  ->  the key itself

  English is bundled rather than fetched, which means the app renders correctly
  with the API down, on a cold cache, offline — every state where waiting on a
  network response would otherwise leave the page blank or keyed.
*/

const STORAGE_KEY = 'mausam_lang'
const CACHE_PREFIX = 'mausam_i18n_'

/** { a: { b: 'x' } } -> { 'a.b': 'x' } — the shape the API already returns. */
function flatten(node, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, out)
    else if (typeof value === 'string') out[full] = value
  }
  return out
}

const EN = flatten(EN_NESTED)

function readStoredLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return normalizeLanguage(saved)
  } catch {
    // storage blocked — fall through to the browser's own preference
  }
  return detectLanguage()
}

function readCachedCatalog(code) {
  if (code === DEFAULT_LANGUAGE) return EN
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + code)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeCachedCatalog(code, strings) {
  try {
    localStorage.setItem(CACHE_PREFIX + code, JSON.stringify(strings))
  } catch {
    // Quota or private mode: the catalog still works this session, it just
    // gets re-fetched next time.
  }
}

export default function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage)
  const [catalog, setCatalog] = useState(() => readCachedCatalog(readStoredLanguage()) || EN)
  const [languages, setLanguages] = useState(LANGUAGES)
  const [loading, setLoading] = useState(false)
  // Catalogs already fetched this session, so re-selecting a language is free.
  const fetchedRef = useRef({ [DEFAULT_LANGUAGE]: EN })

  // Real coverage numbers and any language the server has that this build
  // doesn't know about. Failure is fine — the bundled list already rendered.
  useEffect(() => {
    let cancelled = false
    get('/i18n/languages')
      .then((data) => {
        if (!cancelled && Array.isArray(data?.languages) && data.languages.length) {
          setLanguages(data.languages)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (language === DEFAULT_LANGUAGE) {
      setCatalog(EN)
      return undefined
    }

    const cached = fetchedRef.current[language] || readCachedCatalog(language)
    if (cached) setCatalog(cached)

    let cancelled = false
    setLoading(true)
    get(`/i18n/${language}`)
      .then((data) => {
        if (cancelled || !data?.strings) return
        // English underneath so a partly-translated catalog can never leave a
        // key unrendered, whatever the server sent.
        const merged = { ...EN, ...data.strings }
        fetchedRef.current[language] = merged
        writeCachedCatalog(language, merged)
        setCatalog(merged)
      })
      .catch(() => {
        // Keep whatever is on screen: the cached catalog if there was one,
        // otherwise English. Never blank the UI over a failed fetch.
        if (!cancelled && !cached) setCatalog(EN)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [language])

  // Assistive tech and the browser's own font/hyphenation choices both key off
  // these, so they have to track the selection.
  useEffect(() => {
    const meta = getLanguage(language)
    document.documentElement.lang = meta.code
    document.documentElement.dir = meta.dir
  }, [language])

  const setLanguage = useCallback((next) => {
    const code = normalizeLanguage(next)
    setLanguageState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // choice just won't survive a reload
    }
    // Follow the account to its other devices. Non-blocking by design: the UI
    // has already switched, and a signed-out visitor has nowhere to save it.
    if (getToken()) {
      put('/users/language', { language: code }).catch((err) => {
        console.error('Could not save language to your account:', err)
      })
    }
  }, [])

  /*
    `fallback` is for vocabulary that comes from data rather than from the
    catalog — a city someone typed in themselves, a condition string a future
    live API returns. Those get looked up optimistically and rendered as they
    arrived if nobody has translated them, which is far better than printing
    "city.Bhopal" on screen.
  */
  const numerals = getLanguage(language).numerals

  // Digits are converted last, after interpolation, so both the numbers baked
  // into a translated string and the ones passed in as variables are covered
  // without any caller having to remember to convert anything.
  const t = useCallback(
    (key, vars, fallback) => createTranslator(catalog, EN, numerals)(key, vars, fallback),
    [catalog, numerals],
  )

  /*
    Fetch any language's catalog, not just the one on screen.

    The spoken brief can be read out in a language the reader has not selected
    for the interface, and it has to actually say the words in that language -
    not read English text in a Tamil accent, which is what happens when only
    the speech voice changes. Shares the same in-memory and localStorage
    caches as the display catalog, so a language already seen costs nothing.
  */
  const loadCatalog = useCallback(async (code) => {
    if (!code || code === DEFAULT_LANGUAGE) return EN
    if (fetchedRef.current[code]) return fetchedRef.current[code]

    const cached = readCachedCatalog(code)
    if (cached) {
      fetchedRef.current[code] = cached
      return cached
    }
    try {
      const data = await get(`/i18n/${code}`)
      if (!data?.strings) return EN
      const merged = { ...EN, ...data.strings }
      fetchedRef.current[code] = merged
      writeCachedCatalog(code, merged)
      return merged
    } catch {
      return EN
    }
  }, [])

  /*
    For numbers rendered straight into JSX rather than through a catalog
    string — a temperature, a score, a badge count. Everything that goes
    through t() is already converted.
  */
  const n = useCallback((value) => toNumerals(String(value ?? ''), numerals), [numerals])

  const value = useMemo(
    () => ({
      t,
      n,
      language,
      setLanguage,
      languages,
      loading,
      dir: getLanguage(language).dir,
      numerals,
      loadCatalog,
    }),
    [t, n, language, setLanguage, languages, loading, numerals, loadCatalog],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
