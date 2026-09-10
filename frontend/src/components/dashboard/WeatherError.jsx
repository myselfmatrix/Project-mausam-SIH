import { AlertCircle, CloudOff, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import './WeatherError.css'

export default function WeatherError({ error, onRetry, isRetrying = false }) {
  const messages = {
    default: 'Weather data unavailable',
    network: 'Connection lost — using cached data',
    timeout: 'Weather service is slow',
    parse: 'Data format issue',
  }

  const getMessage = () => {
    if (error?.includes('Network')) return 'network'
    if (error?.includes('timeout')) return 'timeout'
    if (error?.includes('parse')) return 'parse'
    return 'default'
  }

  const msgKey = getMessage()
  const msg = messages[msgKey]

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
          {error && <p className="weather-error-detail">{error}</p>}
        </div>
      </div>

      <button
        type="button"
        className="weather-error-retry"
        onClick={onRetry}
        disabled={isRetrying}
        title="Retry loading weather"
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
        {isRetrying ? 'Retrying…' : 'Retry'}
      </button>
    </motion.div>
  )
}
