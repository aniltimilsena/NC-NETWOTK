import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Breadcrumbs from '../components/Breadcrumbs';

interface UserLayoutProps {
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  showAlert: any;
  showToast: any;
}

export default function UserLayout({
  user,
  isAdmin,
  onLogout,
  showAlert,
  showToast,
}: UserLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLegacyNavigate = (page: string, param: any = null) => {
    switch (page) {
      case 'home': navigate('/'); break;
      case 'listing': navigate('/talents'); break;
      case 'profile': navigate(param ? `/profile/${param}` : '/talents'); break;
      case 'casting': navigate('/casting'); break;
      case 'casting-detail': navigate(`/casting/${param}`); break;
      case 'signin': navigate('/signin'); break;
      case 'signup': navigate('/signup'); break;
      case 'profile-create': navigate('/profile/create'); break;
      case 'casting-create': navigate('/casting/create'); break;
      case 'premium': navigate('/premium'); break;
      case 'messages': navigate('/messages'); break;
      case 'notifications': navigate('/notifications'); break;
      case 'settings': navigate('/settings'); break;
      case 'privacy': navigate('/privacy'); break;
      case 'terms': navigate('/terms'); break;
      case 'trust': navigate('/trust-safety'); break;
      default: navigate('/');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-nc-dark text-nc-text">
      <Navbar
        user={user}
        isAdmin={isAdmin}
        onLogout={onLogout}
        currentPage={location.pathname}
        onNavigate={handleLegacyNavigate}
      />
      <main className="flex-1">
        <Breadcrumbs />
        <Outlet context={{ user, isAdmin, showAlert, showToast }} />
      </main>
    </div>
  );
}
