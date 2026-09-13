import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, MapPin, Radio } from 'lucide-react'
import AlertBanner from '../AlertBanner'
import VoiceBrief from '../VoiceBrief'
import MetricCard from '../MetricCard'
import ComfortGauge from '../ComfortGauge'
import SkyPanel from '../SkyPanel'
import HourlyStrip from '../HourlyStrip'
import CustomizeDashboard from '../CustomizeDashboard'
import WeatherError from '../WeatherError'
import { getComfortScore, getAvailablePersonas, isPersonaAvailable } from '../../../utils/personalization'
import { getMetric } from '../../../data/metricDefs'
import { PERSONAS } from '../../../data/personaData'
import useDashboardLayout from '../../../hooks/useDashboardLayout'
import { getGreetingKey } from '../../../utils/format'
import { useTranslation } from '../../../i18n/useTranslation'
import { tCity } from '../../../i18n/vocab'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

/* Formatted per language rather than once at module load, so the weekday and
   month names follow the reader's locale like every other string does. */
function todayIn(language) {
  return new Date().toLocaleDateString(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function OverviewTab({
  weather,
  persona,
  userName,
  topAlert,
  alerts = [],
  onViewAlerts,
  onPersonaChange,
  dataSaver = false,
  weatherLoading = false,
  weatherError = null,
  weatherErrorReason = null,
  weatherIsLive = false,
  onRetryWeather,
}) {
  const [customizeMode, setCustomizeMode] = useState(false)
  const { t, n, language } = useTranslation()
  const comfort = getComfortScore(persona.id, weather)
  const layout = useDashboardLayout(persona.id)

  /*
    Which tiles this location can actually fill.

    The saved layout is a list of metric keys chosen per persona and knows
    nothing about where the user is. Two separate problems follow, and this
    handles both:

    1. A tile whose data is absent must not render. A beachgoer has "Next
       Tide" pinned; at Leh the forecast carries an explicit null for it, and
       reading `weather.tide.next` off that took the whole dashboard down.

    2. A persona whose entire set is inapplicable must not be left with an
       almost-empty grid. That same beachgoer inland would see one lonely
       wind tile - technically correct and visibly broken. So when fewer than
       three survive, the grid is topped up from metrics every location has,
       which is a worse fit for the persona but a far better screen than a
       single card floating in white space.
  */
  /*
    Ordered by how much the reading changes what someone does today, because
    the top-up stops at five and everything after that is cut. Air quality was
    last, which meant a beachgoer at Leh - where the persona's own tiles do not
    apply - got wind, rain and humidity while an AQI of 175 never appeared at
    all. On an Indian forecast that is the reading most likely to change a
    plan, so it sits behind only the temperature and the rain.
  */
  const UNIVERSAL_FALLBACK = ['temperature', 'rainProbability', 'aqi', 'uvIndex', 'humidity', 'windSpeed', 'visibility', 'sunriseSunset']

  /*
    Data Saver keeps the three things nobody can plan a day without.

    The setting used to be a switch that moved nothing. It now genuinely cuts
    the grid, which is what its own description promises - "temperature,
    alerts & rain only" - and matters on a metered connection where each tile
    is more layout and more to render.
  */
  const DATA_SAVER_KEYS = ['temperature', 'rainProbability', 'aqi']

  const visibleKeys = useMemo(() => {
    const usable = (key) => {
      const m = getMetric(key)
      return Boolean(m) && (!m.isAvailable || m.isAvailable(weather))
    }

    if (dataSaver) return DATA_SAVER_KEYS.filter(usable)

    const kept = layout.sortedKeys.filter(usable)
    if (kept.length >= 3) return kept

    for (const key of UNIVERSAL_FALLBACK) {
      if (kept.length >= 5) break
      if (!kept.includes(key) && !layout.hidden.includes(key) && usable(key)) kept.push(key)
    }
    return kept
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.sortedKeys, layout.hidden, weather, dataSaver])

  /*
    Only the personas this place can actually serve.

    The chosen persona stays in the list even when it does not apply here, so
    a beachgoer visiting Lucknow still sees which lens they are on and can
    switch away deliberately - dropping the active pill would leave the row
    with nothing highlighted and no way back. The note below says why the
    dashboard looks general.
  */
  const offeredPersonas = useMemo(() => {
    const available = getAvailablePersonas(weather)
    if (available.some((p) => p.id === persona.id)) return available
    const current = PERSONAS.find((p) => p.id === persona.id)
    return current ? [current, ...available] : available
  }, [weather, persona.id])

  const personaApplies = isPersonaAvailable(persona.id, weather)

  const firstName = userName ? userName.split(' ')[0] : ''
  const personaTitle = t(persona.titleKey)

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.header className="ov-head" variants={fadeUp}>
        <div className="ov-head-text">
          <p className="ov-meta">
            <span>
              <CalendarDays size={13} strokeWidth={2.2} /> {todayIn(language)}
            </span>
            <span>
              <MapPin size={13} strokeWidth={2.2} /> {tCity(t, weather.location)}
            </span>
            <span
              className={`ov-live ${weatherLoading ? 'is-syncing' : weatherIsLive ? 'is-live' : 'is-cached'}`}
              title={
                weatherLoading
                  ? t('overview.syncingTitle')
                  : weatherIsLive
                    ? t('overview.liveTitle')
                    : t('overview.cachedTitle')
              }
            >
              <Radio size={11} strokeWidth={2.4} />
              {weatherLoading
                ? t('overview.syncing')
                : weatherIsLive
                  ? t('overview.live')
                  : t('overview.cached')}
            </span>
          </p>
          <h1>
            {t(getGreetingKey())}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          {/* The persona name is bolded inside a full sentence, so the sentence
              is one catalog string split on its placeholder — word order
              differs by language and hard-coding it around a <strong> would
              force English grammar onto every translation. */}
          <p className="ov-sub">
            {(() => {
              const [before = '', after = ''] = t('overview.subtitle').split('{persona}')
              return (
                <>
                  {before}
                  <strong>{personaTitle}</strong>
                  {after}
                </>
              )
            })()}
          </p>
        </div>

        {/* Switching persona is the product's whole point, so it belongs on the
            home screen rather than only inside Personalize. */}
        {onPersonaChange && (
          <div className="ov-persona-switch">
            <span className="ov-persona-label">{t('overview.viewingAs')}</span>
            <div className="ov-persona-pills">
              {offeredPersonas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`ov-persona-pill ${p.id === persona.id ? 'is-active' : ''}`}
                  onClick={() => onPersonaChange(p.id)}
                  title={t(p.titleKey)}
                  aria-pressed={p.id === persona.id}
                >
                  <p.icon size={14} strokeWidth={2.2} />
                  <span>{t(p.labelKey)}</span>
                </button>
              ))}
            </div>
            {/* Why the grid looks generic, said once, where the switch is. */}
            {!personaApplies && weather && (
              <p className="ov-persona-note">
                {t('overview.personaNotHere', {
                  persona: t(persona.titleKey),
                  location: tCity(t, weather.location),
                })}
              </p>
            )}
          </div>
        )}
      </motion.header>

      <AnimatePresence>
        {weatherError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <WeatherError error={weatherError}
          reason={weatherErrorReason} onRetry={onRetryWeather} isRetrying={weatherLoading} />
          </motion.div>
        )}
      </AnimatePresence>

      {topAlert && (
        <motion.div variants={fadeUp}>
          <AlertBanner alert={topAlert} onViewAll={onViewAlerts} />
        </motion.div>
      )}

      {/* Below the warning, above the numbers: the brief narrates both. */}
      <motion.div variants={fadeUp}>
        <VoiceBrief weather={weather} alerts={alerts} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <SkyPanel weather={weather} />
      </motion.div>

      <motion.div className="ov-split" variants={fadeUp}>
        <ComfortGauge
          title={t('overview.comfortTitle', { persona: t(persona.labelKey) })}
          score={comfort.score}
          label={t(comfort.labelKey)}
          status={comfort.status}
          factors={comfort.factors}
        />
        <HourlyStrip hours={weather.hourlyForecast} />
      </motion.div>

      <motion.div className="ov-section-bar" variants={fadeUp}>
        <p className="section-label">{t('overview.prioritized', { persona: personaTitle })}</p>
        <CustomizeDashboard
          active={customizeMode}
          onToggle={() => setCustomizeMode((v) => !v)}
          onReset={layout.resetLayout}
          hiddenKeys={layout.hidden}
          onUnhide={layout.toggleHidden}
        />
      </motion.div>

      <motion.div className="metric-grid" variants={stagger}>
        {visibleKeys.map((key) => {
          const m = getMetric(key)
          if (!m) return null
          const isPinned = layout.pinned.includes(key)
          const group = visibleKeys.filter((k) => layout.pinned.includes(k) === isPinned)
          const groupIdx = group.indexOf(key)
          return (
            <motion.div key={key} variants={fadeUp} layout>
              <MetricCard
                icon={m.icon}
                label={t(m.labelKey)}
                value={m.getValue(weather, t, n)}
                caption={m.getCaption ? m.getCaption(weather, t, n) : null}
                status={m.getStatus ? m.getStatus(weather) : null}
                customize={
                  customizeMode
                    ? {
                        isPinned,
                        onPin: () => layout.togglePinned(key),
                        onHide: () => layout.toggleHidden(key),
                        onMoveUp: () => layout.moveWidget(key, -1),
                        onMoveDown: () => layout.moveWidget(key, 1),
                        canMoveUp: groupIdx > 0,
                        canMoveDown: groupIdx < group.length - 1,
                      }
                    : null
                }
              />
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
