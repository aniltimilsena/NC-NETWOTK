import React from 'react';
import { Route, useParams } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const Notifications = lazyWithRetry(() => import('../features/notifications/Notifications'));

const NotificationsWrapper = ({ onNavigate, user }: any) => {
  const { filter } = useParams();
  return <Notifications onNavigate={onNavigate} user={user} initialFilter={filter || 'all'} />;
};

export const NotificationsRoutes = ({ onNavigate, user }: any) => (
  <>
    <Route path="/notifications" element={<NotificationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/notifications/all" element={<NotificationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/notifications/unread" element={<NotificationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/notifications/mentions" element={<NotificationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/notifications/:filter" element={<NotificationsWrapper onNavigate={onNavigate} user={user} />} />
  </>
);
