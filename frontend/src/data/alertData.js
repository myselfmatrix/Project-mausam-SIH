/*
  Mock alert centre data. `severity` maps directly to the semantic status
  tokens in styles/tokens.css (safe | info | caution | warning | critical).

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

export const ALERTS = [
  {
    id: 'alert-1',
    category: 'weather',
    severity: 'warning',
    whatKey: 'alertData.rainWhat',
    whenKey: 'alertData.rainWhen',
    whyKey: 'alertData.rainWhy',
    actionKey: 'alertData.rainAction',
    timestamp: '2026-09-09T07:10:00',
    read: false,
  },
  {
    id: 'alert-2',
    category: 'health',
    severity: 'caution',
    whatKey: 'alertData.aqiWhat',
    whenKey: 'alertData.aqiWhen',
    whyKey: 'alertData.aqiWhy',
    actionKey: 'alertData.aqiAction',
    timestamp: '2026-09-09T06:45:00',
    read: false,
  },
  {
    id: 'alert-3',
    category: 'travel',
    severity: 'critical',
    whatKey: 'alertData.stormWhat',
    whenKey: 'alertData.stormWhen',
    whyKey: 'alertData.stormWhy',
    actionKey: 'alertData.stormAction',
    timestamp: '2026-09-09T06:00:00',
    read: true,
  },
  {
    id: 'alert-4',
    category: 'agriculture',
    severity: 'info',
    whatKey: 'alertData.sowingWhat',
    whenKey: 'alertData.sowingWhen',
    whyKey: 'alertData.sowingWhy',
    actionKey: 'alertData.sowingAction',
    timestamp: '2026-09-08T18:20:00',
    read: true,
  },
  {
    id: 'alert-5',
    category: 'commute',
    severity: 'caution',
    whatKey: 'alertData.fogWhat',
    whenKey: 'alertData.fogWhen',
    whyKey: 'alertData.fogWhy',
    actionKey: 'alertData.fogAction',
    timestamp: '2026-09-08T21:00:00',
    read: true,
  },
  {
    id: 'alert-6',
    category: 'marine',
    severity: 'warning',
    whatKey: 'alertData.seaWhat',
    whenKey: 'alertData.seaWhen',
    whyKey: 'alertData.seaWhy',
    actionKey: 'alertData.seaAction',
    timestamp: '2026-09-08T15:30:00',
    read: true,
  },
]
