import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import RouteLoader from '../components/RouteLoader';

interface ProtectedRouteProps {
    user?: any;
    authReady?: boolean;
    children?: React.ReactElement;
}

export default function ProtectedRoute({ user, authReady, children }: ProtectedRouteProps) {
    const { isLoaded, isSignedIn } = useAuth();
    const location = useLocation();

    if (!isLoaded || (authReady === false)) {
        return <RouteLoader />;
    }

    const isAuthenticated = isSignedIn || !!user;

    if (!isAuthenticated) {
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    return children ? children : <Outlet />;
}
