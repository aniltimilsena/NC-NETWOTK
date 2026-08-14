import React, { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
interface PublicLayoutProps {
    user: any;
    isAdmin: boolean;
    onLogout: () => void;
    showAlert: any;
    showToast: any;
}
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
                navigate('/discover');
                break;
            case 'listing':
            case 'talent':
            case 'talents':
                navigate('/talents');
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
            case 'premium':
                navigate('/premium');
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
    const showNavbar = !isAuthPage && !location.pathname.startsWith('/messages') && !location.pathname.startsWith('/notifications');
    return (<div className="flex flex-col min-h-screen bg-nc-dark text-nc-text">
      {showNavbar && (<Navbar user={user} isAdmin={isAdmin} onLogout={onLogout} onNavigate={handleLegacyNavigate}/>)}
      <main className="flex-1 px-0 pb-0">
        <Suspense fallback={<div className="min-h-screen bg-[#070709]" />}>
          <Outlet context={{ user, isAdmin, showAlert, showToast }}/>
        </Suspense>
      </main>
      {!isAuthPage && location.pathname === '/' && <Footer user={user}/>}
    </div>);
}

