import { getPersona } from '../data/personaData'
import { getMetric } from '../data/metricDefs'

// Ordered list of metric definitions (icon/label/value/status) for a
// persona — this ordering is what makes two personas looking at the exact
// same weather see a different homepage. Swap the persona priority arrays
// or the metric registry for a real rules/ML backend later.
export function getPriorityMetrics(personaId) {
  const persona = getPersona(personaId)
  return persona.priority
    .map((key) => ({ key, ...getMetric(key) }))
    .filter((m) => m.getValue)
}

const SCORE_STATUS = [
  { min: 8, label: 'Excellent', status: 'safe' },
  { min: 6.5, label: 'Good', status: 'safe' },
  { min: 5, label: 'Fair', status: 'caution' },
  { min: 3, label: 'Poor', status: 'warning' },
  { min: 0, label: 'Avoid', status: 'critical' },
]

// Rule-based (not AI) comfort score: start at 10, subtract this persona's
// own priority metrics' penalty contribution. Different personas weigh
// different factors, so the same weather yields a different score for each.
export function getComfortScore(personaId, weather) {
  const persona = getPersona(personaId)
  const factors = persona.priority
    .map((key) => ({ key, ...getMetric(key) }))
    .filter((m) => typeof m.getPenalty === 'function')
    .map((m) => ({ label: m.label, penalty: m.getPenalty(weather) }))

  const totalPenalty = factors.reduce((sum, f) => sum + f.penalty, 0)
  const score = Math.max(0, Math.min(10, 10 - totalPenalty))
  const { label, status } = SCORE_STATUS.find((s) => score >= s.min)

  return {
    score: Math.round(score * 10) / 10,
    label,
    status,
    factors: factors.sort((a, b) => b.penalty - a.penalty).slice(0, 3),
  }
}
