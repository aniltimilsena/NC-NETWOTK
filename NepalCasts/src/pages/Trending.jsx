import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Search, ChevronLeft, SlidersHorizontal } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { collection, onSnapshot, query, doc, deleteDoc, setDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { subscribeToTalents, notifyFollowUpdated } from '../features/profile/services/users';
import Avatar from '../components/ui/Avatar';
import SEO from '../components/SEO';
import { CATEGORIES, getCategoryColor, getCategoryConfig, matchesCategory } from '../constants/categories';
import { cacheManager } from '../utils/cacheManager';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/firebase';

export default function Trending({ onNavigate, user }) {
  const { t } = useTranslation();
  const { user: clerkUser } = useUser();
  const activeUser = user || (clerkUser ? {
    uid: clerkUser.id,
    displayName: clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || "Someone",
    photoURL: clerkUser.imageUrl || "",
  } : null);
  const [profiles, setProfiles] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('This Week');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  useEffect(() => {
    setLoading(true);
    return subscribeToTalents((data) => {
      setProfiles(data);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    const userId = clerkUser?.id;
    if (userId) {
      return cacheManager.subscribePooled(`user_follows_${userId}`, (pooledCb) => {
        const q = query(collection(db, "follows"), where("followerId", "==", userId));
        return onSnapshot(q, (snapshot) => {
          const ids = snapshot.docs.map(doc => doc.data().followingId);
          pooledCb(ids, null);
        }, (err) => {
          console.warn("Follows listener error:", err);
          pooledCb([], err);
        });
      }, (ids) => {
        setFollowingIds(ids);
      });
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
    const followId = `${currentUser.uid}_${talentId}`;
    const followDocRef = doc(db, "follows", followId);
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
    const notifId = `${currentUser.uid}_${talentId}_follow`;
    try {
      if (isFollowing) {
        await deleteDoc(followDocRef);
        await deleteDoc(doc(db, "notifications", notifId)).catch(() => {});
      }
      else {
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
          followingId: talentId,
          createdAt: serverTimestamp()
        });
        await setDoc(doc(db, "notifications", notifId), {
          userId: talentId,
          recipientId: talentId,
          receiverId: talentId,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || "Someone",
          senderAvatar: currentUser.photoURL || "",
          title: "New Follower",
          body: `${currentUser.displayName || "Someone"} started following you.`,
          type: "follow",
          notificationType: "follow",
          isRead: false,
          read: false,
          createdAt: serverTimestamp(),
          targetUrl: `/profile/${currentUser.uid}`
        }, { merge: true });
      }
      notifyFollowUpdated(talentId);
    }
    catch (err) {
      console.error("Error toggling follow:", err);
      setFollowingIds(prevFollowingIds);
      setProfiles(prevProfiles);
    }
  };
  const rankedProfiles = profiles
    .filter(p => {
      if (!p.name || p.name.trim() === '') return false;
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
      return '#FFD700';
    if (rank === 2)
      return '#C0C0C0';
    if (rank === 3)
      return '#CD7F32';
    return '#4B5563';
  };
  return (<div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-6 relative font-sans">
    <SEO title="Trending Cinema Talent | NepalCasts" description="Check out who's trending now on Nepal's premier casting and cinema professional network." />

    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12">

      <div className="flex items-center justify-between gap-4 pb-3 mb-6">
        <div className="flex items-center gap-3.5 min-w-0">
          <button onClick={() => onNavigate('back')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0" aria-label="Back" title="Go Back">
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white leading-none truncate">
              {t('trending_now')}
            </h1>
          </div>
        </div>

        <div className="relative shrink-0">
          <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-sky-400 hover:text-sky-300 transition-colors duration-200 cursor-pointer" aria-label="Category Filter" title="Category Filter">
            <SlidersHorizontal className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-sky-400" strokeWidth={2} />
          </button>

          <AnimatePresence>
            {isFilterDropdownOpen && (<>
              <div className="fixed inset-0 z-30" onClick={() => setIsFilterDropdownOpen(false)} />
              <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-36 bg-[#111116] border border-white/10 rounded-xl shadow-2xl py-1 z-40 text-left">
                <button onClick={() => {
                  setSelectedCategory('All');
                  setVisibleCount(10);
                  setIsFilterDropdownOpen(false);
                }} className={`w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${selectedCategory === 'All'
                  ? 'text-sky-400 bg-sky-400/5'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  {t('nav_talent_directory')}
                </button>
                {CATEGORIES.map(cat => {
                  const isActive = selectedCategory === cat;
                  return (<button key={cat} onClick={() => {
                    setSelectedCategory(cat);
                    setVisibleCount(10);
                    setIsFilterDropdownOpen(false);
                  }} className={`w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive
                    ? 'text-sky-400 bg-sky-400/5'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    {getCategoryConfig(cat).label}
                  </button>);
                })}
              </motion.div>
            </>)}
          </AnimatePresence>
        </div>
      </div>


      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="inline-flex bg-[#0E0E0E] border border-white/10 rounded-full p-1 max-w-full overflow-x-auto items-center gap-1">
          {['Today', 'This Week', 'This Month'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPeriod(p);
                setVisibleCount(10);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedPeriod === p
                  ? 'bg-[#18181b] border border-white/20 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (<div className="space-y-12">

        {selectedCategory === 'All' && (<div className="hidden md:flex justify-center items-end gap-6 max-w-4xl mx-auto pt-8 pb-4 relative">

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-yellow-500/5 via-blue-500/5 to-purple-500/5 blur-[80px] rounded-full pointer-events-none" />


          <div className="flex-1 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full skeleton border border-white/5 mb-6" />
            <div className="h-4 skeleton w-24 mb-2" />
            <div className="h-3 skeleton w-16 mb-4" />
            <div className="h-8 skeleton w-20 rounded-full" />
          </div>


          <div className="flex-1 flex flex-col items-center">
            <Crown className="w-8 h-8 text-yellow-400/20 mb-2 fill-yellow-400/5 animate-pulse" />
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
          {Array.from({ length: 5 }).map((_, idx) => (<div key={idx} className="flex items-center justify-between gap-4 py-5 border-b border-white/5">
            <div className="flex items-center gap-4 min-w-0 flex-1">

              <div className="w-10 sm:w-14 h-8 rounded-lg skeleton shrink-0" />


              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full skeleton shrink-0" />


              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-4 skeleton w-1/3" />
                <div className="h-3 skeleton w-1/2" />
                <div className="h-3.5 skeleton w-1/4 mt-1" />
              </div>
            </div>


            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right space-y-1.5 hidden sm:block">
                <div className="h-3.5 skeleton w-16 ml-auto" />
                <div className="h-3 skeleton w-20 ml-auto" />
              </div>
              <div className="w-20 sm:w-24 h-9 sm:h-10 rounded-xl skeleton" />
            </div>
          </div>))}
        </div>
      </div>) : rankedProfiles.length === 0 ? (<div className="text-center py-24 bg-[#111] border border-dashed border-white/5 rounded-[2.5rem]">
        <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white">No matches found</h3>
        <p className="text-gray-500 text-sm mt-1.5 max-w-xs mx-auto">
          Nobody in the "{selectedCategory}" category fits the active search filters for {selectedPeriod.toLowerCase()}.
        </p>
      </div>) : (<div className="space-y-12">


        {topThree.length > 0 && selectedCategory === 'All' && (<div className="hidden md:flex justify-center items-end gap-6 max-w-4xl mx-auto pt-8 pb-4 relative">

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-yellow-500/5 via-blue-500/5 to-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

          {podiumOrder.map((item, idx) => {
            const prof = item.profile;
            if (!prof)
              return <div key={idx} className="flex-1" />;
            const isFollowing = followingIds.includes(prof.id);
            const isNew = isProfileNew(prof);
            return (<motion.div key={prof.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: item.pos * 0.15 }} onClick={() => onNavigate('profile', prof.id)} className="flex-1 flex flex-col items-center cursor-pointer group">

              <div className="relative mb-6">

                {item.pos === 0 && (<div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                  <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] fill-yellow-400" />
                </div>)}

                <div className={`p-1.5 rounded-full border-2 bg-black/40 ${item.pos === 0 ? 'border-yellow-400' : item.pos === 1 ? 'border-slate-300' : 'border-amber-700'} relative`}>
                  <Avatar userId={prof.id || prof.uid} user={prof} size={item.pos === 0 ? 'xl' : 'lg'} name={prof.name} className="group-hover:scale-105 transition-transform duration-500" />


                  {prof.openToWork && (<span className="absolute bottom-1.5 right-1.5 flex h-4.5 w-4.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border border-[#0A0A0A]"></span>
                  </span>)}
                </div>


                <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border" style={{
                  backgroundColor: '#111',
                  borderColor: getRankColor(item.pos + 1),
                  color: getRankColor(item.pos + 1)
                }}>
                  #{item.pos + 1}
                </div>
              </div>

              <div className="text-center mb-4 w-full px-2">
                <h3 className="font-bold text-white text-base tracking-tight truncate max-w-[180px] mx-auto">
                  {prof.name}
                </h3>
                <p className="text-xs text-nc-accent font-medium truncate mt-0.5">
                  @{prof.username || prof.name?.toLowerCase().replace(/\s+/g, '_') || 'talent'}
                </p>
              </div>


              <div className={`w-full ${item.height} bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/40 border-t ${item.borderGlow} rounded-t-[2.5rem] flex flex-col justify-between p-5 text-center transition-all duration-300 group-hover:border-white/10`}>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Followers</p>
                  <p className="text-xl sm:text-2xl font-black text-white">{Math.max(0, prof.followers || 0)}</p>
                </div>

                {isNew && (<span className="self-center text-[#0099FF] font-black text-[9px] sm:text-[10px] uppercase tracking-wider">
                  New
                </span>)}

                <button type="button" onClick={(e) => handleToggleFollow(e, prof.id)} className={`w-full py-2 rounded-full text-xs font-bold transition-all border cursor-pointer active:scale-95 ${isFollowing
                  ? 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/15'
                  : 'bg-[#18181b] border-white/20 text-white hover:bg-white/15 hover:border-white/30 shadow-sm'}`}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </motion.div>);
          })}
        </div>)}


        <div className="space-y-4 max-w-4xl mx-auto">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 text-left">
            {selectedCategory === 'All' ? 'All Ranked Talent' : `${getCategoryConfig(selectedCategory).label} Rankings`}
          </h2>

          <div className="flex flex-col text-left">
            {remainingList.slice(0, visibleCount).map((prof, index) => {
              const rank = index + 1;
              const isFollowing = followingIds.includes(prof.id);
              const isNew = isProfileNew(prof);
              const catColor = getCategoryColor(prof.role);
              return (<motion.div key={prof.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: (index % 10) * 0.05 }} onClick={() => onNavigate('profile', prof.id)} className="group flex items-center justify-between gap-4 py-2 active:bg-white/[0.01] transition-all duration-300 cursor-pointer text-left">

                <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">

                  <div className="w-10 sm:w-14 flex items-center justify-center relative shrink-0">
                    <span className="text-2xl sm:text-3xl font-black select-none tracking-tighter" style={{ color: getRankColor(rank) }}>
                      #{rank}
                    </span>
                  </div>

                  <div className="relative shrink-0">
                    <Avatar user={prof} size="none" name={prof.name} className="w-20 h-20 sm:w-24 sm:h-24 border-white/5 group-hover:border-white/20" />
                    {prof.openToWork && (<span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border border-[#111]"></span>
                    </span>)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate group-hover:text-[#0099FF] transition-colors">
                        {prof.name}
                      </h3>
                      {isNew && (<span className="shrink-0 text-[#0099FF] font-black text-[9px] sm:text-[10px] uppercase tracking-wider">
                        New
                      </span>)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-400">
                      <span className="text-nc-accent font-semibold">
                        @{prof.username || prof.name?.toLowerCase().replace(/\s+/g, '_') || 'talent'}
                      </span>
                      {prof.role && (<>
                        <span className="text-gray-600">·</span>
                        <span className="font-semibold text-gray-300 capitalize">
                          {prof.role?.split(',')[0]}
                        </span>
                      </>)}
                      {prof.location && (<>
                        <span className="text-gray-600">·</span>
                        <span className="capitalize text-gray-400">
                          {prof.location}
                        </span>
                      </>)}
                    </div>
                  </div>

                </div>

                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  {prof.id !== activeUser?.uid && (<button type="button" onClick={(e) => handleToggleFollow(e, prof.id)} className={`px-5 py-2 sm:px-6 sm:py-2 rounded-full text-xs font-bold transition-all border cursor-pointer active:scale-95 ${isFollowing
                    ? 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/15'
                    : 'bg-[#18181b] border-white/20 text-white hover:bg-white/15 hover:border-white/30 shadow-sm'}`}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>)}
                </div>

              </motion.div>);
            })}
          </div>

          {rankedProfiles.length > visibleCount && (<div className="pt-8 text-center">
            <button onClick={() => setVisibleCount(prev => prev + 10)} className="inline-flex items-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-white/10 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98]">
              Load More Profiles
            </button>
          </div>)}
        </div>

      </div>)}

    </div>
  </div>);
}
