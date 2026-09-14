import { CloudSun, Wind, Droplets, Gauge } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
import { tCity, tCondition, tRegion } from '../../i18n/vocab'
import './DashboardPreview.css'

// Rendered from the same live weather the hero fetches for the project's
// home city (see HomePage's useWeather call) - not a screenshot, and not
// sample data, so what a visitor sees here is never out of step with what
// the real dashboard shows once they sign in.
export default function DashboardPreview({ weather }) {
  const { t, n } = useTranslation()

  return (
    <div className="preview-frame">
      <div className="preview-chrome">
        <span />
        <span />
        <span />
      </div>
      <div className="preview-body">
        <div className="preview-top">
          <div>
            <p className="preview-location">
              {tCity(t, weather.location)}, {tRegion(t, weather.region)}
            </p>
            <div className="preview-temp">
              {n(weather.temperature)}
              <span>°C</span>
            </div>
            <p className="preview-condition">{tCondition(t, weather.condition)}</p>
          </div>
          <CloudSun size={40} strokeWidth={1.5} className="preview-icon" />
        </div>

        <div className="preview-chips">
          <span className="preview-chip">
            <Wind size={13} /> {n(weather.windSpeed)} km/h
          </span>
          <span className="preview-chip">
            <Droplets size={13} /> {n(weather.humidity)}%
          </span>
          <span className="preview-chip">
            <Gauge size={13} /> AQI {n(weather.aqi)}
          </span>
        </div>

        <div className="preview-alert">
          <strong>{t('alertData.rainWhat')}</strong>
          <span>{t('alertData.rainWhen')}</span>
        </div>
      </div>
    </div>
  )
}
