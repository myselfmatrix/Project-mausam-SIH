import { useCallback, useEffect, useRef, useState } from 'react'
import { tCity, tCondition, tWindDirection } from '../i18n/vocab'

/*
  A spoken summary of the live forecast, in the reader's language.

  This uses the browser's own speech synthesis rather than generated audio
  files. Two reasons that matter here: the brief describes weather that
  changes every ten minutes, so there is nothing to pre-record; and the app
  speaks eight languages, which would otherwise mean eight recordings per
  location per update.

  What it says is assembled from the same catalog the screen uses, so the
  spoken and written versions cannot drift apart.
*/

/** Voices whose language matches, best match first. */
function pickVoice(voices, langCode) {
  if (!voices.length) return null
  const exact = voices.filter((v) => v.lang?.toLowerCase().startsWith(`${langCode}-`))
  const loose = voices.filter((v) => v.lang?.toLowerCase().split('-')[0] === langCode)
  // An Indian-locale voice reads Indian place names better than any other
  // regional variant of the same language.
  const indian = exact.find((v) => v.lang?.toLowerCase().endsWith('-in'))
  return indian || exact[0] || loose[0] || null
}

export function useSpokenBrief({ weather, alerts = [], t, language, languageLabel }) {
  const [isSpeaking, setSpeaking] = useState(false)
  const [notice, setNotice] = useState(null)
  const [voices, setVoices] = useState([])
  const utteranceRef = useRef(null)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  /*
    Chrome populates the voice list asynchronously and fires `voiceschanged`
    when it does, so reading it once on mount usually returns an empty array
    and silently loses every non-default voice.
  */
  useEffect(() => {
    if (!supported) return undefined
    const load = () => setVoices(window.speechSynthesis.getVoices() || [])
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [supported])

  // Speech keeps running after the component goes away unless it is cancelled.
  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel()
    },
    [supported],
  )

  const buildScript = useCallback(() => {
    if (!weather) return ''
    const parts = [
      t('brief.now', {
        location: tCity(t, weather.location),
        temperature: weather.temperature,
        condition: tCondition(t, weather.condition),
        feelsLike: weather.feelsLike,
      }),
    ]

    if (typeof weather.aqi === 'number') {
      parts.push(
        t('brief.air', {
          aqi: weather.aqi,
          category: weather.aqiCategory || '',
          pollutant: weather.aqiDominantLabel || '',
        }),
      )
    }

    parts.push(
      t('brief.wind', {
        wind: weather.windSpeed,
        unit: t(weather.speedUnitKey || 'units.kmh'),
        direction: tWindDirection(t, weather.windDirection),
        humidity: weather.humidity,
      }),
    )

    /*
      One advisory, not all of them. A brief is something you listen to while
      putting your shoes on; reading out six hazards turns it into something
      you stop listening to. The list is already severity-sorted, so the first
      is the one worth hearing.
    */
    if (alerts.length > 0) {
      const worst = alerts[0]
      parts.push(t('brief.advisoryLead'))
      parts.push(t(worst.whatKey, worst.params))
      parts.push(t(worst.actionKey, worst.params))
    } else {
      parts.push(t('brief.clear'))
    }

    return parts.join(' ')
  }, [weather, alerts, t])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(() => {
    if (!supported) {
      setNotice(t('brief.unsupported'))
      return
    }
    if (!weather) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(buildScript())
    const voice = pickVoice(voices, language)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
      setNotice(null)
    } else {
      // Say so rather than reading Tamil in an English voice without warning.
      utterance.lang = `${language}-IN`
      setNotice(language === 'en' ? null : t('brief.voiceFallback', { language: languageLabel }))
    }
    // A shade under natural pace: weather briefs are dense with numbers.
    utterance.rate = 0.95

    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    utteranceRef.current = utterance
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }, [supported, weather, buildScript, voices, language, languageLabel, t])

  const toggle = useCallback(() => {
    if (isSpeaking) stop()
    else speak()
  }, [isSpeaking, speak, stop])

  return { isSpeaking, toggle, stop, supported, notice, script: buildScript() }
}

export default useSpokenBrief
