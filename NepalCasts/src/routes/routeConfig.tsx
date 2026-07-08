import React, { lazy } from 'react';
import { Route, Routes, Navigate, useNavigate, useParams } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';
import RouteLoader from '../components/RouteLoader';

// Lazy load all pages
const Home = lazy(() => import('../pages/Home'));
const TalentListing = lazy(() => import('../pages/TalentListing'));
const Trending = lazy(() => import('../pages/Trending'));
const Profile = lazy(() => import('../pages/Profile'));
const CastingCall = lazy(() => import('../pages/CastingCall'));
const CastingDetail = lazy(() => import('../pages/CastingCallDetail'));
const Premium = lazy(() => import('../pages/Premium'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../pages/TermsOfService'));
const TrustSafety = lazy(() => import('../pages/TrustSafety'));
const SignIn = lazy(() => import('../pages/SignIn'));
const SignUp = lazy(() => import('../pages/SignUp'));
const ProfileCreate = lazy(() => import('../pages/ProfileCreate'));
const CastingCallCreate = lazy(() => import('../pages/CastingCallCreate'));
const Messages = lazy(() => import('../pages/Messages'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Settings = lazy(() => import('../pages/Settings'));
const SavedCastingCalls = lazy(() => import('../pages/SavedCastingCalls'));

// Admin Pages
const AdminOverview = lazy(() => import('../pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('../pages/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('../pages/admin/AdminAnalytics'));
const AdminContent = lazy(() => import('../pages/admin/AdminContent'));
const AdminCasting = lazy(() => import('../pages/admin/AdminCasting'));
const AdminMessages = lazy(() => import('../pages/admin/AdminMessages'));
const AdminPro = lazy(() => import('../pages/admin/AdminPro'));
const AdminModeration = lazy(() => import('../pages/admin/AdminModeration'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));
const AdminDataRequests = lazy(() => import('../pages/admin/DataRequests'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Route Guards
const ProtectedRoute = ({ user, authReady, children }: any) => {
  if (!authReady) return <RouteLoader />;
  return user ? children : <Navigate to="/signin" replace />;
};

const AdminRoute = ({ user, isAdmin, authReady, children }: any) => {
  if (!authReady) return <RouteLoader />;
  return user && isAdmin ? children : <Navigate to="/" replace />;
};

// Parameterized wrappers to map router params to legacy component props
const ProfileWrapper = ({ onNavigate, user, isAdmin, showAlert }: any) => {
  const { id } = useParams();
  return <Profile onNavigate={onNavigate} profileId={id || user?.uid} user={user} isAdmin={isAdmin} showAlert={showAlert} />;
};

const CastingDetailWrapper = ({ onNavigate, user, showAlert }: any) => {
  const { id } = useParams();
  return <CastingDetail onNavigate={onNavigate} castingId={id} user={user} showAlert={showAlert} />;
};

const TalentListingWrapper = ({ onNavigate }: any) => {
  const { category } = useParams();
  return <TalentListing onNavigate={onNavigate} initialCategory={category || 'All'} />;
};

export default function RouteConfig({ user, isAdmin, authReady, onLogout, showAlert, showToast }: any) {
  const navigate = useNavigate();

  const onNavigate = (page: string, param?: any) => {
    let targetPage = page;
    if (page === 'casting-detail') targetPage = 'casting';
    if (page === 'listing') targetPage = 'talents';

    let path = '/' + targetPage;
    if (targetPage === 'home') path = '/';
    if (param) path = `/${targetPage}/${param}`;
    navigate(path);
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={
        <PublicLayout 
          user={user} 
          isAdmin={isAdmin} 
          onLogout={onLogout} 
          showAlert={showAlert} 
          showToast={showToast} 
        />
      }>
        <Route path="/" element={<Home onNavigate={onNavigate} user={user} />} />
        <Route path="/talents" element={<TalentListingWrapper onNavigate={onNavigate} />} />
        <Route path="/talents/:category" element={<TalentListingWrapper onNavigate={onNavigate} />} />
        <Route path="/trending" element={<Trending onNavigate={onNavigate} />} />
        <Route path="/profile/:id" element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} />} />
        <Route path="/talent/:id" element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} />} />
        <Route path="/casting" element={<CastingCall onNavigate={onNavigate} user={user} isAdmin={isAdmin} />} />
        <Route path="/casting/:id" element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/trust-safety" element={<TrustSafety />} />
        <Route path="/signin" element={<SignIn onNavigate={onNavigate} />} />
        <Route path="/signup" element={<SignUp onNavigate={onNavigate} />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute user={user} authReady={authReady} />}>
        <Route element={
          <UserLayout 
            user={user} 
            isAdmin={isAdmin} 
            onLogout={onLogout} 
            showAlert={showAlert} 
            showToast={showToast} 
          />
        }>
          <Route path="/profile/create" element={<ProfileCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
          <Route path="/casting/create" element={<CastingCallCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
          <Route path="/messages" element={<Messages onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
          <Route path="/messages/:id" element={<Messages onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
          <Route path="/notifications" element={<Notifications onNavigate={onNavigate} user={user} />} />
          <Route path="/settings" element={<Settings onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
          <Route path="/saved-castings" element={<SavedCastingCalls user={user} onNavigate={onNavigate} showToast={showToast} />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route path="/" element={<AdminRoute user={user} isAdmin={isAdmin} authReady={authReady} />}>
        <Route element={<AdminLayout showToast={showToast} />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/casting" element={<AdminCasting />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/pro" element={<AdminPro />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/data-requests" element={<AdminDataRequests />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
