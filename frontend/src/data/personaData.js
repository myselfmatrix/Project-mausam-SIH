import {
  HeartPulse,
  Dumbbell,
  Waves,
  Plane,
  Users,
  Sprout,
  Car,
  PartyPopper,
} from 'lucide-react'

// Each persona lists the metric keys (see metricDefs.js) that matter most to
// it, in priority order. This is the entire "personalization engine" for the
// frontend prototype — swap this for a real rules/ML service later without
// touching any component.
//
// The three `*Key` fields are translation keys, not copy: the persona a user
// picks has to read in their own language everywhere it appears, so the text
// lives in the i18n catalogs and components resolve it with t().
export const PERSONAS = [
  {
    id: 'health',
    labelKey: 'persona.healthLabel',
    titleKey: 'persona.healthTitle',
    descKey: 'persona.healthDesc',
    icon: HeartPulse,
    priority: ['aqi', 'uvIndex', 'humidity', 'heatRisk'],
  },
  {
    id: 'fitness',
    labelKey: 'persona.fitnessLabel',
    titleKey: 'persona.fitnessTitle',
    descKey: 'persona.fitnessDesc',
    icon: Dumbbell,
    priority: ['workoutWindow', 'uvIndex', 'heatRisk', 'windSpeed', 'rainProbability', 'sunriseSunset'],
  },
  {
    id: 'beach',
    labelKey: 'persona.beachLabel',
    titleKey: 'persona.beachTitle',
    descKey: 'persona.beachDesc',
    icon: Waves,
    priority: ['tide', 'waveHeight', 'seaConditions', 'windSpeed', 'waterTemperature'],
  },
  {
    id: 'travel',
    labelKey: 'persona.travelLabel',
    titleKey: 'persona.travelTitle',
    descKey: 'persona.travelDesc',
    icon: Plane,
    priority: ['destinationWeather', 'rainProbability', 'temperature', 'packingTip'],
  },
  {
    id: 'parent',
    labelKey: 'persona.parentLabel',
    titleKey: 'persona.parentTitle',
    descKey: 'persona.parentDesc',
    icon: Users,
    priority: ['schoolCommute', 'rainDuringSchool', 'heatRisk', 'aqi'],
  },
  {
    id: 'gardener',
    labelKey: 'persona.gardenerLabel',
    titleKey: 'persona.gardenerTitle',
    descKey: 'persona.gardenerDesc',
    icon: Sprout,
    priority: ['rainfallPrediction', 'soilMoisture', 'frost', 'temperatureTrend', 'irrigationGuidance'],
  },
  {
    id: 'commuter',
    labelKey: 'persona.commuterLabel',
    titleKey: 'persona.commuterTitle',
    descKey: 'persona.commuterDesc',
    icon: Car,
    priority: ['visibility', 'fog', 'rainTiming', 'storm', 'windSpeed'],
  },
  {
    id: 'event',
    labelKey: 'persona.eventLabel',
    titleKey: 'persona.eventTitle',
    descKey: 'persona.eventDesc',
    icon: PartyPopper,
    priority: ['outdoorComfort', 'rainProbability', 'temperature', 'humidity', 'windSpeed'],
  },
]

export const getPersona = (id) => PERSONAS.find((p) => p.id === id) || PERSONAS[0]
