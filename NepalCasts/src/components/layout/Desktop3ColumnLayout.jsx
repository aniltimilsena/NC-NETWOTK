import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Users, Film, Bookmark, MessageSquare, Compass, ShieldCheck, ChevronRight, TrendingUp, Lock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionSearchBar } from '@/components/ui/ActionSearchBar';
import { subscribeToTalents, subscribeToCastingCalls } from '../../services';
import Avatar from '../ui/Avatar';
import { getAvatar } from '../../utils/avatars';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, collection, query, where, or } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
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
  activeNav = 'discover',
  featuredTalents = [],
  trendingCalls = [],
  loading = false
}) {
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
        const allActive = data
          .filter(t => !t.deactivated && t.name)
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
        const featuredOnly = allActive.filter(t => t.featured === true || t.premium === true || t.isPremium === true);
        const finalTalents = featuredOnly.length > 0 ? featuredOnly : allActive;
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
  const [realReviews, setRealReviews] = useState(0);

  const uid = user?.uid || user?.id;

  useEffect(() => {
    if (!uid) {
      setProfileData(null);
      setRealFollowers(0);
      setRealFollowing(0);
      setRealReviews(0);
      return;
    }

    const unsubProfile = onSnapshot(doc(db, 'profiles', uid), (snap) => {
      if (snap.exists()) {
        setProfileData(snap.data());
      } else {
        const unsubUser = onSnapshot(doc(db, 'users', uid), (userSnap) => {
          if (userSnap.exists()) {
            setProfileData(userSnap.data());
          }
        });
        return () => unsubUser();
      }
    });

    // Real-time Followers count
    const qFollowers = query(collection(db, 'follows'), where('followingId', '==', uid));
    const unsubFollowers = onSnapshot(qFollowers, (snap) => {
      setRealFollowers(snap.size);
    }, (err) => console.warn('Followers listener warning:', err));

    // Real-time Following count
    const qFollowing = query(collection(db, 'follows'), where('followerId', '==', uid));
    const unsubFollowing = onSnapshot(qFollowing, (snap) => {
      setRealFollowing(snap.size);
    }, (err) => console.warn('Following listener warning:', err));

    // Real-time Reviews count
    let unsubReviews = () => {};
    try {
      const qReviews = query(collection(db, 'reviews'), or(where('targetUid', '==', uid), where('targetUserId', '==', uid)));
      unsubReviews = onSnapshot(qReviews, (snap) => {
        setRealReviews(snap.size);
      }, () => {
        const qSingle = query(collection(db, 'reviews'), where('targetUid', '==', uid));
        onSnapshot(qSingle, (sSnap) => setRealReviews(sSnap.size), () => {});
      });
    } catch {
      const qSingle = query(collection(db, 'reviews'), where('targetUid', '==', uid));
      unsubReviews = onSnapshot(qSingle, (sSnap) => setRealReviews(sSnap.size), () => {});
    }

    return () => {
      unsubProfile();
      unsubFollowers();
      unsubFollowing();
      unsubReviews();
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
  const isPremium = profileData?.isPremium === true || profileData?.premium === true || user?.isPremium === true || user?.premium === true;
  const gender = profileData?.gender || user?.gender;

  // Real-time stats from Firestore collections
  const followersCount = realFollowers || profileData?.followers || profileData?.followersCount || 0;
  const followingCount = realFollowing || profileData?.following || profileData?.followingCount || 0;
  const reviewsCount = realReviews || profileData?.reviewsCount || (Array.isArray(profileData?.reviews) ? profileData.reviews.length : 0) || user?.reviewsCount || 0;

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
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20 pt-2 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide space-y-4">
            
            {/* Inline Desktop Search Bar */}
            <div className="px-1">
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

            <div className="overflow-hidden bg-[#060709] rounded-2xl">

              {/* === PROFILE CARD === */}
              {user ? (
                <>
                  {/* Avatar + Info (Horizontal Row) */}
                  <div className="px-4 py-5 relative z-10 flex items-center gap-4 bg-[#0A0A0E]/50 rounded-2xl">
                    <div className="relative shrink-0">
                      <Avatar
                        user={user}
                        userId={user?.uid}
                        src={realImage}
                        gender={gender}
                        name={realName}
                        size={64}
                        className="ring-2 ring-white/10 shadow-xl"
                      />
                      {/* Online dot */}
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#060709] shadow-[0_0_8px_rgba(52,211,153,0.8)] pointer-events-none" />
                    </div>

                    <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-white font-extrabold text-lg leading-snug tracking-tight truncate">{realName}</h3>
                        {isVerified && (
                          <span className="w-4.5 h-4.5 rounded-full bg-[#00BFFF] flex items-center justify-center text-[#060709] text-[9px] font-black shrink-0 shadow-sm" title="Verified Talent">
                            ✓
                          </span>
                        )}
                        {isPremium && (
                          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[8px] tracking-wider uppercase shrink-0">
                            PREMIUM
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs font-semibold capitalize truncate">{realRole}</span>
                      </div>

                      {openToWork && (
                        <div className="mt-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] text-[8px] font-extrabold tracking-wider uppercase border border-[#00BFFF]/20 flex items-center justify-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
                            OPEN TO WORK
                          </span>
                        </div>
                      )}
                    </div>
                  </div>


                  {/* View My Profile Link */}
                  <div className="px-4 pb-4 mt-2 text-left">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('profile', user?.uid)}
                      className="text-[11px] font-bold text-[#00BFFF] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <span>{t('profile.viewProfile')}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-3 text-center space-y-3">
                  <h3 className="text-white font-extrabold text-base">Join NepalCasts</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">Connect with top directors and casting opportunities in Nepal.</p>
                  <Link
                    to="/signin"
                    className="w-full py-2.5 bg-[#00BFFF] hover:opacity-90 text-black font-extrabold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-[#00BFFF]/25 active:scale-[0.98] text-center block"
                  >
                    Sign In / Register
                  </Link>
                </div>
              )}

              {/* === MAIN NAVIGATION (No divider line) === */}
              <div className="py-1">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 px-4 mb-1.5 block">MAIN</span>

                <Link
                  to="/discover"
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'discover' || activeNav === 'home'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {(activeNav === 'discover' || activeNav === 'home') && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Compass className="w-5 h-5" />
                    <span>{t('nav.discover')}</span>
                  </div>
                </Link>

                <Link
                  to="/talents"
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'talent' || activeNav === 'talents'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {(activeNav === 'talent' || activeNav === 'talents') && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    <span>{t('nav.talents')}</span>
                  </div>
                </Link>

                <Link
                  to="/casting"
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'casting'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {activeNav === 'casting' && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Film className="w-5 h-5" />
                    <span>{t('nav.casting')}</span>
                  </div>
                </Link>
              </div>

              {/* === PERSONAL NAVIGATION === */}
              {user && (
                <div className="py-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 px-5 mb-2 block">PERSONAL</span>

                  <Link
                    to="/messages"
                    className={`w-full px-5 py-3 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'messages'
                        ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                        : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                  >
                    {activeNav === 'messages' && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5" />
                      <span>Messages</span>
                    </div>
                  </Link>

                  <Link
                    to="/saved"
                    className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'saved-castings' || activeNav === 'saved-casting' || activeNav === 'saved'
                        ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                        : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                  >
                    {(activeNav === 'saved-castings' || activeNav === 'saved-casting' || activeNav === 'saved') && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                    <div className="flex items-center gap-3">
                      <Bookmark className="w-5 h-5" />
                      <span>Saved Calls</span>
                    </div>
                  </Link>
                </div>
              )}

              {/* === LEGAL & SAFETY === */}
              <div className="py-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 px-5 mb-2 block">LEGAL & SAFETY</span>

                <Link
                  to="/trust-safety"
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'trust-safety' || activeNav === 'trust'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {(activeNav === 'trust-safety' || activeNav === 'trust') && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#00BFFF]" />
                    <span>Trust & Safety</span>
                  </div>
                </Link>

                <Link
                  to="/privacy"
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'privacy'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {activeNav === 'privacy' && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    <span>Privacy Policy</span>
                  </div>
                </Link>

                <Link
                  to="/terms"
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'terms'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {activeNav === 'terms' && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    <span>Terms of Service</span>
                  </div>
                </Link>
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
          <main className="col-span-12 xl:col-span-6 min-w-0">
            {children}
          </main>

          {/* RIGHT SIDEBAR (Desktop Only: xl+) */}
          <aside className="hidden xl:block xl:col-span-3 sticky top-20 space-y-4 h-fit pt-2">

            {/* Go Pro CTA */}
            {!isPremium && !isVerified && (
              <div className="px-2">
                <div className="bg-[#1C1C1C] rounded-2xl p-3.5 border border-[#2A2A2A] relative overflow-hidden space-y-2">
                  <div className="flex items-center gap-1.5 relative z-10">
                    <span className="text-white font-bold text-[14px]">Go Pro</span>
                    <span className="text-[#00BFFF] text-sm">✓</span>
                  </div>
                  <p className="text-[#888] text-[11px] leading-snug relative z-10">
                    Get a verified badge and appear first in search results.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('premium')}
                    className="w-full text-center block text-black rounded-lg py-1.5 font-bold text-[12px] hover:opacity-90 transition-all relative z-10 shadow-lg cursor-pointer active:scale-[0.98]"
                    style={{ backgroundColor: '#FACC15' }}
                  >
                    Upgrade Profile
                  </button>
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#FACC15] blur-3xl opacity-10 rounded-full" />
                </div>
              </div>
            )}

            {/* Why NepalCasts? Card */}
            <div className="px-2">
              <div className="bg-[#121215] rounded-2xl p-4 border border-white/5 relative overflow-hidden space-y-4 shadow-xl">
                <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 text-left">Why NepalCasts?</h4>
                
                <div className="space-y-3.5 text-left">
                  {/* Point 1 */}
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4.5 h-4.5 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-white text-xs font-bold font-sans">Remote Live Auditions</h5>
                      <p className="text-[#888] text-[11px] leading-relaxed mt-0.5">Audition from anywhere in Nepal via nepalcasts</p>
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-white text-xs font-bold font-sans">Direct Connections</h5>
                      <p className="text-[#888] text-[11px] leading-relaxed mt-0.5">Message top directors and production teams directly without middle agents.</p>
                    </div>
                  </div>

                  {/* Point 3 */}
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4.5 h-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-white text-xs font-bold font-sans">Verified PRO Casting</h5>
                      <p className="text-[#888] text-[11px] leading-relaxed mt-0.5">Get verified to rank first in search results and stand out to casting teams.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* === PEOPLE TO FOLLOW === */}
            {(isTalentsLoading || safeFeatured.length > 0) && (
              <div className="px-2">
                <div className="bg-[#121215] rounded-2xl p-4 border border-white/5 relative overflow-hidden space-y-4 shadow-xl">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">People to follow</h4>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('talent')}
                      className="text-[11px] font-bold text-[#00BFFF] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="px-1 space-y-3">
                    {isTalentsLoading ? (
                      <FollowItemSkeleton count={3} />
                    ) : (
                      safeFeatured.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 group"
                        >
                          <div
                            onClick={() => onNavigate?.('profile', item.id)}
                            className="cursor-pointer flex-shrink-0"
                          >
                            <Avatar
                              userId={item.id || item.uid}
                              src={getAvatar(item.photoURL || item.profileImage || item.image, item.gender)}
                              size="md"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5
                              onClick={() => onNavigate?.('profile', item.id)}
                              className="text-white text-[13px] font-bold truncate cursor-pointer group-hover:text-[#00BFFF] transition-colors"
                            >
                              {item.name || 'Talent'}
                            </h5>
                            <p className="text-gray-500 text-[11px] truncate mt-0.5">
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
              </div>
            )}

            {/* Trending Casting Calls Widget (No TrendingUp Icon) */}
            {(isCallsLoading || safeTrending.length > 0) && (
              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
                    {t('sidebar.activeCastingCalls')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('casting')}
                    className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
                  >
                    {t('sidebar.viewAll')}
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
                            src={call.thumbnail || call.thumbnailUrl || call.mediaUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=300&auto=format&fit=crop'}
                            alt={call.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=300&auto=format&fit=crop';
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
