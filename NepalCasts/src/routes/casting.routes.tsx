import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const CastingCall = lazy(() => import('../features/casting/CastingCall'));
const CastingDetail = lazy(() => import('../features/casting/CastingCallDetail'));
const CastingCallCreate = lazy(() => import('../features/casting/CastingCallCreate'));

const CastingDetailWrapper = ({ onNavigate, user, showAlert }: any) => {
  const params = useParams();
  const castingId = params.castingId || params.id;
  const activeSubView = params.sub || params.action;

  return (
    <CastingDetail
      onNavigate={onNavigate}
      castingId={castingId}
      user={user}
      showAlert={showAlert}
      activeTab={activeSubView}
    />
  );
};

export const CastingRoutes = ({ onNavigate, user, isAdmin, showAlert }: any) => (
  <>
    {/* Public Casting Routes */}
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

    {/* Casting Management Routes (/my-casting/*) */}
    <Route
      path="/my-casting"
      element={<CastingCall onNavigate={onNavigate} user={user} isAdmin={isAdmin} filter="my-calls" />}
    />
    <Route
      path="/my-casting/create"
      element={<CastingCallCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
    <Route
      path="/my-casting/:castingId"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
    <Route
      path="/my-casting/:castingId/:sub"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
  </>
);
