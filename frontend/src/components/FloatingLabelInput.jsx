import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import './FloatingLabelInput.css'

export default function FloatingLabelInput({
  id,
  type = 'text',
  label,
  value,
  onChange,
  icon: Icon,
  error,
  autoComplete,
  name,
  minLength,
}) {
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
  const floated = focused || value.length > 0

  return (
    <div className={`fli ${floated ? 'is-floated' : ''} ${error ? 'has-error' : ''}`}>
      <div className="fli-field">
        {Icon && <span className="fli-icon"><Icon size={16} strokeWidth={2} /></span>}
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <label htmlFor={id}>{label}</label>
        {isPassword && (
          <button
            type="button"
            className="fli-toggle"
            onClick={() => setShowPassword((s) => !s)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <span className="fli-error">{error}</span>}
    </div>
  )
}
