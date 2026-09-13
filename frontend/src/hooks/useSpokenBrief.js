import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tAqiCategory, tCity, tCondition, tWindDirection } from '../i18n/vocab'
import { useTranslation } from '../i18n/useTranslation'
import { createTranslator } from '../i18n/translate'
import { getLanguage } from '../i18n/languages'
import EN from '../i18n/en.json'

/*
  A spoken summary of the live forecast, in a language of the listener's
  choosing.

  Browser speech synthesis rather than generated audio: the brief describes
  weather that changes every ten minutes, so there is nothing to pre-record,
  and the app speaks eight languages, which would otherwise mean eight
  recordings per location per update.

  The narration language is deliberately separate from the interface language
  - someone reading English may want to hand the phone to a parent who does
  not - so the script is built against *that* language's catalog rather than
  the one on screen. Setting only the speech voice would read English words in
  a Tamil accent, which is not the same feature at all.
*/

const flatten = (object, prefix = '') =>
  Object.entries(object).reduce((out, [key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...out, ...flatten(value, name) }
      : { ...out, [name]: value }
  }, {})

const EN_FLAT = flatten(EN)

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

export function useSpokenBrief({ weather, alerts = [], language }) {
  const { loadCatalog, languages } = useTranslation()
  const [isSpeaking, setSpeaking] = useState(false)
  const [notice, setNotice] = useState(null)
  const [voices, setVoices] = useState([])
  const [catalog, setCatalog] = useState(EN_FLAT)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const languageLabel = (languages || []).find((l) => l.code === language)?.label || language

  // The narration language's own catalog. Falls back to English rather than
  // failing, so the brief always has words to say.
  useEffect(() => {
    let cancelled = false
    loadCatalog(language)
      .then((strings) => {
        if (!cancelled) setCatalog(strings || EN_FLAT)
      })
      .catch(() => {
        if (!cancelled) setCatalog(EN_FLAT)
      })
    return () => {
      cancelled = true
    }
  }, [language, loadCatalog])

  const speak_t = useMemo(
    () => createTranslator(catalog, EN_FLAT, getLanguage(language).numerals),
    [catalog, language],
  )

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

  const script = useMemo(() => {
    if (!weather) return ''
    const t = speak_t
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
          // Through the vocab helper, not raw: the backend sends CPCB
          // categories as English strings, so passing one straight in left
          // "Satisfactory" spoken in the middle of a Tamil sentence.
          category: tAqiCategory(t, weather.aqiCategory),
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
  }, [weather, alerts, speak_t])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(() => {
    if (!supported) {
      setNotice(speak_t('brief.unsupported'))
      return
    }
    if (!weather || !script) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(script)
    const voice = pickVoice(voices, language)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
      setNotice(null)
    } else {
      /*
        No installed voice for this language.

        The words are still correct - they come from that language's catalog -
        so the brief is read aloud anyway, in whatever voice the device has.
        Saying so beats either silence or pretending it sounded right.
      */
      utterance.lang = `${language}-IN`
      setNotice(language === 'en' ? null : speak_t('brief.voiceFallback', { language: languageLabel }))
    }
    // A shade under natural pace: weather briefs are dense with numbers.
    utterance.rate = 0.95

    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }, [supported, weather, script, voices, language, languageLabel, speak_t])

  /*
    Changing language or place mid-sentence would leave the old brief talking
    over the new one. Kept in a ref and assigned inside an effect, so the
    cancel-on-change effect does not have to depend on `stop` - depending on
    it would re-run on every render that produced a new callback and cut the
    narration off almost immediately.
  */
  const stopRef = useRef(stop)
  useEffect(() => {
    stopRef.current = stop
  }, [stop])
  useEffect(() => {
    stopRef.current?.()
  }, [language, weather?.location])

  const toggle = useCallback(() => {
    if (isSpeaking) stop()
    else speak()
  }, [isSpeaking, speak, stop])

  return { isSpeaking, toggle, stop, supported, notice, script, t: speak_t }
}

export default useSpokenBrief
