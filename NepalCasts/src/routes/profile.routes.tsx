import React, { lazy } from 'react';
import { Route, useParams, Navigate } from 'react-router-dom';

const Profile = lazy(() => import('../features/profile/ProfilePage'));
const ProfileCreate = lazy(() => import('../features/profile/ProfileCreate'));

const ProfileWrapper = ({ onNavigate, user, isAdmin, showAlert }: any) => {
  const { id } = useParams();
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
    />
  );
};

export const ProfileRoutes = ({ onNavigate, user, isAdmin, showAlert }: any) => (
  <>
    <Route
      path="/profile/create"
      element={<ProfileCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
    <Route
      path="/profile"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} />}
    />
    <Route
      path="/profile/:id"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} />}
    />
    <Route
      path="/profile/:id/:tab"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} />}
    />
    <Route
      path="/talent/:id"
      element={<ProfileWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} showAlert={showAlert} />}
    />
  </>
);
