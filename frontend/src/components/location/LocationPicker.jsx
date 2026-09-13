import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check, Crosshair, Loader2, MapPin, Plus, Search, Sparkles, X,
} from 'lucide-react'
import PickerGlobe from './PickerGlobe'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useTranslation } from '../../i18n/useTranslation'
import { tCity, tCondition, tRegion } from '../../i18n/vocab'
import {
  bulkConditions, distanceKm, isSamePlace, popularPlaces, reverseGeocode, searchPlaces,
} from '../../services/geo'
import './LocationPicker.css'

/*
  The location picker.

  Four ways to choose a place, because no single one covers everyone: search
  by name, use the device's GPS, pick from what you have saved, or spin the
  globe and tap a point. The globe is the reason the last of those exists at
  all - a flat list cannot tell you what is on the coast, and a map of India
  cannot show you that your destination is on the far side of a cyclone.

  Selection is two steps on purpose. Tapping a result moves the globe and
  loads that place's live conditions into a card; confirming is a second tap.
  The intermediate state is what makes the choice reviewable - you can see
  that "Kota" is the one in Rajasthan and that it is 34 degrees there before
  you commit your whole dashboard to it.
*/

// Long enough that typing a city name is one request rather than eight, short
// enough that results feel like they are keeping up.
const SEARCH_DEBOUNCE_MS = 260

// After the globe is spun by hand, wait for it to settle before asking what
// place is now in the crosshair.
const REVERSE_DEBOUNCE_MS = 520

export default function LocationPicker({
  open, activePlace, savedLocations = [], onSelect, onSave, onClose,
}) {
  const { t, n, language } = useTranslation()
  const geolocation = useGeolocation()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setSearching] = useState(false)
  const [popular, setPopular] = useState([])
  const [highlight, setHighlight] = useState(-1)
  const [selection, setSelection] = useState(() => activePlace)
  const [preview, setPreview] = useState(null)
  const [isNaming, setNaming] = useState(false)

  const inputRef = useRef(null)
  const searchAbort = useRef(null)
  const previewAbort = useRef(null)
  // True when the selection came from a hand-spin, which is the only case that
  // needs a reverse lookup to find out what was selected.
  const needsNaming = useRef(false)

  /* ---------------------------------------------------------------- */
  /* Opening and closing                                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!open) return undefined
    setSelection(activePlace)
    setQuery('')
    setResults([])
    setHighlight(-1)
    needsNaming.current = false

    /*
      Focus the search box, but not on a touch device.

      Focusing an input on a phone raises the keyboard, which would cover the
      globe the moment the picker opens - the one screen where the visual is
      the point. On a pointer device there is no such cost and typing
      immediately is the fastest path.
    */
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    if (!isTouch) {
      const timer = setTimeout(() => inputRef.current?.focus(), 180)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [open, activePlace])

  // The page behind a full-screen modal must not scroll under it.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /* ---------------------------------------------------------------- */
  /* Search                                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!open) return undefined
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      searchAbort.current?.abort()
      setResults([])
      setSearching(false)
      return undefined
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      // Cancel the previous request so a slow answer for "luc" cannot land
      // after the answer for "lucknow" and replace it.
      searchAbort.current?.abort()
      const controller = new AbortController()
      searchAbort.current = controller

      try {
        const found = await searchPlaces(trimmed, { lang: language, count: 8, signal: controller.signal })
        if (controller.signal.aborted) return
        setResults(found)
        setHighlight(found.length > 0 ? 0 : -1)
        setSearching(false)
      } catch {
        // Superseded by a newer keystroke; that request owns the state now.
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, language, open])

  // Popular cities, fetched once per language for the opening screen.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    popularPlaces({ lang: language }).then((list) => {
      if (!cancelled) setPopular(list)
    })
    // eslint-disable-next-line consistent-return
    return () => { cancelled = true }
  }, [open, language])

  /* ---------------------------------------------------------------- */
  /* Live conditions for whatever is selected                         */
  /* ---------------------------------------------------------------- */

  /*
    The preview card shows real conditions, fetched per selection.

    It is deliberately the bulk endpoint with a single point rather than the
    full forecast: the card needs a temperature and a condition, and asking
    for the whole payload - air quality, marine, seven days - to fill two
    lines would be wasteful on every arrow-key press.
  */
  useEffect(() => {
    if (!open || !selection || !Number.isFinite(selection.lat)) {
      setPreview(null)
      return undefined
    }

    previewAbort.current?.abort()
    const controller = new AbortController()
    previewAbort.current = controller
    setPreview(null)

    bulkConditions([selection], { signal: controller.signal }).then(([row]) => {
      if (!controller.signal.aborted && row) setPreview(row)
    })

    return () => controller.abort()
    /*
      Keyed on the coordinates, not on `selection` itself: the object is
      replaced when the reverse lookup fills in a name, and conditions for a
      point do not change because we learned what it is called. Depending on
      the whole object would refetch on every naming.
    */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selection?.lat, selection?.lon])

  /*
    Name the point under the crosshair after a hand-spin.

    Only after a spin: a place chosen from search or from the saved list
    already has a name, and re-deriving it would replace "Chhatrapati Shivaji
    Terminus" with whatever administrative district happens to contain it.
  */
  useEffect(() => {
    if (!open || !needsNaming.current || !selection) return undefined

    setNaming(true)
    const timer = setTimeout(async () => {
      const place = await reverseGeocode(selection.lat, selection.lon, { lang: language })
      setNaming(false)
      if (!place) return
      needsNaming.current = false
      setSelection((current) =>
        // Guard against a late answer for a point the user has already left.
        current && Math.abs(current.lat - selection.lat) < 1e-6
          ? { ...current, ...place, lat: current.lat, lon: current.lon }
          : current,
      )
    }, REVERSE_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      setNaming(false)
    }
    // Coordinates again, for the same reason: this effect is what SETS the
    // name, so depending on the named object would re-trigger itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selection?.lat, selection?.lon, language])

  /* ---------------------------------------------------------------- */
  /* Actions                                                          */
  /* ---------------------------------------------------------------- */

  const choosePlace = useCallback((place) => {
    needsNaming.current = false
    setSelection(place)
  }, [])

  /** A drag on the globe: coordinates only, so the name has to be looked up. */
  const handleSelectionChange = useCallback((updater) => {
    needsNaming.current = true
    setSelection((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      return {
        lat: Math.round(next.lat * 1e4) / 1e4,
        lon: Math.round(next.lon * 1e4) / 1e4,
        // The old name is dropped immediately rather than left showing while
        // the globe moves away from the place it belonged to.
        name: '',
        region: '',
      }
    })
  }, [])

  const handleGlobePick = useCallback((coords) => {
    needsNaming.current = true
    setSelection({
      lat: Math.round(coords.lat * 1e4) / 1e4,
      lon: Math.round(coords.lon * 1e4) / 1e4,
      name: '',
      region: '',
    })
  }, [])

  const handleUseGps = useCallback(async () => {
    const coords = await geolocation.request()
    if (!coords) return

    // Show the point immediately; the name catches up. Waiting for the
    // reverse lookup would leave the button spinning after the fix arrived.
    setSelection({ ...coords, name: '', region: '' })
    const place = await reverseGeocode(coords.lat, coords.lon, { lang: language })
    needsNaming.current = false
    setSelection((current) =>
      current && Math.abs(current.lat - coords.lat) < 1e-6
        ? { ...current, ...(place || {}), lat: coords.lat, lon: coords.lon, fromGps: true }
        : current,
    )
  }, [geolocation, language])

  /*
    A readable name for a point that has none yet.

    Reverse lookup can still be in flight when the user confirms - it is
    queued behind a one-per-second rate limit - and "Pinned point" in the
    navbar tells them nothing about where they are looking. Coordinates do,
    and they are never wrong.
  */
  const labelFor = useCallback(
    (p) =>
      p?.name ||
      `${n(Math.abs(p.lat).toFixed(2))}°${p.lat >= 0 ? 'N' : 'S'}, ${n(Math.abs(p.lon).toFixed(2))}°${p.lon >= 0 ? 'E' : 'W'}`,
    [n],
  )

  const confirm = useCallback(() => {
    if (!selection || !Number.isFinite(selection.lat)) return
    onSelect({
      name: labelFor(selection),
      region: selection.region || '',
      country: selection.country || '',
      countryCode: selection.countryCode || '',
      lat: selection.lat,
      lon: selection.lon,
      timezone: selection.timezone || '',
    })
  }, [selection, onSelect, labelFor])

  const saveSelection = useCallback(() => {
    if (!selection || !Number.isFinite(selection.lat)) return
    onSave?.({
      name: labelFor(selection),
      region: selection.region || '',
      country: selection.country || '',
      countryCode: selection.countryCode || '',
      lat: selection.lat,
      lon: selection.lon,
      timezone: selection.timezone || '',
    })
  }, [selection, onSave, labelFor])

  /* Arrow keys move through results and the globe follows, so the list and
     the globe are never showing different places. */
  const onSearchKeyDown = useCallback(
    (event) => {
      if (results.length === 0) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const delta = event.key === 'ArrowDown' ? 1 : -1
        const next = (highlight + delta + results.length) % results.length
        setHighlight(next)
        choosePlace(results[next])
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (highlight >= 0) choosePlace(results[highlight])
        confirm()
      }
    },
    [results, highlight, choosePlace, confirm],
  )

  const isAlreadySaved = useMemo(
    () => savedLocations.some((l) => isSamePlace(l, selection)),
    [savedLocations, selection],
  )

  const gpsDistance = useMemo(
    () => (geolocation.coords && selection ? distanceKm(geolocation.coords, selection) : null),
    [geolocation.coords, selection],
  )

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  const gpsLabelKey = {
    locating: 'picker.gpsLocating',
    denied: 'picker.gpsDenied',
    unsupported: 'picker.gpsUnsupported',
    unavailable: 'picker.gpsUnavailable',
    timeout: 'picker.gpsTimeout',
  }[geolocation.status] || 'picker.useMyLocation'

  const gpsDisabled = geolocation.status === 'locating' || geolocation.status === 'unsupported'

  const renderRow = (place, { index = -1, saved = false } = {}) => {
    const active = isSamePlace(place, selection)
    return (
      <li key={`${place.lat},${place.lon}`}>
        <button
          type="button"
          className={`lp-row ${active ? 'is-active' : ''} ${index === highlight ? 'is-highlight' : ''}`}
          onClick={() => choosePlace(place)}
          onDoubleClick={confirm}
        >
          <span className="lp-row-icon">
            {saved ? <MapPin size={15} /> : <Search size={14} />}
          </span>
          <span className="lp-row-text">
            <span className="lp-row-name">{tCity(t, place.name)}</span>
            <span className="lp-row-meta">
              {[tRegion(t, place.region), place.country].filter(Boolean).join(' · ')}
            </span>
          </span>
          {place.label || place.labelKey ? (
            <span className="lp-row-tag">{place.label || t(place.labelKey)}</span>
          ) : null}
          {active && <Check size={15} className="lp-row-check" />}
        </button>
      </li>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="lp"
          role="dialog"
          aria-modal="true"
          aria-label={t('picker.title')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="lp-scrim"
            aria-label={t('common.cancel')}
            onClick={onClose}
          />

          <motion.div
            className="lp-shell"
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* ---- Globe ---- */}
            <div className="lp-stage">
              <PickerGlobe
                selection={selection}
                savedPlaces={savedLocations}
                onSelectionChange={handleSelectionChange}
                onPick={handleGlobePick}
              />
              <p className="lp-stage-hint">
                <Sparkles size={13} /> {t('picker.globeHint')}
              </p>

              {/* The selected place, over the globe on desktop and above the
                  sheet on mobile. Shows live conditions so the choice can be
                  judged before it is made. */}
              <div className="lp-selected">
                <div className="lp-selected-text">
                  <p className="lp-selected-name">
                    {selection?.name
                      ? tCity(t, selection.name)
                      : isNaming
                        ? t('picker.naming')
                        : t('picker.pinnedPoint')}
                  </p>
                  <p className="lp-selected-meta">
                    {[tRegion(t, selection?.region), selection?.country].filter(Boolean).join(' · ') ||
                      `${n(selection?.lat?.toFixed(2))}, ${n(selection?.lon?.toFixed(2))}`}
                  </p>
                  {selection?.fromGps && geolocation.accuracy ? (
                    <p className="lp-selected-accuracy">
                      {t('picker.gpsAccuracy', { metres: n(geolocation.accuracy) })}
                    </p>
                  ) : null}
                  {gpsDistance !== null && !selection?.fromGps ? (
                    <p className="lp-selected-accuracy">
                      {t('picker.awayFromYou', { km: n(gpsDistance) })}
                    </p>
                  ) : null}
                </div>

                <div className="lp-selected-now">
                  {preview ? (
                    <>
                      <span className="lp-selected-temp">{n(preview.temperature)}°</span>
                      <span className="lp-selected-cond">{tCondition(t, preview.condition)}</span>
                    </>
                  ) : (
                    <span className="lp-selected-loading">
                      <Loader2 size={16} className="lp-spin" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Panel ---- */}
            <div className="lp-panel">
              <header className="lp-head">
                <h2>{t('picker.title')}</h2>
                <button type="button" className="lp-close" onClick={onClose} aria-label={t('common.cancel')}>
                  <X size={18} />
                </button>
              </header>

              <div className="lp-search">
                <Search size={16} className="lp-search-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  className="lp-search-input"
                  placeholder={t('picker.searchPlaceholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  autoComplete="off"
                  spellCheck="false"
                  aria-label={t('picker.searchPlaceholder')}
                />
                {isSearching && <Loader2 size={15} className="lp-search-spin lp-spin" />}
                {query && !isSearching && (
                  <button
                    type="button"
                    className="lp-search-clear"
                    onClick={() => { setQuery(''); inputRef.current?.focus() }}
                    aria-label={t('common.cancel')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className={`lp-gps ${geolocation.status === 'denied' ? 'is-denied' : ''}`}
                onClick={handleUseGps}
                disabled={gpsDisabled}
              >
                {geolocation.isLocating
                  ? <Loader2 size={16} className="lp-spin" />
                  : <Crosshair size={16} />}
                {t(gpsLabelKey)}
              </button>

              <div className="lp-lists">
                {query.trim().length >= 2 ? (
                  <section className="lp-section">
                    <p className="lp-section-label">{t('picker.results')}</p>
                    {results.length > 0 ? (
                      <ul className="lp-rows">
                        {results.map((place, index) => renderRow(place, { index }))}
                      </ul>
                    ) : (
                      <p className="lp-empty">
                        {isSearching ? t('picker.searching') : t('picker.noResults', { query: query.trim() })}
                      </p>
                    )}
                  </section>
                ) : (
                  <>
                    {savedLocations.length > 0 && (
                      <section className="lp-section">
                        <p className="lp-section-label">{t('picker.saved')}</p>
                        <ul className="lp-rows">
                          {savedLocations.map((place) => renderRow(place, { saved: true }))}
                        </ul>
                      </section>
                    )}

                    <section className="lp-section">
                      <p className="lp-section-label">{t('picker.popular')}</p>
                      <div className="lp-chips">
                        {popular.map((place) => (
                          <button
                            type="button"
                            key={`${place.lat},${place.lon}`}
                            className={`lp-chip ${isSamePlace(place, selection) ? 'is-active' : ''}`}
                            onClick={() => choosePlace(place)}
                          >
                            {tCity(t, place.name)}
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>

              <footer className="lp-actions">
                <button
                  type="button"
                  className="lp-save"
                  onClick={saveSelection}
                  disabled={isAlreadySaved || !selection}
                  title={isAlreadySaved ? t('picker.alreadySaved') : t('picker.saveLocation')}
                >
                  {isAlreadySaved ? <Check size={16} /> : <Plus size={16} />}
                  <span>{isAlreadySaved ? t('picker.alreadySaved') : t('picker.saveLocation')}</span>
                </button>
                <button type="button" className="lp-confirm" onClick={confirm} disabled={!selection}>
                  {t('picker.useThisLocation')}
                </button>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
