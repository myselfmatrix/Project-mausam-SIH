import React from 'react'
import ReactDOM from 'react-dom/client'

// Stylesheets are imported BEFORE App on purpose. Vite emits CSS in module
// evaluation order, so importing App first would pull every page's stylesheet
// into the bundle ahead of these — and ui.css primitives (.btn, .surface)
// would then override the page rules meant to adjust them at equal specificity.
import './styles/tokens.css'
import './styles/ui.css'
import './index.css'

import App from './App.jsx'
import I18nProvider from './i18n/I18nProvider'
import PreferencesProvider from './preferences/PreferencesProvider'

// Every screen reads its copy from here, so the provider wraps the whole app
// rather than any single page.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </I18nProvider>
  </React.StrictMode>,
)
