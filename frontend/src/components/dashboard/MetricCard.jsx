import { Pin, EyeOff, ChevronUp, ChevronDown } from 'lucide-react'
import './MetricCard.css'

export default function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  status,
  badge,
  customize,
}) {
  return (
    <div className={`metric-card ${status ? `status-${status}` : ''} ${customize ? 'is-customizing' : ''}`}>
      {badge && <span className="metric-card-badge">{badge}</span>}
      <div className="metric-card-icon">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="metric-card-body">
        <span className="metric-card-label">{label}</span>
        <span className="metric-card-value">{value}</span>
        {caption && <span className="metric-card-caption">{caption}</span>}
      </div>

      {customize && (
        <div className="metric-card-controls">
          <button
            type="button"
            className={`metric-card-control ${customize.isPinned ? 'is-active' : ''}`}
            onClick={customize.onPin}
            aria-label={customize.isPinned ? 'Unpin card' : 'Pin card'}
            title={customize.isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin size={13} />
          </button>
          <button
            type="button"
            className="metric-card-control"
            onClick={customize.onMoveUp}
            disabled={!customize.canMoveUp}
            aria-label="Move up"
            title="Move up"
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            className="metric-card-control"
            onClick={customize.onMoveDown}
            disabled={!customize.canMoveDown}
            aria-label="Move down"
            title="Move down"
          >
            <ChevronDown size={13} />
          </button>
          <button
            type="button"
            className="metric-card-control"
            onClick={customize.onHide}
            aria-label="Hide card"
            title="Hide"
          >
            <EyeOff size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
