import { useState, useEffect } from 'react'
import { get } from '../services/api'
import './HomePage.css'

export default function HomePage({ onGetStarted }) {
  const [backendStatus, setBackendStatus] = useState('Loading...')
  const [personas] = useState([
    { id: 1, name: 'Health Conscious', icon: '❤️' },
    { id: 2, name: 'Fitness Enthusiast', icon: '🏃' },
    { id: 3, name: 'Beachgoer', icon: '🏖️' },
    { id: 4, name: 'Traveler', icon: '✈️' },
    { id: 5, name: 'Parent', icon: '👨‍👩‍👧' },
    { id: 6, name: 'Gardener', icon: '🌱' },
    { id: 7, name: 'Commuter', icon: '🚗' },
    { id: 8, name: 'Event Planner', icon: '🎉' },
  ])

  useEffect(() => {
    get('/health')
      .then(data => setBackendStatus(data.status))
      .catch(() => setBackendStatus('Backend not connected'))
  }, [])

  return (
    <div className="homepage">
      <header className="header">
        <h1>🌤️ Mausam</h1>
        <p>Personalized Weather for Your Lifestyle</p>
      </header>

      <div className="status-banner">
        <p>Backend Status: {backendStatus}</p>
      </div>

      <section className="personas-section">
        <h2>Choose Your Persona</h2>
        <div className="personas-grid">
          {personas.map(persona => (
            <div key={persona.id} className="persona-card">
              <div className="persona-icon">{persona.icon}</div>
              <p>{persona.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <button className="cta-button" onClick={onGetStarted}>
          Get Started
        </button>
      </section>
    </div>
  )
}
