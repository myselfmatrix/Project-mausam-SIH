import { motion } from 'framer-motion'
import { Loader2, MapPin, Plus, RefreshCw, Star, X } from 'lucide-react'
import { useTranslation } from '../../../i18n/useTranslation'
import { tCity, tCondition, tRegion } from '../../../i18n/vocab'
import { isSamePlace } from '../../../services/geo'
import './Tabs.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

/*
  The saved-locations grid.

  Every card's temperature and condition is live, fetched for all of them in a
  single request (see hooks/useSavedLocations). They used to be fixed numbers
  in a data file, which meant London was 16 degrees and lightly raining
  forever.

  A card whose conditions have not arrived shows a spinner rather than a
  placeholder number: the point of this screen is comparing places, and a
  stand-in figure would make that comparison wrong in a way nothing on screen
  would reveal.
*/

/* Rain and alert colouring follow the same thresholds the metric tiles use,
   so a card and a tile never disagree about whether 65% is worth noticing. */
const rainTone = (percent) => {
  if (!Number.isFinite(percent)) return 'safe'
  if (percent >= 70) return 'warning'
  if (percent >= 50) return 'caution'
  if (percent >= 20) return 'info'
  return 'safe'
}

export default function LocationsTab({ activePlace, onSelectPlace, onAddLocation, saved }) {
  const { t, n } = useTranslation()
  const { locations, removeLocation, conditionFor, isLoadingConditions, refreshConditions } = saved

  return (
    <motion.div className="tab-panel" initial="hidden" animate="show" variants={stagger}>
      <motion.div className="tab-header" variants={fadeUp}>
        <h1>{t('locations.title')}</h1>
        <p>{t('locations.subtitle')}</p>
      </motion.div>

      <motion.div className="locations-toolbar" variants={fadeUp}>
        <span className="section-label">{t('locations.savedCount', { count: locations.length })}</span>
        <div className="locations-toolbar-actions">
          <button
            type="button"
            className="btn-ghost-sm"
            onClick={refreshConditions}
            disabled={isLoadingConditions}
            aria-label={t('locations.refresh')}
          >
            <RefreshCw size={14} className={isLoadingConditions ? 'lp-spin' : ''} />
            {t('locations.refresh')}
          </button>
          <button type="button" className="btn-primary-sm" onClick={onAddLocation}>
            <Plus size={15} /> {t('locations.add')}
          </button>
        </div>
      </motion.div>

      <motion.div className="locations-grid" variants={stagger}>
        {locations.map((loc) => {
          const isPrimary = isSamePlace(loc, activePlace)
          const now = conditionFor(loc)

          return (
            <motion.div
              className={`location-card ${isPrimary ? 'is-primary' : ''}`}
              key={loc.id}
              variants={fadeUp}
            >
              <div className="location-card-top">
                <span className="location-card-category">
                  {loc.label || (loc.labelKey ? t(loc.labelKey) : t('locationCategory.saved'))}
                </span>
                {isPrimary ? (
                  <span className="location-card-primary">{t('locations.primary')}</span>
                ) : (
                  <button
                    type="button"
                    className="location-card-remove"
                    onClick={() => removeLocation(loc.id)}
                    aria-label={t('locations.remove', { city: tCity(t, loc.name) })}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <p className="location-card-city">{tCity(t, loc.name)}</p>
              <p className="location-card-region">{tRegion(t, loc.region)}</p>

              <div className="location-card-bottom">
                {now ? (
                  <>
                    <div>
                      <span className="location-card-temp">{n(now.temperature)}°</span>
                      <p className="location-card-condition">{tCondition(t, now.condition)}</p>
                    </div>
                    <span
                      className={`location-card-status status-${rainTone(now.rainProbability)}`}
                      title={t('locations.rainChance', { percent: n(now.rainProbability) })}
                    />
                  </>
                ) : (
                  <div className="location-card-pending">
                    <Loader2 size={15} className="lp-spin" />
                    <span>{t('locations.loadingNow')}</span>
                  </div>
                )}
              </div>

              {now ? (
                <p className="location-card-range">
                  {t('locations.highLow', { high: n(now.high), low: n(now.low) })}
                  {Number.isFinite(now.rainProbability)
                    ? ` · ${t('locations.rainChance', { percent: n(now.rainProbability) })}`
                    : ''}
                </p>
              ) : null}

              {!isPrimary && (
                <button
                  type="button"
                  className="btn-ghost-sm location-card-action"
                  onClick={() => onSelectPlace?.(loc)}
                >
                  <Star size={13} />
                  {t('locations.setPrimary')}
                </button>
              )}
            </motion.div>
          )
        })}

        <motion.button
          type="button"
          className="add-location-card"
          onClick={onAddLocation}
          variants={fadeUp}
        >
          <span className="add-location-card-icon">
            <MapPin size={20} />
          </span>
          {t('locations.addNew')}
          <span className="add-location-card-hint">{t('locations.addHint')}</span>
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
