import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { ActionSearchBar } from '@/components/ui/ActionSearchBar';
import { subscribeToTalents, subscribeToCastingCalls } from '../../services';
import Avatar from '../ui/Avatar';
import { getAvatar } from '../../utils/avatars';
import { CurrentUser } from '../../utils/CurrentUser';
import { formatRole, isCastingCallClosed } from '../../utils';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';
import { AuthService } from '../../services/AuthService';
import { FollowItemSkeleton } from '../ui/Skeleton';
import Footer from './Footer';
import { useApp } from '../../providers/AppProviders';
import { toggleFollowUser, subscribeToUserFollows } from '../../features/profile/services/users';

// Inline follow button that mirrors ProfileHeader's style and uses backend/Firestore permissions safely
function FollowBtn({ targetUid, currentUser }) {
  const { showToast } = useApp();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentUserId = AuthService.getUserId() || currentUser?.uid || currentUser?.id || CurrentUser.id;

  useEffect(() => {
    if (!currentUserId || !targetUid || currentUserId === targetUid) return;
    const unsub = subscribeToUserFollows(currentUserId, (followingIds) => {
      setFollowing(followingIds.includes(targetUid));
    });
    return () => unsub();
  }, [currentUserId, targetUid]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!currentUserId) {
      showToast?.('Please sign in to connect', 'info');
      return;
    }
    if (!targetUid || currentUserId === targetUid) return;
    setLoading(true);
    const prevFollowing = following;
    setFollowing(!prevFollowing);
    try {
      const res = await toggleFollowUser({
        currentUserId,
        targetUserId: targetUid,
        isCurrentlyFollowing: prevFollowing,
        senderInfo: {
          displayName: currentUser?.displayName || currentUser?.name || 'Someone',
          photoURL: currentUser?.photoURL || currentUser?.profileImage || '',
        }
      });
      if (res && res.success === false) {
        throw new Error(res.error || 'Failed to update connection');
      }
      if (typeof res?.isFollowing === 'boolean') {
        setFollowing(res.isFollowing);
      }
    } catch (err) {
      console.error('Follow toggle failed in FollowBtn:', err);
      setFollowing(prevFollowing);
      showToast?.('Failed to update connection. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUserId || currentUserId === targetUid) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold font-inter transition-all cursor-pointer active:scale-[0.96] flex items-center gap-1 ${
        following
          ? 'bg-[#194332] text-white border-0 hover:bg-[#102F28]'
          : 'border border-[#194332] text-[#194332] hover:bg-[#194332]/10 bg-transparent'
      } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {following ? 'Connected' : 'Connect'}
    </button>
  );
}

export default function Desktop3ColumnLayout({
  children,
  user,
  onNavigate,
  onLogout = null,
  activeNav = 'discover',
  featuredTalents = [],
  trendingCalls = [],
  loading = false
}) {
  const location = useLocation();
  const pathname = location?.pathname || '';
  const isHomePage = pathname === '/' || pathname === '' || activeNav === 'home';
  const isAdmin = user?.admin === true || user?.role === 'admin' || CurrentUser.isAdmin === true;
  const [profileData] = useState(null);

  const [internalFeatured, setInternalFeatured] = useState([]);
  const [, setInternalTrending] = useState([]);
  const [talentsLoading, setTalentsLoading] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  const hasPropsFeatured = Boolean(featuredTalents && featuredTalents.length > 0);
  const hasPropsTrending = Boolean(trendingCalls && trendingCalls.length > 0);

  useEffect(() => {
    if (hasPropsFeatured) {
      setTalentsLoading(false);
      return;
    }

    setTalentsLoading(true);
    const unsubTalents = subscribeToTalents((data) => {
      if (Array.isArray(data)) {
        const myUid = user?.uid || user?.id || CurrentUser.id;
        const myEmail = (user?.email || CurrentUser.email || '').toLowerCase().trim();
        const myName = (user?.displayName || user?.fullName || CurrentUser.name || '').toLowerCase().trim();

        const allActive = data
          .filter(t => {
            const tName = t.name || t.displayName || t.fullName || t.username;
            if (t.deactivated || !tName || t.isAdmin === true || t.role?.toLowerCase() === 'admin' || t.email?.toLowerCase() === 'aniltimilsena53@gmail.com') return false;
            const isSelf = Boolean(
              (myUid && (t.id === myUid || t.uid === myUid)) ||
              (myEmail && t.email && t.email.toLowerCase().trim() === myEmail) ||
              (myName && tName && tName.toLowerCase().trim() === myName)
            );
            return !isSelf;
          })
          .reduce((acc, current) => {
            const isDuplicate = acc.some(item =>
              item.id === current.id ||
              (item.name && item.name.trim().toLowerCase() === current.name?.trim().toLowerCase())
            );
            if (!isDuplicate) {
              acc.push(current);
            }
            return acc;
          }, []);
        const featuredOnly = allActive.filter(t => t.featured === true);
        const finalTalents = (featuredOnly.length > 0 ? featuredOnly : allActive).slice(0, 50);
        setInternalFeatured(finalTalents);
      }
      setTalentsLoading(false);
    });

    return () => {
      unsubTalents();
    };
  }, [hasPropsFeatured, user]);

  useEffect(() => {
    if (hasPropsTrending) {
      return;
    }

    const unsubCalls = subscribeToCastingCalls('All', (data) => {
      if (Array.isArray(data)) {
        setInternalTrending(data);
      }
    });

    return () => {
      unsubCalls();
    };
  }, [hasPropsTrending]);

  const [realFollowers, setRealFollowers] = useState(0);
  const [realFollowing, setRealFollowing] = useState(0);

  const uid = user?.uid || user?.id;

  useEffect(() => {
    if (!uid) {
      setRealFollowers(0);
      setRealFollowing(0);
      return;
    }

    const qFollowers = query(collection(db, 'follows'), where('followingId', '==', uid));
    const unsubFollowers = onSnapshot(qFollowers, (snap) => {
      const mockUids = new Set(['uyR9rwPbZBUms2ffermJA0SDbqw2', uid]);
      const valid = snap.docs.filter(d => d.data().followerId && !mockUids.has(d.data().followerId));
      setRealFollowers(valid.length);
    }, () => setRealFollowers(0));

    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', uid));
    const unsubFollowing = onSnapshot(qFollowing, (snap) => {
      const valid = snap.docs.filter(d => d.data().followingId && d.data().followingId !== uid);
      setRealFollowing(valid.length);
    }, () => setRealFollowing(0));

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [uid]);

  const realName =
    profileData?.name ||
    profileData?.fullName ||
    [profileData?.firstName, profileData?.lastName].filter(Boolean).join(' ') ||
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Talent Member';

  const realRole = formatRole(
    profileData?.role ||
    profileData?.category ||
    user?.role ||
    user?.category ||
    'Actor'
  );

  const realImage =
    profileData?.image ||
    profileData?.photoURL ||
    profileData?.profileImage ||
    user?.image ||
    user?.photoURL ||
    user?.profileImage;

  const isVerified = profileData?.verified === true || user?.verified === true;
  const gender = profileData?.gender || user?.gender;
  const openToWork = profileData?.openToWork;

  const safeFeatured = (Array.isArray(featuredTalents) && featuredTalents.length > 0) ? featuredTalents : internalFeatured;
  const isTalentsLoading = loading || talentsLoading;

  const { t } = useTranslation();

  return (
    <div className="w-full bg-[#FAF8F4] text-[#202923]">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 pt-0 pb-0">
        <div className="grid grid-cols-12 gap-0 lg:gap-5">

          {/* LEFT SIDEBAR (Desktop: lg+) */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-16 sm:top-20 pt-2 pb-6 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide space-y-4">

            {/* Inline Desktop Search Bar */}
            <div className="px-1">
              <div
                onClick={() => setShowSearchOverlay(true)}
                className="relative flex items-center bg-white rounded-lg px-4 py-2.5 border border-[#D5D1C7] shadow-sm hover:border-[#194332] transition-all cursor-pointer"
              >
                <input
                  type="text"
                  readOnly
                  placeholder={t('ui.searchPlaceholder') || "Search talents, casting calls..."}
                  className="w-full bg-transparent outline-none text-[#202923] text-sm placeholder:text-[#777C75] pr-8 cursor-pointer border-0 font-inter"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777C75]">
                  <Search className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* PROFILE CARD */}
            {user ? (
              <div className="bg-white rounded-2xl border border-[#E7E5E0] p-4 shadow-card">
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <Avatar
                      user={user}
                      userId={user?.uid}
                      src={realImage}
                      gender={gender}
                      name={realName}
                      size={52}
                      className="border border-[#E7E5E0] shadow-sm"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#286847] ring-2 ring-white pointer-events-none" />
                  </div>

                  <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-[#202923] font-semibold text-base leading-snug tracking-tight truncate font-inter">
                        {realName}
                      </h3>
                      {isVerified && (
                        <span className="rounded-full bg-[#194332] flex items-center justify-center text-white shrink-0 w-4 h-4" title="Verified Talent">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>

                    <p className="text-[#626860] text-xs font-normal capitalize truncate font-inter">
                      {realRole}
                    </p>

                    {openToWork && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#EAF2ED] text-[#286847] text-[9px] font-semibold tracking-wider uppercase border border-[#C8DFD2] flex items-center justify-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#286847]" />
                          OPEN TO WORK
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E7E5E0] flex items-center justify-between text-xs text-[#626860] font-inter">
                  <span><strong className="text-[#202923]">{realFollowers}</strong> connects</span>
                  <span><strong className="text-[#202923]">{realFollowing}</strong> connecting</span>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E7E5E0] p-5 text-center space-y-3 shadow-card">
                <h3 className="text-[#202923] font-display font-semibold text-lg">Join NepalCasts</h3>
                <p className="text-[#626860] text-xs leading-relaxed font-inter">Connect with top directors and casting opportunities in Nepal.</p>
                <Link
                  to="/signin"
                  className="w-full py-2.5 bg-[#194332] hover:bg-[#102F28] text-white font-semibold rounded-lg text-sm transition-all cursor-pointer shadow-sm text-center block font-inter"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* NAVIGATION GROUPS */}
            <div className="bg-white rounded-2xl border border-[#E7E5E0] p-3 shadow-card space-y-4 text-left">
              {/* DISCOVER GROUP */}
              <div>
                <div className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#777C75] select-none font-inter">
                  Discover
                </div>
                <div className="space-y-0.5">
                  {user && (
                    <Link
                      to={`/profile/${user?.uid}`}
                      className={`flex items-center w-full px-3.5 py-2 rounded-lg transition-all font-inter text-sm ${
                        pathname.startsWith('/profile')
                          ? "bg-[#194332]/10 text-[#194332] font-semibold"
                          : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923] font-medium"
                      }`}
                    >
                      <Avatar
                        userId={user?.uid}
                        user={user}
                        src={user?.photoURL || user?.profileImage || user?.image}
                        name={user?.displayName || user?.name}
                        size="none"
                        className="w-5 h-5 rounded-full object-cover mr-3 shrink-0 border border-[#E7E5E0]"
                      />
                      <span>My Profile</span>
                    </Link>
                  )}

                  {[
                    { name: "Home", path: "/", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
                    { name: "Discover", path: "/discover", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18zm.75-13.25l-2 4.5 4.5-2-4.5 2z" /> },
                    { name: "Talent Directory", path: "/talents", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
                    { name: "Trending", path: "/trending", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
                  ].map((item, i) => {
                    const isActive = item.path === '/'
                      ? (pathname === '/' || pathname === '')
                      : (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/')));
                    return (
                      <Link
                        key={i}
                        to={item.path}
                        className={`flex items-center w-full px-3.5 py-2 rounded-lg transition-all font-inter text-sm ${
                          isActive
                            ? "bg-[#194332]/10 text-[#194332] font-semibold"
                            : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923] font-medium"
                        }`}
                      >
                        <svg className={`w-4 h-4 mr-3 shrink-0 ${isActive ? "text-[#194332]" : "text-[#777C75]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {item.icon}
                        </svg>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* PROJECTS GROUP */}
              <div>
                <div className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#777C75] select-none font-inter">
                  Projects
                </div>
                <div className="space-y-0.5">
                  {[
                    { name: "Casting Calls", path: "/casting", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                    { name: "Post Project", path: "/casting/create", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                  ].map((item, i) => {
                    const isActive = item.path === '/casting'
                      ? (pathname === '/casting' || (pathname.startsWith('/casting/') && pathname !== '/casting/create'))
                      : (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/')));
                    return (
                      <Link
                        key={i}
                        to={item.path}
                        className={`flex items-center w-full px-3.5 py-2 rounded-lg transition-all font-inter text-sm ${
                          isActive
                            ? "bg-[#194332]/10 text-[#194332] font-semibold"
                            : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923] font-medium"
                        }`}
                      >
                        <svg className={`w-4 h-4 mr-3 shrink-0 ${isActive ? "text-[#194332]" : "text-[#777C75]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {item.icon}
                        </svg>
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* PERSONAL GROUP */}
              {user && (
                <div>
                  <div className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#777C75] select-none font-inter">
                    Personal
                  </div>
                  <div className="space-y-0.5">
                    {[
                      { name: "Messages", path: "/messages", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                      { name: "Saved Calls", path: "/saved", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /> },
                    ].map((item, i) => {
                      const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'));
                      return (
                        <Link
                          key={i}
                          to={item.path}
                          className={`flex items-center w-full px-3.5 py-2 rounded-lg transition-all font-inter text-sm ${
                            isActive
                              ? "bg-[#194332]/10 text-[#194332] font-semibold"
                              : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923] font-medium"
                          }`}
                        >
                          <svg className={`w-4 h-4 mr-3 shrink-0 ${isActive ? "text-[#194332]" : "text-[#777C75]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {item.icon}
                          </svg>
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ABOUT & SUPPORT */}
              <div>
                <div className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#777C75] select-none font-inter">
                  About & Support
                </div>
                <div className="space-y-0.5">
                  {[
                    { name: "About Us", path: "/about" },
                    { name: "Help & FAQ", path: "/help" },
                    { name: "Contact", path: "/contact" },
                    { name: "Trust & Safety", path: "/trust-safety" },
                  ].map((item) => {
                    const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center w-full px-3.5 py-2 rounded-lg transition-all font-inter text-sm ${
                          isActive
                            ? "bg-[#194332]/10 text-[#194332] font-semibold"
                            : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923] font-medium"
                        }`}
                      >
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={`flex items-center w-full px-3.5 py-2 rounded-lg transition-all font-inter text-sm ${
                        pathname.startsWith("/admin")
                          ? "bg-[#194332]/15 text-[#194332] font-semibold"
                          : "text-[#194332] hover:bg-[#194332]/10 font-medium"
                      }`}
                    >
                      <span>Admin Panel</span>
                    </Link>
                  )}
                </div>
              </div>

              {user && (
                <div className="pt-2 border-t border-[#E7E5E0]">
                  <button
                    type="button"
                    onClick={onLogout || (() => AuthService.signOut())}
                    className="flex items-center w-full px-3.5 py-2 rounded-lg transition-all text-[#B42318] hover:bg-[#FEE4E2] font-medium cursor-pointer font-inter text-sm"
                  >
                    <svg className="w-4 h-4 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-1 text-center">
              <p className="text-[11px] text-[#777C75] font-inter">
                &copy; {new Date().getFullYear()} NepalCasts. All rights reserved.
              </p>
            </div>
          </aside>

          {/* CENTER MAIN CONTENT */}
          <main className={`col-span-12 lg:col-span-8 ${isHomePage ? 'xl:col-span-6' : 'xl:col-span-9'} min-w-0 pt-0 pb-3 h-auto lg:h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] lg:overflow-y-auto flex flex-col justify-between`}>
            <div className="flex-1 min-w-0">
              {children}
            </div>
            {isHomePage && <Footer />}
          </main>

          {/* RIGHT SIDEBAR (Desktop Only: Home Page Only) */}
          {isHomePage && (
            <aside className="hidden xl:block xl:col-span-3 sticky top-16 sm:top-20 pt-2 pb-6 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide space-y-4">

              {/* Why NepalCasts? Section */}
              <div className="bg-white rounded-2xl border border-[#E7E5E0] p-5 shadow-card space-y-4 text-left">
                <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E0]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#946019] font-inter select-none">
                    Why NepalCasts?
                  </h4>
                </div>

                <div className="space-y-4 text-left">
                  {/* Point 1 */}
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-[#FAF8F4] border border-[#E7E5E0] flex items-center justify-center text-[#194332]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-[#202923] text-sm font-semibold font-inter">Live Remote Auditions</h5>
                      <p className="text-[#626860] text-xs leading-relaxed mt-0.5 font-inter">Audition securely from anywhere in Nepal directly on NepalCasts.</p>
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-[#FAF8F4] border border-[#E7E5E0] flex items-center justify-center text-[#194332]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-[#202923] text-sm font-semibold font-inter">Direct Connections</h5>
                      <p className="text-[#626860] text-xs leading-relaxed mt-0.5 font-inter">Message directors and verified production teams without middlemen.</p>
                    </div>
                  </div>

                  {/* Point 3 */}
                  <div className="flex gap-3 items-start">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-[#FAF8F4] border border-[#E7E5E0] flex items-center justify-center text-[#194332]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-[#202923] text-sm font-semibold font-inter">Verified Talent Profiles</h5>
                      <p className="text-[#626860] text-xs leading-relaxed mt-0.5 font-inter">Gain authentic trust and get noticed first by major casting calls.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PEOPLE TO CONNECT */}
              {(isTalentsLoading || safeFeatured.length > 0) && (
                <div className="bg-white rounded-2xl border border-[#E7E5E0] p-5 shadow-card space-y-4 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E0]">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#946019] font-inter select-none">
                      People to connect
                    </h4>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('talent')}
                      className="text-xs font-medium text-[#194332] hover:text-[#102F28] transition-colors cursor-pointer flex items-center gap-0.5 font-inter"
                    >
                      View all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-3.5">
                    {isTalentsLoading ? (
                      <FollowItemSkeleton count={3} />
                    ) : (
                      safeFeatured.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          <div
                            onClick={() => onNavigate?.('profile', item.id)}
                            className="cursor-pointer flex-shrink-0"
                          >
                            <Avatar
                              userId={item.id || item.uid}
                              src={getAvatar(item.photoURL || item.profileImage || item.image, item.gender)}
                              size="md"
                              name={item.name}
                              className="border border-[#E7E5E0]"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5
                              onClick={() => onNavigate?.('profile', item.id)}
                              className="text-[#202923] text-sm font-semibold truncate cursor-pointer hover:text-[#194332] font-inter"
                            >
                              {item.name || 'Talent'}
                            </h5>
                            <p className="text-[#626860] text-xs truncate mt-0.5 font-inter">
                              {formatRole(item.role || item.category || 'Talent')}
                              {item.location && <span> · {item.location}</span>}
                            </p>
                          </div>
                          <FollowBtn targetUid={item.id} currentUser={user} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}

        </div>
      </div>

      {showSearchOverlay && (
        <div className="fixed inset-0 z-[100] bg-[#202923]/40 backdrop-blur-md flex items-start justify-center pt-16 px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl relative bg-white border border-[#E7E5E0] rounded-2xl shadow-elevated p-2">
            <ActionSearchBar
              onClose={() => setShowSearchOverlay(false)}
              onActionSelect={(profileId) => {
                setShowSearchOverlay(false);
                onNavigate?.('profile', profileId);
              }}
              onPageNavigate={(page) => {
                setShowSearchOverlay(false);
                onNavigate?.(page);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
