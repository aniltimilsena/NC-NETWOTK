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
        return null;
    }
    if (!user || !isAdmin) {
        return <Navigate to="/" replace/>;
    }
    return children ? children : <Outlet />;
}
