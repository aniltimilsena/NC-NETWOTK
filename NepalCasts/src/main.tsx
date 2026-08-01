import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initErrorTracking } from './utils/errorTracking';
import './index.css';
import { LanguageProvider } from './i18n/LanguageProvider';
import './config/i18n';

const DEFAULT_CLERK_KEY = 'pk_test_cmVsaWV2ZWQtbWFtbWFsLTQ4LmNsZXJrLmFjY291bnRzLmRldiQ';
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || DEFAULT_CLERK_KEY;

const isValidClerkKey = (key: string) => {
    if (!key) return false;
    if (key.includes('YOUR_CLERK_PUBLISHABLE_KEY_HERE')) return false;
    return key.startsWith('pk_test_') || key.startsWith('pk_live_');
};

const MissingClerkKeyScreen = () => (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#111] border border-yellow-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center mx-auto text-yellow-400 font-bold text-2xl">
                🔑
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">Clerk Pro Key Required</h1>
                <p className="text-gray-400 text-xs leading-relaxed">
                    To run authentication in <strong>NepalCasts</strong>, please add your <code>VITE_CLERK_PUBLISHABLE_KEY</code> from your <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="text-yellow-400 underline font-semibold">Clerk Dashboard</a> to your <code>.env</code> file.
                </p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-xl text-left border border-white/5 space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">.env file</p>
                <code className="text-xs text-yellow-400 break-all block font-mono">
                    VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
                </code>
            </div>
            <p className="text-[11px] text-gray-500">
                After saving your key in <code>.env</code>, save the file to reload.
            </p>
        </div>
    </div>
);

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

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            {isValidClerkKey(PUBLISHABLE_KEY) ? (
                <ClerkProvider
                    publishableKey={PUBLISHABLE_KEY}
                    appearance={{
                        variables: {
                            colorBackground: '#141414',
                            colorInputBackground: '#1a1a1a',
                            colorText: '#ffffff',
                            colorTextSecondary: '#9ca3af',
                            colorPrimary: '#facc15',
                            colorNeutral: '#ffffff',
                        },
                    }}
                >
                    <HelmetProvider>
                        <BrowserRouter>

                            <LanguageProvider>
                                <App />
                            </LanguageProvider>
                        </BrowserRouter>
                    </HelmetProvider>
                </ClerkProvider>
            ) : (
                <MissingClerkKeyScreen />
            )}
        </ErrorBoundary>
    </React.StrictMode>
);


