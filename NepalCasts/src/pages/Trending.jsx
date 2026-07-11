import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, MapPin, Search, TrendingUp, ChevronLeft
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { 
  collection, onSnapshot, query, doc, deleteDoc, setDoc, updateDoc, increment, addDoc, serverTimestamp, where 
} from 'firebase/firestore';
import Avatar from '../components/ui/Avatar';
import SEO from '../components/SEO';
import { CATEGORIES, getCategoryColor, getCategoryConfig } from '../constants/categories';



export default function Trending({ onNavigate }) {
  const [profiles, setProfiles] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  
  const [selectedPeriod, setSelectedPeriod] = useState('This Week'); 
  const [selectedCategory, setSelectedCategory] = useState('All'); 
  
  
  const [visibleCount, setVisibleCount] = useState(10);

  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "profiles"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProfiles(data);
      setLoading(false);
    }, (err) => {
      console.warn("Profiles fetch failed or permission denied:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const q = query(collection(db, "follows"), where("followerId", "==", currentUser.uid));
        const unsub = onSnapshot(q, (snapshot) => {
          const ids = snapshot.docs.map(doc => doc.data().followingId);
          setFollowingIds(ids);
        }, (err) => {
          console.warn("Follows listener error in Trending:", err);
        });
        return () => unsub();
      } else {
        setFollowingIds([]);
      }
    });
    return () => unsubscribe();
  }, []);

  
  const isProfileNew = (profile) => {
    const createdDate = profile.createdAt?.toDate?.() || (profile.createdAt ? new Date(profile.createdAt) : null);
    if (!createdDate) return false;
    const diff = Date.now() - createdDate.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  
  const calculateTrendingScore = (profile, period) => {
    const followers = profile.followers || 0;
    const rating = parseFloat(profile.rating) || 0;
    
    const updatedDate = profile.updatedAt?.toDate?.() || (profile.updatedAt ? new Date(profile.updatedAt) : null);
    const createdDate = profile.createdAt?.toDate?.() || (profile.createdAt ? new Date(profile.createdAt) : null);
    
    const lastActiveTime = updatedDate ? updatedDate.getTime() : 0;
    const createdTime = createdDate ? createdDate.getTime() : 0;
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    let recencyBonus = 0;
    let activityBonus = 0;
    
    if (period === 'Today') {
      if (now - createdTime < oneDay) recencyBonus = 120;
      else if (now - createdTime < 7 * oneDay) recencyBonus = 40;
      
      if (now - lastActiveTime < oneDay) activityBonus = 60;
      else if (now - lastActiveTime < 3 * oneDay) activityBonus = 25;
    } else if (period === 'This Week') {
      if (now - createdTime < 7 * oneDay) recencyBonus = 90;
      else if (now - createdTime < 30 * oneDay) recencyBonus = 30;
      
      if (now - lastActiveTime < 7 * oneDay) activityBonus = 45;
    } else { 
      if (now - createdTime < 30 * oneDay) recencyBonus = 70;
      if (now - lastActiveTime < 30 * oneDay) activityBonus = 35;
    }
    
    return (rating * 25) + (followers * 1.8) + recencyBonus + activityBonus;
  };

  
  const handleToggleFollow = async (e, talentId) => {
    e.stopPropagation();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please sign in to follow talents.");
      return;
    }
    
    const isFollowing = followingIds.includes(talentId);
    const followId = `${currentUser.uid}_${talentId}`;
    const followDocRef = doc(db, "follows", followId);
    
    
    const prevFollowingIds = [...followingIds];
    const prevProfiles = [...profiles];

    
    setFollowingIds(prev => 
      isFollowing 
        ? prev.filter(id => id !== talentId) 
        : [...prev, talentId]
    );

    setProfiles(prev => prev.map(p => {
      if (p.id === talentId) {
        return { ...p, followers: Math.max(0, (p.followers || 0) + (isFollowing ? -1 : 1)) };
      }
      return p;
    }));
    
    try {
      if (isFollowing) {
        
        await deleteDoc(followDocRef);
        await updateDoc(doc(db, "profiles", talentId), { followers: increment(-1) });
        await updateDoc(doc(db, "profiles", currentUser.uid), { following: increment(-1) });
      } else {
        
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
          followingId: talentId,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "profiles", talentId), { followers: increment(1) });
        await updateDoc(doc(db, "profiles", currentUser.uid), { following: increment(1) });
        
        
        await addDoc(collection(db, "notifications"), {
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
        });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
      
      setFollowingIds(prevFollowingIds);
      setProfiles(prevProfiles);
    }
  };

  
  const rankedProfiles = profiles
    .filter(p => {
      if (p.deactivated === true) return false;
      if (selectedCategory !== 'All' && p.role?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
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
    if (rank === 1) return '#FFD700'; 
    if (rank === 2) return '#C0C0C0'; 
    if (rank === 3) return '#CD7F32'; 
    return '#4B5563'; 
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-32 md:pb-20 relative font-sans">
      <SEO 
        title="Trending Cinema Talent | NepalCasts" 
        description="Check out who's trending now on Nepal's premier casting and cinema professional network." 
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Back Button */}
        <div className="mb-6 flex justify-start">
          <button
            onClick={() => onNavigate('back')}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white border border-white/10 transition-colors"
            aria-label="Back"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Header with yellow left bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 mb-10 text-left">
          <div className="flex items-start gap-4">
            <div className="w-1.5 h-12 bg-yellow-400 rounded-full self-center shrink-0"></div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2">
                Trending Now
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Discover Nepal's most active and popular creators</p>
            </div>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex bg-[#111] border border-white/5 rounded-2xl p-1 shrink-0 self-start md:self-center">
            {['Today', 'This Week', 'This Month'].map(p => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPeriod(p);
                  setVisibleCount(10);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                  selectedPeriod === p
                    ? 'bg-[#0099FF] text-black shadow-md shadow-[#0099FF]/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex overflow-x-auto gap-2.5 pb-6 mb-8 scrollbar-hide -mx-6 px-6 sm:mx-0 sm:px-0">
          <button
            onClick={() => {
              setSelectedCategory('All');
              setVisibleCount(10);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
              selectedCategory === 'All'
                ? 'bg-white text-black font-extrabold'
                : 'bg-[#111] border border-white/5 text-gray-400 hover:text-white hover:border-white/10'
            }`}
          >
            All Talent
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setVisibleCount(10);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
                selectedCategory === cat
                  ? 'bg-white text-black font-extrabold shadow-lg'
                  : 'bg-[#111] border border-white/5 text-gray-400 hover:text-white hover:border-white/10'
              }`}
            >
              {getCategoryConfig(cat).label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-12">
            {/* Podium Skeleton (Desktop View) */}
            {selectedCategory === 'All' && (
              <div className="hidden md:flex justify-center items-end gap-6 max-w-4xl mx-auto pt-8 pb-4 relative">
                {/* Backdrop ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-yellow-500/5 via-blue-500/5 to-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
                
                {/* #2 Rank Skeleton */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full skeleton border border-white/5 mb-6" />
                  <div className="h-4 skeleton w-24 mb-2" />
                  <div className="h-3 skeleton w-16 mb-4" />
                  <div className="h-8 skeleton w-20 rounded-full" />
                </div>
                
                {/* #1 Rank Skeleton */}
                <div className="flex-1 flex flex-col items-center">
                  <Crown className="w-8 h-8 text-yellow-400/20 mb-2 fill-yellow-400/5 animate-pulse" />
                  <div className="w-32 h-32 rounded-full skeleton border-2 border-yellow-400/10 mb-6" />
                  <div className="h-5 skeleton w-28 mb-2" />
                  <div className="h-3.5 skeleton w-20 mb-4" />
                  <div className="h-9 skeleton w-24 rounded-full" />
                </div>
                
                {/* #3 Rank Skeleton */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full skeleton border border-white/5 mb-6" />
                  <div className="h-4 skeleton w-20 mb-2" />
                  <div className="h-3 skeleton w-16 mb-4" />
                  <div className="h-8 skeleton w-20 rounded-full" />
                </div>
              </div>
            )}

            {/* List Skeleton */}
            <div className="flex flex-col">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 py-5 border-b border-white/5"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Rank Placeholder */}
                    <div className="w-10 sm:w-14 h-8 rounded-lg skeleton shrink-0" />
                    
                    {/* Avatar Placeholder */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full skeleton shrink-0" />
                    
                    {/* Details Placeholder */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="h-4 skeleton w-1/3" />
                      <div className="h-3 skeleton w-1/2" />
                      <div className="h-3.5 skeleton w-1/4 mt-1" />
                    </div>
                  </div>
                  
                  {/* Followers & Follow Button Placeholders */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right space-y-1.5 hidden sm:block">
                      <div className="h-3.5 skeleton w-16 ml-auto" />
                      <div className="h-3 skeleton w-20 ml-auto" />
                    </div>
                    <div className="w-20 sm:w-24 h-9 sm:h-10 rounded-xl skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : rankedProfiles.length === 0 ? (
          <div className="text-center py-24 bg-[#111] border border-dashed border-white/5 rounded-[2.5rem]">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">No matches found</h3>
            <p className="text-gray-500 text-sm mt-1.5 max-w-xs mx-auto">
              Nobody in the "{selectedCategory}" category fits the active search filters for {selectedPeriod.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* TOP 3 PODIUM - DESKTOP VIEW */}
            {topThree.length > 0 && selectedCategory === 'All' && (
              <div className="hidden md:flex justify-center items-end gap-6 max-w-4xl mx-auto pt-8 pb-4 relative">
                {/* Backdrop ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-yellow-500/5 via-blue-500/5 to-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

                {podiumOrder.map((item, idx) => {
                  const prof = item.profile;
                  if (!prof) return <div key={idx} className="flex-1" />;

                  const isFollowing = followingIds.includes(prof.id);
                  const isNew = isProfileNew(prof);

                  return (
                    <motion.div
                      key={prof.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: item.pos * 0.15 }}
                      onClick={() => onNavigate('profile', prof.id)}
                      className="flex-1 flex flex-col items-center cursor-pointer group"
                    >
                      {/* Avatar container */}
                      <div className="relative mb-6">
                        {/* Crown for #1 */}
                        {item.pos === 0 && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                            <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] fill-yellow-400" />
                          </div>
                        )}
                        
                        <div className={`p-1.5 rounded-full border-2 bg-black/40 ${
                          item.pos === 0 ? 'border-yellow-400' : item.pos === 1 ? 'border-slate-300' : 'border-amber-700'
                        } relative`}>
                          <Avatar
                            user={prof}
                            size={item.pos === 0 ? 'xl' : 'lg'}
                            name={prof.name}
                            className="group-hover:scale-105 transition-transform duration-500"
                          />
                          
                          {/* Active green dot */}
                          {prof.openToWork && (
                            <span className="absolute bottom-1.5 right-1.5 flex h-4.5 w-4.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border border-[#0A0A0A]"></span>
                            </span>
                          )}
                        </div>

                        {/* Rank Badge overlay on Avatar */}
                        <div 
                          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border"
                          style={{ 
                            backgroundColor: '#111', 
                            borderColor: getRankColor(item.pos + 1),
                            color: getRankColor(item.pos + 1)
                          }}
                        >
                          #{item.pos + 1}
                        </div>
                      </div>

                      {/* Name / Username */}
                      <div className="text-center mb-4 w-full px-2">
                        <h3 className="font-bold text-white text-base tracking-tight truncate max-w-[180px] mx-auto">
                          {prof.name}
                        </h3>
                        <p className="text-xs text-nc-accent font-medium truncate mt-0.5">
                          @{prof.username || prof.name?.toLowerCase().replace(/\s+/g, '_') || 'talent'}
                        </p>
                      </div>

                      {/* Podium Pedestal */}
                      <div className={`w-full ${item.height} bg-gradient-to-b from-[#111]/90 to-[#0A0A0A]/40 border-t ${item.borderGlow} rounded-t-[2.5rem] flex flex-col justify-between p-5 text-center transition-all duration-300 group-hover:border-white/10`}>
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Followers</p>
                          <p className="text-xl sm:text-2xl font-black text-white">{Math.max(0, prof.followers || 0)}</p>
                        </div>

                        {isNew && (
                          <span className="self-center px-2 py-0.5 rounded-md text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-400 font-extrabold uppercase tracking-wide animate-pulse">
                            New
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleToggleFollow(e, prof.id)}
                          className={`w-full py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                            isFollowing
                              ? 'bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 text-gray-300'
                              : 'bg-[#0099FF] text-black hover:opacity-95 shadow-md shadow-[#0099FF]/10 active:scale-[0.98]'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* RANKED LIST OF CARDS */}
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

                  return (
                    <motion.div
                      key={prof.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: (index % 10) * 0.05 }}
                      onClick={() => onNavigate('profile', prof.id)}
                      className="group flex items-center justify-between gap-4 py-5 border-b border-white/5 hover:border-white/10 active:bg-white/[0.01] transition-all duration-300 cursor-pointer text-left"
                    >
                      {/* Left Side: Rank, Avatar and details */}
                      <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                        
                        {/* Rank Number with absolute background size for top ranks */}
                        <div className="w-10 sm:w-14 flex items-center justify-center relative shrink-0">
                          <span 
                            className="text-2xl sm:text-3xl font-black select-none tracking-tighter"
                            style={{ color: getRankColor(rank) }}
                          >
                            #{rank}
                          </span>
                        </div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <Avatar
                            user={prof}
                            size="none"
                            name={prof.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 border-white/5 group-hover:border-white/20"
                          />
                          {prof.openToWork && (
                            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border border-[#111]"></span>
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate group-hover:text-[#0099FF] transition-colors">
                              {prof.name}
                            </h3>
                            {isNew && (
                              <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] bg-blue-500/10 border border-blue-500/30 text-blue-400 font-extrabold uppercase tracking-wide animate-pulse">
                                New
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                            <span className="text-nc-accent font-semibold">
                              @{prof.username || prof.name?.toLowerCase().replace(/\s+/g, '_') || 'talent'}
                            </span>
                            
                            {prof.location && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <MapPin className="w-3 h-3 text-gray-600 shrink-0" />
                                {prof.location}
                              </span>
                            )}

                            {/* Category Badge pill */}
                            {prof.role && (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0"
                                style={{ 
                                  backgroundColor: `${catColor}15`, 
                                  color: catColor,
                                  border: `1px solid ${catColor}25`
                                }}
                              >
                                {prof.role}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right Side: Follower count & Follow button */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="text-center hidden sm:block">
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Followers</p>
                          <p className="text-sm font-extrabold text-white">{Math.max(0, prof.followers || 0)}</p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleToggleFollow(e, prof.id)}
                          className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
                            isFollowing
                              ? 'bg-transparent border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 text-gray-300'
                              : 'bg-[#0099FF] text-black hover:opacity-95 shadow-md shadow-[#0099FF]/10 active:scale-[0.98]'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>

                    </motion.div>
                  );
                })}
              </div>

              {/* PAGINATION: "Load More" */}
              {rankedProfiles.length > visibleCount && (
                <div className="pt-8 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    className="inline-flex items-center gap-2 bg-[#111] hover:bg-[#1a1a1a] border border-white/5 hover:border-white/10 text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                  >
                    Load More Profiles
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
