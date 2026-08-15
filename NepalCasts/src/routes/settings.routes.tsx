import React, { lazy } from 'react';
import { Route, useParams, useLocation } from 'react-router-dom';

const Settings = lazy(() => import('../features/settings/SettingsPage'));

const SettingsWrapper = ({ onNavigate, user, showToast, showAlert }: any) => {
  const { tab } = useParams();
  const location = useLocation();
  const pathSegment = location.pathname.split('/').filter(Boolean).pop();
  const currentTab = tab || (pathSegment && pathSegment !== 'settings' ? pathSegment : undefined);

  return (
    <Settings
      onNavigate={onNavigate}
      user={user}
      showToast={showToast}
      showAlert={showAlert}
      initialTab={currentTab}
    />
  );
};

export const SettingsRoutes = ({ onNavigate, user, showToast, showAlert }: any) => (
  <>
    <Route path="/settings" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/profile" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/account" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/security" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/privacy" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/password" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/notifications" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/language" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/appearance" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/subscription" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/billing" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/payment-methods" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/blocked-users" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/sessions" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/help" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
    <Route path="/settings/:tab" element={<SettingsWrapper onNavigate={onNavigate} user={user} showToast={showToast} showAlert={showAlert} />} />
  </>
);
