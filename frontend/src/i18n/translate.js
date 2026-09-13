import { toNumerals } from './numerals'

/*
  Translation mechanics, separated from the provider that owns the *current*
  language.

  The spoken brief needs this: it can be read out in a language other than the
  one on screen, so it has to translate against a catalog the provider is not
  currently holding. Sharing the code means the spoken and written versions
  interpolate and localise digits by exactly the same rules.
*/

/** Fills {placeholders} from `vars`; leaves unknown ones visible on purpose. */
export function interpolate(template, vars) {
  if (!vars) return template
  return String(template).replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  )
}

/**
 * A `t(key, vars, fallback)` bound to one catalog.
 *
 * @param catalog  flat key -> string map for the target language.
 * @param english  bundled English, used when the catalog lacks a key.
 * @param numerals digit set for the target language, applied after
 *                 interpolation so both baked-in and passed-in numbers are
 *                 converted without any caller having to remember to.
 */
export function createTranslator(catalog, english, numerals) {
  return (key, vars, fallback) => {
    const template = catalog?.[key] ?? english?.[key] ?? fallback ?? key
    return toNumerals(interpolate(template, vars), numerals)
  }
}
