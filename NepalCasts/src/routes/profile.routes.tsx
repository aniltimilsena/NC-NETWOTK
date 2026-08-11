import React, { lazy } from 'react';
import { Route, useParams, Navigate } from 'react-router-dom';
// RouteLoader removed to prevent generic skeleton flash

const Profile = lazy(() => import('../features/profile/ProfilePage'));
const ProfileCreate = lazy(() => import('../features/profile/ProfileCreate'));

const ProfileWrapper = ({ onNavigate, user, isAdmin, showAlert, authReady, defaultTab }: any) => {
  const { id, tab } = useParams();
  
  if (!authReady) {
    return <div className="min-h-screen bg-[#070709]" />;
  }

  const targetId = id || user?.uid;
  
  if (!targetId && !user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <Profile
      onNavigate={onNavigate}
      profileId={targetId}
      user={user}
      isAdmin={isAdmin}
      showAlert={showAlert}
      initialTab={defaultTab || tab}
    />
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
      path="/profile/reviews"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} authReady={authReady} defaultTab="reviews" />}
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
