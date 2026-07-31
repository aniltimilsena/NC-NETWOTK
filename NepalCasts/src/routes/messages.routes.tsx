import React, { lazy } from 'react';
import { Route } from 'react-router-dom';

const Messages = lazy(() => import('../features/messages/MessagesPage'));

export const MessagesRoutes = ({ onNavigate, user, showAlert }: any) => (
  <>
    <Route path="/messages" element={<Messages onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:id" element={<Messages onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
    <Route path="/messages/:id/:sub" element={<Messages onNavigate={onNavigate} user={user} showAlert={showAlert} />} />
  </>
);
