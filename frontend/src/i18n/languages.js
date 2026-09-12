/*
  Mirror of backend/i18n/languages.js.

  The switcher has to render its full list on first paint — before the API has
  answered, and even if the API never does — so the list can't come from the
  network. The backend remains the authority: once GET /i18n/languages
  responds, its list (with real coverage numbers) replaces this one.
*/
export const LANGUAGES = [
  { code: 'en', label: 'English', englishName: 'English', dir: 'ltr', numerals: 'latn' },
  { code: 'hi', label: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', numerals: 'deva' },
  { code: 'bn', label: 'বাংলা', englishName: 'Bengali', dir: 'ltr', numerals: 'beng' },
  { code: 'mr', label: 'मराठी', englishName: 'Marathi', dir: 'ltr', numerals: 'deva' },
  { code: 'ta', label: 'தமிழ்', englishName: 'Tamil', dir: 'ltr', numerals: 'tamldec' },
  { code: 'te', label: 'తెలుగు', englishName: 'Telugu', dir: 'ltr', numerals: 'telu' },
  { code: 'gu', label: 'ગુજરાતી', englishName: 'Gujarati', dir: 'ltr', numerals: 'gujr' },
  { code: 'kn', label: 'ಕನ್ನಡ', englishName: 'Kannada', dir: 'ltr', numerals: 'knda' },
]

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

export function normalizeLanguage(input) {
  if (typeof input !== 'string') return DEFAULT_LANGUAGE
  const code = input.trim().toLowerCase().split(/[-_]/)[0]
  return LANGUAGE_CODES.includes(code) ? code : DEFAULT_LANGUAGE
}

export function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
}

/** The browser's preference, if we happen to speak it. */
export function detectLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE
  for (const tag of navigator.languages || [navigator.language]) {
    const code = normalizeLanguage(tag)
    // normalizeLanguage falls back to English, so only take it as a real match
    // when the tag actually starts with a code we support.
    if (typeof tag === 'string' && tag.toLowerCase().startsWith(code) && code !== DEFAULT_LANGUAGE) {
      return code
    }
  }
  return DEFAULT_LANGUAGE
}
