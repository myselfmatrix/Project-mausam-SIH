import { MapPin, RefreshCw, Search } from 'lucide-react'
import Logo from '../brand/Logo'
import { useTranslation } from '../../i18n/useTranslation'
import './DashboardSkeleton.css'

/*
  What the dashboard shows before its first real reading arrives.

  The shapes deliberately match the real layout's proportions, so nothing
  jumps when the forecast lands. What they deliberately do NOT contain is
  numbers: a skeleton with plausible temperatures in it is indistinguishable
  from live data, and this screen exists precisely because we do not have live
  data yet.

  It doubles as the error state. If the first fetch fails there is nothing to
  fall back to, so this is also where the retry lives - along with a way to
  pick a different location, since a coordinate the upstream cannot serve is
  one of the reasons a first load fails.
*/
export default function DashboardSkeleton({ place, error, onRetry, onOpenPicker, reason = null }) {
  const { t } = useTranslation()

  // Reasons the server can report; anything else is the generic line.
  const KNOWN = ['rateLimited', 'timeout', 'upstreamDown', 'network', 'parse']
  const reasonKey = KNOWN.includes(reason) ? reason : 'default'

  return (
    <div className="dskel">
      <header className="dskel-nav">
        <Logo size={28} />
        <span className="dskel-place">
          <MapPin size={14} />
          {place?.name || t('common.loading')}
        </span>
      </header>

      <main className="dskel-main" aria-busy={!error} aria-live="polite">
        {error ? (
          <div className="dskel-error">
            <h2>{t('weatherError.title')}</h2>
            {/*
              The server's classification, translated — never the upstream's
              own string. A spent API quota used to arrive here verbatim, so
              the failure screen read `Upstream 429: {"error":true,...}`: a
              provider's internal JSON, in English, shown to someone who only
              wanted to know whether to carry an umbrella.
            */}
            <p>{t(`weatherError.${reasonKey}`)}</p>
            {reasonKey === 'rateLimited' && (
              <p className="dskel-error-hint">{t('weatherError.rateLimitedHint')}</p>
            )}
            <div className="dskel-error-actions">
              <button type="button" className="btn-primary-sm" onClick={onRetry}>
                <RefreshCw size={15} /> {t('common.retry')}
              </button>
              <button type="button" className="btn-ghost-sm" onClick={onOpenPicker}>
                <Search size={15} /> {t('picker.changeLocation')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Announced once, rather than per shape, so a screen reader says
                "loading the forecast" instead of reading out nine boxes. */}
            <span className="sr-only">{t('picker.loadingForecast')}</span>
            <div className="dskel-hero">
              <div className="dskel-line dskel-line-sm" />
              <div className="dskel-line dskel-line-lg" />
              <div className="dskel-line dskel-line-md" />
            </div>
            <div className="dskel-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <div className="dskel-card" key={i}>
                  <div className="dskel-line dskel-line-xs" />
                  <div className="dskel-line dskel-line-md" />
                </div>
              ))}
            </div>
            <div className="dskel-strip" />
          </>
        )}
      </main>
    </div>
  )
}
