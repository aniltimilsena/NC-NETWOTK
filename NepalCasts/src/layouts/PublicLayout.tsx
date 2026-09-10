import React, { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
interface PublicLayoutProps {
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

export default function PublicLayout({ user, isAdmin, onLogout, showAlert, showToast, }: PublicLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
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
    const isAuthPage =
        location.pathname.startsWith('/signin') ||
        location.pathname.startsWith('/signup') ||
        location.pathname.startsWith('/sign-in') ||
        location.pathname.startsWith('/sign-up') ||
        location.pathname.startsWith('/forgot-password') ||
        location.pathname.startsWith('/reset-password') ||
        location.pathname.startsWith('/sso-callback');

    React.useEffect(() => {
        if (!isAuthPage) {
            try {
                sessionStorage.setItem('last_non_auth_path', location.pathname + location.search);
            } catch (e) {
                // ignore
            }
        }
    }, [location.pathname, location.search, isAuthPage]);
    const showNavbar =
        !isAuthPage &&
        !location.pathname.startsWith('/call') &&
        !location.pathname.startsWith('/messages');
    return (<div className={`flex flex-col min-h-screen ${isAuthPage ? 'bg-[#0c0e15]' : 'bg-nc-dark'} text-nc-text`}>
        {showNavbar && (<Navbar user={user} isAdmin={isAdmin} onLogout={onLogout} onNavigate={handleLegacyNavigate} />)}
        <main className="flex-1 px-0 pb-0 min-h-0">
            <Suspense fallback={<RouteLoadingFallback />}>
                <Outlet context={{ user, isAdmin, showAlert, showToast }} />
            </Suspense>
        </main>
    </div>);
}

