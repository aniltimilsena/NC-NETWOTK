import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User, Users, Film, Bookmark, MessageSquare, Compass, ShieldCheck, ChevronRight, TrendingUp, BarChart3, ArrowRight, Eye, UserPlus, CheckCircle2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { getAvatar } from '../../utils/avatars';
import { AdBanner } from '../ui/AdBanner';
import { db, auth } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Inline follow button that mirrors ProfileHeader's style and uses Firestore
function FollowBtn({ targetUid }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser?.uid || !targetUid || currentUser.uid === targetUid) return;
    const followId = `${currentUser.uid}_${targetUid}`;
    const unsub = onSnapshot(doc(db, 'follows', followId), (snap) => {
      setFollowing(snap.exists());
    });
    return () => unsub();
  }, [currentUser?.uid, targetUid]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (!currentUser?.uid || !targetUid || currentUser.uid === targetUid) return;
    setLoading(true);
    const followId = `${currentUser.uid}_${targetUid}`;
    const followDocRef = doc(db, 'follows', followId);
    try {
      if (following) {
        await deleteDoc(followDocRef);
      } else {
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
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

  if (!currentUser?.uid || currentUser.uid === targetUid) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer active:scale-[0.96] flex items-center gap-1 ${
        following
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

  const uid = user?.uid || user?.id;

  useEffect(() => {
    if (!uid) {
      setProfileData(null);
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

    return () => unsubProfile();
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

  // Stats (will show 0 until these fields exist in Firestore)
  const followersCount = profileData?.followersCount || 0;
  const followingCount = profileData?.followingCount || 0;
  const profileViewsCount = profileData?.profileViews || 0;

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

  return (
    <div className="w-full">
      <div className="max-w-[1600px] mx-auto px-0 sm:px-4 lg:px-6 pt-0 pb-0">
        <div className="grid grid-cols-12 gap-8">

          {/* LEFT SIDEBAR (Desktop Only: xl+) */}
          <aside className="hidden xl:block xl:col-span-3 sticky top-24 pt-6 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide">
            <div className="overflow-hidden">

              {/* === PROFILE CARD === */}
              {user ? (
                <>
                  {/* Cover Banner */}
                  <div className="relative h-32 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] overflow-hidden rounded-2xl">
                    {profileData?.coverImage && profileData?.coverImage !== '/hero-bg.png' ? (
                      <img src={profileData.coverImage} alt="Cover" className="w-full h-full object-cover opacity-80" />
                    ) : realImage ? (
                      <img src={realImage} alt="Cover" className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,191,255,0.25),transparent_70%)]" />
                    )}
                  </div>

                  {/* Avatar + Info (Centered) */}
                  <div className="px-4 -mt-14 relative z-10 text-center flex flex-col items-center">
                    <div className="relative w-fit mx-auto">
                      <Avatar src={getAvatar(realImage, gender)} size={78} className="ring-4 ring-[#0A0A0F] shadow-2xl" />
                      {/* Online dot */}
                      <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#0A0A0F] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>

                    <div className="mt-3 space-y-2 flex flex-col items-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <h3 className="text-white font-black text-lg leading-tight tracking-tight">{realName}</h3>
                        {isVerified && <CheckCircle2 className="w-4 h-4 text-[#00BFFF] fill-[#00BFFF] flex-shrink-0" />}
                        {isPremium && (
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[9px] tracking-widest uppercase shadow-md shadow-amber-400/20">
                            PREMIUM
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-gray-400 text-xs font-semibold capitalize">{realRole}</span>
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

                  {/* Stats Row (Centered with Vertical Dividers) */}
                  <div className="grid grid-cols-3 divide-x divide-white/10 text-center py-3 my-4">
                    <div className="flex flex-col items-center justify-center px-1">
                      <span className="text-white text-lg font-black">{followersCount}</span>
                      <span className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mt-0.5">Followers</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-1">
                      <span className="text-white text-lg font-black">{followingCount}</span>
                      <span className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mt-0.5">Following</span>
                    </div>
                    <div className="flex flex-col items-center justify-center px-1">
                      <span className="text-white text-lg font-black">{profileViewsCount}</span>
                      <span className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mt-0.5">Views</span>
                    </div>
                  </div>

                  {/* View My Profile Button */}
                  <div className="px-4">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('profile')}
                      className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] bg-white/[0.06] hover:bg-white/10 text-white"
                    >
                      <span>View My Profile</span>
                    </button>
                  </div>


                </>
              ) : (
                <div className="p-4 text-center space-y-4">
                  <h3 className="text-white font-extrabold text-base">Join NepalCasts</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">Connect with top directors and casting opportunities in Nepal.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('signin')}
                    className="w-full py-3 bg-[#00BFFF] hover:opacity-90 text-black font-extrabold rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-[#00BFFF]/25 active:scale-[0.98]"
                  >
                    Sign In / Register
                  </button>
                </div>
              )}

              {/* === MAIN NAVIGATION === */}
              <div className="py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 px-5 mb-1 block">Main</span>

                <button
                  type="button"
                  onClick={() => onNavigate?.('home')}
                  className={`w-full px-5 py-2.5 text-[13px] font-semibold flex items-center justify-between transition-all cursor-pointer relative ${
                    activeNav === 'discover'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.06]'
                      : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                  }`}
                >
                  {activeNav === 'discover' && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Compass className="w-[18px] h-[18px]" />
                    <span>Discover Feed</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate?.('talent')}
                  className={`w-full px-5 py-2.5 text-[13px] font-semibold flex items-center justify-between transition-all cursor-pointer relative ${
                    activeNav === 'talent'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.06]'
                      : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                  }`}
                >
                  {activeNav === 'talent' && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Users className="w-[18px] h-[18px]" />
                    <span>Talent Directory</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate?.('casting')}
                  className={`w-full px-5 py-2.5 text-[13px] font-semibold flex items-center justify-between transition-all cursor-pointer relative ${
                    activeNav === 'casting'
                      ? 'text-[#00BFFF] bg-[#00BFFF]/[0.06]'
                      : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                  }`}
                >
                  {activeNav === 'casting' && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#00BFFF]" />}
                  <div className="flex items-center gap-3">
                    <Film className="w-[18px] h-[18px]" />
                    <span>Casting Calls</span>
                  </div>
                </button>
              </div>

              {/* === PERSONAL NAVIGATION (logged-in only) === */}
              {user && (
                <div className="py-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 px-5 mb-1 block">Personal</span>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('messages')}
                    className={`w-full px-5 py-2.5 text-[13px] font-semibold flex items-center justify-between transition-all cursor-pointer relative ${
                      activeNav === 'messages'
                        ? 'text-[#00BFFF] bg-[#00BFFF]/[0.06]'
                        : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                    }`}
                  >
                    {activeNav === 'messages' && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#00BFFF]" />}
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-[18px] h-[18px]" />
                      <span>Messages</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate?.('saved-castings')}
                    className={`w-full px-5 py-2.5 text-[13px] font-semibold flex items-center justify-between transition-all cursor-pointer relative ${
                      activeNav === 'saved-castings' || activeNav === 'saved-casting'
                        ? 'text-[#00BFFF] bg-[#00BFFF]/[0.06]'
                        : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                    }`}
                  >
                    {(activeNav === 'saved-castings' || activeNav === 'saved-casting') && <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#00BFFF]" />}
                    <div className="flex items-center gap-3">
                      <Bookmark className="w-[18px] h-[18px]" />
                      <span>Saved Calls</span>
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

            {/* Footer Links */}
            <div className="px-3 py-4 mt-2">
              <p className="text-[10px] text-[#555] flex flex-wrap items-center gap-x-1 gap-y-0.5">
                <Link to="/trust-safety" className="hover:underline hover:text-gray-300">Trust</Link>
                <span className="opacity-40">·</span>
                <Link to="/privacy" className="hover:underline hover:text-gray-300">Privacy</Link>
                <span className="opacity-40">·</span>
                <Link to="/terms" className="hover:underline hover:text-gray-300">Terms</Link>
                <span className="opacity-40">·</span>
                <span>&copy; {new Date().getFullYear()} NepalCasts</span>
              </p>
            </div>
          </div>
        </aside>

          {/* CENTER MAIN CONTENT */}
          <main className="col-span-12 xl:col-span-6 min-w-0">
            {children}
          </main>

          {/* RIGHT SIDEBAR (Desktop Only: xl+) */}
          <aside className="hidden xl:block xl:col-span-3 sticky top-24 space-y-6 h-fit pt-6">

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

            {/* Ad Banner */}
            <div className="px-2">
              <AdBanner
                variant="card"
                badge="SPONSORED"
                title="Promote Your Casting"
                subtitle="Reach thousands of talented actors across Nepal."
                ctaText="Get Started"
                ctaUrl="/premium"
              />
            </div>

            {/* Featured Talent Widget */}
            {safeFeatured.length > 0 && (
              <div className="space-y-4 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black text-base">
                    <Users className="w-5 h-5 text-[#00BFFF]" />
                    <span>Featured Talent</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('talent')}
                    className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {safeFeatured.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onNavigate?.('profile', item.id)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer group"
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
              <div className="space-y-4 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black text-base">
                    <TrendingUp className="w-5 h-5 text-[#00BFFF]" />
                    <span>Active Casting Calls</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('casting')}
                    className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {safeTrending.slice(0, 3).map((call) => (
                    <div
                      key={call.id}
                      onClick={() => onNavigate?.('casting-detail', call.id)}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer group space-y-1.5"
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
