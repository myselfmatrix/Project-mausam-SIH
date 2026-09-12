// Mock saved-locations data (spec example set, kept verbatim). "Primary" is
// derived at render time in LocationsTab by comparing `city` against the
// dashboard's active location — not tracked here.
//
// `city`/`region`/`condition` stay as plain English values: they are looked up
// in the translation catalogs at render time and fall back to what's here, so
// a location the user adds themselves still displays correctly. `categoryKey`
// is a catalog key because these four are fixed labels, not user input.
export const SAVED_LOCATIONS = [
  {
    id: 'loc-home',
    categoryKey: 'locationCategory.home',
    city: 'Lucknow',
    region: 'Uttar Pradesh',
    temperature: 29,
    condition: 'Partly Cloudy',
    rainProbability: 65,
    alertStatus: 'caution',
  },
  {
    id: 'loc-college',
    categoryKey: 'locationCategory.college',
    city: 'Jhansi',
    region: 'Uttar Pradesh',
    temperature: 31,
    condition: 'Sunny',
    rainProbability: 10,
    alertStatus: 'safe',
  },
  {
    id: 'loc-office',
    categoryKey: 'locationCategory.office',
    city: 'Noida',
    region: 'Uttar Pradesh',
    temperature: 32,
    condition: 'Hazy Sun',
    rainProbability: 15,
    alertStatus: 'warning',
  },
  {
    id: 'loc-travel',
    categoryKey: 'locationCategory.travel',
    city: 'London',
    region: 'United Kingdom',
    temperature: 16,
    condition: 'Light Rain',
    rainProbability: 80,
    alertStatus: 'info',
  },
]
