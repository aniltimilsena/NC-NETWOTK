import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { subscribeToGlobalSettings } from '../features/admin/services/admin';
interface UserLayoutProps {
    user: any;
    isAdmin: boolean;
    onLogout: () => void;
    showAlert: any;
    showToast: any;
}

const RouteLoadingFallback = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-pulse space-y-6">
        <div className="h-8 bg-white/5 rounded-2xl w-48 mb-8" />
        <div className="h-4 bg-white/5 rounded-xl w-3/4" />
        <div className="h-4 bg-white/5 rounded-xl w-full" />
        <div className="h-4 bg-white/5 rounded-xl w-5/6" />
        <div className="pt-8 space-y-4">
            <div className="h-6 bg-white/5 rounded-xl w-40" />
            <div className="h-4 bg-white/5 rounded-xl w-full" />
            <div className="h-4 bg-white/5 rounded-xl w-11/12" />
            <div className="h-4 bg-white/5 rounded-xl w-4/5" />
        </div>
    </div>
);

export default function UserLayout({ user, isAdmin, onLogout, showAlert, showToast, }: UserLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
    useEffect(() => {
        const unsub = subscribeToGlobalSettings((settings: any) => {
            setMaintenanceMode(!!settings?.maintenanceMode);
        });
        return () => unsub();
    }, []);
    const handleLegacyNavigate = (page: string, param: any = null) => {
        if (!page) {
            navigate('/');
            return;
        }
        if (page.startsWith('/')) {
            navigate(page);
            return;
        }
        switch (page) {
            case 'home':
                navigate('/');
                break;
            case 'discover':
            case 'categories':
                navigate(param ? `/discover/${param}` : '/discover');
                break;
            case 'listing':
            case 'talent':
            case 'talents':
                navigate(param ? `/talents/${param}` : '/talents');
                break;
            case 'profile':
                navigate(param ? `/profile/${param}` : user?.uid ? `/profile/${user.uid}` : '/profile');
                break;
            case 'casting':
                navigate('/casting');
                break;
            case 'casting-detail':
                navigate(param ? `/casting/${param}` : '/casting');
                break;
            case 'casting-apply':
                navigate(param ? `/casting/${param}/apply` : '/casting');
                break;
            case 'signin':
                navigate('/signin');
                break;
            case 'signup':
                navigate('/signup');
                break;
            case 'profile-create':
                navigate('/profile/create');
                break;
            case 'casting-create':
                navigate('/casting/create');
                break;
            case 'messages':
                navigate(param ? `/messages/${param}` : '/messages');
                break;
            case 'notifications':
                navigate('/notifications');
                break;
            case 'settings':
                navigate('/settings');
                break;
            case 'saved':
            case 'saved-casting':
            case 'saved-castings':
                navigate('/saved');
                break;
            case 'privacy':
                navigate('/privacy');
                break;
            case 'terms':
                navigate('/terms');
                break;
            case 'trust':
            case 'trust-safety':
                navigate('/trust-safety');
                break;
            case 'trending':
                navigate('/trending');
                break;
            default: navigate('/' + page);
        }
    };
    const showNavbar =
        !location.pathname.startsWith('/call') &&
        !location.pathname.startsWith('/messages');
    if (maintenanceMode && !isAdmin && !location.pathname.startsWith('/admin')) {
        return (<div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">System Under Maintenance</h1>
                    <p className="text-sm text-gray-400">
                        NepalCasts is currently undergoing scheduled upgrades and maintenance.
                    </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <span>We'll be back online shortly. Thank you for your patience!</span>
                </div>
            </div>
        </div>);
    }
    return (<div className="flex flex-col min-h-screen bg-nc-dark text-nc-text">
        {showNavbar && (<Navbar user={user} isAdmin={isAdmin} onLogout={onLogout} onNavigate={handleLegacyNavigate} />)}
        <main className="flex-1 px-0 pb-0 min-h-0">
            <Suspense fallback={<RouteLoadingFallback />}>
                <Outlet context={{ user, isAdmin, showAlert, showToast }} />
            </Suspense>
        </main>
    </div>);
}
