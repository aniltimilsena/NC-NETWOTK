import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  user: any;
  authReady: boolean;
  children?: React.ReactElement;
}

export default function ProtectedRoute({ user, authReady, children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!authReady) {
    return null; // Wait until Firebase Auth initializes
  }

  if (!user) {
    // Redirect to sign in, saving the current location in router state
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
