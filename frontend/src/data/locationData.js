// Mock saved-locations data (spec example set, kept verbatim). "Primary" is
// derived at render time in LocationsTab by comparing `city` against the
// dashboard's active location — not tracked here.
export const SAVED_LOCATIONS = [
  {
    id: 'loc-home',
    category: 'Home',
    city: 'Lucknow',
    region: 'Uttar Pradesh',
    temperature: 29,
    condition: 'Partly Cloudy',
    rainProbability: 65,
    alertStatus: 'caution',
  },
  {
    id: 'loc-college',
    category: 'College',
    city: 'Jhansi',
    region: 'Uttar Pradesh',
    temperature: 31,
    condition: 'Sunny',
    rainProbability: 10,
    alertStatus: 'safe',
  },
  {
    id: 'loc-office',
    category: 'Office',
    city: 'Noida',
    region: 'Uttar Pradesh',
    temperature: 32,
    condition: 'Hazy Sun',
    rainProbability: 15,
    alertStatus: 'warning',
  },
  {
    id: 'loc-travel',
    category: 'Travel',
    city: 'London',
    region: 'United Kingdom',
    temperature: 16,
    condition: 'Light Rain',
    rainProbability: 80,
    alertStatus: 'info',
  },
]
