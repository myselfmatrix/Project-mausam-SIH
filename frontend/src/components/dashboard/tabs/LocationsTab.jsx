import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Star } from 'lucide-react'
import { SAVED_LOCATIONS } from '../../../data/locationData'
import { useTranslation } from '../../../i18n/useTranslation'
import { tCity, tCondition, tRegion } from '../../../i18n/vocab'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

// The saved-locations list itself (SAVED_LOCATIONS) is local-only mock data
// for this prototype — wire it to /api/users/locations once that endpoint
// returns full weather summaries per saved location, not just a name.
// "Primary" is NOT tracked locally, though: it's derived from `activeLocation`
// (owned by DashboardPage, persisted to localStorage) so that setting a card
// as primary actually drives what the rest of the dashboard displays, instead
// of just flipping a cosmetic badge that nothing else reads.
export default function LocationsTab({ activeLocation, onSetPrimary }) {
  const { t, n } = useTranslation()
  const [locations, setLocations] = useState(SAVED_LOCATIONS)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')

  const handleRemove = (id) => {
    setLocations((prev) => prev.filter((l) => l.id !== id))
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!city.trim()) return
    setLocations((prev) => [
      ...prev,
      {
        id: `loc-${Date.now()}`,
        // A label the user typed is theirs, in their words; only the fallback
        // comes from the catalog.
        category: category.trim() || undefined,
        categoryKey: category.trim() ? undefined : 'locationCategory.saved',
        city: city.trim(),
        region: '',
        temperature: 28,
        condition: 'Clear',
        rainProbability: 10,
        alertStatus: 'safe',
      },
    ])
    setCategory('')
    setCity('')
    setShowForm(false)
  }

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>{t('locations.title')}</h1>
        <p>{t('locations.subtitle')}</p>
      </motion.div>

      <motion.div className="locations-toolbar" variants={fadeUp}>
        <span className="section-label">{t('locations.savedCount', { count: locations.length })}</span>
        <button type="button" className="btn-primary-sm" onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> {t('locations.add')}
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
              placeholder={t('locations.labelPlaceholder')}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className="form-input"
              placeholder={t('locations.cityPlaceholder')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className="add-location-form-actions">
            <button type="button" className="btn-ghost-sm" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary-sm">
              {t('locations.saveLocation')}
            </button>
          </div>
        </motion.form>
      )}

      <motion.div className="locations-grid" variants={stagger}>
        {locations.map((loc) => {
          const isPrimary = loc.city === activeLocation
          return (
            <motion.div className={`location-card ${isPrimary ? 'is-primary' : ''}`} key={loc.id} variants={fadeUp}>
              <div className="location-card-top">
                <span className="location-card-category">
                  {loc.categoryKey ? t(loc.categoryKey) : loc.category}
                </span>
                {isPrimary ? (
                  <span className="location-card-primary">{t('locations.primary')}</span>
                ) : (
                  <button
                    type="button"
                    className="location-card-remove"
                    onClick={() => handleRemove(loc.id)}
                    aria-label={t('locations.remove', { city: tCity(t, loc.city) })}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <p className="location-card-city">{tCity(t, loc.city)}</p>
              <p className="location-card-region">{tRegion(t, loc.region)}</p>
              <div className="location-card-bottom">
                <div>
                  <span className="location-card-temp">{n(loc.temperature)}°</span>
                  <p className="location-card-condition">{tCondition(t, loc.condition)}</p>
                </div>
                <span className={`location-card-status status-${loc.alertStatus}`} title={loc.alertStatus} />
              </div>
              {!isPrimary && (
                <button
                  type="button"
                  className="btn-ghost-sm"
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={() => onSetPrimary?.(loc.city)}
                >
                  <Star size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                  {t('locations.setPrimary')}
                </button>
              )}
            </motion.div>
          )
        })}

        <motion.button type="button" className="add-location-card" onClick={() => setShowForm(true)} variants={fadeUp}>
          <Plus size={22} />
          {t('locations.addNew')}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
