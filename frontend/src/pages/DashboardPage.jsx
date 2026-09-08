import { useState, useEffect } from 'react'
import { get, post } from '../services/api'
import './DashboardPage.css'

export default function DashboardPage({ userId, userPersona, onPersonaSelect }) {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState('Delhi')

  useEffect(() => {
    fetchWeather()
  }, [userPersona, location])

  const fetchWeather = async () => {
    setLoading(true)
    try {
      const data = await get(`/weather/personalized/data?personaType=${userPersona}&location=${location}`)
      setWeather(data)
    } catch (error) {
      console.error('Failed to fetch weather:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePersonaChange = async (newPersona) => {
    try {
      await post('/users/persona', { userId, persona: newPersona })
      onPersonaSelect(newPersona)
    } catch (error) {
      console.error('Failed to update persona:', error)
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🌤️ Mausam Dashboard</h1>
        <button onClick={() => {
          localStorage.removeItem('userId')
          window.location.reload()
        }}>
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <section className="persona-selector">
          <h2>Change Persona</h2>
          <div className="persona-buttons">
            {[
              { id: 'health', name: '❤️ Health', label: 'Health Conscious' },
              { id: 'fitness', name: '🏃 Fitness', label: 'Fitness' },
              { id: 'beach', name: '🏖️ Beach', label: 'Beach' },
              { id: 'travel', name: '✈️ Travel', label: 'Travel' },
              { id: 'parent', name: '👨‍👩‍👧 Parent', label: 'Parent' },
              { id: 'gardener', name: '🌱 Gardener', label: 'Gardener' },
              { id: 'commuter', name: '🚗 Commuter', label: 'Commuter' },
              { id: 'event', name: '🎉 Event', label: 'Event Planner' }
            ].map(p => (
              <button
                key={p.id}
                className={`persona-btn ${userPersona === p.id ? 'active' : ''}`}
                onClick={() => handlePersonaChange(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        <section className="weather-section">
          <h2>Weather for {location}</h2>
          <div className="location-input">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
            />
            <button onClick={fetchWeather}>Search</button>
          </div>

          {loading ? (
            <p>Loading weather data...</p>
          ) : weather ? (
            <div className="weather-cards">
              <div className="weather-card">
                <h3>Current Weather</h3>
                <div className="weather-info">
                  <p className="temp">{weather.weather.temperature}°C</p>
                  <p className="condition">{weather.weather.condition}</p>
                  <p className="feels-like">Feels like: {weather.weather.feelsLike}°C</p>
                </div>
              </div>

              <div className="weather-card">
                <h3>Details</h3>
                <ul className="details-list">
                  <li>Humidity: {weather.weather.humidity}%</li>
                  <li>Wind Speed: {weather.weather.windSpeed} km/h</li>
                  <li>Visibility: {weather.weather.visibility} km</li>
                  <li>Pressure: {weather.weather.pressure} mb</li>
                  <li>Sunrise: {weather.weather.sunrise}</li>
                  <li>Sunset: {weather.weather.sunset}</li>
                </ul>
              </div>

              <div className="weather-card">
                <h3>Health Indicators</h3>
                <ul className="details-list">
                  <li>AQI: {weather.weather.aqi}</li>
                  <li>UV Index: {weather.weather.uvIndex}</li>
                </ul>
              </div>

              <div className="weather-card recommendation">
                <h3>Recommendation</h3>
                <p>{weather.recommendation}</p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
