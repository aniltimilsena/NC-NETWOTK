import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initErrorTracking } from './utils/errorTracking';
import './index.css';
import { LanguageProvider } from './i18n/LanguageProvider';
import './config/i18n';
initErrorTracking();
window.addEventListener('vite:preloadError', () => {
    try {
        const lastReloaded = sessionStorage.getItem("vite_reload_time");
        const now = Date.now();
        if (!lastReloaded || now - parseInt(lastReloaded, 10) > 15000) {
            sessionStorage.setItem("vite_reload_time", now.toString());
            window.location.reload();
        }
    } catch (_e) {}
});
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>);
