import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Breadcrumbs from '../components/Breadcrumbs';
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
        switch (page) {
            case 'home':
                navigate('/');
                break;
            case 'listing':
                navigate('/talents');
                break;
            case 'profile':
                navigate(param ? `/profile/${param}` : '/talents');
                break;
            case 'casting':
                navigate('/casting');
                break;
            case 'casting-detail':
                navigate(`/casting/${param}`);
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
                navigate('/messages');
                break;
            case 'notifications':
                navigate('/notifications');
                break;
            case 'settings':
                navigate('/settings');
                break;
            case 'privacy':
                navigate('/privacy');
                break;
            case 'terms':
                navigate('/terms');
                break;
            case 'trust':
                navigate('/trust-safety');
                break;
            default: navigate('/');
        }
    };
    const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';
    const showNavbar = !isAuthPage && !location.pathname.startsWith('/messages') && !location.pathname.startsWith('/notifications');
    return (<div className="flex flex-col min-h-screen bg-nc-dark text-nc-text">
      {showNavbar && (<Navbar user={user} isAdmin={isAdmin} onLogout={onLogout} onNavigate={handleLegacyNavigate}/>)}
      <main className="flex-1 px-0 pb-0">
        {!isAuthPage && <Breadcrumbs />}
        <Outlet context={{ user, isAdmin, showAlert, showToast }}/>
      </main>
      {!isAuthPage && location.pathname === '/' && <Footer user={user}/>}
    </div>);
}
