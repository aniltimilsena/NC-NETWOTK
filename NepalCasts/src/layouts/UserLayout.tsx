import React, { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { subscribeToGlobalSettings } from '../features/admin/services/admin';
import { prefetchRoute } from '../utils/prefetchRoute';

interface UserLayoutProps {
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  showAlert: any;
  showToast: any;
}

const RouteLoadingFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5" aria-hidden="true">
    {/* Camera aperture SVG loader */}
    <svg
      className="animate-aperture-pulse"
      width="52" height="52" viewBox="0 0 52 52" fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="26" cy="26" r="24" stroke="#E7E5E0" strokeWidth="2" />
      <circle cx="26" cy="26" r="10" fill="#194332" fillOpacity="0.12" />
      {/* Aperture blades */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => (
        <line
          key={i}
          x1="26" y1="26"
          x2={26 + 20 * Math.cos((deg * Math.PI) / 180)}
          y2={26 + 20 * Math.sin((deg * Math.PI) / 180)}
          stroke="#194332"
          strokeWidth="1.5"
          strokeOpacity="0.35"
          strokeLinecap="round"
        />
      ))}
      <circle cx="26" cy="26" r="4" fill="#194332" fillOpacity="0.7" />
    </svg>
    <p className="text-xs font-inter text-[#777C75] tracking-widest uppercase">Every story loads</p>
  </div>
);

export default function UserLayout({
  user,
  isAdmin,
  onLogout,
  showAlert,
  showToast,
}: UserLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToGlobalSettings((settings: any) => {
      setMaintenanceMode(!!settings?.maintenanceMode);
    });
    return () => unsub();
  }, []);

  // Pre-warm frequently switched routes in background so tapping them is instant
  useEffect(() => {
    if (!user?.uid) return;
    const prewarm = () => {
      prefetchRoute('notifications');
      prefetchRoute('messages');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(prewarm, { timeout: 1500 });
      return () => {
        if ('cancelIdleCallback' in window) (window as any).cancelIdleCallback(idleId);
      };
    } else {
      const timer = setTimeout(prewarm, 800);
      return () => clearTimeout(timer);
    }
  }, [user?.uid]);

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
      default:
        navigate('/' + page);
    }
  };

  const showNavbar =
    !location.pathname.startsWith('/call') &&
    !location.pathname.startsWith('/messages');

  if (maintenanceMode && !isAdmin && !location.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] text-[#202923] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-[#E7E5E0] rounded-2xl p-8 shadow-card space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF4EC] border border-[#EADBC8] text-[#946019] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-[#202923]">System Under Maintenance</h1>
            <p className="text-sm text-[#626860]">
              NepalCasts is currently undergoing scheduled upgrades and maintenance.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF8F4] border border-[#E7E5E0] text-xs text-[#414840] flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#946019] animate-ping"></span>
            <span>We&apos;ll be back online shortly. Thank you for your patience!</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF8F4] nc-texture text-[#202923] selection:bg-[#194332]/10 selection:text-[#194332]">
      {showNavbar && (
        <Navbar user={user} isAdmin={isAdmin} onLogout={onLogout} onNavigate={handleLegacyNavigate} />
      )}
      <main className="flex-1 px-0 pb-0 min-h-0">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet context={{ user, isAdmin, showAlert, showToast }} />
        </Suspense>
      </main>
    </div>
  );
}
