import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

const AdminOverview = lazy(() => import('../features/admin/AdminOverview'));
const AdminUsers = lazy(() => import('../features/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('../features/admin/AdminAnalytics'));
const AdminContent = lazy(() => import('../features/admin/AdminContent'));
const AdminCasting = lazy(() => import('../features/admin/AdminCasting'));
const AdminMessages = lazy(() => import('../features/admin/AdminMessages'));
const AdminPro = lazy(() => import('../features/admin/AdminPro'));
const AdminModeration = lazy(() => import('../features/admin/AdminModeration'));
const AdminSettings = lazy(() => import('../features/admin/AdminSettings'));

export const AdminRoutes = () => (
  <>
    <Route path="/admin" element={<AdminOverview />} />
    <Route path="/admin/users" element={<AdminUsers />} />
    <Route path="/admin/analytics" element={<AdminAnalytics />} />
    <Route path="/admin/reports" element={<AdminAnalytics />} />
    <Route path="/admin/content" element={<AdminContent />} />
    <Route path="/admin/casting" element={<AdminCasting />} />
    <Route path="/admin/messages" element={<AdminMessages />} />
    <Route path="/admin/pro" element={<AdminPro />} />
    <Route path="/admin/payments" element={<AdminPro />} />
    <Route path="/admin/moderation" element={<AdminModeration />} />
    <Route path="/admin/settings" element={<AdminSettings />} />
  </>
);
