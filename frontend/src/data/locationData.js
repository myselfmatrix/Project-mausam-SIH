/*
  The locations a brand-new install starts with.

  Coordinates, not conditions. Everything about the weather at these places is
  fetched live; this file only answers "where is Lucknow", because the forecast
  API takes latitude and longitude and nothing else.

  Four seeds rather than an empty list: a locations screen that opens blank
  gives a first-time user nothing to look at and nothing to compare, and the
  four categories below are the ones the product is built around - where you
  live, where you study, where you work, where you are going. They are
  replaced the moment the user saves anything of their own.

  `labelKey` rather than a label: these four names are ours, not the user's,
  so they are catalog keys and appear in the reader's own language. A label the
  user types is stored verbatim instead.
*/
export const SEED_LOCATIONS = [
  {
    id: 'seed-home',
    labelKey: 'locationCategory.home',
    name: 'Lucknow',
    region: 'Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    lat: 26.8393,
    lon: 80.9231,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'seed-college',
    labelKey: 'locationCategory.college',
    name: 'Jhansi',
    region: 'Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    lat: 25.4484,
    lon: 78.5685,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'seed-office',
    labelKey: 'locationCategory.office',
    name: 'Noida',
    region: 'Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    lat: 28.5708,
    lon: 77.326,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'seed-travel',
    labelKey: 'locationCategory.travel',
    name: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    lat: 19.0728,
    lon: 72.8826,
    timezone: 'Asia/Kolkata',
  },
]

/*
  Where the app points before anyone chooses.

  The dashboard cannot render without somewhere to render, and this is the
  project's home city. It is replaced by the user's own choice - or by their
  GPS fix - as soon as there is one, and a signed-in user's saved active
  location takes precedence over it entirely.
*/
export const DEFAULT_PLACE = {
  name: 'Lucknow',
  region: 'Uttar Pradesh',
  country: 'India',
  countryCode: 'IN',
  lat: 26.8393,
  lon: 80.9231,
  timezone: 'Asia/Kolkata',
}
