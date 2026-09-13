/*
  Display units.

  Everything upstream is metric: the API returns °C and km/h, every threshold
  in the alert engine and every band in metricDefs is written against those,
  and the CPCB and IMD scales are defined in them. So metric stays the
  internal unit everywhere, and conversion happens once, at the point where a
  number becomes something a person reads.

  Converting earlier would be worse than untidy: a heat-wave threshold of 40
  compared against a value already turned into 104 fires on the wrong weather.
*/

export const TEMP_UNITS = ['C', 'F']
export const SPEED_UNITS = ['km/h', 'mph']

const KMH_TO_MPH = 0.621371

export const toDisplayTemp = (celsius, unit) => {
  if (typeof celsius !== 'number' || !Number.isFinite(celsius)) return celsius
  return unit === 'F' ? Math.round(celsius * 1.8 + 32) : celsius
}

export const toDisplaySpeed = (kmh, unit) => {
  if (typeof kmh !== 'number' || !Number.isFinite(kmh)) return kmh
  return unit === 'mph' ? Math.round(kmh * KMH_TO_MPH) : kmh
}

/** Catalog key for the speed unit, so it reads in the user's script. */
export const speedUnitKey = (unit) => (unit === 'mph' ? 'units.mph' : 'units.kmh')

/*
  Fields carrying a temperature in °C, and fields carrying a speed in km/h.

  Listed explicitly rather than guessed from names. A heuristic would have to
  decide what `soilTemperature` and `waterTemperature` are (temperatures) and
  what `temperatureTrendDeltaC` is (a difference, where a °F conversion would
  need a different formula entirely), and getting that wrong shows a plausible
  wrong number rather than an obvious one.
*/
const TEMP_FIELDS = [
  'temperature',
  'feelsLike',
  'high',
  'low',
  'soilTemperature',
  'waterTemperature',
]
const SPEED_FIELDS = ['windSpeed', 'windGust']

/**
 * A copy of the weather payload with every temperature and speed expressed in
 * the user's chosen units. Metric input is returned untouched, so the common
 * case costs one object spread and nothing else.
 */
export function convertWeather(weather, { tempUnit = 'C', speedUnit = 'km/h' } = {}) {
  if (!weather) return weather

  /*
    The chosen units travel with the payload.

    Metric definitions receive `(weather, t, n)` and nothing else, so without
    this they would have to hardcode "km/h" next to a number that is no longer
    in km/h. Carrying the unit on the reading itself keeps the value and its
    label impossible to separate.
  */
  const marker = { tempUnit, speedUnitKey: speedUnitKey(speedUnit) }
  if (tempUnit === 'C' && speedUnit === 'km/h') return { ...weather, ...marker }

  const out = { ...weather, ...marker }
  for (const field of TEMP_FIELDS) out[field] = toDisplayTemp(weather[field], tempUnit)
  for (const field of SPEED_FIELDS) out[field] = toDisplaySpeed(weather[field], speedUnit)

  if (Array.isArray(weather.hourlyForecast)) {
    out.hourlyForecast = weather.hourlyForecast.map((h) => ({
      ...h,
      temp: toDisplayTemp(h.temp, tempUnit),
      feelsLike: toDisplayTemp(h.feelsLike, tempUnit),
    }))
  }
  if (Array.isArray(weather.dailyForecast)) {
    out.dailyForecast = weather.dailyForecast.map((d) => ({
      ...d,
      high: toDisplayTemp(d.high, tempUnit),
      low: toDisplayTemp(d.low, tempUnit),
      windMax: toDisplaySpeed(d.windMax, speedUnit),
    }))
  }
  return out
}

/**
 * Alert parameters carry raw readings too, and an advisory that disagrees
 * with the tile above it reads as a bug even when both are individually
 * right. `unit` is added so the wind copy can name the unit in the reader's
 * own script rather than hardcoding "km/h".
 */
export function convertAlerts(alerts, { tempUnit = 'C', speedUnit = 'km/h' } = {}) {
  if (!Array.isArray(alerts)) return []
  return alerts.map((alert) => {
    const params = { ...alert.params }
    for (const field of ['feelsLike', 'high', 'low']) {
      if (field in params) params[field] = toDisplayTemp(params[field], tempUnit)
    }
    if ('gust' in params) params.gust = toDisplaySpeed(params.gust, speedUnit)
    return { ...alert, params }
  })
}
