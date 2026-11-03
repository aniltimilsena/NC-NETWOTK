import React, { Suspense } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import AppProviders, { useApp } from './providers/AppProviders';
import { DialogProvider } from './providers/DialogProvider';
import RouteConfig from './routes/routeConfig';
import ErrorBoundary from './components/ErrorBoundary';

const AgentationWidget = import.meta.env.DEV
  ? React.lazy(() => import('agentation').then(m => ({ default: m.Agentation })))
  : null;

function MainApp() {
  const { user, isAdmin, authReady, handleLogout, showAlert, showToast } = useApp();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4]" />}>
      <RouteConfig user={user} isAdmin={isAdmin} authReady={authReady} onLogout={handleLogout} showAlert={showAlert} showToast={showToast} />
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict>
        <DialogProvider>
          <AppProviders>
            <MainApp />
            {import.meta.env.DEV && AgentationWidget && (
              <Suspense fallback={null}>
                <AgentationWidget />
              </Suspense>
            )}
          </AppProviders>
        </DialogProvider>
      </LazyMotion>
    </ErrorBoundary>
  );
}
