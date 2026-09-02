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
    <Route index element={<AdminOverview />} />
    <Route path="users" element={<AdminUsers />} />
    <Route path="analytics" element={<AdminAnalytics />} />
    <Route path="reports" element={<AdminAnalytics />} />
    <Route path="content" element={<AdminContent />} />
    <Route path="casting" element={<AdminCasting />} />
    <Route path="messages" element={<AdminMessages />} />
    <Route path="moderation" element={<AdminModeration />} />
    <Route path="settings" element={<AdminSettings />} />
  </>
);
