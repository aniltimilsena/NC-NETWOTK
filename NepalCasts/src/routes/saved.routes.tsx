import React from 'react';
import { Route, useParams, Navigate } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const SavedCastingCalls = lazyWithRetry(() => import('../features/casting/SavedCastingCalls'));

interface SavedRoutesProps {
  user?: any;
  onNavigate?: (page: string, param?: unknown) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SavedWrapper = ({ user, onNavigate, showToast }: SavedRoutesProps) => {
  const { type } = useParams();
  return <SavedCastingCalls user={user} onNavigate={onNavigate} showToast={showToast} activeTab={type || 'casting'} />;
};

export const SavedRoutes = ({ user, onNavigate, showToast }: SavedRoutesProps) => (
  <>
    <Route path="/saved" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/talent" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/casting" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/posts" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/searches" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved/:type" element={<SavedWrapper user={user} onNavigate={onNavigate} showToast={showToast} />} />
    <Route path="/saved-castings" element={<Navigate to="/saved" replace />} />
  </>
);
