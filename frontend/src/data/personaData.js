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
export const PERSONAS = [
  {
    id: 'health',
    label: 'Health',
    title: 'Health-conscious',
    description: 'Monitor AQI, UV, humidity and heat risk',
    icon: HeartPulse,
    priority: ['aqi', 'uvIndex', 'humidity', 'heatRisk'],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    title: 'Outdoor fitness enthusiast',
    description: 'Find the best time for outdoor workouts',
    icon: Dumbbell,
    priority: ['workoutWindow', 'uvIndex', 'heatRisk', 'windSpeed', 'rainProbability', 'sunriseSunset'],
  },
  {
    id: 'beach',
    label: 'Beach',
    title: 'Beachgoer / surfer',
    description: 'Track tide, waves and sea conditions',
    icon: Waves,
    priority: ['tide', 'waveHeight', 'seaConditions', 'windSpeed', 'waterTemperature'],
  },
  {
    id: 'travel',
    label: 'Travel',
    title: 'Traveler',
    description: 'Stay prepared for weather at your destination',
    icon: Plane,
    priority: ['destinationWeather', 'rainProbability', 'temperature', 'packingTip'],
  },
  {
    id: 'parent',
    label: 'Family',
    title: 'Parent / family',
    description: 'Keep the school run safe and on time',
    icon: Users,
    priority: ['schoolCommute', 'rainDuringSchool', 'heatRisk', 'aqi'],
  },
  {
    id: 'gardener',
    label: 'Agriculture',
    title: 'Agriculture / gardener',
    description: 'Plan irrigation, sowing and frost protection',
    icon: Sprout,
    priority: ['rainfallPrediction', 'soilMoisture', 'frost', 'temperatureTrend', 'irrigationGuidance'],
  },
  {
    id: 'commuter',
    label: 'Commute',
    title: 'Commuter',
    description: 'Know before you leave for work',
    icon: Car,
    priority: ['visibility', 'fog', 'rainTiming', 'storm', 'windSpeed'],
  },
  {
    id: 'event',
    label: 'Events',
    title: 'Event planner',
    description: 'Plan outdoor events with confidence',
    icon: PartyPopper,
    priority: ['outdoorComfort', 'rainProbability', 'temperature', 'humidity', 'windSpeed'],
  },
]

export const getPersona = (id) => PERSONAS.find((p) => p.id === id) || PERSONAS[0]
