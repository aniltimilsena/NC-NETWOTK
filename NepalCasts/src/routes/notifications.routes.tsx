import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

const Notifications = lazy(() => import('../features/notifications/Notifications'));

export const NotificationsRoutes = ({ onNavigate, user }: any) => (
  <>
    <Route path="/notifications" element={<Notifications onNavigate={onNavigate} user={user} />} />
    <Route path="/notifications/:filter" element={<Notifications onNavigate={onNavigate} user={user} />} />
  </>
);
