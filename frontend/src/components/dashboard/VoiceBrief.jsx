import { useState } from 'react'
import { Play, Square, Volume2 } from 'lucide-react'
import { useSpokenBrief } from '../../hooks/useSpokenBrief'
import { useTranslation } from '../../i18n/useTranslation'
import { LANGUAGES } from '../../i18n/languages'
import './VoiceBrief.css'

/*
  The spoken brief, on the dashboard rather than buried in Settings.

  It was a settings row, which is the wrong place for it: nobody opens
  Settings to hear today's weather. It belongs where the forecast is, next to
  the day it describes, and it is the one control on this screen that works
  without looking at it - which matters for a user who is getting ready to
  leave, or who cannot read the script the app is written in.

  The language selector stays with the button because the narration language
  is genuinely separate from the interface language: an English-reading user
  handing the phone to a parent wants Tamil out loud and English on screen.
*/
export default function VoiceBrief({ weather, alerts = [] }) {
  const { t, language, languages } = useTranslation()
  const [voiceLang, setVoiceLang] = useState(language)
  const [expanded, setExpanded] = useState(false)
  const brief = useSpokenBrief({ weather, alerts, language: voiceLang })

  if (!weather) return null

  const options = languages?.length ? languages : LANGUAGES

  return (
    <section className={`vbrief ${brief.isSpeaking ? 'is-speaking' : ''}`}>
      <button
        type="button"
        className="vbrief-play"
        onClick={brief.toggle}
        aria-label={brief.isSpeaking ? t('settings.briefPause') : t('settings.briefPlay')}
        aria-pressed={brief.isSpeaking}
      >
        {brief.isSpeaking ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
      </button>

      <div className="vbrief-body">
        <p className="vbrief-title">
          <Volume2 size={13} strokeWidth={2.2} />
          {t('settings.briefSummary')}
        </p>
        <p className="vbrief-meta">
          {brief.notice || (brief.isSpeaking ? t('brief.speaking') : t('brief.idle'))}
        </p>
      </div>

      <div className="vbrief-controls">
        <select
          id="voice-brief-language"
          className="vbrief-lang"
          value={voiceLang}
          onChange={(e) => {
            brief.stop()
            setVoiceLang(e.target.value)
          }}
          aria-label={t('language.choose')}
        >
          {options.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="vbrief-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? t('common.hide', null, 'Hide text') : t('common.showText', null, 'Show text')}
        </button>
      </div>

      {/* The words it will read: usable with the sound off, and a way to
          check afterwards what was actually said. */}
      {expanded && <p className="vbrief-script">{brief.script}</p>}
    </section>
  )
}
