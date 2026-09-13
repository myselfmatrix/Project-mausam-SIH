import { PERSONAS, getPersona } from '../data/personaData'
import { getMetric } from '../data/metricDefs'

// Ordered list of metric definitions (icon/label/value/status) for a
// persona — this ordering is what makes two personas looking at the exact
// same weather see a different homepage. Swap the persona priority arrays
// or the metric registry for a real rules/ML backend later.
export function getPriorityMetrics(personaId, weather) {
  const persona = getPersona(personaId)
  return persona.priority
    .map((key) => ({ key, ...getMetric(key) }))
    .filter((m) => m.getValue)
    /*
      Drop tiles whose data this location does not have. A tide tile in
      Lucknow, or a wave height in Leh, is not a loading state that will
      resolve - there is no sea there. Showing the tile empty implies the app
      is broken; leaving it out lets the next real metric take its place.

      Called without `weather` (during first paint, before any fetch has
      resolved) nothing is filtered, so the grid keeps its full shape.
    */
    .filter((m) => !weather || !m.isAvailable || m.isAvailable(weather))
}


/*
  Whether a persona means anything at this location.

  A beachgoer's dashboard in Lucknow is four empty tiles and a wind speed:
  there is no sea there, so tide, wave height, sea state and water temperature
  are not slow to load, they do not exist. Offering the persona anyway asks
  someone to choose a lens that cannot focus on anything.

  The rule is general rather than a check for "is it the beach one". A persona
  is offered where at least half of its own priority metrics have data, which
  lets it fall out on its own wherever the data does - the beach personas
  inland, and anything else we add later that depends on a local measurement.
  Above that line a persona is kept even with a gap or two: a health user in a
  city with no pollen coverage still has AQI, UV, humidity and heat.
*/
export function isPersonaAvailable(personaId, weather) {
  // Before the first response there is nothing to judge by, and hiding
  // personas during load would make the switcher flicker.
  if (!weather) return true
  const persona = getPersona(personaId)
  const keys = persona.priority || []
  if (keys.length === 0) return true

  const usable = keys.filter((key) => {
    const metric = getMetric(key)
    return Boolean(metric) && (!metric.isAvailable || metric.isAvailable(weather))
  }).length

  return usable >= Math.ceil(keys.length / 2)
}

/** The personas worth offering for this location, in their usual order. */
export function getAvailablePersonas(weather) {
  return PERSONAS.filter((p) => isPersonaAvailable(p.id, weather))
}

// Labels are catalog keys: the band a score falls into is maths, but the word
// for it is copy, and the caller translates it.
const SCORE_STATUS = [
  { min: 8, labelKey: 'score.excellent', status: 'safe' },
  { min: 6.5, labelKey: 'score.good', status: 'safe' },
  { min: 5, labelKey: 'score.fair', status: 'caution' },
  { min: 3, labelKey: 'score.poor', status: 'warning' },
  { min: 0, labelKey: 'score.avoid', status: 'critical' },
]

// Rule-based (not AI) comfort score: start at 10, subtract this persona's
// own priority metrics' penalty contribution. Different personas weigh
// different factors, so the same weather yields a different score for each.
export function getComfortScore(personaId, weather) {
  const persona = getPersona(personaId)
  const factors = persona.priority
    .map((key) => ({ key, ...getMetric(key) }))
    .filter((m) => typeof m.getPenalty === 'function')
    .filter((m) => !m.isAvailable || m.isAvailable(weather))
    .map((m) => ({ labelKey: m.labelKey, penalty: m.getPenalty(weather) }))
    /*
      A penalty of null means the banding function was handed a missing
      reading. Counting it as zero would quietly flatter the score, and
      counting it as the worst band would invent a hazard, so the factor is
      dropped and the score reflects only what is actually known.
    */
    .filter((f) => typeof f.penalty === 'number' && Number.isFinite(f.penalty))

  const totalPenalty = factors.reduce((sum, f) => sum + f.penalty, 0)
  const score = Math.max(0, Math.min(10, 10 - totalPenalty))
  const { labelKey, status } = SCORE_STATUS.find((s) => score >= s.min)

  return {
    score: Math.round(score * 10) / 10,
    labelKey,
    status,
    factors: factors.sort((a, b) => b.penalty - a.penalty).slice(0, 3),
  }
}
