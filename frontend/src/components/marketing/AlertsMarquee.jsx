import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useNationalAlerts } from '../../hooks/useNationalAlerts'
import { useTranslation } from '../../i18n/useTranslation'
import './AlertsMarquee.css'

const SEVERITY_ICON = {
  safe: CheckCircle2,
  info: Info,
  caution: AlertTriangle,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

function AlertChip({ alert }) {
  const { t } = useTranslation()
  const Icon = SEVERITY_ICON[alert.severity] || Info
  return (
    <article className={`amq-card status-${alert.severity}`}>
      <header>
        <span className="amq-card-icon">
          <Icon size={14} strokeWidth={2.2} />
        </span>
        <span className="amq-card-cat">{t(`alertCategory.${alert.category}`)}</span>
        <span className="amq-card-sev">{t(`severity.${alert.severity}`)}</span>
      </header>
      <h4>{t(alert.whatKey, alert.params)}</h4>
      <p className="amq-card-when">
        {alert.place ? `${alert.place} · ` : ''}
        {t(alert.whenKey, alert.whenParams)}
      </p>
      <p className="amq-card-action">{t(alert.actionKey, alert.params)}</p>
    </article>
  )
}

/**
 * Two rows of real alert cards drifting in opposite directions.
 *
 * Each row renders its list twice and translates by exactly -50%, so the loop
 * is seamless — the second copy is in the first's position at the moment the
 * animation restarts.
 */
export default function AlertsMarquee() {
  const alerts = useNationalAlerts()

  // Nothing to drift until the fetch lands, and a genuinely calm day across
  // every city is a real outcome too - both render as absence rather than as
  // stand-in cards.
  if (alerts.length === 0) return null

  const rowA = alerts
  const rowB = [...alerts].reverse()

  return (
    <div className="amq" aria-hidden="true">
      <div className="amq-row">
        <div className="amq-track">
          {[...rowA, ...rowA].map((a, i) => (
            <AlertChip key={`${a.id}-a-${i}`} alert={a} />
          ))}
        </div>
      </div>
      <div className="amq-row amq-row-reverse">
        <div className="amq-track">
          {[...rowB, ...rowB].map((a, i) => (
            <AlertChip key={`${a.id}-b-${i}`} alert={a} />
          ))}
        </div>
      </div>
    </div>
  )
}
