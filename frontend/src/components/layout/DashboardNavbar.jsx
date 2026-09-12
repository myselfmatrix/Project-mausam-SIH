import { MapPin, ChevronDown, Search, Bell, LogOut } from 'lucide-react'
import Logo from '../brand/Logo'
import ThemeToggle from '../ui/ThemeToggle'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import { useTranslation } from '../../i18n/useTranslation'
import { tCity } from '../../i18n/vocab'
import './Layout.css'

export default function DashboardNavbar({ location, unreadCount, onOpenLocations, onOpenAlerts, onLogout }) {
  const { t, n } = useTranslation()

  return (
    <header className="dnav">
      <Logo size={28} className="dnav-logo" />

      <button type="button" className="dnav-location" onClick={onOpenLocations}>
        <MapPin size={14} />
        {tCity(t, location)}
        <ChevronDown size={14} />
      </button>

      <div className="dnav-actions">
        <LanguageSwitcher className="dnav-lang" />
        <ThemeToggle className="dnav-theme" />
        <button type="button" className="dnav-icon-btn dnav-search" onClick={onOpenLocations} aria-label={t('dnav.searchLocations')}>
          <Search size={17} strokeWidth={2} />
        </button>
        <button type="button" className="dnav-icon-btn" onClick={onOpenAlerts} aria-label={t('dnav.notifications')}>
          <Bell size={17} strokeWidth={2} />
          {unreadCount > 0 && <span className="dnav-badge">{n(unreadCount)}</span>}
        </button>
        <button type="button" className="dnav-icon-btn" onClick={onLogout} aria-label={t('common.logOut')}>
          <LogOut size={17} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
