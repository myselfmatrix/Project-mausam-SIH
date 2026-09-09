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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
