import React, { Suspense } from 'react';
import AppProviders, { useApp } from './providers/AppProviders';
import RouteConfig from './routes/routeConfig';
import RouteLoader from './components/RouteLoader';
import { Agentation } from "agentation";

function MainApp() {
  const { user, isAdmin, authReady, handleLogout, showAlert, showToast } = useApp();

  return (
    <Suspense fallback={<RouteLoader />}>
      <RouteConfig
        user={user}
        isAdmin={isAdmin}
        authReady={authReady}
        onLogout={handleLogout}
        showAlert={showAlert}
        showToast={showToast}
      />
    </Suspense>
  );
}

export default function App() {
  return (
    <AppProviders>
      <MainApp />
      <Agentation />
    </AppProviders>
  );
}
