import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'

// Handle Vite dynamic import chunk failures gracefully by auto-reloading to fetch the latest bundle version
window.addEventListener('vite:preloadError', () => {
  const lastReloaded = sessionStorage.getItem("vite_reload_time");
  const now = Date.now();
  if (!lastReloaded || now - parseInt(lastReloaded, 10) > 15000) {
    sessionStorage.setItem("vite_reload_time", now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
