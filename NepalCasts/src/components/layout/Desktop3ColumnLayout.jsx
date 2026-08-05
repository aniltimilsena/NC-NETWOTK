import React, { useState, useEffect } from 'react';
import { Users, Film, Bookmark, MessageSquare, Compass, ShieldCheck, ChevronRight, TrendingUp, Lock, FileText } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { getAvatar } from '../../utils/avatars';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, collection, query, where, or } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

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
  trendingCalls = []
}) {
  const [profileData, setProfileData] = useState(null);

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
  const isPremium = profileData?.isPremium === true || user?.isPremium === true || user?.premium === true;
  const gender = profileData?.gender || user?.gender;

  // Real-time stats from Firestore collections
  const followersCount = realFollowers || profileData?.followersCount || 0;
  const followingCount = realFollowing || profileData?.followingCount || 0;
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


  const safeFeatured = Array.isArray(featuredTalents) ? featuredTalents : [];
  const safeTrending = Array.isArray(trendingCalls) ? trendingCalls : [];

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
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20 pt-2 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-hide">
            <div className="overflow-hidden bg-[#060709] rounded-2xl">

              {/* === PROFILE CARD === */}
              {user ? (
                <>
                  {/* Cover Banner (Static Hero BG - No User Upload) */}
                  <div className="relative h-36 sm:h-40 bg-gradient-to-b from-[#092238] via-[#07192b] to-[#040e1a] overflow-hidden rounded-t-2xl select-none">
                    <picture className="w-full h-full">
                      <source srcSet="/hero-bg.webp" type="image/webp" />
                      <img
                        src="/hero-bg.png"
                        alt="Hero Cover"
                        fetchPriority="high"
                        decoding="async"
                        className="w-full h-full object-cover object-center opacity-90 pointer-events-none select-none"
                      />
                    </picture>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#060709]" />
                  </div>

                  {/* Avatar + Info (Centered) */}
                  <div className="px-4 -mt-12 relative z-10 text-center flex flex-col items-center">
                    <div className="relative w-fit mx-auto">
                      <Avatar
                        user={user}
                        userId={user?.uid}
                        src={realImage}
                        gender={gender}
                        name={realName}
                        size={80}
                        className="ring-4 ring-[#060709] shadow-2xl"
                      />
                      {/* Online dot */}
                      <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-[#060709] shadow-[0_0_10px_rgba(52,211,153,0.8)] pointer-events-none" />
                    </div>

                    <div className="mt-3 space-y-1 flex flex-col items-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <h3 className="text-white font-black text-2xl leading-tight tracking-tight">{realName}</h3>
                        {isVerified && (
                          <span className="w-5 h-5 rounded-full bg-[#00BFFF] flex items-center justify-center text-[#060709] text-[10px] font-black shrink-0 shadow-md shadow-[#00BFFF]/30" title="Verified Talent">
                            ✓
                          </span>
                        )}
                        {isPremium && (
                          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[10px] tracking-wider uppercase shadow-md shadow-amber-500/20">
                            PREMIUM
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-gray-400 text-sm font-semibold capitalize">{realRole}</span>
                      </div>

                      {openToWork && (
                        <div className="mt-1">
                          <span className="px-3 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] text-[10px] font-extrabold tracking-wider uppercase border border-[#00BFFF]/30 flex items-center justify-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
                            OPEN TO WORK
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats Row (Centered with Vertical Dividers, No Outer Border Box) */}
                  <div className="grid grid-cols-3 divide-x divide-white/10 text-center py-1.5 my-3">
                    <div className="flex flex-col items-center justify-center px-1">
                      <span className="text-white text-2xl font-black">{followersCount}</span>
                      <span className="text-gray-400 text-[10px] uppercase tracking-widest font-extrabold mt-0.5">{t('followers')}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-1">
                      <span className="text-white text-2xl font-black">{followingCount}</span>
                      <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mt-0.5">{t('btn_following')}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-1">
                      <span className="text-white text-2xl font-black">{reviewsCount}</span>
                      <span className="text-gray-400 text-[10px] uppercase tracking-widest font-extrabold mt-0.5">{t('profile.reviews')}</span>
                    </div>
                  </div>

                  {/* View My Profile Button */}
                  <div className="px-3 mb-4">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('profile', user?.uid)}
                      className="w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] bg-[#161619] hover:bg-[#202026] text-white shadow-sm"
                    >
                      <span>{t('profile.viewProfile')}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-3 text-center space-y-3">
                  <h3 className="text-white font-extrabold text-base">Join NepalCasts</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">Connect with top directors and casting opportunities in Nepal.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('signin')}
                    className="w-full py-2.5 bg-[#00BFFF] hover:opacity-90 text-black font-extrabold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-[#00BFFF]/25 active:scale-[0.98]"
                  >
                    Sign In / Register
                  </button>
                </div>
              )}

              {/* === MAIN NAVIGATION (No divider line) === */}
              <div className="py-1">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 px-4 mb-1.5 block">MAIN</span>

                <button
                  type="button"
                  onClick={() => onNavigate?.('home')}
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'discover'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {activeNav === 'discover' && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Compass className="w-5 h-5" />
                    <span>{t('nav.discover')}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate?.('talent')}
                  className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'talent'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                      : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                >
                  {activeNav === 'talent' && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5" />
                    <span>{t('nav.talents')}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate?.('casting')}
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
                </button>
              </div>

              {/* === PERSONAL NAVIGATION (No divider line) === */}
              {user && (
                <div className="py-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500 px-5 mb-2 block">PERSONAL</span>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('messages')}
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
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('saved-castings')}
                    className={`w-full px-4 py-2.5 text-[14px] font-bold flex items-center transition-all cursor-pointer relative ${activeNav === 'saved-castings' || activeNav === 'saved-casting'
                        ? 'text-[#00BFFF] bg-[#00BFFF]/[0.10]'
                        : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                  >
                    {(activeNav === 'saved-castings' || activeNav === 'saved-casting') && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#00BFFF]" />}
                    <div className="flex items-center gap-3">
                      <Bookmark className="w-5 h-5" />
                      <span>Saved Calls</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('/trust-safety')}
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
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('/privacy')}
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
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('/terms')}
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
                  </button>
                </div>
              )}



              {/* === PEOPLE TO FOLLOW === */}
              {safeFeatured.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between px-1 mb-3">
                    <h4 className="text-white font-extrabold text-sm">People to follow</h4>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('talent')}
                      className="text-[11px] font-bold text-[#00BFFF] hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="px-1 space-y-3">
                    {safeFeatured.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 group"
                      >
                        <div
                          onClick={() => onNavigate?.('profile', item.id)}
                          className="cursor-pointer flex-shrink-0"
                        >
                          <Avatar
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
                    ))}
                  </div>
                </div>
              )}

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

            {/* Go Verified CTA */}
            {!isVerified && (
              <div className="px-2">
                <div className="bg-[#1C1C1C] rounded-2xl p-3.5 border border-[#2A2A2A] relative overflow-hidden space-y-2">
                  <div className="flex items-center gap-1.5 relative z-10">
                    <span className="text-white font-bold text-[14px]">Go Verified</span>
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

            {/* Featured Talent Widget */}
            {safeFeatured.length > 0 && (
              <div className="space-y-4 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black text-base">
                    <Users className="w-5 h-5 text-[#00BFFF]" />
                    <span>{t('sidebar.featuredTalent')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('talent')}
                    className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
                  >
                    {t('sidebar.viewAll')}
                  </button>
                </div>

                <div className="space-y-1">
                  {visibleFeatured.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate?.('profile', item.id)}
                      className="flex items-center gap-3 py-2 px-2.5 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <Avatar
                        src={getAvatar(item.photoURL || item.profileImage || item.image, item.gender)}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <h5 className="text-white text-sm font-bold truncate group-hover:text-[#00BFFF] transition-colors">
                          {item.name || 'Talent'}
                        </h5>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{item.role || item.category || 'Talent'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Casting Calls Widget */}
            {safeTrending.length > 0 && (
              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black text-base">
                    <TrendingUp className="w-5 h-5 text-[#00BFFF]" />
                    <span>{t('sidebar.activeCastingCalls')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('casting')}
                    className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
                  >
                    {t('sidebar.viewAll')}
                  </button>
                </div>

                <div className="space-y-1">
                  {safeTrending.slice(0, 3).map((call) => (
                    <div
                      key={call.id}
                      onClick={() => onNavigate?.('casting-detail', call.id)}
                      className="py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group space-y-1"
                    >
                      <h5 className="text-white text-sm font-bold group-hover:text-[#00BFFF] transition-colors line-clamp-1">
                        {call.title}
                      </h5>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{call.type || 'General'}</span>
                        <span className="text-[#00BFFF] font-bold">{call.location || 'Nepal'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}
