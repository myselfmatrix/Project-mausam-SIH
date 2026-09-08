import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Menu, X, ArrowRight, Target, MapPin, Bell, Gauge, ShieldCheck, Smartphone,
  Info, AlertTriangle, ShieldAlert, CheckCircle2,
} from 'lucide-react'
import { PERSONAS } from '../data/personaData'
import { getWeather } from '../data/weatherData'
import { ALERTS } from '../data/alertData'
import DashboardPreview from '../components/marketing/DashboardPreview'
import PersonaDemo from '../components/marketing/PersonaDemo'
import AlertBanner from '../components/dashboard/AlertBanner'
import './HomePage.css'

const FEATURES = [
  { icon: Target, title: 'Persona intelligence', desc: 'The same forecast, re-prioritized around what actually affects your day.' },
  { icon: MapPin, title: 'Multi-location', desc: 'Track home, work, college or a travel destination side by side.' },
  { icon: Bell, title: 'Alerts that explain why', desc: 'What, when, why it matters, and what to do — not just a number.' },
  { icon: Gauge, title: 'Transparent comfort scoring', desc: 'A rule-based score you can trace back to the factors behind it.' },
  { icon: ShieldCheck, title: 'Clear severity levels', desc: 'Consistent, color-coded status from safe to critical across the app.' },
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

export default function HomePage({ onGetStarted, onSignIn }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const weather = getWeather()
  const sampleAlert = ALERTS[0]

  const handleNavClick = (e, id) => {
    e.preventDefault()
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="landing">
      <header className="l-navbar">
        <div className="l-navbar-inner">
          <a href="#top" className="l-logo" onClick={(e) => handleNavClick(e, 'top')}>
            <span className="l-logo-mark">M</span> MAUSAM
          </a>

          <nav className={`l-nav-links ${menuOpen ? 'is-open' : ''}`}>
            <a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')}>How it works</a>
            <a href="#personas" onClick={(e) => handleNavClick(e, 'personas')}>Personas</a>
            <a href="#alerts" onClick={(e) => handleNavClick(e, 'alerts')}>Alerts</a>
            <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>Features</a>
            <div className="l-nav-links-actions">
              <button type="button" className="btn-outline" onClick={onSignIn}>Sign In</button>
              <button type="button" className="btn-solid" onClick={onGetStarted}>Get Started</button>
            </div>
          </nav>

          <div className="l-navbar-actions">
            <button type="button" className="btn-outline btn-sm l-desktop-only" onClick={onSignIn}>Sign In</button>
            <button type="button" className="btn-solid btn-sm" onClick={onGetStarted}>Get Started</button>
            <button type="button" className="l-burger" aria-label="Toggle menu" onClick={() => setMenuOpen((v) => !v)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <section className="l-hero" id="top">
        <motion.div className="l-hero-text" initial="hidden" animate="show" variants={stagger}>
          <motion.span className="l-badge" variants={fadeUp}>
            Smart India Hackathon 2026 · SIH26076
          </motion.span>
          <motion.h1 variants={fadeUp}>Weather that understands what matters to you.</motion.h1>
          <motion.p className="l-hero-sub" variants={fadeUp}>
            MAUSAM turns raw weather data into personalized insights, contextual information and
            actionable alerts — built around who you are, not just where you are.
          </motion.p>
          <motion.div className="l-hero-actions" variants={fadeUp}>
            <button type="button" className="btn-solid btn-lg" onClick={onGetStarted}>
              Get Started <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="btn-outline btn-lg" onClick={(e) => handleNavClick(e, 'how-it-works')}>
              See how it works
            </a>
          </motion.div>
          <motion.div className="l-hero-trust" variants={fadeUp}>
            {PERSONAS.slice(0, 6).map((p) => (
              <span key={p.id} className="l-trust-icon" title={p.title}>
                <p.icon size={15} strokeWidth={2} />
              </span>
            ))}
            <span className="l-trust-text">8 personas, one weather feed</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="l-hero-visual"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <DashboardPreview weather={weather} />
        </motion.div>
      </section>

      <section className="l-section" id="how-it-works">
        <motion.div className="l-section-head" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <span className="l-eyebrow">How it works</span>
          <h2>Three steps to a homepage that fits your day</h2>
        </motion.div>

        <motion.div className="l-steps" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          {STEPS.map((s) => (
            <motion.div className="l-step" key={s.num} variants={fadeUp}>
              <span className="l-step-num">{s.num}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="l-section l-section-alt" id="personalized">
        <motion.div className="l-section-head" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <span className="l-eyebrow">The core idea</span>
          <h2>The same weather. A different homepage for everyone.</h2>
          <p>Tap a persona below — the priority cards update from live mock conditions, not a static screenshot.</p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <PersonaDemo />
        </motion.div>
      </section>

      <section className="l-section" id="personas">
        <motion.div className="l-section-head" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <span className="l-eyebrow">Built for 8 kinds of days</span>
          <h2>Whoever you are today, MAUSAM has a lens for it</h2>
        </motion.div>

        <motion.div className="l-personas-grid" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          {PERSONAS.map((p) => (
            <motion.div className="l-persona-card" key={p.id} variants={fadeUp}>
              <span className="l-persona-icon">
                <p.icon size={20} strokeWidth={2} />
              </span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="l-section l-section-alt" id="alerts">
        <motion.div className="l-section-head" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <span className="l-eyebrow">Smart alerts</span>
          <h2>Alerts that tell you what, when, why — and what to do</h2>
        </motion.div>

        <motion.div className="l-alert-showcase" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <AlertBanner alert={sampleAlert} />
          <div className="severity-legend">
            {SEVERITY_LEGEND.map((s) => (
              <span key={s.status} className={`severity-legend-item status-${s.status}`}>
                <s.icon size={13} /> {s.label}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="l-section" id="features">
        <motion.div className="l-section-head" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <span className="l-eyebrow">Why MAUSAM</span>
          <h2>Everything a weather product needs to feel trustworthy</h2>
        </motion.div>

        <motion.div className="l-features-grid" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
          {FEATURES.map((f) => (
            <motion.div className="l-feature-card" key={f.title} variants={fadeUp}>
              <span className="l-feature-icon">
                <f.icon size={19} strokeWidth={2} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="l-final-cta">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <h2>Ready to see weather differently?</h2>
          <p>Create an account and get a homepage that actually understands your day.</p>
          <button type="button" className="btn-solid btn-lg" onClick={onGetStarted}>
            Get Started <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      <footer className="l-footer">
        <span className="l-logo"><span className="l-logo-mark">M</span> MAUSAM</span>
        <p>Prototype for Smart India Hackathon 2026 · Problem Statement SIH26076</p>
        <p className="l-footer-muted">Conceptual submission for the Ministry of Earth Sciences (IMD) — Smart Automation theme.</p>
      </footer>
    </div>
  )
}
