import React from 'react';
import { Route, Routes, Navigate, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';
// RouteLoader removed to prevent generic skeleton flash

import { MessagesRoutes } from './messages.routes';
import { SettingsRoutes } from './settings.routes';
import { ProfileRoutes } from './profile.routes';
import { CastingRoutes } from './casting.routes';
import { DiscoverRoutes } from './discover.routes';
import { AdminRoutes } from './admin.routes';
import { NotificationsRoutes } from './notifications.routes';
import { SavedRoutes } from './saved.routes';

import { CallsRoutes } from './calls.routes';
import { ApplicationsRoutes } from './applications.routes';
import { CurrentUser } from '../utils/CurrentUser';
import { lazyWithRetry } from '../utils/lazyWithRetry';

import SignIn from '../features/auth/SignIn';
import SignUp from '../features/auth/SignUp';
import ForgotPassword from '../features/auth/ForgotPassword';

const Home = lazyWithRetry(() => import('../pages/Home'));
const About = lazyWithRetry(() => import('../pages/About'));
const Contact = lazyWithRetry(() => import('../pages/Contact'));
const Help = lazyWithRetry(() => import('../pages/Help'));
const PrivacyPolicy = lazyWithRetry(() => import('../pages/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('../pages/TermsOfService'));
const TrustSafety = lazyWithRetry(() => import('../pages/TrustSafety'));
const NotFound = lazyWithRetry(() => import('../pages/NotFound'));
const Forbidden = lazyWithRetry(() => import('../pages/Forbidden'));
const ServerError = lazyWithRetry(() => import('../pages/ServerError'));

import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ProtectedRoute = ({ user, authReady, children }: any) => {
  const location = useLocation();
  if (!authReady) return <div className="min-h-screen bg-[#070709]" />;
  return user ? (children || <Outlet />) : <Navigate to={`/signin?redirect_url=${encodeURIComponent(location.pathname + location.search)}`} replace />;
};

const AdminRoute = ({ user, isAdmin, authReady, children }: any) => {
  const [isLiveAdmin, setIsLiveAdmin] = React.useState<boolean>(
    Boolean(isAdmin || user?.isAdmin === true || user?.role?.toLowerCase() === 'admin' || (user?.email && user.email.toLowerCase() === 'aniltimilsena53@gmail.com'))
  );
  const [checking, setChecking] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (isAdmin || user?.isAdmin === true || user?.role?.toLowerCase() === 'admin' || (user?.email && user.email.toLowerCase() === 'aniltimilsena53@gmail.com')) {
      setIsLiveAdmin(true);
      setChecking(false);
      return;
    }
    if (!user?.uid) {
      if (authReady) setChecking(false);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && (userSnap.data()?.isAdmin === true || userSnap.data()?.role?.toLowerCase() === 'admin')) {
          if (isMounted) setIsLiveAdmin(true);
          return;
        }
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        if (profileSnap.exists() && (profileSnap.data()?.isAdmin === true || profileSnap.data()?.role?.toLowerCase() === 'admin')) {
          if (isMounted) setIsLiveAdmin(true);
          return;
        }
      } catch (e) {
        console.warn("Admin check failed in route:", e);
      } finally {
        if (isMounted) setChecking(false);
      }
    })();

    return () => { isMounted = false; };
  }, [user, isAdmin, authReady]);

  if (!authReady || checking) return <div className="min-h-screen bg-[#070709]" />;
  return user && isLiveAdmin ? (children || <Outlet />) : <Navigate to="/" replace />;
};

export default function RouteConfig({ user, isAdmin, authReady, onLogout, showAlert, showToast }: any) {
  const navigate = useNavigate();

  const onNavigate = (page: string, param?: any) => {
    if (page === 'back') {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/casting');
      }
      return;
    }
    if (page && page.startsWith('/')) {
      navigate(page);
      return;
    }
    let targetPage = page;
    if (page === 'casting-apply') {
      navigate(param ? `/casting/${param}/apply` : '/casting');
      return;
    }
    if (page === 'casting-detail') targetPage = 'casting';
    if (page === 'listing' || page === 'talent' || page === 'talents') targetPage = 'talents';
    if (page === 'saved-casting' || page === 'saved-castings') targetPage = 'saved-castings';

    let path = '/' + targetPage;
    if (targetPage === 'home') path = '/';
    if (targetPage === 'profile-create') path = '/profile/create';
    if (targetPage === 'profile-edit') path = '/settings/profile';
    if (targetPage === 'casting-create') path = '/casting/create';

    if (targetPage === 'profile') {
      const cleanParam = typeof param === 'string' ? param.replace(/^@/, '') : '';
      const isOwn = !param || param === user?.uid || param === user?.id || (CurrentUser.id && param === CurrentUser.id) || (CurrentUser.username && cleanParam === CurrentUser.username);
      if (isOwn) {
        path = '/profile';
      } else {
        path = `/profile/${param}`;
      }
    } else if (param) {
      path = `/${targetPage}/${param}`;
    }
    path = path.replace(/\/+/g, '/');
    navigate(path);
  };

  return (
    <Routes>
      {/* Public Routes with Shared Public Layout */}
      <Route element={<PublicLayout user={user} isAdmin={isAdmin} onLogout={onLogout} showAlert={showAlert} showToast={showToast} />}>
        <Route path="/" element={<Home onNavigate={onNavigate} user={user} />} />
        {DiscoverRoutes({ onNavigate, user, isAdmin })}
        {ProfileRoutes({ onNavigate, user, isAdmin, showAlert, authReady })}
        {CastingRoutes({ onNavigate, user, isAdmin, showAlert, authReady })}
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
        <Route path="/trust-safety" element={<TrustSafety />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/signin/*" element={<SignIn onNavigate={onNavigate} />} />
        <Route path="/signup/*" element={<SignUp onNavigate={onNavigate} />} />
        <Route path="/sign-in/*" element={<SignIn onNavigate={onNavigate} />} />
        <Route path="/sign-up/*" element={<SignUp onNavigate={onNavigate} />} />
        <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/discover" signUpForceRedirectUrl="/discover" />} />
        <Route path="/forgot-password" element={<ForgotPassword onNavigate={onNavigate} />} />
        <Route path="/reset-password" element={<ForgotPassword onNavigate={onNavigate} />} />
      </Route>

      {/* Protected User Routes with User Layout */}
      <Route path="/" element={<ProtectedRoute user={user} authReady={authReady} />}>
        <Route element={<UserLayout user={user} isAdmin={isAdmin} onLogout={onLogout} showAlert={showAlert} showToast={showToast} />}>
          {MessagesRoutes({ onNavigate, user, showAlert })}
          {SettingsRoutes({ onNavigate, user, showToast, showAlert })}
          {NotificationsRoutes({ onNavigate, user })}
          {SavedRoutes({ user, onNavigate, showToast })}
          {CallsRoutes()}
          {ApplicationsRoutes({ onNavigate, user })}
        </Route>
      </Route>

      {/* Admin Routes with Admin Layout */}
      <Route path="/admin/*" element={<AdminRoute user={user} isAdmin={isAdmin} authReady={authReady} />}>
        <Route element={<AdminLayout showToast={showToast} />}>
          {AdminRoutes()}
        </Route>
      </Route>

      {/* Error Pages */}
      <Route path="/402" element={<NotFound />} />
      <Route path="/403" element={<NotFound />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="/405" element={<NotFound />} />
      <Route path="/500" element={<NotFound />} />

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
