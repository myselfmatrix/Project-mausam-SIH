import { AlertCircle, CloudOff, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from '../../i18n/useTranslation'
import './WeatherError.css'

const REASONS = new Set(['rateLimited', 'timeout', 'upstreamDown', 'network', 'parse'])

export default function WeatherError({ error, reason = null, onRetry, isRetrying = false }) {
  const { t } = useTranslation()

  /*
    The server's own classification first.

    Reading the message text was all there was before, which meant anything
    unrecognised fell through to a generic line - and worse, the raw upstream
    string was being shown verbatim, so a spent API quota reached the user as
    a provider's JSON. Sniffing is kept only for failures that never reach the
    server, like the browser being offline.
  */
  const msgKey = REASONS.has(reason)
    ? reason
    : error?.includes('Network') || error?.includes('reach the server')
      ? 'network'
      : error?.includes('timeout')
        ? 'timeout'
        : error?.includes('parse')
          ? 'parse'
          : 'default'

  const msg = t(`weatherError.${msgKey}`)
  // Only the quota case has something worth explaining; the rest are obvious.
  const hint = msgKey === 'rateLimited' ? t('weatherError.rateLimitedHint') : null

  return (
    <motion.div
      className="weather-error"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <div className="weather-error-header">
        <div className="weather-error-icon">
          {msgKey === 'network' ? (
            <CloudOff size={18} strokeWidth={2.2} />
          ) : (
            <AlertCircle size={18} strokeWidth={2.2} />
          )}
        </div>
        <div className="weather-error-text">
          <p className="weather-error-title">{msg}</p>
          {/* A translated explanation, never the upstream's own text: that
              string is written for an operator reading a log, not for someone
              standing in front of the app. */}
          {hint && <p className="weather-error-detail">{hint}</p>}
        </div>
      </div>

      <button
        type="button"
        className="weather-error-retry"
        onClick={onRetry}
        disabled={isRetrying}
        title={t('weatherError.retryTitle')}
      >
        <motion.span
          animate={isRetrying ? { rotate: 360 } : { rotate: 0 }}
          transition={{
            duration: 1,
            repeat: isRetrying ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <RefreshCw size={16} strokeWidth={2.2} />
        </motion.span>
        {isRetrying ? t('common.retrying') : t('common.retry')}
      </button>
    </motion.div>
  )
}
