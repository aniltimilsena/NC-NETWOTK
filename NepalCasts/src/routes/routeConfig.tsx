import React, { lazy } from 'react';
import { Route, Routes, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';
import RouteLoader from '../components/RouteLoader';

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

const Home = lazy(() => import('../pages/Home'));
const Premium = lazy(() => import('../pages/Premium'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Help = lazy(() => import('../pages/Help'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../pages/TermsOfService'));
const TrustSafety = lazy(() => import('../pages/TrustSafety'));
const SignIn = lazy(() => import('../features/auth/SignIn'));
const SignUp = lazy(() => import('../features/auth/SignUp'));
const ForgotPassword = lazy(() => import('../features/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../features/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('../features/auth/VerifyEmail'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Forbidden = lazy(() => import('../pages/Forbidden'));
const ServerError = lazy(() => import('../pages/ServerError'));

const ProtectedRoute = ({ user, authReady, children }: any) => {
  if (!authReady) return <RouteLoader />;
  return user ? (children || <Outlet />) : <Navigate to="/login" replace />;
};

const AdminRoute = ({ user, isAdmin, authReady, children }: any) => {
  if (!authReady) return <RouteLoader />;
  return user && isAdmin ? (children || <Outlet />) : <Navigate to="/" replace />;
};

export default function RouteConfig({ user, isAdmin, authReady, onLogout, showAlert, showToast }: any) {
  const navigate = useNavigate();

  const onNavigate = (page: string, param?: any) => {
    if (page === 'back') {
      navigate(-1);
      return;
    }
    if (page && page.startsWith('/')) {
      navigate(page);
      return;
    }
    let targetPage = page;
    if (page === 'casting-detail') targetPage = 'casting';
    if (page === 'listing' || page === 'talent' || page === 'talents') targetPage = 'talents';
    if (page === 'saved-casting' || page === 'saved-castings') targetPage = 'saved-castings';

    let path = '/' + targetPage;
    if (targetPage === 'home') path = '/';
    if (targetPage === 'profile-create') path = '/profile/create';
    if (targetPage === 'casting-create') path = '/casting/create';

    if (param) path = `/${targetPage}/${param}`;
    path = path.replace(/\/+/g, '/');
    navigate(path);
  };

  return (
    <Routes>
      {/* Public Routes with Shared Public Layout */}
      <Route element={<PublicLayout user={user} isAdmin={isAdmin} onLogout={onLogout} showAlert={showAlert} showToast={showToast} />}>
        <Route path="/" element={<Home onNavigate={onNavigate} user={user} />} />
        {DiscoverRoutes({ onNavigate, user, isAdmin })}
        {ProfileRoutes({ onNavigate, user, isAdmin, showAlert })}
        {CastingRoutes({ onNavigate, user, isAdmin, showAlert })}
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/trust-safety" element={<TrustSafety />} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/signin/*" element={<SignIn onNavigate={onNavigate} />} />
        <Route path="/signup/*" element={<SignUp onNavigate={onNavigate} />} />
        <Route path="/sign-in/*" element={<SignIn onNavigate={onNavigate} />} />
        <Route path="/sign-up/*" element={<SignUp onNavigate={onNavigate} />} />
        <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/discover" signUpForceRedirectUrl="/discover" />} />
        <Route path="/forgot-password" element={<ForgotPassword onNavigate={onNavigate} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
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
      <Route path="/" element={<AdminRoute user={user} isAdmin={isAdmin} authReady={authReady} />}>
        <Route element={<AdminLayout showToast={showToast} />}>
          {AdminRoutes()}
        </Route>
      </Route>

      {/* Error Pages */}
      <Route path="/403" element={<Forbidden />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="/500" element={<ServerError />} />

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
