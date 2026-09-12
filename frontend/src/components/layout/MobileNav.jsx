import { NAV_ITEMS } from './navItems'
import { useTranslation } from '../../i18n/useTranslation'
import './Layout.css'

export default function MobileNav({ activeTab, onSelect }) {
  const { t } = useTranslation()

  return (
    <nav className="mnav" aria-label={t('tab.sections')}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`mnav-item ${activeTab === item.id ? 'is-active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <item.icon size={20} strokeWidth={2} />
          <span>{t(item.labelKey)}</span>
        </button>
      ))}
    </nav>
  )
}
