import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

const Settings = lazy(() => import('../features/settings/SettingsPage'));

export const SettingsRoutes = ({ onNavigate, user, showToast, showAlert }: any) => (
  <>
    <Route path="/settings" element={<Settings onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/:tab" element={<Settings onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
  </>
);
