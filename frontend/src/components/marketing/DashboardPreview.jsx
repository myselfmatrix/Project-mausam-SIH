import { CloudSun, Wind, Droplets, Gauge } from 'lucide-react'
import './DashboardPreview.css'

// Static preview built from real mock data (data/weatherData.js) — not a
// screenshot, so it stays truthful to what the actual dashboard renders.
export default function DashboardPreview({ weather }) {
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
            <p className="preview-location">{weather.location}, {weather.region}</p>
            <div className="preview-temp">
              {weather.temperature}
              <span>°C</span>
            </div>
            <p className="preview-condition">{weather.condition}</p>
          </div>
          <CloudSun size={40} strokeWidth={1.5} className="preview-icon" />
        </div>

        <div className="preview-chips">
          <span className="preview-chip">
            <Wind size={13} /> {weather.windSpeed} km/h
          </span>
          <span className="preview-chip">
            <Droplets size={13} /> {weather.humidity}%
          </span>
          <span className="preview-chip">
            <Gauge size={13} /> AQI {weather.aqi}
          </span>
        </div>

        <div className="preview-alert">
          <strong>Heavy rainfall expected</strong>
          <span>5:00 PM – 7:00 PM · leave 20 min earlier</span>
        </div>
      </div>
    </div>
  )
}
