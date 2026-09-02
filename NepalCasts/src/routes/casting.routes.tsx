import React from 'react';
import { Route, useParams, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const CastingCall = lazyWithRetry(() => import('../features/casting/CastingCall'));
const CastingDetail = lazyWithRetry(() => import('../features/casting/CastingCallDetail'));
const CastingCallCreate = lazyWithRetry(() => import('../features/casting/CastingCallCreate'));

const CastingDetailWrapper = ({ onNavigate, user, showAlert, defaultTab }: any) => {
  const params = useParams();
  const castingId = params.castingId || params.id;
  const activeSubView = defaultTab || params.sub || params.action;

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

export const CastingRoutes = ({ onNavigate, user, isAdmin, showAlert, authReady }: any) => (
  <>
    {/* Public Casting Directory & Detail Routes */}
    <Route
      path="/casting"
      element={<CastingCall onNavigate={onNavigate} user={user} isAdmin={isAdmin} />}
    />
    <Route
      path="/casting/create"
      element={
        !authReady ? (
          <div className="min-h-screen bg-[#070709]" />
        ) : user ? (
          <CastingCallCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />
        ) : (
          <Navigate to="/signin?redirect_url=/casting/create" replace />
        )
      }
    />
    <Route
      path="/casting/:id/apply"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} defaultTab="apply" />}
    />
    <Route
      path="/casting/:id/apply-for-casting"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} defaultTab="apply" />}
    />
    <Route
      path="/apply/casting/:id"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} defaultTab="apply" />}
    />
    <Route
      path="/apply-casting/:id"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} defaultTab="apply" />}
    />
    <Route
      path="/casting/:id"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />
    <Route
      path="/casting/:id/:sub"
      element={<CastingDetailWrapper onNavigate={onNavigate} user={user} showAlert={showAlert} />}
    />

    {/* Protected Casting Management Routes */}
    <Route
      path="/my-casting"
      element={
        !authReady ? (
          <div className="min-h-screen bg-[#070709]" />
        ) : user ? (
          <CastingCall onNavigate={onNavigate} user={user} isAdmin={isAdmin} filter="my-calls" />
        ) : (
          <Navigate to="/signin?redirect_url=/my-casting" replace />
        )
      }
    />
    <Route
      path="/my-casting/create"
      element={
        !authReady ? (
          <div className="min-h-screen bg-[#070709]" />
        ) : user ? (
          <CastingCallCreate onNavigate={onNavigate} user={user} showAlert={showAlert} />
        ) : (
          <Navigate to="/signin?redirect_url=/casting/create" replace />
        )
      }
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

