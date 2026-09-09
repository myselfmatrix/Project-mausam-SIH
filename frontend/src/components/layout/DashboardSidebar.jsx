import { NAV_ITEMS } from './navItems'
import './Layout.css'

/** "Aarav Sharma" → "AS". Falls back to a single letter, then to a dash. */
function initials(name) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '—'
}

export default function DashboardSidebar({
  activeTab,
  onSelect,
  userName,
  userEmail,
  persona,
  unreadCount = 0,
}) {
  return (
    <aside className="dsidebar" aria-label="Dashboard sections">
      <nav className="dsidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`dsidebar-item ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="dsidebar-rail" aria-hidden="true" />
              <item.icon size={18} strokeWidth={2} />
              <span className="dsidebar-label">{item.label}</span>
              {item.id === 'alerts' && unreadCount > 0 && (
                <span className="dsidebar-count">{unreadCount}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Account card — also the quickest reminder of which lens you're in. */}
      <div className="dsidebar-user">
        <span className="dsidebar-avatar" aria-hidden="true">
          {initials(userName)}
        </span>
        <span className="dsidebar-user-meta">
          <span className="dsidebar-user-name">{userName || 'Signed in'}</span>
          <span className="dsidebar-user-mail">{userEmail || ''}</span>
        </span>
      </div>

      {persona && (
        <button
          type="button"
          className="dsidebar-persona"
          onClick={() => onSelect('personalize')}
          title="Change persona"
        >
          <persona.icon size={14} strokeWidth={2.2} />
          <span>{persona.title}</span>
        </button>
      )}
    </aside>
  )
}
