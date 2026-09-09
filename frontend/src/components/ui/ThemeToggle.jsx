import { Moon, Sun } from 'lucide-react'
import useTheme from '../../hooks/useTheme'
import './ThemeToggle.css'

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${isDark ? '' : 'is-light'}`}>
          {isDark ? <Moon size={13} strokeWidth={2.2} /> : <Sun size={13} strokeWidth={2.2} />}
        </span>
      </span>
    </button>
  )
}
