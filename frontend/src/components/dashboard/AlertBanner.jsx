import { AlertTriangle, ShieldAlert, Info, ArrowRight } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
import './AlertBanner.css'

const ICONS = {
  safe: Info,
  info: Info,
  caution: AlertTriangle,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

export default function AlertBanner({ alert, onViewAll }) {
  const { t } = useTranslation()
  if (!alert) return null
  const Icon = ICONS[alert.severity] || Info

  return (
    <div className={`alert-banner status-${alert.severity}`}>
      <div className="alert-banner-icon">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="alert-banner-body">
        <div className="alert-banner-top">
          <p className="alert-banner-what">{t(alert.whatKey)}</p>
          <span className="alert-banner-when">{t(alert.whenKey)}</span>
        </div>
        <p className="alert-banner-why">{t(alert.whyKey)}</p>
        <p className="alert-banner-action">{t(alert.actionKey)}</p>
      </div>
      {onViewAll && (
        <button type="button" className="alert-banner-link" onClick={onViewAll}>
          {t('alertsTab.viewAll')} <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}
