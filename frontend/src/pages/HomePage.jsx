import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Menu, X, ArrowRight, Target, MapPin, Bell, Gauge, ShieldCheck, Smartphone,
  Info, AlertTriangle, ShieldAlert, CheckCircle2, Wind, Sun, CloudRain, Sparkles,
} from 'lucide-react'
import { PERSONAS } from '../data/personaData'
import { getWeather } from '../data/weatherData'
import { ALERTS } from '../data/alertData'
import DashboardPreview from '../components/marketing/DashboardPreview'
import ScrollStory from '../components/marketing/ScrollStory'
import AlertsMarquee from '../components/marketing/AlertsMarquee'
import AlertBanner from '../components/dashboard/AlertBanner'
import AtmosphereScene from '../components/three/LazyAtmosphere'
import Logo from '../components/brand/Logo'
import ThemeToggle from '../components/ui/ThemeToggle'
import Reveal, { RevealGroup, RevealItem } from '../components/ui/Reveal'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import useTilt from '../hooks/useTilt'
import useCountUp from '../hooks/useCountUp'
import { useTranslation } from '../i18n/useTranslation'
import { tCity } from '../i18n/vocab'
import './HomePage.css'

const FEATURES = [
  { icon: Target, titleKey: 'features.personaTitle', descKey: 'features.personaDesc', wide: true },
  { icon: MapPin, titleKey: 'features.locationTitle', descKey: 'features.locationDesc' },
  { icon: Bell, titleKey: 'features.alertsTitle', descKey: 'features.alertsDesc' },
  { icon: Gauge, titleKey: 'features.scoringTitle', descKey: 'features.scoringDesc' },
  { icon: ShieldCheck, titleKey: 'features.severityTitle', descKey: 'features.severityDesc' },
  { icon: Smartphone, titleKey: 'features.mobileTitle', descKey: 'features.mobileDesc' },
]

const STEPS = [
  { num: '01', titleKey: 'steps.oneTitle', descKey: 'steps.oneDesc' },
  { num: '02', titleKey: 'steps.twoTitle', descKey: 'steps.twoDesc' },
  { num: '03', titleKey: 'steps.threeTitle', descKey: 'steps.threeDesc' },
]

const SEVERITY_LEGEND = [
  { status: 'safe', labelKey: 'severity.safe', icon: CheckCircle2 },
  { status: 'info', labelKey: 'severity.info', icon: Info },
  { status: 'caution', labelKey: 'severity.caution', icon: AlertTriangle },
  { status: 'warning', labelKey: 'severity.warning', icon: AlertTriangle },
  { status: 'critical', labelKey: 'severity.critical', icon: ShieldAlert },
]

const STATS = [
  { end: 8, suffix: '', labelKey: 'stats.personasLabel', noteKey: 'stats.personasNote' },
  { end: 30, suffix: '+', labelKey: 'stats.factorsLabel', noteKey: 'stats.factorsNote' },
  { end: 5, suffix: '', labelKey: 'stats.severityLabel', noteKey: 'stats.severityNote' },
  { end: 100, suffix: '%', labelKey: 'stats.explainableLabel', noteKey: 'stats.explainableNote' },
]

/*
  Headlines that highlight one word in a serif accent are stored as a single
  string with an {accent} placeholder, so a translator can move the emphasised
  word to wherever the sentence actually needs it — which is rarely the same
  position as in English.
*/
function AccentHeadline({ template, accent, className, as: Tag = 'h2' }) {
  const [before = '', after = ''] = template.split('{accent}')
  return (
    <Tag className={className}>
      {before}
      <span className="serif-accent">{accent}</span>
      {after}
    </Tag>
  )
}

function TiltCard({ className = '', children, max = 6 }) {
  const ref = useTilt({ max })
  return (
    <div ref={ref} className={`tilt-card ${className}`}>
      {children}
    </div>
  )
}

function Stat({ end, suffix, labelKey, noteKey }) {
  const { t, n } = useTranslation()
  const [ref, value] = useCountUp(end)
  return (
    <div className="stat" ref={ref}>
      <span className="stat-value">
        {n(value)}
        {suffix}
      </span>
      <span className="stat-label">{t(labelKey)}</span>
      <span className="stat-note">{t(noteKey)}</span>
    </div>
  )
}

export default function HomePage({ onGetStarted, onSignIn }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const progressRef = useRef(null)
  const { t, n } = useTranslation()
  const weather = getWeather()
  const sampleAlert = ALERTS[0]

  // Reading-progress hairline under the navbar. Written straight to a CSS
  // custom property so scrolling never triggers a React render.
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const ratio = max > 0 ? window.scrollY / max : 0
      progressRef.current?.style.setProperty('--progress', String(ratio))
      setScrolled(window.scrollY > 24)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleNavClick = (e, id) => {
    e.preventDefault()
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const heroChips = [
    { icon: Wind, label: t('hero.chipAirQuality'), value: n(weather.aqi), note: t(`aqiCategory.${weather.aqiCategory.toLowerCase()}`, null, weather.aqiCategory), tone: 'warning', pos: 'chip-a' },
    { icon: Sun, label: t('hero.chipUvIndex'), value: n(weather.uvIndex), note: t('hero.chipHigh'), tone: 'caution', pos: 'chip-b' },
    { icon: CloudRain, label: t('hero.chipRainChance'), value: `${n(weather.rainProbability)}%`, note: t('hero.chipNext6h'), tone: 'info', pos: 'chip-c' },
  ]

  return (
    <div className="landing">
      {/* ---------------------------------------------------------- Nav */}
      {/* While transparent the navbar floats over the always-dark hero, so it
          borrows the night tokens; once it picks up its glass background it
          follows the active theme again. */}
      <header className={`nav ${scrolled ? 'is-scrolled' : 'night-surface'}`}>
        <div className="nav-inner">
          <a href="#top" onClick={(e) => handleNavClick(e, 'top')} className="nav-logo-link">
            <Logo size={30} />
          </a>

          <nav className="nav-links">
            <a href="#how" onClick={(e) => handleNavClick(e, 'how')}>{t('nav.howItWorks')}</a>
            <a href="#personas" onClick={(e) => handleNavClick(e, 'personas')}>{t('nav.personas')}</a>
            <a href="#alerts" onClick={(e) => handleNavClick(e, 'alerts')}>{t('nav.alerts')}</a>
            <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>{t('nav.features')}</a>
          </nav>

          <div className="nav-actions">
            <LanguageSwitcher className="nav-lang" />
            <ThemeToggle />
            <button type="button" className="btn btn-ghost btn-sm nav-signin" onClick={onSignIn}>
              {t('common.signIn')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onGetStarted}>
              {t('common.getStarted')}
            </button>
            <button
              type="button"
              className="nav-burger"
              aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <div ref={progressRef} className="nav-progress" />
      </header>

      {/* Mobile drawer */}
      <div className={`nav-drawer ${menuOpen ? 'is-open' : ''}`}>
        <nav>
          <a href="#how" onClick={(e) => handleNavClick(e, 'how')}>{t('nav.howItWorks')}</a>
          <a href="#personas" onClick={(e) => handleNavClick(e, 'personas')}>{t('nav.personas')}</a>
          <a href="#alerts" onClick={(e) => handleNavClick(e, 'alerts')}>{t('nav.alerts')}</a>
          <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>{t('nav.features')}</a>
        </nav>
        <div className="nav-drawer-theme">
          {t('language.label')}
          <LanguageSwitcher align="right" />
        </div>
        <div className="nav-drawer-theme">
          {t('common.appearance')}
          <ThemeToggle />
        </div>
        <button type="button" className="btn btn-ghost btn-block" onClick={onSignIn}>{t('common.signIn')}</button>
        <button type="button" className="btn btn-primary btn-block" onClick={onGetStarted}>{t('common.getStarted')}</button>
      </div>

      {/* --------------------------------------------------------- Hero */}
      <section className="hero night-surface" id="top">
        <div className="atmos-backdrop" />
        <div className="hero-scene">
          <AtmosphereScene />
        </div>

        <div className="hero-inner">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}
          >
            <RevealItem>
              <span className="pill">
                <span className="pill-dot" />
                {t('hero.badge')}
              </span>
            </RevealItem>

            <RevealItem>
              <AccentHeadline
                as="h1"
                className="display-1 hero-title"
                template={t('hero.title')}
                accent={t('hero.titleAccent')}
              />
            </RevealItem>

            <RevealItem>
              <p className="lede hero-lede">{t('hero.lede')}</p>
            </RevealItem>

            <RevealItem className="hero-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={onGetStarted}>
                {t('common.getStarted')} <ArrowRight size={16} />
              </button>
              <a href="#how" className="btn btn-glass btn-lg" onClick={(e) => handleNavClick(e, 'how')}>
                {t('hero.seeHow')}
              </a>
            </RevealItem>

            <RevealItem className="hero-stats">
              <div>
                <strong>{n(8)}</strong>
                <span>{t('hero.statPersonas')}</span>
              </div>
              <div>
                <strong>{n(5)}</strong>
                <span>{t('hero.statSeverity')}</span>
              </div>
              <div>
                <strong>{n(100)}%</strong>
                <span>{t('hero.statExplainable')}</span>
              </div>
            </RevealItem>
          </motion.div>

          {/* Floating readouts — they sell "this is a real product", not a poster */}
          <div className="hero-chips" aria-hidden="true">
            {heroChips.map((c, i) => (
              <motion.div
                key={c.label}
                className={`hero-chip ${c.pos} tone-${c.tone}`}
                initial={{ opacity: 0, y: 18, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.16, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="hero-chip-icon"><c.icon size={15} strokeWidth={2.2} /></span>
                <span className="hero-chip-body">
                  <span className="hero-chip-label">{c.label}</span>
                  <span className="hero-chip-value">{c.value} <em>{c.note}</em></span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="hero-marquee" aria-hidden="true">
          <div className="hero-marquee-track">
            {[...PERSONAS, ...PERSONAS].map((p, i) => (
              <span className="hero-marquee-item" key={`${p.id}-${i}`}>
                <p.icon size={14} strokeWidth={2} /> {t(p.titleKey)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Preview */}
      <section className="section preview-section">
        <div className="section-inner">
          <Reveal className="preview-frame">
            <div className="preview-glow" aria-hidden="true" />
            <DashboardPreview weather={weather} />
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- Stats */}
      <section className="section stats-section">
        <div className="section-inner">
          <div className="stats-band surface">
            {STATS.map((s) => (
              <Stat key={s.labelKey} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- How it works */}
      <section className="section" id="how">
        <div className="section-inner">
          <Reveal className="section-head is-centered">
            <span className="eyebrow"><Sparkles size={13} /> {t('steps.eyebrow')}</span>
            <h2 className="display-2">{t('steps.title')}</h2>
          </Reveal>

          <RevealGroup className="steps">
            {STEPS.map((s) => (
              <RevealItem key={s.num}>
                <TiltCard className="step surface">
                  <span className="step-num">{s.num}</span>
                  <h3>{t(s.titleKey)}</h3>
                  <p>{t(s.descKey)}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------- The core idea (scroll story) */}
      <section className="section section-tinted" id="personas">
        <div className="section-inner">
          <Reveal className="section-head is-centered">
            <span className="eyebrow">{t('story.eyebrow')}</span>
            <AccentHeadline
              className="display-2"
              template={t('story.title')}
              accent={t('story.titleAccent')}
            />
            {/* Deliberately not "the panel on the left" — it sits on top once
                the layout collapses to a single column on phones. */}
            <p className="lede">{t('story.lede', { location: tCity(t, weather.location) })}</p>
          </Reveal>

          <ScrollStory />
        </div>
      </section>

      {/* --------------------------------------------------------- Alerts */}
      <section className="section" id="alerts">
        <div className="section-inner">
          <Reveal className="section-head is-centered">
            <span className="eyebrow">{t('alertsSection.eyebrow')}</span>
            <h2 className="display-2">{t('alertsSection.title')}</h2>
          </Reveal>
        </div>

        <Reveal>
          <AlertsMarquee />
        </Reveal>

        <div className="section-inner">
          <Reveal className="alert-showcase">
            <AlertBanner alert={sampleAlert} />
            <div className="severity-legend">
              {SEVERITY_LEGEND.map((s) => (
                <span key={s.status} className={`severity-legend-item status-${s.status}`}>
                  <s.icon size={13} /> {t(s.labelKey)}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- Features */}
      <section className="section section-tinted" id="features">
        <div className="section-inner">
          <Reveal className="section-head is-centered">
            <span className="eyebrow">{t('features.eyebrow')}</span>
            <h2 className="display-2">{t('features.title')}</h2>
          </Reveal>

          <RevealGroup className="feature-grid" stagger={0.06}>
            {FEATURES.map((f) => (
              <RevealItem key={f.titleKey} className={f.wide ? 'is-wide' : ''}>
                <TiltCard className="feature-card surface">
                  <span className="feature-icon">
                    <f.icon size={19} strokeWidth={2} />
                  </span>
                  <h3>{t(f.titleKey)}</h3>
                  <p>{t(f.descKey)}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ------------------------------------------------------ Final CTA */}
      <section className="section cta night-surface">
        <div className="aurora" aria-hidden="true">
          <span /><span /><span />
        </div>
        <Reveal className="cta-inner">
          <AccentHeadline
            className="display-2"
            template={t('cta.title')}
            accent={t('cta.titleAccent')}
          />
          <p className="lede">{t('cta.lede')}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={onGetStarted}>
            {t('common.getStarted')} <ArrowRight size={16} />
          </button>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Logo size={28} />
            <p>{t('footer.tagline')}</p>
          </div>
          <div className="footer-meta">
            <p>{t('footer.meta')}</p>
            <p className="footer-muted">{t('footer.disclaimer')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
