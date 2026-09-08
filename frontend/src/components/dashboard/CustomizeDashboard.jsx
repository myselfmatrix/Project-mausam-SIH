import { Settings2, RotateCcw, Check, Eye } from 'lucide-react'
import { getMetric } from '../../data/metricDefs'
import './CustomizeDashboard.css'

export default function CustomizeDashboard({ active, onToggle, onReset, hiddenKeys, onUnhide }) {
  return (
    <div className="customize-bar">
      <button
        type="button"
        className={`customize-toggle ${active ? 'is-active' : ''}`}
        onClick={onToggle}
      >
        {active ? <Check size={14} /> : <Settings2 size={14} />}
        {active ? 'Done customizing' : 'Customize dashboard'}
      </button>

      {active && (
        <button type="button" className="customize-reset" onClick={onReset}>
          <RotateCcw size={13} />
          Reset layout
        </button>
      )}

      {active && hiddenKeys.length > 0 && (
        <div className="customize-hidden">
          <span className="customize-hidden-label">Hidden:</span>
          {hiddenKeys.map((key) => {
            const metric = getMetric(key)
            if (!metric) return null
            return (
              <button
                key={key}
                type="button"
                className="customize-hidden-chip"
                onClick={() => onUnhide(key)}
                title={`Show ${metric.label}`}
              >
                <Eye size={12} /> {metric.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
