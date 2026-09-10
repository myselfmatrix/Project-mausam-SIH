import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, WifiOff, RotateCw, LogOut } from 'lucide-react'
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

// Units/data-saver/offline-preview are local UI state for this prototype —
// wire units to a real /api/users/preferences call when it exists; the
// offline banner just demonstrates the intended state, no service worker yet.
export default function SettingsTab({ userName, userEmail, onLogout }) {
  const [tempUnit, setTempUnit] = useState('C')
  const [speedUnit, setSpeedUnit] = useState('km/h')
  const [dataSaver, setDataSaver] = useState(false)
  const [offlinePreview, setOfflinePreview] = useState(false)
  const [voiceLang, setVoiceLang] = useState('English')
  const [isPlaying, setIsPlaying] = useState(false)

  // No narration audio exists yet — this simulates playback timing so the
  // control gives real feedback instead of sitting dead when clicked.
  useEffect(() => {
    if (!isPlaying) return
    const id = setTimeout(() => setIsPlaying(false), 4000)
    return () => clearTimeout(id)
  }, [isPlaying])

  const initial = (userName || userEmail || 'M')[0].toUpperCase()

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>Settings</h1>
        <p>Your profile, units and connectivity preferences.</p>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <div className="profile-header">
          <span className="profile-avatar">{initial}</span>
          <div>
            <p className="profile-name">{userName || 'Mausam User'}</p>
            <p className="profile-email">{userEmail || 'you@example.com'}</p>
          </div>
        </div>
        <button type="button" className="btn-ghost-sm" onClick={onLogout} style={{ alignSelf: 'flex-start' }}>
          <LogOut size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          Log out
        </button>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">Units</p>
        <div className="settings-row">
          <span className="settings-row-label">Temperature</span>
          <div className="segmented">
            <button type="button" className={tempUnit === 'C' ? 'is-active' : ''} onClick={() => setTempUnit('C')}>°C</button>
            <button type="button" className={tempUnit === 'F' ? 'is-active' : ''} onClick={() => setTempUnit('F')}>°F</button>
          </div>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Wind speed</span>
          <div className="segmented">
            <button type="button" className={speedUnit === 'km/h' ? 'is-active' : ''} onClick={() => setSpeedUnit('km/h')}>km/h</button>
            <button type="button" className={speedUnit === 'mph' ? 'is-active' : ''} onClick={() => setSpeedUnit('mph')}>mph</button>
          </div>
        </div>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">Today's Weather Brief</p>
        <div className="voice-brief-card" style={{ border: 'none', padding: 0 }}>
          <button
            type="button"
            className={`voice-brief-play ${isPlaying ? 'is-playing' : ''}`}
            onClick={() => setIsPlaying((v) => !v)}
            aria-label={isPlaying ? 'Pause brief' : 'Play brief'}
            aria-pressed={isPlaying}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <div className="voice-brief-body">
            <p className="voice-brief-title">30-second audio summary</p>
            <p className="voice-brief-meta">
              {isPlaying ? 'Playing… (narration audio coming soon)' : 'Tap play for a spoken summary'}
            </p>
          </div>
          <select className="voice-lang-select" value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)}>
            <option>English</option>
            <option>Hindi</option>
            <option>Bengali</option>
            <option>Tamil</option>
            <option>Telugu</option>
          </select>
        </div>
      </motion.div>

      <motion.div className="settings-card" variants={fadeUp}>
        <p className="settings-card-title">Connectivity</p>
        <div className="settings-row">
          <div>
            <p className="settings-row-label">Data Saver Mode</p>
            <p className="settings-row-desc">Prioritize temperature, alerts & rain only</p>
          </div>
          <Toggle on={dataSaver} onClick={() => setDataSaver((v) => !v)} label="Toggle data saver mode" />
        </div>
        {dataSaver && <span className="data-saver-pill">Data Saver active</span>}

        <div className="settings-row">
          <div>
            <p className="settings-row-label">Preview offline state</p>
            <p className="settings-row-desc">See how MAUSAM looks with no connection</p>
          </div>
          <Toggle on={offlinePreview} onClick={() => setOfflinePreview((v) => !v)} label="Toggle offline preview" />
        </div>
        {offlinePreview && (
          <div className="offline-banner">
            <WifiOff size={16} />
            You're offline — showing weather data from 12 minutes ago.
            <button type="button" className="offline-banner-retry" onClick={() => setOfflinePreview(false)}>
              <RotateCw size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
              Retry
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
