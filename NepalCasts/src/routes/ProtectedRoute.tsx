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
        return null;
    }
    if (!user) {
        return <Navigate to="/signin" state={{ from: location }} replace/>;
    }
    return children ? children : <Outlet />;
}
