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
import useTilt from '../hooks/useTilt'
import useCountUp from '../hooks/useCountUp'
import './HomePage.css'

const FEATURES = [
  { icon: Target, title: 'Persona intelligence', desc: 'The same forecast, re-prioritized around what actually affects your day.', wide: true },
  { icon: MapPin, title: 'Multi-location', desc: 'Track home, work, college or a travel destination side by side.' },
  { icon: Bell, title: 'Alerts that explain why', desc: 'What, when, why it matters, and what to do — not just a number.' },
  { icon: Gauge, title: 'Transparent scoring', desc: 'A rule-based comfort score you can trace back to the factors behind it.' },
  { icon: ShieldCheck, title: 'Clear severity levels', desc: 'Consistent, colour-coded status from safe to critical across the app.' },
  { icon: Smartphone, title: 'Built mobile-first', desc: 'Designed for the phone in your pocket, not squeezed onto one.' },
]

const STEPS = [
  { num: '01', title: 'Tell us what matters', desc: 'Pick the persona closest to your day-to-day — health, fitness, travel, farming and more.' },
  { num: '02', title: 'We read the sky differently', desc: 'The same weather data gets mapped to the factors your persona actually cares about.' },
  { num: '03', title: 'Get prioritized insights', desc: 'Open your dashboard to a homepage ordered around what to do next, not raw numbers.' },
]

const SEVERITY_LEGEND = [
  { status: 'safe', label: 'Safe', icon: CheckCircle2 },
  { status: 'info', label: 'Information', icon: Info },
  { status: 'caution', label: 'Caution', icon: AlertTriangle },
  { status: 'warning', label: 'Warning', icon: AlertTriangle },
  { status: 'critical', label: 'Critical', icon: ShieldAlert },
]

const STATS = [
  { end: 8, suffix: '', label: 'Personas', note: 'One feed, eight lenses' },
  { end: 30, suffix: '+', label: 'Weather factors', note: 'Mapped and weighted' },
  { end: 5, suffix: '', label: 'Severity levels', note: 'Safe through critical' },
  { end: 100, suffix: '%', label: 'Explainable', note: 'Rule-based, not a black box' },
]

function TiltCard({ className = '', children, max = 6 }) {
  const ref = useTilt({ max })
  return (
    <div ref={ref} className={`tilt-card ${className}`}>
      {children}
    </div>
  )
}

function Stat({ end, suffix, label, note }) {
  const [ref, value] = useCountUp(end)
  return (
    <div className="stat" ref={ref}>
      <span className="stat-value">
        {value}
        {suffix}
      </span>
      <span className="stat-label">{label}</span>
      <span className="stat-note">{note}</span>
    </div>
  )
}

export default function HomePage({ onGetStarted, onSignIn }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const progressRef = useRef(null)
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
    { icon: Wind, label: 'Air quality', value: `${weather.aqi}`, note: weather.aqiCategory, tone: 'warning', pos: 'chip-a' },
    { icon: Sun, label: 'UV index', value: `${weather.uvIndex}`, note: 'High', tone: 'caution', pos: 'chip-b' },
    { icon: CloudRain, label: 'Rain chance', value: `${weather.rainProbability}%`, note: 'Next 6h', tone: 'info', pos: 'chip-c' },
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
            <a href="#how" onClick={(e) => handleNavClick(e, 'how')}>How it works</a>
            <a href="#personas" onClick={(e) => handleNavClick(e, 'personas')}>Personas</a>
            <a href="#alerts" onClick={(e) => handleNavClick(e, 'alerts')}>Alerts</a>
            <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>Features</a>
          </nav>

          <div className="nav-actions">
            <ThemeToggle />
            <button type="button" className="btn btn-ghost btn-sm nav-signin" onClick={onSignIn}>
              Sign in
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onGetStarted}>
              Get started
            </button>
            <button
              type="button"
              className="nav-burger"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
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
          <a href="#how" onClick={(e) => handleNavClick(e, 'how')}>How it works</a>
          <a href="#personas" onClick={(e) => handleNavClick(e, 'personas')}>Personas</a>
          <a href="#alerts" onClick={(e) => handleNavClick(e, 'alerts')}>Alerts</a>
          <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>Features</a>
        </nav>
        <div className="nav-drawer-theme">
          Appearance
          <ThemeToggle />
        </div>
        <button type="button" className="btn btn-ghost btn-block" onClick={onSignIn}>Sign in</button>
        <button type="button" className="btn btn-primary btn-block" onClick={onGetStarted}>Get started</button>
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
                Smart India Hackathon 2026 · SIH26076
              </span>
            </RevealItem>

            <RevealItem>
              <h1 className="display-1 hero-title">
                Weather that <span className="serif-accent">understands</span> the day you’re having.
              </h1>
            </RevealItem>

            <RevealItem>
              <p className="lede hero-lede">
                MAUSAM turns one raw forecast into eight different homepages — each ordered around
                the conditions that actually change what you do next.
              </p>
            </RevealItem>

            <RevealItem className="hero-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={onGetStarted}>
                Get started <ArrowRight size={16} />
              </button>
              <a href="#how" className="btn btn-glass btn-lg" onClick={(e) => handleNavClick(e, 'how')}>
                See how it works
              </a>
            </RevealItem>

            <RevealItem className="hero-stats">
              <div>
                <strong>8</strong>
                <span>personas</span>
              </div>
              <div>
                <strong>5</strong>
                <span>severity levels</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>explainable rules</span>
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
                <p.icon size={14} strokeWidth={2} /> {p.title}
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
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- How it works */}
      <section className="section" id="how">
        <div className="section-inner">
          <Reveal className="section-head is-centered">
            <span className="eyebrow"><Sparkles size={13} /> How it works</span>
            <h2 className="display-2">Three steps to a homepage that fits your day</h2>
          </Reveal>

          <RevealGroup className="steps">
            {STEPS.map((s) => (
              <RevealItem key={s.num}>
                <TiltCard className="step surface">
                  <span className="step-num">{s.num}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
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
            <span className="eyebrow">The core idea</span>
            <h2 className="display-2">
              One sky. <span className="serif-accent">Eight</span> different days.
            </h2>
            {/* Deliberately not "the panel on the left" — it sits on top once
                the layout collapses to a single column on phones. */}
            <p className="lede">
              Keep scrolling — the dashboard panel re-sorts itself for every persona, from the exact
              same {weather.location} forecast.
            </p>
          </Reveal>

          <ScrollStory />
        </div>
      </section>

      {/* --------------------------------------------------------- Alerts */}
      <section className="section" id="alerts">
        <div className="section-inner">
          <Reveal className="section-head is-centered">
            <span className="eyebrow">Smart alerts</span>
            <h2 className="display-2">Alerts that tell you what, when, why — and what to do</h2>
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
                  <s.icon size={13} /> {s.label}
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
            <span className="eyebrow">Why MAUSAM</span>
            <h2 className="display-2">Everything a weather product needs to feel trustworthy</h2>
          </Reveal>

          <RevealGroup className="feature-grid" stagger={0.06}>
            {FEATURES.map((f) => (
              <RevealItem key={f.title} className={f.wide ? 'is-wide' : ''}>
                <TiltCard className="feature-card surface">
                  <span className="feature-icon">
                    <f.icon size={19} strokeWidth={2} />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
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
          <h2 className="display-2">
            Ready to see weather <span className="serif-accent">differently</span>?
          </h2>
          <p className="lede">Create an account and get a homepage that actually understands your day.</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={onGetStarted}>
            Get started <ArrowRight size={16} />
          </button>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Logo size={28} />
            <p>Personalized weather intelligence — one forecast, eight ways of reading it.</p>
          </div>
          <div className="footer-meta">
            <p>Prototype for Smart India Hackathon 2026 · Problem Statement SIH26076</p>
            <p className="footer-muted">
              Conceptual student submission for the Ministry of Earth Sciences (IMD) Smart Automation
              theme. Not an official IMD product, and weather values shown are mock data.
              Globe and Moon imagery: NASA Visible Earth (Blue Marble / Black Marble), public domain.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
