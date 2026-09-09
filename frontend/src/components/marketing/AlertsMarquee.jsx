import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { ALERTS } from '../../data/alertData'
import './AlertsMarquee.css'

const SEVERITY_ICON = {
  safe: CheckCircle2,
  info: Info,
  caution: AlertTriangle,
  warning: AlertTriangle,
  critical: ShieldAlert,
}

function AlertChip({ alert }) {
  const Icon = SEVERITY_ICON[alert.severity] || Info
  return (
    <article className={`amq-card status-${alert.severity}`}>
      <header>
        <span className="amq-card-icon">
          <Icon size={14} strokeWidth={2.2} />
        </span>
        <span className="amq-card-cat">{alert.category}</span>
        <span className="amq-card-sev">{alert.severity}</span>
      </header>
      <h4>{alert.what}</h4>
      <p className="amq-card-when">{alert.when}</p>
      <p className="amq-card-action">{alert.action}</p>
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
  const rowA = ALERTS
  const rowB = [...ALERTS].reverse()

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
