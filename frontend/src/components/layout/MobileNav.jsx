import { NAV_ITEMS } from './navItems'
import './Layout.css'

export default function MobileNav({ activeTab, onSelect }) {
  return (
    <nav className="mnav" aria-label="Dashboard sections">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`mnav-item ${activeTab === item.id ? 'is-active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <item.icon size={20} strokeWidth={2} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
