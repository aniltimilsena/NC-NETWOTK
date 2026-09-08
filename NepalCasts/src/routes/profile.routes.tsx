import React from 'react';
import { Route, useParams, Navigate } from 'react-router-dom';
import { CurrentUser } from '../utils/CurrentUser';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';

const Profile = lazyWithRetry(() => import('../features/profile/ProfilePage'));
const ProfileCreate = lazyWithRetry(() => import('../features/profile/ProfileCreate'));

const ProfileWrapper = ({ onNavigate, user, isAdmin, showAlert, authReady, defaultTab }: any) => {
  const { id, tab } = useParams();

  if (!authReady) {
    return <div className="min-h-screen bg-[#141414]" />;
  }

  const targetId = id || user?.uid || user?.id || CurrentUser.id;

  if (!targetId && !user && !CurrentUser.id) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="profile">
      <Profile
        onNavigate={onNavigate}
        profileId={targetId}
        user={user}
        isAdmin={isAdmin}
        showAlert={showAlert}
        initialTab={defaultTab || tab}
      />
    </Desktop3ColumnLayout>
  );
};

export const ProfileRoutes = ({ onNavigate, user, isAdmin, showAlert, authReady }: any) => (
  <>
    <Route
      path="/profile/create"
      element={<ProfileCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
    <Route
      path="/profile/media"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} authReady={authReady} defaultTab="media" />}
    />
    <Route
      path="/profile/experience"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} authReady={authReady} defaultTab="experience" />}
    />
    <Route
      path="/profile"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} authReady={authReady} />}
    />
    <Route
      path="/profile/:id"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} authReady={authReady} />}
    />
    <Route
      path="/profile/:id/:tab"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} authReady={authReady} />}
    />
    <Route
      path="/talent/:id"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} authReady={authReady} />}
    />
  </>
);
