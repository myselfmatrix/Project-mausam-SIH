import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, WifiOff, RotateCw, LogOut, Languages } from 'lucide-react'
import LanguageSwitcher from '../../ui/LanguageSwitcher'
import { useTranslation } from '../../../i18n/useTranslation'
import { LANGUAGES } from '../../../i18n/languages'
import { usePreferences } from '../../../preferences/PreferencesProvider'
import { useSpokenBrief } from '../../../hooks/useSpokenBrief'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

function Toggle({ on, onClick, label }) {
  return (
    <button type="button" className={`toggle ${on ? 'is-on' : ''}`} onClick={onClick} aria-label={label} aria-pressed={on}>
      <span className="toggle-knob" />
    </button>
  )
}

// Data saver and the offline banner remain local demonstrations; everything
// else on this screen now changes what the app actually does.
export default function SettingsTab({ userName, userEmail, onLogout, weather, alerts = [] }) {
  const { t, language, languages } = useTranslation()
  const { tempUnit, speedUnit, setPreference } = usePreferences()
  const [dataSaver, setDataSaver] = useState(false)
  const [offlinePreview, setOfflinePreview] = useState(false)
  // Narration language, separate from the display language but seeded from it
  // — nobody wants a spoken brief in a language they didn't choose to read.
  const [voiceLang, setVoiceLang] = useState(language)

  const languageLabel =
    (languages || LANGUAGES).find((l) => l.code === voiceLang)?.label || voiceLang
  const brief = useSpokenBrief({
    weather,
    alerts,
    t,
    language: voiceLang,
    languageLabel,
  })

  const initial = (userName || userEmail || 'M')[0].toUpperCase()

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <div className="profile-header">
          <span className="profile-avatar">{initial}</span>
          <div>
            <p className="profile-name">{userName || t('settings.defaultName')}</p>
            <p className="profile-email">{userEmail || 'you@example.com'}</p>
          </div>
        </div>
        <button type="button" className="btn-ghost-sm" onClick={onLogout} style={{ alignSelf: 'flex-start' }}>
          <LogOut size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          {t('common.logOut')}
        </button>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">
          <Languages size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          {t('settings.language')}
        </p>
        <div className="settings-row">
          <span className="settings-row-desc">{t('settings.languageDesc')}</span>
          <LanguageSwitcher align="right" />
        </div>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">{t('settings.units')}</p>
        <div className="settings-row">
          <span className="settings-row-label">{t('settings.temperature')}</span>
          <div className="segmented">
            <button type="button" className={tempUnit === 'C' ? 'is-active' : ''} onClick={() => setPreference('tempUnit', 'C')}>°C</button>
            <button type="button" className={tempUnit === 'F' ? 'is-active' : ''} onClick={() => setPreference('tempUnit', 'F')}>°F</button>
          </div>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">{t('settings.windSpeed')}</span>
          <div className="segmented">
            <button type="button" className={speedUnit === 'km/h' ? 'is-active' : ''} onClick={() => setPreference('speedUnit', 'km/h')}>km/h</button>
            <button type="button" className={speedUnit === 'mph' ? 'is-active' : ''} onClick={() => setPreference('speedUnit', 'mph')}>mph</button>
          </div>
        </div>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">{t('settings.briefTitle')}</p>
        <div className="voice-brief-card" style={{ border: 'none', padding: 0 }}>
          <button
            type="button"
            className={`voice-brief-play ${brief.isSpeaking ? 'is-playing' : ''}`}
            onClick={brief.toggle}
            disabled={!weather}
            aria-label={brief.isSpeaking ? t('settings.briefPause') : t('settings.briefPlay')}
            aria-pressed={brief.isSpeaking}
          >
            {brief.isSpeaking ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <div className="voice-brief-body">
            <p className="voice-brief-title">{t('settings.briefSummary')}</p>
            <p className="voice-brief-meta">
              {brief.notice || (brief.isSpeaking ? t('brief.speaking') : t('brief.idle'))}
            </p>
            {/* The words it will read, so the brief is usable without sound. */}
            {weather && <p className="voice-brief-script">{brief.script}</p>}
          </div>
          <select
            className="voice-lang-select"
            value={voiceLang}
            onChange={(e) => {
              brief.stop()
              setVoiceLang(e.target.value)
            }}
            aria-label={t('language.choose')}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">{t('settings.connectivity')}</p>
        <div className="settings-row">
          <div>
            <p className="settings-row-label">{t('settings.dataSaver')}</p>
            <p className="settings-row-desc">{t('settings.dataSaverDesc')}</p>
          </div>
          <Toggle on={dataSaver} onClick={() => setDataSaver((v) => !v)} label={t('settings.dataSaverToggle')} />
        </div>
        {dataSaver && <span className="data-saver-pill">{t('settings.dataSaverActive')}</span>}

        <div className="settings-row">
          <div>
            <p className="settings-row-label">{t('settings.offlinePreview')}</p>
            <p className="settings-row-desc">{t('settings.offlineDesc')}</p>
          </div>
          <Toggle on={offlinePreview} onClick={() => setOfflinePreview((v) => !v)} label={t('settings.offlineToggle')} />
        </div>
        {offlinePreview && (
          <div className="offline-banner">
            <WifiOff size={16} />
            {t('settings.offlineBanner')}
            <button type="button" className="offline-banner-retry" onClick={() => setOfflinePreview(false)}>
              <RotateCw size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
              {t('common.retry')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
