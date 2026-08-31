import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const AdminOverview = lazyWithRetry(() => import('../features/admin/AdminOverview'));
const AdminUsers = lazyWithRetry(() => import('../features/admin/AdminUsers'));
const AdminAnalytics = lazyWithRetry(() => import('../features/admin/AdminAnalytics'));
const AdminContent = lazyWithRetry(() => import('../features/admin/AdminContent'));
const AdminCasting = lazyWithRetry(() => import('../features/admin/AdminCasting'));
const AdminMessages = lazyWithRetry(() => import('../features/admin/AdminMessages'));
const AdminModeration = lazyWithRetry(() => import('../features/admin/AdminModeration'));
const AdminSettings = lazyWithRetry(() => import('../features/admin/AdminSettings'));

export const AdminRoutes = () => (
  <>
    <Route path="/admin" element={<AdminOverview />} />
    <Route path="/admin/users" element={<AdminUsers />} />
    <Route path="/admin/analytics" element={<AdminAnalytics />} />
    <Route path="/admin/reports" element={<AdminAnalytics />} />
    <Route path="/admin/content" element={<AdminContent />} />
    <Route path="/admin/casting" element={<AdminCasting />} />
    <Route path="/admin/messages" element={<AdminMessages />} />
    <Route path="/admin/moderation" element={<AdminModeration />} />
    <Route path="/admin/settings" element={<AdminSettings />} />
  </>
);
