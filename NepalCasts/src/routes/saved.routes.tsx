import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

const SavedCastingCalls = lazy(() => import('../features/casting/SavedCastingCalls'));

export const SavedRoutes = ({ user, onNavigate, showToast }: any) => (
  <>
    <Route path="/saved" element={<SavedCastingCalls user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/:type" element={<SavedCastingCalls user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved-castings" element={<SavedCastingCalls user={user} onNavigate={onNavigate} showToast={showToast} />} />
  </>
);
