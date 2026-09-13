/*
  Alert categories.

  The alerts themselves are no longer here. They are computed from the live
  forecast in backend/weather/alerts.js and arrive with the weather, so what
  the user sees is derived from the same fetch as the numbers beside it
  rather than from a fixture. `severity` on those alerts maps directly to the
  semantic status tokens in styles/tokens.css
  (safe | info | caution | warning | critical).

  Categories are ids, not display text, so filtering keeps working in every
  language — comparing translated labels would break the moment the user
  switched. The prose fields are catalog keys for the same reason: an alert
  that tells you what to do is useless in a language you don't read.
*/
export const ALERT_CATEGORIES = [
  { id: 'all', labelKey: 'alertCategory.all' },
  { id: 'weather', labelKey: 'alertCategory.weather' },
  { id: 'health', labelKey: 'alertCategory.health' },
  { id: 'travel', labelKey: 'alertCategory.travel' },
  { id: 'commute', labelKey: 'alertCategory.commute' },
  { id: 'agriculture', labelKey: 'alertCategory.agriculture' },
  { id: 'marine', labelKey: 'alertCategory.marine' },
]
