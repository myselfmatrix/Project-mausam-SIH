import { MapPin, ChevronDown, Search, Bell, LogOut } from 'lucide-react'
import './Layout.css'

export default function DashboardNavbar({ location, unreadCount, onOpenLocations, onOpenAlerts, onLogout }) {
  return (
    <header className="dnav">
      <span className="dnav-logo">
        <span className="dnav-logo-mark">M</span> MAUSAM
      </span>

      <button type="button" className="dnav-location" onClick={onOpenLocations}>
        <MapPin size={14} />
        {location}
        <ChevronDown size={14} />
      </button>

      <div className="dnav-actions">
        <button type="button" className="dnav-icon-btn" onClick={onOpenLocations} aria-label="Search locations">
          <Search size={17} strokeWidth={2} />
        </button>
        <button type="button" className="dnav-icon-btn" onClick={onOpenAlerts} aria-label="Notifications">
          <Bell size={17} strokeWidth={2} />
          {unreadCount > 0 && <span className="dnav-badge">{unreadCount}</span>}
        </button>
        <button type="button" className="dnav-icon-btn" onClick={onLogout} aria-label="Log out">
          <LogOut size={17} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
