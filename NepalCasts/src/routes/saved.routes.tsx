import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const SavedCastingCalls = lazy(() => import('../features/casting/SavedCastingCalls'));

const SavedWrapper = ({ user, onNavigate, showToast }: any) => {
  const { type } = useParams();
  return <SavedCastingCalls user={user} onNavigate={onNavigate} showToast={showToast} activeTab={type || 'casting'} />;
};

export const SavedRoutes = ({ user, onNavigate, showToast }: any) => (
  <>
    <Route path="/saved" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/talent" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/casting" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/posts" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/searches" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/:type" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved-castings" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
  </>
);
