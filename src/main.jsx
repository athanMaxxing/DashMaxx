import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary, { reloadForNewVersion } from './components/ErrorBoundary'
import './lib/install' // catch the install prompt before React mounts

// A lazy chunk from an older deploy failed to load: reload onto the new version.
window.addEventListener('vite:preloadError', (e) => {
  if (reloadForNewVersion()) e.preventDefault()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fullscreen>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
