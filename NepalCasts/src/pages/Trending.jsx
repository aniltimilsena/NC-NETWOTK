import { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Crown, Search, ChevronLeft, SlidersHorizontal, MapPin, UserPlus, UserCheck } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { subscribeToTalents, subscribeToUserFollows, toggleFollowUser } from '../features/profile/services/users';
import { prefetchProfile } from '../utils/prefetchRoute';
import Avatar from '../components/ui/Avatar';
import SEO from '../components/SEO';
import { CATEGORIES, getCategoryConfig, matchesCategory } from '../constants/categories';
import { formatRole, isDefaultImage } from '../utils';
import { useTranslation } from 'react-i18next';
import { useApp } from '../providers/AppProviders';

export default function Trending({ onNavigate, user }) {
  const { t } = useTranslation();
  const { showToast } = useApp();
  const { user: clerkUser } = useUser();
  const activeUser = user || (clerkUser ? {
    uid: clerkUser.id,
    displayName: clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || "Someone",
    photoURL: (clerkUser.imageUrl && !isDefaultImage(clerkUser.imageUrl)) ? clerkUser.imageUrl : "",
  } : null);
  const [profiles, setProfiles] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    return subscribeToTalents((data, err) => {
      if (err) {
        setError(err.message || 'Failed to load trending talents');
      } else {
        setError(null);
        setProfiles(data || []);
      }
      setLoading(false);
    });
  }, [reloadKey]);
  useEffect(() => {
    const userId = clerkUser?.id;
    if (userId) {
      return subscribeToUserFollows(userId, setFollowingIds);
    } else {
      setFollowingIds([]);
    }
  }, [clerkUser]);

  const isProfileNew = (profile) => {
    const createdDate = profile.createdAt?.toDate?.() || (profile.createdAt ? new Date(profile.createdAt) : null);
    if (!createdDate)
      return false;
    const diff = Date.now() - createdDate.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  const getExperienceLevel = (talent) => {
    const count = Array.isArray(talent.experience) ? talent.experience.length : 0;
    if (count === 0) return 'Beginner';
    if (count <= 2) return 'Intermediate';
    if (count <= 4) return 'Expert';
    return 'Pro';
  };

  const getJoinYear = (talent) => {
    let createdDate = null;
    if (talent.createdAt) {
      createdDate = talent.createdAt.toDate ? talent.createdAt.toDate() : new Date(talent.createdAt);
    } else if (talent.joinedYear) {
      createdDate = new Date(`${talent.joinedYear}-01-01`);
    }
    if (!createdDate || isNaN(createdDate.getTime())) {
      createdDate = new Date('2026-07-01');
    }
    return createdDate.getFullYear();
  };
  const calculateTrendingScore = (profile, period) => {
    const followers = profile.followers || 0;
    const rating = parseFloat(profile.rating) || 0;
    const updatedDate = profile.updatedAt?.toDate?.() || (profile.updatedAt ? new Date(profile.updatedAt) : null);
    const createdDate = profile.createdAt?.toDate?.() || (profile.createdAt ? new Date(profile.createdAt) : null);
    const lastActiveTime = updatedDate ? updatedDate.getTime() : (profile.lastActive || 0);
    const createdTime = createdDate ? createdDate.getTime() : (profile.joinedAt || 0);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    let periodScore = 0;
    if (period === 'Today') {
      const isTodayCreated = createdTime > 0 && (now - createdTime < oneDay);
      const isTodayActive = lastActiveTime > 0 && (now - lastActiveTime < oneDay);
      if (isTodayCreated) periodScore += 800;
      else if (createdTime > 0 && now - createdTime < 3 * oneDay) periodScore += 400;
      if (isTodayActive) periodScore += 500;
      else if (lastActiveTime > 0 && now - lastActiveTime < 3 * oneDay) periodScore += 200;
    } else if (period === 'This Week') {
      const isWeekCreated = createdTime > 0 && (now - createdTime < 7 * oneDay);
      const isWeekActive = lastActiveTime > 0 && (now - lastActiveTime < 7 * oneDay);
      if (isWeekCreated) periodScore += 600;
      else if (createdTime > 0 && now - createdTime < 14 * oneDay) periodScore += 300;
      if (isWeekActive) periodScore += 400;
      else if (lastActiveTime > 0 && now - lastActiveTime < 14 * oneDay) periodScore += 150;
    } else {
      const isMonthCreated = createdTime > 0 && (now - createdTime < 30 * oneDay);
      const isMonthActive = lastActiveTime > 0 && (now - lastActiveTime < 30 * oneDay);
      if (isMonthCreated) periodScore += 400;
      if (isMonthActive) periodScore += 300;
    }

    return periodScore + (rating * 20) + (followers * 1.5);
  };
  const handleToggleFollow = async (e, talentId) => {
    e.stopPropagation();
    const currentUser = activeUser;
    if (!currentUser) {
      onNavigate('/signin');
      return;
    }
    if (currentUser.uid === talentId) {
      return;
    }
    const isFollowing = followingIds.includes(talentId);
    const prevFollowingIds = [...followingIds];
    const prevProfiles = [...profiles];
    setFollowingIds(prev => isFollowing
      ? prev.filter(id => id !== talentId)
      : [...prev, talentId]);
    setProfiles(prev => prev.map(p => {
      if (p.id === talentId) {
        return { ...p, followers: Math.max(0, (p.followers || 0) + (isFollowing ? -1 : 1)) };
      }
      return p;
    }));
    try {
      await toggleFollowUser({
        currentUserId: currentUser.uid,
        targetUserId: talentId,
        isCurrentlyFollowing: isFollowing,
        senderInfo: {
          displayName: currentUser.displayName || "Someone",
          photoURL: currentUser.photoURL || "",
        }
      });
    }
    catch (err) {
      console.error("Error toggling follow:", err);
      setFollowingIds(prevFollowingIds);
      setProfiles(prevProfiles);
      showToast?.('Failed to update connection. Please try again.', 'error');
    }
  };
  const rankedProfiles = profiles
    .filter(p => {
      if (p.deactivated === true || p.isAdmin === true || p.role?.toLowerCase() === 'admin' || p.email?.toLowerCase() === 'aniltimilsena53@gmail.com') return false;
      const pName = p.name || p.displayName || p.fullName || p.username;
      if (!pName || pName.trim() === '') return false;
      if (selectedCategory !== 'All') {
        if (!matchesCategory(p, selectedCategory))
          return false;
      }
      return true;
    })
    .map(p => ({
      ...p,
      trendingScore: calculateTrendingScore(p, selectedPeriod)
    }))
    .sort((a, b) => b.trendingScore - a.trendingScore);
  const topThree = rankedProfiles.slice(0, 3);
  const remainingList = rankedProfiles;
  const podiumOrder = [
    { pos: 1, profile: topThree[1], height: 'h-44 sm:h-52', borderGlow: 'border-slate-400/20 shadow-[0_0_25px_rgba(200,200,200,0.05)]' },
    { pos: 0, profile: topThree[0], height: 'h-52 sm:h-64', borderGlow: 'border-yellow-400/30 shadow-[0_0_35px_rgba(250,204,21,0.08)]' },
    { pos: 2, profile: topThree[2], height: 'h-36 sm:h-44', borderGlow: 'border-amber-700/20 shadow-[0_0_20px_rgba(205,127,50,0.05)]' }
  ];
  const getRankColor = (rank) => {
    if (rank === 1)
      return '#194332';
    if (rank === 2)
      return '#C0C0C0';
    if (rank === 3)
      return '#CD7F32';
    return '#4B5563';
  };
  return (<div className="min-h-screen bg-[#FAF8F4] text-[#202923] pt-2 sm:pt-4 pb-6 relative font-sans">
    <SEO title="Trending Cinema Talent | NepalCasts" description="Check out who's trending now on Nepal's premier casting and cinema professional network." />

    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">

      <div className="flex items-center justify-between gap-4 pb-3 mb-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <button onClick={() => onNavigate('back')} type="button" className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9] transition-colors cursor-pointer shrink-0" aria-label="Back" title="Go Back">
            <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-display font-semibold text-[#202923] leading-none truncate">
              {t('trending_now')}
            </h1>
          </div>
        </div>

        <div className="relative shrink-0">
          <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#202923] hover:text-[#194332] transition-colors duration-200 cursor-pointer" aria-label="Category Filter" title="Category Filter">
            <SlidersHorizontal className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#202923]" strokeWidth={2} />
          </button>

          <AnimatePresence>
            {isFilterDropdownOpen && (<>
              <div className="fixed inset-0 z-30" onClick={() => setIsFilterDropdownOpen(false)} />
              <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-36 bg-white border border-[#E7E5E0] rounded-xl shadow-lg py-1 z-40 text-left">
                <button onClick={() => {
                  setSelectedCategory('All');
                  setVisibleCount(10);
                  setIsFilterDropdownOpen(false);
                }} className={`w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${selectedCategory === 'All'
                  ? 'text-[#194332] bg-[#EAF2ED]'
                  : 'text-[#626860] hover:text-[#202923] hover:bg-[#FAF8F4]'}`}>
                  {t('nav_talent_directory')}
                </button>
                {CATEGORIES.map(cat => {
                  const isActive = selectedCategory === cat;
                  return (<button key={cat} onClick={() => {
                    setSelectedCategory(cat);
                    setVisibleCount(10);
                    setIsFilterDropdownOpen(false);
                  }} className={`w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive
                    ? 'text-[#194332] bg-[#EAF2ED]'
                    : 'text-[#626860] hover:text-[#202923] hover:bg-[#FAF8F4]'}`}>
                    {getCategoryConfig(cat).label}
                  </button>);
                })}
              </motion.div>
            </>)}
          </AnimatePresence>
        </div>
      </div>


      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="inline-flex bg-white border border-[#E7E5E0] rounded-full p-1 max-w-full overflow-x-auto items-center gap-1 shadow-2xs">
          {['Today', 'This Week', 'This Month'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPeriod(p);
                setVisibleCount(10);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${selectedPeriod === p
                  ? 'bg-[#194332] text-white shadow-xs'
                  : 'text-[#626860] hover:text-[#202923] hover:bg-[#FAF8F4]'
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && profiles.length === 0 ? (
        <div className="max-w-md mx-auto py-16 px-4 text-center">
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-white space-y-4">
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : loading ? (<div className="space-y-12">

        {selectedCategory === 'All' && (<div className="hidden md:flex justify-center items-end gap-6 max-w-4xl mx-auto pt-8 pb-4 relative">

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-yellow-500/5 via-blue-500/5 to-purple-500/5 blur-[80px] rounded-full pointer-events-none" />


          <div className="flex-1 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full skeleton border border-white/5 mb-6" />
            <div className="h-4 skeleton w-24 mb-2" />
            <div className="h-3 skeleton w-16 mb-4" />
            <div className="h-8 skeleton w-20 rounded-full" />
          </div>


          <div className="flex-1 flex flex-col items-center">
            <Crown className="w-8 h-8 text-white/20 mb-2 fill-yellow-400/5 animate-pulse" />
            <div className="w-32 h-32 rounded-full skeleton border-2 border-yellow-400/10 mb-6" />
            <div className="h-5 skeleton w-28 mb-2" />
            <div className="h-3.5 skeleton w-20 mb-4" />
            <div className="h-9 skeleton w-24 rounded-full" />
          </div>


          <div className="flex-1 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full skeleton border border-white/5 mb-6" />
            <div className="h-4 skeleton w-20 mb-2" />
            <div className="h-3 skeleton w-16 mb-4" />
            <div className="h-8 skeleton w-20 rounded-full" />
          </div>
        </div>)}


        <div className="flex flex-col">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between py-3.5 px-1 border-b border-white/[0.06]">
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full skeleton shrink-0" />
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="h-4 skeleton w-1/3" />
                  <div className="h-3 skeleton w-1/2" />
                  <div className="h-3 skeleton w-1/4" />
                </div>
              </div>
              <div className="w-20 sm:w-24 h-8 rounded-full skeleton shrink-0" />
            </div>
          ))}
        </div>
      </div>) : rankedProfiles.length === 0 ? (<div className="text-center py-24 bg-white border border-dashed border-[#E7E5E0] rounded-2xl shadow-card">
        <Search className="w-12 h-12 text-[#777C75] mx-auto mb-4" />
        <h3 className="text-xl font-display font-semibold text-[#202923]">No matches found</h3>
        <p className="text-[#626860] text-sm mt-1.5 max-w-xs mx-auto">
          Nobody in the "{selectedCategory}" category fits the active search filters for {selectedPeriod.toLowerCase()}.
        </p>
      </div>) : (<div className="space-y-12">


        {topThree.length > 0 && selectedCategory === 'All' && (<div className="hidden md:flex justify-center items-end gap-6 max-w-4xl mx-auto pt-8 pb-4 relative">

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

          {podiumOrder.map((item, idx) => {
            const prof = item.profile;
            if (!prof)
              return <div key={idx} className="flex-1" />;
            const isFollowing = followingIds.includes(prof.id);
            const isNew = isProfileNew(prof);
            return (<motion.div key={prof.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: item.pos * 0.15 }} onClick={() => onNavigate('profile', prof.id)} className="flex-1 flex flex-col items-center cursor-pointer group">

              <div className="relative mb-6">

                {item.pos === 0 && (<div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                  <Crown className="w-8 h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] fill-amber-400" />
                </div>)}

                <div className={`p-1.5 rounded-full border-2 bg-white ${item.pos === 0 ? 'border-amber-400' : item.pos === 1 ? 'border-slate-400' : 'border-amber-700'} relative shadow-md`}>
                  <Avatar userId={prof.id || prof.uid} user={prof} size={item.pos === 0 ? 'xl' : 'lg'} name={prof.name} className="group-hover:scale-105 transition-transform duration-500" />


                  {prof.openToWork && (<span className="absolute bottom-1.5 right-1.5 flex h-4.5 w-4.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border border-white"></span>
                  </span>)}
                </div>


                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-[#E7E5E0] bg-white text-[#202923] shadow-md">
                  #{item.pos + 1}
                </div>
              </div>

              <div className="text-center mb-4 w-full px-2">
                <h3 className="font-display font-semibold text-[#202923] text-base tracking-normal truncate max-w-[180px] mx-auto">
                  {prof.name}
                </h3>
                <p className="text-xs text-[#626860] font-medium truncate mt-0.5">
                  @{prof.username || prof.name?.toLowerCase().replace(/\s+/g, '_') || 'talent'}
                </p>
              </div>


              <div className={`w-full ${item.height} bg-[#F5EFE1] border-t-2 ${item.borderGlow} rounded-t-[2.5rem] flex flex-col justify-between p-5 text-center transition-all duration-300 shadow-md group-hover:bg-[#ece4d4]`}>
                <div className="space-y-1">
                  <p className="text-[10px] text-[#78716c] uppercase tracking-wider font-bold">Connects</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">{Math.max(0, prof.followers || 0)}</p>
                </div>

                {isNew && (<span className="self-center text-emerald-700 font-bold text-[9px] sm:text-[10px] uppercase tracking-wider">
                  New
                </span>)}

                {!(prof.id === activeUser?.uid || prof.uid === activeUser?.uid) && (
                  <button
                    type="button"
                    onClick={(e) => handleToggleFollow(e, prof.id)}
                    title={isFollowing ? 'Connected' : 'Connect'}
                    aria-label={isFollowing ? 'Connected' : 'Connect'}
                    className="p-2 self-center transition-transform duration-200 active:scale-90 cursor-pointer flex items-center justify-center bg-transparent border-0"
                  >
                    {isFollowing ? (
                      <UserCheck className="w-6 h-6 text-emerald-700 hover:text-emerald-800 transition-colors" strokeWidth={2.2} />
                    ) : (
                      <UserPlus className="w-6 h-6 text-[#57534e] hover:text-[#1c1917] transition-colors" strokeWidth={2} />
                    )}
                  </button>
                )}
              </div>
            </motion.div>);
          })}
        </div>)}


        <div className="space-y-4 max-w-4xl mx-auto">
          <h2 className="text-xs font-bold text-[#78716c] uppercase tracking-wider mb-6 text-left">
            {selectedCategory === 'All' ? 'All Ranked Talent' : `${getCategoryConfig(selectedCategory).label} Rankings`}
          </h2>

          <div className="flex flex-col text-left">
            {remainingList.slice(0, visibleCount).map((prof) => {
              const isSelf = prof.id === activeUser?.uid || prof.uid === activeUser?.uid;
              const isFollowing = followingIds.includes(prof.id);
              const expLevel = getExperienceLevel(prof);
              const joinYear = getJoinYear(prof);
              const talentPhoto = prof.image || prof.photoURL || prof.profileImage || prof.avatar || prof.photo;

              return (
                <div
                  key={prof.id}
                  onMouseEnter={() => prefetchProfile(prof.id)}
                  onTouchStart={() => prefetchProfile(prof.id)}
                  onClick={() => onNavigate('profile', prof.id)}
                  className="flex items-center justify-between py-3.5 px-4 rounded-2xl bg-[#F5EFE1] border border-black/5 hover:bg-[#ece4d4] transition-all duration-200 cursor-pointer group select-none shadow-sm mb-2.5"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar
                        userId={prof.id || prof.uid}
                        user={prof}
                        src={talentPhoto}
                        size="none"
                        name={prof.name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-black/10 group-hover:border-black/30 transition-colors"
                      />
                      {prof.openToWork && (
                        <span
                          className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0 shadow-sm"
                          title="Open to Work"
                        />
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="font-semibold text-[#1c1917] text-base sm:text-lg tracking-normal truncate flex items-center gap-1.5 group-hover:text-black transition-colors">
                        {prof.name}
                        {prof.verified && (
                          <span className="verified-badge shrink-0 text-sky-600 text-xs" title="Verified Talent">✓</span>
                        )}
                      </h3>
                      <p className="text-xs text-[#57534e] font-normal mt-0.5 truncate">
                        {formatRole(prof.role)} • {expLevel} Level • Since {joinYear}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-[#78716c] font-normal mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#78716c] shrink-0" />
                        <span>{prof.location || 'Nepal'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollow(e, prof.id)}
                        title={isFollowing ? 'Connected' : 'Connect'}
                        aria-label={isFollowing ? 'Connected' : 'Connect'}
                        className="p-2 transition-transform duration-200 active:scale-90 cursor-pointer flex items-center justify-center bg-transparent border-0"
                      >
                        {isFollowing ? (
                          <UserCheck className="w-5 h-5 text-emerald-700 hover:text-emerald-800 transition-colors" strokeWidth={2.2} />
                        ) : (
                          <UserPlus className="w-5 h-5 text-[#57534e] hover:text-[#1c1917] transition-colors" strokeWidth={2} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {rankedProfiles.length > visibleCount && (<div className="pt-8 text-center">
            <button onClick={() => setVisibleCount(prev => prev + 10)} className="inline-flex items-center gap-2 bg-[#AEC4D4] hover:bg-[#97b1c3] border border-black/10 text-[#1c1917] font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-md active:scale-[0.98] cursor-pointer">
              Load More Profiles
            </button>
          </div>)}
        </div>

      </div>)}

    </div>
  </div>);
}
