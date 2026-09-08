import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Star } from 'lucide-react'
import { SAVED_LOCATIONS } from '../../../data/locationData'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

// Local-only for this prototype (SAVED_LOCATIONS is mock data). Wire this up
// to /api/users/locations once the backend endpoint returns full weather
// summaries per saved location, not just a location name.
export default function LocationsTab() {
  const [locations, setLocations] = useState(SAVED_LOCATIONS)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')

  const handleRemove = (id) => {
    setLocations((prev) => prev.filter((l) => l.id !== id))
  }

  const handleSetPrimary = (id) => {
    setLocations((prev) => prev.map((l) => ({ ...l, isPrimary: l.id === id })))
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!city.trim()) return
    setLocations((prev) => [
      ...prev,
      {
        id: `loc-${Date.now()}`,
        category: category.trim() || 'Saved',
        city: city.trim(),
        region: '',
        temperature: 28,
        condition: 'Clear',
        rainProbability: 10,
        alertStatus: 'safe',
        isPrimary: false,
      },
    ])
    setCategory('')
    setCity('')
    setShowForm(false)
  }

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>Saved Locations</h1>
        <p>Weather for the places that matter to your routine.</p>
      </motion.div>

      <motion.div className="locations-toolbar" variants={fadeUp}>
        <span className="section-label">{locations.length} saved</span>
        <button type="button" className="btn-primary-sm" onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> Add location
        </button>
      </motion.div>

      {showForm && (
        <motion.form
          className="add-location-form"
          onSubmit={handleAdd}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="add-location-form-row">
            <input
              className="form-input"
              placeholder="Label (e.g. Home, Office)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className="form-input"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className="add-location-form-actions">
            <button type="button" className="btn-ghost-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary-sm">
              Save location
            </button>
          </div>
        </motion.form>
      )}

      <motion.div className="locations-grid" variants={stagger}>
        {locations.map((loc) => (
          <motion.div className="location-card" key={loc.id} variants={fadeUp}>
            <div className="location-card-top">
              <span className="location-card-category">{loc.category}</span>
              {loc.isPrimary ? (
                <span className="location-card-primary">Primary</span>
              ) : (
                <button
                  type="button"
                  className="location-card-remove"
                  onClick={() => handleRemove(loc.id)}
                  aria-label={`Remove ${loc.city}`}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <p className="location-card-city">{loc.city}</p>
            <p className="location-card-region">{loc.region}</p>
            <div className="location-card-bottom">
              <div>
                <span className="location-card-temp">{loc.temperature}°</span>
                <p className="location-card-condition">{loc.condition}</p>
              </div>
              <span className={`location-card-status status-${loc.alertStatus}`} title={loc.alertStatus} />
            </div>
            {!loc.isPrimary && (
              <button type="button" className="btn-ghost-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => handleSetPrimary(loc.id)}>
                <Star size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                Set as primary
              </button>
            )}
          </motion.div>
        ))}

        <motion.button type="button" className="add-location-card" onClick={() => setShowForm(true)} variants={fadeUp}>
          <Plus size={22} />
          Add a new location
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
