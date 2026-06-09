import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface AdminRouteProps {
  user: any;
  isAdmin: boolean;
  authReady: boolean;
  children?: React.ReactElement;
}

export default function AdminRoute({ user, isAdmin, authReady, children }: AdminRouteProps) {
  if (!authReady) {
    return null; // Wait until Firebase Auth initializes
  }

  if (!user || !isAdmin) {
    // Redirect unauthorized users to the main landing page
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}
