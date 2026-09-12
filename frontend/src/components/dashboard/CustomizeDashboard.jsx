import { Settings2, RotateCcw, Check, Eye } from 'lucide-react'
import { getMetric } from '../../data/metricDefs'
import { useTranslation } from '../../i18n/useTranslation'
import './CustomizeDashboard.css'

export default function CustomizeDashboard({ active, onToggle, onReset, hiddenKeys, onUnhide }) {
  const { t } = useTranslation()

  return (
    <div className="customize-bar">
      <button
        type="button"
        className={`customize-toggle ${active ? 'is-active' : ''}`}
        onClick={onToggle}
      >
        {active ? <Check size={14} /> : <Settings2 size={14} />}
        {active ? t('customize.done') : t('customize.start')}
      </button>

      {active && (
        <button type="button" className="customize-reset" onClick={onReset}>
          <RotateCcw size={13} />
          {t('customize.reset')}
        </button>
      )}

      {active && hiddenKeys.length > 0 && (
        <div className="customize-hidden">
          <span className="customize-hidden-label">{t('customize.hidden')}</span>
          {hiddenKeys.map((key) => {
            const metric = getMetric(key)
            if (!metric) return null
            return (
              <button
                key={key}
                type="button"
                className="customize-hidden-chip"
                onClick={() => onUnhide(key)}
                title={t('customize.show', { label: t(metric.labelKey) })}
              >
                <Eye size={12} /> {t(metric.labelKey)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
