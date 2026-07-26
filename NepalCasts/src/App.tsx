import React, { Suspense } from 'react';
import AppProviders, { useApp } from './providers/AppProviders';
import RouteConfig from './routes/routeConfig';
import RouteLoader from './components/RouteLoader';
const AgentationWidget = import.meta.env.DEV
    ? React.lazy(() => import('agentation').then(m => ({ default: m.Agentation })))
    : null;
function MainApp() {
    const { user, isAdmin, authReady, handleLogout, showAlert, showToast } = useApp();
    return (<Suspense fallback={<RouteLoader />}>
      <RouteConfig user={user} isAdmin={isAdmin} authReady={authReady} onLogout={handleLogout} showAlert={showAlert} showToast={showToast}/>
    </Suspense>);
}
export default function App() {
    return (<AppProviders>
      <MainApp />
      {import.meta.env.DEV && AgentationWidget && (<Suspense fallback={null}>
          <AgentationWidget />
        </Suspense>)}
    </AppProviders>);
}
