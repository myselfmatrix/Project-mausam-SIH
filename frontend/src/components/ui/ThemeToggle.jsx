import { Moon, Sun } from 'lucide-react'
import useTheme from '../../hooks/useTheme'
import { useTranslation } from '../../i18n/useTranslation'
import './ThemeToggle.css'

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      title={isDark ? t('theme.light') : t('theme.dark')}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${isDark ? '' : 'is-light'}`}>
          {isDark ? <Moon size={13} strokeWidth={2.2} /> : <Sun size={13} strokeWidth={2.2} />}
        </span>
      </span>
    </button>
  )
}
