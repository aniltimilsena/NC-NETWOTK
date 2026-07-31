import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const CastingCall = lazy(() => import('../features/casting/CastingCall'));
const CastingDetail = lazy(() => import('../features/casting/CastingCallDetail'));
const CastingCallCreate = lazy(() => import('../features/casting/CastingCallCreate'));

const CastingDetailWrapper = ({ onNavigate, user, showAlert }: any) => {
  const { id } = useParams();
  return <CastingDetail onNavigate={onNavigate} castingId={id} user={user} showAlert={showAlert} />;
};

export const CastingRoutes = ({ onNavigate, user, isAdmin, showAlert }: any) => (
  <>
    <Route
      path="/casting"
      element={<CastingCall onNavigate={onNavigate} user={user} isAdmin={isAdmin} />}
    />
    <Route
      path="/casting/create"
      element={<CastingCallCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
    <Route
      path="/casting/:id"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
    <Route
      path="/casting/:id/:sub"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
  </>
);
