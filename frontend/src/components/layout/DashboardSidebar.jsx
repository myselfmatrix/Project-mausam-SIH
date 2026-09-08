import { NAV_ITEMS } from './navItems'
import './Layout.css'

export default function DashboardSidebar({ activeTab, onSelect }) {
  return (
    <nav className="dsidebar" aria-label="Dashboard sections">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`dsidebar-item ${activeTab === item.id ? 'is-active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <item.icon size={18} strokeWidth={2} />
          {item.label}
        </button>
      ))}
    </nav>
  )
}
