import { AlertTriangle, ShieldAlert, Info, ArrowRight } from 'lucide-react'
import './AlertBanner.css'

const ICONS = {
  safe: Info,
  info: Info,
  caution: AlertTriangle,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

export default function AlertBanner({ alert, onViewAll }) {
  if (!alert) return null
  const Icon = ICONS[alert.severity] || Info

  return (
    <div className={`alert-banner status-${alert.severity}`}>
      <div className="alert-banner-icon">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="alert-banner-body">
        <div className="alert-banner-top">
          <p className="alert-banner-what">{alert.what}</p>
          <span className="alert-banner-when">{alert.when}</span>
        </div>
        <p className="alert-banner-why">{alert.why}</p>
        <p className="alert-banner-action">{alert.action}</p>
      </div>
      {onViewAll && (
        <button type="button" className="alert-banner-link" onClick={onViewAll}>
          View all alerts <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
