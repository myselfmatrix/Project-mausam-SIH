import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, ArrowRight, ArrowLeft, MapPin, Home, GraduationCap, Briefcase,
  Sprout, LocateFixed, Sparkles, Bell,
} from 'lucide-react'
import { PERSONAS, getPersona } from '../data/personaData'
import { INTERESTS } from '../data/interestData'
import Logo from '../components/brand/Logo'
import { useTranslation } from '../i18n/useTranslation'
// Reuse the persona-card / interest-chip visual language already
// established in the dashboard's Personalize tab instead of inventing a
// new one.
import '../components/dashboard/tabs/Tabs.css'
import './OnboardingPage.css'

const LOCATION_OPTIONS = [
  { id: 'current', labelKey: 'onboarding.optCurrent', icon: LocateFixed },
  { id: 'home', labelKey: 'onboarding.optHome', icon: Home },
  { id: 'college', labelKey: 'onboarding.optCollege', icon: GraduationCap },
  { id: 'office', labelKey: 'onboarding.optOffice', icon: Briefcase },
  { id: 'farm', labelKey: 'onboarding.optFarm', icon: Sprout },
  { id: 'custom', labelKey: 'onboarding.optCustom', icon: MapPin },
]

const STEP_META = [
  {
    key: 'persona',
    labelKey: 'onboarding.personaLabel',
    titleKey: 'onboarding.personaTitle',
    subtitleKey: 'onboarding.personaSubtitle',
  },
  {
    key: 'location',
    labelKey: 'onboarding.locationLabel',
    titleKey: 'onboarding.locationTitle',
    subtitleKey: 'onboarding.locationSubtitle',
  },
  {
    key: 'priorities',
    labelKey: 'onboarding.prioritiesLabel',
    titleKey: 'onboarding.prioritiesTitle',
    subtitleKey: 'onboarding.prioritiesSubtitle',
  },
  {
    key: 'finish',
    labelKey: 'onboarding.finishLabel',
    titleKey: 'onboarding.finishTitle',
    subtitleKey: 'onboarding.finishSubtitle',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
}

export default function OnboardingPage({ onComplete }) {
  const { t, n } = useTranslation()
  const [step, setStep] = useState(0)
  const [persona, setPersona] = useState(null)
  const [locationContext, setLocationContext] = useState(null)
  const [customLocation, setCustomLocation] = useState('')
  const [priorities, setPriorities] = useState([])

  const togglePriority = (item) => {
    setPriorities((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))
  }

  const selectedLocationOption = LOCATION_OPTIONS.find((o) => o.id === locationContext)
  // A typed-in place is stored verbatim; a picked one is stored as its id and
  // translated on the way out, so the summary follows the chosen language.
  const resolvedLocationLabel = locationContext === 'custom'
    ? (customLocation.trim() || t('onboarding.customLocation'))
    : (selectedLocationOption ? t(selectedLocationOption.labelKey) : t('common.notSet'))

  const canContinue =
    step === 0 ? Boolean(persona) :
    step === 1 ? Boolean(locationContext) && (locationContext !== 'custom' || customLocation.trim().length > 0) :
    true

  const handleNext = () => {
    if (step < STEP_META.length - 1) setStep((s) => s + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const handleFinish = () => {
    // Local-only for this prototype — no backend endpoint exists yet for
    // location context / priorities. Swap these for a real API call (e.g.
    // POST /api/users/preferences) once the backend supports it; the
    // persona itself is already synced via App.jsx's onComplete handler.
    localStorage.setItem('mausam_location_context', resolvedLocationLabel)
    localStorage.setItem('mausam_priorities', JSON.stringify(priorities))
    onComplete(persona)
  }

  const personaObj = getPersona(persona)

  return (
    <div className="ob-shell night-surface">
      {/* Veil only — no aurora here. Auth gets away with the colour blobs
          because the planet and the glass card anchor them; this screen is a
          wide, mostly-empty content area where they just read as noise. */}
      <div className="atmos-backdrop" />

      <header className="ob-topbar">
        <div className="ob-topbar-inner">
          <Logo size={28} className="ob-logo" />

          <div>
            <p className="ob-progress-text">
              {t('onboarding.progress', {
                current: step + 1,
                total: STEP_META.length,
                label: t(STEP_META[step].labelKey),
              })}
            </p>
            <div className="ob-progress">
              {STEP_META.map((s, i) => (
                <div className="ob-progress-item" key={s.key}>
                  <span className={`ob-progress-dot ${i < step ? 'is-done' : ''} ${i === step ? 'is-active' : ''}`}>
                    {i < step ? <Check size={13} strokeWidth={2.5} /> : n(i + 1)}
                  </span>
                  {i < STEP_META.length - 1 && (
                    <span className={`ob-progress-line ${i < step ? 'is-done' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="ob-main">
        <div className="ob-content">
          <AnimatePresence mode="wait">
            <motion.section
              key={STEP_META[step].key}
              className="ob-step"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {step === 3 && (
                <span className="ob-finish-icon">
                  <Sparkles size={24} strokeWidth={2} />
                </span>
              )}
              <h1 className="ob-step-title">{t(STEP_META[step].titleKey)}</h1>
              <p className="ob-step-sub">{t(STEP_META[step].subtitleKey)}</p>

              {step === 0 && (
                <motion.div className="persona-select-grid" initial="hidden" animate="show" variants={stagger}>
                  {PERSONAS.map((p) => (
                    <motion.button
                      key={p.id}
                      type="button"
                      className={`persona-select-card ${persona === p.id ? 'is-selected' : ''}`}
                      onClick={() => setPersona(p.id)}
                      variants={fadeUp}
                    >
                      <span className="persona-select-icon">
                        <p.icon size={19} strokeWidth={2} />
                      </span>
                      <span>
                        <p className="persona-select-title">{t(p.titleKey)}</p>
                        <p className="persona-select-desc">{t(p.descKey)}</p>
                      </span>
                      {persona === p.id && (
                        <Check size={18} color="var(--color-brand-600)" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {step === 1 && (
                <>
                  <motion.div className="ob-location-grid" initial="hidden" animate="show" variants={stagger}>
                    {LOCATION_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.id}
                        type="button"
                        className={`ob-location-card ${locationContext === opt.id ? 'is-selected' : ''}`}
                        onClick={() => setLocationContext(opt.id)}
                        variants={fadeUp}
                      >
                        <span className="ob-location-icon">
                          <opt.icon size={18} strokeWidth={2} />
                        </span>
                        <span className="ob-location-label">{t(opt.labelKey)}</span>
                        {locationContext === opt.id && (
                          <Check size={16} color="var(--color-brand-600)" className="ob-location-check" />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>

                  <AnimatePresence>
                    {locationContext === 'custom' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <input
                          className="form-input ob-custom-input"
                          type="text"
                          placeholder={t('onboarding.customPlaceholder')}
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {step === 2 && (
                <motion.div className="interest-chip-grid" initial="hidden" animate="show" variants={fadeUp}>
                  {INTERESTS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`interest-chip ${priorities.includes(opt.id) ? 'is-selected' : ''}`}
                      onClick={() => togglePriority(opt.id)}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </motion.div>
              )}

              {step === 3 && (
                <div className="ob-summary-card">
                  <div className="ob-summary-row">
                    <span className="ob-summary-icon">
                      <personaObj.icon size={17} strokeWidth={2} />
                    </span>
                    <div>
                      <p className="ob-summary-label">{t('onboarding.summaryPersona')}</p>
                      <p className="ob-summary-value">{t(personaObj.titleKey)}</p>
                    </div>
                  </div>
                  <div className="ob-summary-row">
                    <span className="ob-summary-icon">
                      <MapPin size={17} strokeWidth={2} />
                    </span>
                    <div>
                      <p className="ob-summary-label">{t('onboarding.summaryLocation')}</p>
                      <p className="ob-summary-value">{resolvedLocationLabel}</p>
                    </div>
                  </div>
                  <div className="ob-summary-row">
                    <span className="ob-summary-icon">
                      <Bell size={17} strokeWidth={2} />
                    </span>
                    <div>
                      <p className="ob-summary-label">{t('onboarding.summaryPriorities')}</p>
                      <p className="ob-summary-value">
                        {priorities.length
                          ? priorities
                              .map((id) => t(INTERESTS.find((i) => i.id === id)?.labelKey || '', null, id))
                              .join(', ')
                          : t('onboarding.noPriorities')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        </div>
      </main>

      <footer className="ob-footer">
        <div className="ob-footer-inner">
          {step > 0 ? (
            <button type="button" className="ob-btn-outline" onClick={handleBack}>
              <ArrowLeft size={16} /> {t('common.back')}
            </button>
          ) : <span />}

          {step < STEP_META.length - 1 ? (
            <button type="button" className="ob-btn-solid" disabled={!canContinue} onClick={handleNext}>
              {t('common.continue')} <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="ob-btn-solid" onClick={handleFinish}>
              {t('onboarding.goToDashboard')} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
