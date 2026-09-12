import { LayoutGrid, CloudSun, MapPin, Bell, SlidersHorizontal, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'overview', labelKey: 'tab.overview', icon: LayoutGrid },
  { id: 'weather', labelKey: 'tab.weather', icon: CloudSun },
  { id: 'locations', labelKey: 'tab.locations', icon: MapPin },
  { id: 'alerts', labelKey: 'tab.alerts', icon: Bell },
  { id: 'personalize', labelKey: 'tab.personalize', icon: SlidersHorizontal },
  { id: 'settings', labelKey: 'tab.settings', icon: Settings },
]
