/*
  The "notify me about" checklist, shared by onboarding and the Personalize
  tab so the two can't drift apart.

  Ids are stored (in localStorage today, in a preferences endpoint later) and
  labels are looked up at render — a saved preference must not change meaning
  when the user switches language.
*/
export const INTERESTS = [
  { id: 'weatherAlerts', labelKey: 'interest.weatherAlerts' },
  { id: 'airQuality', labelKey: 'interest.airQuality' },
  { id: 'uv', labelKey: 'interest.uv' },
  { id: 'rain', labelKey: 'interest.rain' },
  { id: 'travel', labelKey: 'interest.travel' },
  { id: 'outdoorActivity', labelKey: 'interest.outdoorActivity' },
  { id: 'commute', labelKey: 'interest.commute' },
  { id: 'agriculture', labelKey: 'interest.agriculture' },
  { id: 'marine', labelKey: 'interest.marine' },
]

export const getInterest = (id) => INTERESTS.find((i) => i.id === id)
