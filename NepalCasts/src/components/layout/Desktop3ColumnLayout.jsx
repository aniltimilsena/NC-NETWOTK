import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Users, Film, Bookmark, MessageSquare, Compass, ShieldCheck, ChevronRight, Lock, FileText } from 'lucide-react';
import { ActionSearchBar } from '@/components/ui/ActionSearchBar';
import { subscribeToTalents, subscribeToCastingCalls } from '../../services';
import Avatar from '../ui/Avatar';
import { getAvatar } from '../../utils/avatars';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, collection, query, where, or } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { AuthService } from '../../services/AuthService';
import { FollowItemSkeleton, SidebarWidgetSkeleton } from '../ui/Skeleton';

// Inline follow button that mirrors ProfileHeader's style and uses Firestore
function FollowBtn({ targetUid }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentUserId = CurrentUser.id;

  useEffect(() => {
    if (!currentUserId || !targetUid || currentUserId === targetUid) return;
    const followId = `${currentUserId}_${targetUid}`;
    const unsub = onSnapshot(doc(db, 'follows', followId), (snap) => {
      setFollowing(snap.exists());
    });
    return () => unsub();
  }, [currentUserId, targetUid]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!currentUserId || !targetUid || currentUserId === targetUid) return;
    setLoading(true);
    const followId = `${currentUserId}_${targetUid}`;
    const followDocRef = doc(db, 'follows', followId);
    try {
      if (following) {
        await deleteDoc(followDocRef);
      } else {
        await setDoc(followDocRef, {
          followerId: currentUserId,
          followingId: targetUid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
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
      className={`flex-shrink-0 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer active:scale-[0.96] flex items-center gap-1 ${following
        ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
        : 'bg-white/[0.06] border-white/10 hover:bg-white/10 text-white'
        } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {following ? 'Following' : 'Follow'}
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
  const [profileData, setProfileData] = useState(null);

  const [internalFeatured, setInternalFeatured] = useState([]);
  const [internalTrending, setInternalTrending] = useState([]);
  const [talentsLoading, setTalentsLoading] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
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
            if (t.deactivated || !t.name) return false;
            const isSelf = Boolean(
              (myUid && (t.id === myUid || t.uid === myUid)) ||
              (myEmail && t.email && t.email.toLowerCase().trim() === myEmail) ||
              (myName && t.name && t.name.toLowerCase().trim() === myName)
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
  }, [hasPropsFeatured]);

  useEffect(() => {
    if (hasPropsTrending) {
      setCallsLoading(false);
      return;
    }

    setCallsLoading(true);
    const unsubCalls = subscribeToCastingCalls('All', (data) => {
      if (Array.isArray(data)) {
        setInternalTrending(data);
      }
      setCallsLoading(false);
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
      setProfileData(null);
      setRealFollowers(0);
      setRealFollowing(0);
      return;
    }

    let unsubUser = null;

    const unsubProfile = onSnapshot(doc(db, 'profiles', uid), (snap) => {
      if (snap.exists()) {
        setProfileData(snap.data());
        if (unsubUser) {
          unsubUser();
          unsubUser = null;
        }
      } else {
        if (!unsubUser) {
          unsubUser = onSnapshot(doc(db, 'users', uid), (userSnap) => {
            if (userSnap.exists()) {
              setProfileData(userSnap.data());
            }
          });
        }
      }
    });

    // Real-time Followers count for logged-in user
    const qFollowers = query(collection(db, 'follows'), where('followingId', '==', uid));
    const unsubFollowers = onSnapshot(qFollowers, (snap) => {
      const mockUids = new Set(['uyR9rwPbZBUms2ffermJA0SDbqw2', 'Mm1B6rYaEebs6ajRyu0EJBrrGwT2', uid]);
      const valid = snap.docs.filter(d => d.data().followerId && !mockUids.has(d.data().followerId));
      setRealFollowers(valid.length);
    }, () => setRealFollowers(0));

    // Real-time Following count for logged-in user
    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', uid));
    const unsubFollowing = onSnapshot(qFollowing, (snap) => {
      const valid = snap.docs.filter(d => d.data().followingId && d.data().followingId !== uid);
      setRealFollowing(valid.length);
    }, () => setRealFollowing(0));

    return () => {
      unsubProfile();
      if (unsubUser) {
        unsubUser();
      }
      unsubFollowers();
      unsubFollowing();
    };
  }, [uid, profileData?.uid, profileData?.id, profileData?.username]);

  const realName =
    profileData?.name ||
    profileData?.fullName ||
    [profileData?.firstName, profileData?.lastName].filter(Boolean).join(' ') ||
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Talent Member';

  const realRole =
    profileData?.role ||
    profileData?.category ||
    user?.role ||
    user?.category ||
    'Actor / Model';

  const realImage =
    profileData?.image ||
    profileData?.photoURL ||
    profileData?.profileImage ||
    user?.image ||
    user?.photoURL ||
    user?.profileImage;

  const isVerified = profileData?.verified === true || user?.verified === true;
  const gender = profileData?.gender || user?.gender;

  // Real-time stats from Firestore collections
  const followersCount = realFollowers;
  const followingCount = realFollowing;

  // Profile strength calculation
  const computeProfileStrength = () => {
    const fields = [
      realName && realName !== 'Talent Member',
      realImage,
      realRole && realRole !== 'Actor / Model',
      profileData?.bio,
      profileData?.location || profileData?.city,
      profileData?.skills?.length > 0,
      profileData?.experience?.length > 0,
      profileData?.education?.length > 0,
      profileData?.languages?.length > 0,
      profileData?.phone || profileData?.contactEmail,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  };
  const profileStrength = user ? computeProfileStrength() : 0;
  const openToWork = profileData?.openToWork;


  const safeFeaturedRaw = (Array.isArray(featuredTalents) && featuredTalents.length > 0) ? featuredTalents : internalFeatured;
  const safeFeatured = safeFeaturedRaw.length > 0 ? safeFeaturedRaw : [
    {
      id: 'mock_talent_1',
      name: 'Achyut Devkota',
      role: 'Actor / Model',
      category: 'Actor',
      gender: 'male',
      location: 'Kathmandu',
    },
    {
      id: 'mock_talent_2',
      name: 'Sushma Karki',
      role: 'Actress / Model',
      category: 'Actress',
      gender: 'female',
      location: 'Lalitpur',
    },
    {
      id: 'mock_talent_3',
      name: 'Dayahang Rai',
      role: 'Actor',
      category: 'Actor',
      gender: 'male',
      location: 'Kathmandu',
    }
  ];
  const safeTrending = (Array.isArray(trendingCalls) && trendingCalls.length > 0) ? trendingCalls : internalTrending;
  const isTalentsLoading = loading || talentsLoading;
  const isCallsLoading = loading || callsLoading;

  const [featuredOffset, setFeaturedOffset] = useState(0);

  useEffect(() => {
    if (safeFeatured.length <= 3) return;
    const timer = setInterval(() => {
      setFeaturedOffset((prev) => (prev + 1) % safeFeatured.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [safeFeatured.length]);

  const visibleFeatured = safeFeatured.length > 3
    ? Array.from({ length: 3 }, (_, i) => safeFeatured[(featuredOffset + i) % safeFeatured.length])
    : safeFeatured;

  const { t } = useTranslation();

  return (
    <div className="w-full">
      <div className="max-w-[1600px] mx-auto px-0 sm:px-1 lg:px-2 pt-0 pb-0">
        <div className="grid grid-cols-12 gap-2 lg:gap-3">

          {/* LEFT SIDEBAR (Desktop: lg+) */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-14 sm:top-20 pt-0 pb-4 lg:pb-20 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide space-y-2">

            {/* Inline Desktop Search Bar */}
            <div className="px-1 pt-1">
              <div
                onClick={() => setShowSearchOverlay(true)}
                className="relative flex items-center bg-[#242526] rounded-full px-4 py-2 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
              >
                <input
                  type="text"
                  readOnly
                  placeholder={t('ui.searchPlaceholder')}
                  className="w-full bg-transparent outline-none text-white text-[15px] placeholder:text-white/40 pr-10 cursor-pointer border-0"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {/* === PROFILE CARD === */}
              {user ? (
                <>
                  {/* Avatar + Info (Horizontal Row) */}
                  <div className="px-4 py-3 relative z-10 flex items-center gap-4">
                    <div className="relative shrink-0">
                      <Avatar
                        user={user}
                        userId={user?.uid}
                        src={realImage}
                        gender={gender}
                        name={realName}
                        size={56}
                        className="ring-2 ring-white/10 shadow-lg"
                      />
                      {/* Online dot */}
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#060709] shadow-[0_0_8px_rgba(52,211,153,0.8)] pointer-events-none" />
                    </div>

                    <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-white font-bold text-base leading-snug tracking-tight truncate">{realName}</h3>
                        {isVerified && (
                          <span className="rounded-full bg-[#00BFFF] flex items-center justify-center text-[#060709] shrink-0 shadow-sm" style={{ width: '16px', height: '16px' }} title="Verified Talent">
                            <svg className="w-2.5 h-2.5 text-[#060709]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs font-normal capitalize truncate">{realRole}</span>
                      </div>

                      {openToWork && (
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] text-[8px] font-normal tracking-wider uppercase border border-[#00BFFF]/20 flex items-center justify-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
                            OPEN TO WORK
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 text-center space-y-3">
                  <h3 className="text-white font-bold text-base">Join NepalCasts</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">Connect with top directors and casting opportunities in Nepal.</p>
                  <Link
                    to="/signin"
                    className="w-full py-2.5 bg-[#00BFFF] hover:opacity-90 text-black font-normal rounded-full text-sm transition-all cursor-pointer shadow-lg shadow-[#00BFFF]/25 active:scale-[0.98] text-center block"
                  >
                    Sign In / Register
                  </Link>
                </div>
              )}

              {/* === CATEGORY GROUPED FLOATING NAVIGATION (LAPTOP VIEW) === */}
              <div className="flex flex-col space-y-3 px-2 py-1 text-left">
                {/* DISCOVER GROUP */}
                <div>
                  <div className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">Discover</div>
                  <div className="space-y-0.5">
                    {[
                      { name: "Home", path: "/", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
                      { name: "Discover", path: "/discover", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 21a9 9 0 100-18 9 9 0 000 18zm.75-13.25l-2 4.5 4.5-2-4.5 2z" /> },
                      { name: "Talent Directory", path: "/talents", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
                      { name: "Trending", path: "/trending", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
                    ].map((item, i) => {
                      const isActive = item.path === '/'
                        ? (pathname === '/' || pathname === '')
                        : (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/')));
                      return (
                        <Link
                          key={i}
                          to={item.path}
                          className={`group flex items-center w-full px-4 py-2.5 rounded-full transition-all duration-200 active:scale-[0.98] ${
                            isActive
                              ? "text-white font-medium"
                              : "text-gray-400 font-normal hover:text-white"
                          }`}
                        >
                          <svg className={`w-5 h-5 mr-3.5 shrink-0 transition-all duration-200 ${isActive ? "text-white scale-105" : "text-gray-400 group-hover:text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {item.icon}
                          </svg>
                          <span className="text-[16px] tracking-tight">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* PROJECTS GROUP */}
                <div>
                  <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">Projects</div>
                  <div className="space-y-0.5">
                    {[
                      { name: "Casting Calls", path: "/casting", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                      { name: "Post Project", path: "/casting/create", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                    ].map((item, i) => {
                      const isActive = item.path === '/casting'
                        ? (pathname === '/casting' || (pathname.startsWith('/casting/') && pathname !== '/casting/create'))
                        : (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/')));
                      return (
                        <Link
                          key={i}
                          to={item.path}
                          className={`group flex items-center w-full px-4 py-2.5 rounded-full transition-all duration-200 active:scale-[0.98] ${
                            isActive
                              ? "text-white font-medium"
                              : "text-gray-400 font-normal hover:text-white"
                          }`}
                        >
                          <svg className={`w-5 h-5 mr-3.5 shrink-0 transition-all duration-200 ${isActive ? "text-white scale-105" : "text-gray-400 group-hover:text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {item.icon}
                          </svg>
                          <span className="text-[16px] tracking-tight">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* PERSONAL GROUP */}
                {user && (
                  <div>
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">Personal</div>
                    <div className="space-y-0.5">
                      {[
                        { name: "Messages", path: "/messages", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                        { name: "Saved Calls", path: "/saved", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /> },
                        { name: "Profile", path: `/profile/${user?.uid}`, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> }
                      ].map((item, i) => {
                        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'));
                        return (
                          <Link
                            key={i}
                            to={item.path}
                            className={`group flex items-center w-full px-4 py-2.5 rounded-full transition-all duration-200 active:scale-[0.98] ${
                              isActive
                                ? "text-white font-medium"
                                : "text-gray-400 font-normal hover:text-white"
                            }`}
                          >
                            <svg className={`w-5 h-5 mr-3.5 shrink-0 transition-all duration-200 ${isActive ? "text-white scale-105" : "text-gray-400 group-hover:text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {item.icon}
                            </svg>
                            <span className="text-[16px] tracking-tight">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LEGAL & SUPPORT GROUP */}
                <div>
                  <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">Legal & Support</div>
                  <div className="space-y-0.5">
                    <Link
                      to="/trust-safety"
                      className={`group flex items-center w-full px-4 py-2.5 rounded-full transition-all duration-200 active:scale-[0.98] ${
                        pathname === '/trust-safety' || pathname.startsWith('/trust-safety/')
                          ? "text-white font-medium"
                          : "text-gray-400 font-normal hover:text-white"
                      }`}
                    >
                      <svg className={`w-5 h-5 mr-3.5 shrink-0 transition-all duration-200 ${pathname === '/trust-safety' || pathname.startsWith('/trust-safety/') ? "text-white scale-105" : "text-gray-400 group-hover:text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[16px] tracking-tight">Support</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className={`group flex items-center w-full px-4 py-2.5 rounded-full transition-all duration-200 active:scale-[0.98] ${
                          pathname.startsWith("/admin")
                            ? "text-white font-medium"
                            : "text-gray-400 font-normal hover:text-white"
                        }`}
                      >
                        <svg className={`w-5 h-5 mr-3.5 shrink-0 transition-all duration-200 ${pathname.startsWith("/admin") ? "text-white scale-105" : "text-gray-400 group-hover:text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-[16px] tracking-tight">Admin Panel</span>
                      </Link>
                    )}
                  </div>
                </div>

                {user && (
                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={onLogout || (() => AuthService.signOut())}
                      className="group flex items-center w-full px-4 py-2.5 rounded-full transition-all duration-200 text-gray-400 hover:text-rose-400 font-normal cursor-pointer active:scale-[0.98]"
                    >
                      <svg className="w-5 h-5 mr-3.5 shrink-0 transition-colors group-hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="text-[16px] tracking-tight">Logout</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar Bottom Copyright */}
              <div className="px-4 py-2 mt-1 border-t border-white/5">
                <p className="text-xs text-gray-500 font-semibold tracking-wide flex items-center justify-between">
                  <span>&copy; {new Date().getFullYear()} NepalCasts</span>
                  <span className="text-[10px] text-gray-600 font-medium">All rights reserved</span>
                </p>
              </div>
            </div>
          </aside>

          {/* CENTER MAIN CONTENT */}
          <main className={`col-span-12 ${isHomePage ? 'xl:col-span-6' : 'xl:col-span-9'} min-w-0 lg:h-[calc(100vh-3.5rem)] sm:lg:h-[calc(100vh-5rem)] lg:overflow-y-auto scrollbar-hide pb-2 lg:pb-20`}>
            {children}
          </main>

          {/* RIGHT SIDEBAR (Desktop Only: Home Page Only) */}
          {isHomePage && (
            <aside className="hidden xl:block xl:col-span-3 sticky top-14 sm:top-20 pt-0 pb-4 lg:pb-20 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide space-y-3">

              {/* Why NepalCasts? Section */}
              <div className="px-2 space-y-3">
                <div className="px-1 pt-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none text-left">Why NepalCasts?</h4>
                </div>

                <div className="space-y-4 text-left px-1">
                  {/* Point 1 */}
                  <div className="flex gap-3.5 items-start">
                    <div className="shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-gray-200 text-sm font-normal font-sans">Remote Live Auditions</h5>
                      <p className="text-gray-400 text-xs leading-relaxed font-normal mt-0.5">Audition from anywhere in Nepal via nepalcasts</p>
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div className="flex gap-3.5 items-start">
                    <div className="shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-gray-200 text-sm font-normal font-sans">Direct Connections</h5>
                      <p className="text-gray-400 text-xs leading-relaxed font-normal mt-0.5">Message top directors and production teams directly without middle agents.</p>
                    </div>
                  </div>

                  {/* Point 3 */}
                  <div className="flex gap-3.5 items-start">
                    <div className="shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-gray-200 text-sm font-normal font-sans">Verified PRO Casting</h5>
                      <p className="text-gray-400 text-xs leading-relaxed font-normal mt-0.5">Get verified to rank first in search results and stand out to casting teams.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* === PEOPLE TO FOLLOW === (Enlarged) */}
              {(isTalentsLoading || safeFeatured.length > 0) && (
                <div className="px-2 space-y-3">
                  <div className="flex items-center justify-between px-1 pt-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">People to follow</h4>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('talent')}
                      className="text-xs font-normal text-[#00BFFF] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      View all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="px-1 space-y-4">
                    {isTalentsLoading ? (
                      <FollowItemSkeleton count={3} />
                    ) : (
                      safeFeatured.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 group"
                        >
                          <div
                            onClick={() => onNavigate?.('profile', item.id)}
                            className="cursor-pointer flex-shrink-0"
                          >
                            <Avatar
                              userId={item.id || item.uid}
                              src={getAvatar(item.photoURL || item.profileImage || item.image, item.gender)}
                              size="lg"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5
                              onClick={() => onNavigate?.('profile', item.id)}
                              className="text-white text-base font-bold truncate cursor-pointer group-hover:text-[#00BFFF] transition-colors"
                            >
                              {item.name || 'Talent'}
                            </h5>
                            <p className="text-gray-400 text-xs font-normal truncate mt-0.5">
                              {item.role || item.category || 'Talent'}
                              {item.location && <span> · {item.location}</span>}
                            </p>
                          </div>
                          <FollowBtn targetUid={item.id} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Trending Casting Calls Widget (No TrendingUp Icon) */}
              {(isCallsLoading || safeTrending.length > 0) && (
                <div className="space-y-3 px-2">
                  <div className="flex items-center justify-between px-1 pt-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 select-none">
                      {t('sidebar.activeCastingCalls')}
                    </h4>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('casting')}
                      className="text-xs font-normal text-[#00BFFF] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      View all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {isCallsLoading ? (
                      <SidebarWidgetSkeleton count={3} type="casting" />
                    ) : (
                      safeTrending.slice(0, 3).map((call) => (
                        <div
                          key={call.id}
                          onClick={() => onNavigate?.('casting-detail', call.id)}
                          className="relative h-32 rounded-2xl overflow-hidden hover:scale-[1.02] hover:border-white/20 transition-all cursor-pointer group shadow-xl border border-white/5 flex flex-col justify-end p-4"
                        >
                          {/* Background Image */}
                          <div className="absolute inset-0 select-none pointer-events-none">
                            <img
                              src={(call.thumbnail && call.thumbnail !== 'has-file') ? call.thumbnail : (call.thumbnailUrl || call.mediaUrl || '/movie-banner.png')}
                              alt={call.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/movie-banner.png';
                              }}
                            />
                            {/* Dark Glassy Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
                          </div>

                          {/* Text info */}
                          <div className="relative z-10 space-y-1">
                            <h5 className="text-white text-base font-black group-hover:text-[#00BFFF] transition-colors truncate uppercase tracking-wider">
                              {call.title}
                            </h5>
                            <div className="flex items-center justify-between text-xs text-gray-300 font-bold">
                              <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">{call.type || 'General'}</span>
                              <span className="text-[#00BFFF] font-black capitalize tracking-wide">{call.location || 'Nepal'}</span>
                            </div>
                          </div>
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
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl relative">
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
