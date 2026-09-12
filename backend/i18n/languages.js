/*
  Languages MAUSAM ships translations for.

  `code` is the BCP-47 tag used everywhere: the catalog filename, the API path,
  the <html lang> attribute and the value stored on the user account. `label`
  is the language's own name in its own script — a switcher that lists
  "Bengali" in English is useless to someone who only reads Bengali.
*/
const LANGUAGES = [
  { code: 'en', label: 'English', englishName: 'English', dir: 'ltr', numerals: 'latn' },
  { code: 'hi', label: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', numerals: 'deva' },
  { code: 'bn', label: 'বাংলা', englishName: 'Bengali', dir: 'ltr', numerals: 'beng' },
  { code: 'mr', label: 'मराठी', englishName: 'Marathi', dir: 'ltr', numerals: 'deva' },
  { code: 'ta', label: 'தமிழ்', englishName: 'Tamil', dir: 'ltr', numerals: 'tamldec' },
  { code: 'te', label: 'తెలుగు', englishName: 'Telugu', dir: 'ltr', numerals: 'telu' },
  { code: 'gu', label: 'ગુજરાતી', englishName: 'Gujarati', dir: 'ltr', numerals: 'gujr' },
  { code: 'kn', label: 'ಕನ್ನಡ', englishName: 'Kannada', dir: 'ltr', numerals: 'knda' },
]

const DEFAULT_LANGUAGE = 'en'

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

/** Resolves any input to a supported code, never throwing. */
function normalizeLanguage(input) {
  if (typeof input !== 'string') return DEFAULT_LANGUAGE
  const code = input.trim().toLowerCase().split(/[-_]/)[0]
  return LANGUAGE_CODES.includes(code) ? code : DEFAULT_LANGUAGE
}

function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
}

module.exports = { LANGUAGES, LANGUAGE_CODES, DEFAULT_LANGUAGE, normalizeLanguage, getLanguage }
