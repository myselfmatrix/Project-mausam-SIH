/*
  Weather vocabulary.

  Conditions, AQI bands, wind directions and weekday names arrive as English
  strings from the weather API, not as catalog keys. Rather than key the data
  itself (which would break the moment a real IMD feed returns a condition we
  hadn't listed), each value is looked up optimistically by its slug and falls
  back to exactly what arrived.

  So "Partly Cloudy" renders translated, and a condition nobody has translated
  yet renders as "Partly Cloudy" — never as "condition.partlyCloudy".
*/

/** "Partly Cloudy" -> "partlyCloudy" */
export function camelSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
}

export const tCondition = (t, value) => (value ? t(`condition.${camelSlug(value)}`, null, value) : '')
export const tAqiCategory = (t, value) => (value ? t(`aqiCategory.${camelSlug(value)}`, null, value) : '')
export const tWindDirection = (t, value) => (value ? t(`wind.${camelSlug(value)}`, null, value) : '')
export const tDay = (t, value) => (value ? t(`day.${camelSlug(value)}`, null, value) : '')
export const tHeatLevel = (t, value) => (value ? t(`heat.${camelSlug(value)}`, null, value) : '')
export const tQuality = (t, value) => (value ? t(`value.${camelSlug(value)}`, null, value) : '')
export const tTide = (t, value) => (value ? t(`tide.${camelSlug(value)}`, null, value) : '')

/* Place names. Cities and regions in the seed data have catalog entries so
   they can be shown in the reader's own script; anything added at runtime
   renders as typed. */
export const tCity = (t, value) => (value ? t(`city.${value}`, null, value) : '')
export const tRegion = (t, value) => (value ? t(`region.${value}`, null, value) : '')
