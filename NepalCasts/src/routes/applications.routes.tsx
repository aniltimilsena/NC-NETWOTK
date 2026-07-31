import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const ApplicationsPage = lazy(() => import('../features/casting/ApplicationsPage'));

const ApplicationsWrapper = ({ onNavigate, user }: any) => {
  const { filter } = useParams();
  return <ApplicationsPage onNavigate={onNavigate} user={user} initialFilter={filter || 'all'} />;
};

export const ApplicationsRoutes = ({ onNavigate, user }: any) => (
  <>
    <Route path="/applications" element={<ApplicationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/applications/active" element={<ApplicationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/applications/shortlisted" element={<ApplicationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/applications/rejected" element={<ApplicationsWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/applications/:filter" element={<ApplicationsWrapper onNavigate={onNavigate} user={user} />} />
  </>
);
