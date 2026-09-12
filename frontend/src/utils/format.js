export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Returns a catalog key, not copy — the caller translates it. */
export function getGreetingKey() {
  const h = new Date().getHours()
  if (h < 5) return 'greeting.lateNight'
  if (h < 12) return 'greeting.morning'
  if (h < 17) return 'greeting.afternoon'
  if (h < 21) return 'greeting.evening'
  return 'greeting.night'
}
