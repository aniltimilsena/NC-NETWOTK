import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { initErrorTracking } from './utils/errorTracking'
import './index.css'
import './config/i18n'


initErrorTracking();


window.addEventListener('vite:preloadError', () => {
  const lastReloaded = sessionStorage.getItem("vite_reload_time");
  const now = Date.now();
  if (!lastReloaded || now - parseInt(lastReloaded, 10) > 15000) {
    sessionStorage.setItem("vite_reload_time", now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
