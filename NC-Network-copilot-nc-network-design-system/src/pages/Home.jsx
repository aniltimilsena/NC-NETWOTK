import { useState, useEffect, useRef } from 'react';

import {
  Plus,
  Check,
  Play,
  X
} from 'lucide-react';
import {
  SpotlightIcon,
  FilmReelIcon,
  ApertureIcon,
  DynamicMotionIcon,
  EqualizerIcon,
  HeadphonesIcon,
  StackedLayersIcon,
  OpenBookIcon,
} from '../components/icons/CategoryIcons';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import CategorySkeleton from '../components/ui/CategorySkeleton';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import Avatar from '../components/ui/Avatar';
import { subscribeToTalents } from '../services/users';
import { subscribeToCastingCalls } from '../services/casting';

import { getAvatar } from '../utils/avatars';
import { db } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

export default function Home({ onNavigate, user }) {
  const isLoggedIn = !!user;
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [followedTalents, setFollowedTalents] = useState([]);
  
  // Real follows subscription
  useEffect(() => {
    if (!user) {
      setFollowedTalents([]);
      return;
    }
    
    const q = query(
      collection(db, "follows"),
      where("followerId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const ids = snap.docs.map(doc => doc.data().followingId);
      setFollowedTalents(ids);
    }, (err) => {
      console.warn("Follows subscription in Home failed:", err);
    });
    
    return () => unsub();
  }, [user?.uid]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPremiumIdx, setCurrentPremiumIdx] = useState(0);
  const [talents, setTalents] = useState([]);
  const [castingCalls, setCastingCalls] = useState([]);
  const [queryError, setQueryError] = useState(null);
  const scrollRef = useRef(null);
  const [categoriesReady, setCategoriesReady] = useState(false);



  const categories = [
    { id: 1, name: 'Actors', icon: SpotlightIcon, count: 0 },
    { id: 2, name: 'Directors', icon: FilmReelIcon, count: 0 },
    { id: 3, name: 'Models', icon: ApertureIcon, count: 0 },
    { id: 4, name: 'Dancers', icon: DynamicMotionIcon, count: 0 },
    { id: 5, name: 'Musicians', icon: EqualizerIcon, count: 0 },
    { id: 6, name: 'Voice Over', icon: HeadphonesIcon, count: 0 },
    { id: 7, name: 'VFX', icon: StackedLayersIcon, count: 0 },
    { id: 8, name: 'Writers', icon: OpenBookIcon, count: 0 },
  ];

  const premiumTalents = talents.filter(t => t.premium || t.verified);

  useEffect(() => {
    let unsubUsers = () => {};
    let unsubCalls = () => {};

    // Initial loading timeout as fallback
    const loaderTimeout = setTimeout(() => setIsLoading(false), 3000);

    try {
      unsubUsers = subscribeToTalents((data) => {
        setTalents(data);
        setIsLoading(false); // Clear as soon as we have any data
      });
      
      unsubCalls = subscribeToCastingCalls('All', (data, error) => {
        if (error) {
          console.warn("Home query issue (likely index building):", error);
        }
        if (data) setCastingCalls(data);
        setIsLoading(false);
      });


    } catch (err) {
      console.error("Critical subscription crash:", err);
      setQueryError(err.message);
      setIsLoading(false);
    }

    return () => {
      clearTimeout(loaderTimeout);
      if (typeof unsubUsers === 'function') unsubUsers();
      if (typeof unsubCalls === 'function') unsubCalls();
    };
  }, []);

  // ── Delayed category reveal for skeleton → real transition ──────────────
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setCategoriesReady(true), 80);
      return () => clearTimeout(t);
    }
    setCategoriesReady(false);
  }, [isLoading]);


  // ── Auto-scroll for Casting Strip ────────────────────────────────────────
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || castingCalls.length === 0) return;

    const checkScroll = () => {
      // We only want to scroll if the content is wider than the container
      setShouldScroll(container.scrollWidth > container.offsetWidth);
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [castingCalls.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !shouldScroll) return;

    let animationId;
    let scrollPos = container.scrollLeft;
    const speed = 0.4;

    const animate = () => {
      scrollPos += speed;
      // Loop point is halfway if duplicated, otherwise at the end
      const loopPoint = castingCalls.length > 3 ? container.scrollWidth / 2 : container.scrollWidth - container.offsetWidth;
      
      if (scrollPos >= loopPoint) {
        scrollPos = 0;
      }
      container.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [shouldScroll, castingCalls.length]);

  const toggleFollow = async (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      onNavigate('signin');
      return;
    }
    const followId = `${user.uid}_${targetId}`;
    const followDocRef = doc(db, "follows", followId);
    const isCurrentlyFollowing = followedTalents.includes(targetId);
    
    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        await deleteDoc(followDocRef);
        await updateDoc(doc(db, "profiles", targetId), { followers: increment(-1) });
        await updateDoc(doc(db, "profiles", user.uid), { following: increment(-1) });
        try {
          await updateDoc(doc(db, "users", targetId), { followers: increment(-1) });
          await updateDoc(doc(db, "users", user.uid), { following: increment(-1) });
        } catch (err) {
          console.warn("Could not sync user follow stats:", err);
        }
      } else {
        // Follow
        await setDoc(followDocRef, {
          followerId: user.uid,
          followingId: targetId,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "profiles", targetId), { followers: increment(1) });
        await updateDoc(doc(db, "profiles", user.uid), { following: increment(1) });
        try {
          await updateDoc(doc(db, "users", targetId), { followers: increment(1) });
          await updateDoc(doc(db, "users", user.uid), { following: increment(1) });
        } catch (err) {
          console.warn("Could not sync user follow stats:", err);
        }
      }
    } catch (err) {
      console.error("Error toggling follow in Home:", err);
    }
  };

  useEffect(() => {
    const featuredList = premiumTalents.length > 0 ? premiumTalents : talents;
    if (featuredList.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentPremiumIdx(prev => (prev + 1) % featuredList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [premiumTalents.length, talents.length]);

  const featuredList = premiumTalents.length > 0 ? premiumTalents : talents;
  const currentPremiumUser = featuredList[currentPremiumIdx] || null;

  return (
    <div className="min-h-screen bg-nc-dark">
      {/* Hero Section */}
      <section className="relative min-h-[50vh] lg:min-h-[60vh] flex flex-col justify-center items-start overflow-hidden pt-20 pb-8 px-6 sm:px-8 lg:px-20">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-bg.png"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nc-dark via-transparent to-nc-dark/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-nc-dark/80 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-2">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-sky-300 to-sky-500">
            Discover
          </h1>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white max-w-2xl opacity-90">
            Multiple Talents in one place
          </h2>
        </div>

        {/* Profile Card */}
        {currentPremiumUser && (
          <motion.div 
            key={currentPremiumUser.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            onClick={() => currentPremiumUser.id && onNavigate('profile', currentPremiumUser.id)}
            className="relative z-30 mt-8 bg-nc-dark/40 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-4 flex items-center gap-5 max-w-sm shadow-2xl transition-all duration-500 hover:border-sky-400/30 group animate-in fade-in slide-in-from-bottom-4 duration-700 cursor-pointer"
          >
            {/* Profile Image with Ring */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
              <div className="w-full h-full rounded-full p-[2px] bg-gradient-to-tr from-sky-400 to-blue-600 shadow-lg shadow-sky-500/20">
                <div className="w-full h-full rounded-full bg-nc-dark p-0.5">
                  <Avatar 
                    key={currentPremiumUser.image}
                    user={currentPremiumUser}
                    size="lg"
                    name={currentPremiumUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">{currentPremiumUser.name}</h3>
                {(currentPremiumUser.premium || currentPremiumUser.verified) && (
                  <div className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                    <Check size={10} className="text-sky-400" strokeWidth={4} />
                    <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Pro</span>
                  </div>
                )}
              </div>
              <p className="text-nc-secondary font-bold text-sm sm:text-base mt-0.5 capitalize">{currentPremiumUser.category || 'Actor'}</p>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentPremiumUser.id) {
                    onNavigate('profile', currentPremiumUser.id);
                  }
                }}
                className="relative z-40 mt-3 flex items-center gap-1.5 text-sky-400 font-black text-xs tracking-wider uppercase group/btn hover:text-white transition-all cursor-pointer"
              >
                Browse profile
                <div className="w-4 h-4 rounded-full bg-sky-400/10 flex items-center justify-center group-hover/btn:bg-white group-hover/btn:text-nc-dark transition-all">
                    <Plus size={10} strokeWidth={3} />
                </div>
              </button>
            </div>
            
            {/* Vertical Accent Line */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-sky-400 rounded-r-full shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
          </motion.div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-nc-dark to-transparent z-10" />
      </section>



      {isLoading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 space-y-16">
          {/* ── Premium category skeletons ─────────────────────── */}
          <section className="pt-2 pb-8 lg:pt-4 lg:pb-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-[4px] h-6 bg-white/[0.06] rounded-sm" />
                <div className="flex items-center gap-3">
                  <div className="h-6 w-44 rounded-lg bg-white/[0.06] cat-skeleton-bone" />
                  <div className="h-4 w-14 rounded-md bg-white/[0.04] cat-skeleton-bone" />
                </div>
              </div>
              <CategorySkeleton />
            </div>
          </section>

          {/* ── Generic content skeletons below ────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse w-full h-48 bg-nc-card rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Featured Actors Showcase (Per Image Reference) */}
          {talents.filter(t => t.role?.includes('Actor')).length > 0 && (
            <section className="pt-10 pb-2 bg-nc-dark relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {/* Header Block */}
                <div className="flex items-center gap-3 mb-8 group/header">
                  <div className="w-[4px] h-6 bg-sky-400 rounded-sm shadow-[0_0_10px_rgba(56,189,248,0.2)]"></div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Actors/Actress</h2>
                    <span className="text-white text-lg font-medium opacity-80">&gt;</span>
                    <button 
                      onClick={() => onNavigate('listing', 'Actors')} 
                      className="text-sky-400 text-[15px] font-medium hover:text-white transition-all ml-1"
                    >
                      View all
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll Area */}
                <div className="relative group">
                  <div className="flex gap-12 sm:gap-20 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth">
                    {talents.filter(t => t.role?.includes('Actor'))
                    .slice(0, 10)
                    .map((actor) => (
                      <div 
                        key={actor.id} 
                        onClick={() => onNavigate('profile', actor.id)}
                        className="flex flex-col items-center gap-4 min-w-[130px] sm:min-w-[180px] cursor-pointer transition-all duration-300 hover:scale-105"
                      >
                        <Avatar 
                          user={actor}
                          size="lg"
                          name={actor.name}
                          className="w-28 h-28 sm:w-36 sm:h-36 border-none"
                        />
                        <div className="text-center">
                          <p className="text-white font-bold text-base sm:text-lg leading-tight">{actor.name}</p>
                          <p className="text-[#888] text-xs sm:text-sm mt-1 font-medium">
                            {actor.location || 'Nepal'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Categories */}
          <section className="pt-2 pb-8 lg:pt-4 lg:pb-12 bg-nc-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 mb-8 group/header">
            <div className="w-[4px] h-6 bg-sky-400 rounded-sm shadow-[0_0_10px_rgba(56,189,248,0.2)]"></div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">Browse by Category</h2>
              <span className="text-white text-lg font-medium opacity-80">&gt;</span>
              <button 
                onClick={() => setShowAllCategories(!showAllCategories)} 
                className="text-sky-400 text-[15px] font-medium hover:text-white transition-all ml-1"
              >
                {showAllCategories ? 'Show less' : 'View all'}
              </button>
            </div>
          </div>
          {/* ── Category cards with staggered reveal ────────── */}
          {categoriesReady ? (
            <div className="flex flex-wrap gap-3">
              {categories?.map((cat, idx) => (
                <button
                  key={cat.id}
                  onClick={() => onNavigate('listing', cat.name)}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className={`cat-card-reveal w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.57rem)] lg:w-[calc(12.5%-0.66rem)] bg-nc-card/50 backdrop-blur-sm border border-white/5 rounded-3xl p-5 flex-col items-center gap-3 hover:border-sky-400/40 hover:bg-sky-400/5 transition-all group relative overflow-hidden ${
                    idx >= 4 && !showAllCategories ? 'hidden sm:flex' : 'flex'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-400/0 to-sky-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 w-10 h-10 flex items-center justify-center text-sky-400 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                    <cat.icon size={28} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors relative z-10">{cat.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <CategorySkeleton />
          )}

          {/* CastingCall & Audition Update Strip */}
          {castingCalls.length > 0 && (
            <div className="mt-10 lg:mt-14">
              <div className="flex items-center gap-3 mb-8 group/header">
                <div className="w-[4px] h-6 bg-sky-400 rounded-sm shadow-[0_0_10px_rgba(56,189,248,0.2)]"></div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white tracking-tight">CastingCall & Audition update</h2>
                  <span className="text-white text-lg font-medium opacity-80">&gt;</span>
                  <button 
                    onClick={() => onNavigate('casting')} 
                    className="text-sky-400 text-[15px] font-medium hover:text-white transition-all ml-1"
                  >
                    View all
                  </button>
                </div>
              </div>
              
               <div 
                ref={scrollRef}
                className={`flex overflow-x-auto gap-4 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] pr-6 sm:pr-8 mx-[-1.5rem] sm:mx-0 px-6 sm:px-0 ${shouldScroll ? '' : 'justify-start sm:justify-center'}`}
              >
                {/* Only double the items if we actually need to loop to fill the screen */}
                {(castingCalls.length > 3 ? [...castingCalls, ...castingCalls] : castingCalls)
                ?.slice(0, 12)
                ?.map((item, i) => (
                  <div 
                    key={i} 
                    onClick={() => onNavigate('casting-detail', item.id)}
                    className="flex-shrink-0 w-[240px] sm:w-[280px] bg-[#0A0A0A] rounded-2xl flex items-center p-2.5 gap-4 border border-[#222] snap-start hover:border-[#333] hover:bg-[#111] transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-20 sm:w-16 sm:h-24 bg-nc-card overflow-hidden rounded-md shadow-md border border-[#222] group-hover:border-nc-accent/50 transition-colors">
                      {item.img ? <img src={item.img} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-nc-muted">LOGO</div>}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-white font-bold leading-tight truncate">{item.title}</h4>
                      <p className="text-[#888] text-xs mt-1 mb-2 line-clamp-2 leading-relaxed">{item.type}</p>
                      <button className="text-nc-accent text-[11px] font-bold uppercase tracking-wider hover:text-sky-300 self-start transition-colors hidden sm:block">View more</button>
                      <button className="text-nc-accent text-xs font-bold self-start sm:hidden">View more</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trending Talents */}
      {talents.length > 0 && (
        <section className="py-8 lg:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-3 mb-8 group/header">
              <div className="w-[4px] h-6 bg-sky-400 rounded-sm shadow-[0_0_10px_rgba(56,189,248,0.2)]"></div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white tracking-tight">Trending Now</h2>
                <span className="text-white text-lg font-medium opacity-80">&gt;</span>
                <button 
                  onClick={() => onNavigate('listing')} 
                  className="text-sky-400 text-[15px] font-medium hover:text-white transition-all ml-1"
                >
                  View all
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {talents.slice(0, 5).map((talent, idx) => (
                <div
                  key={talent.id}
                  onClick={() => onNavigate('profile', talent.id)}
                  className="bg-nc-card/30 hover:bg-nc-card/50 border border-white/5 rounded-3xl p-3 sm:p-4 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <Avatar 
                      user={talent}
                      size="md"
                      name={talent.name}
                    />

                    {/* Basic Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">{talent.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-nc-muted text-xs sm:text-sm truncate">
                        <span className="text-sky-400 font-medium truncate shrink-0">@{(talent.username || talent.name.toLowerCase().replace(/\s+/g, '')).replace(/^@/, '')}</span>
                        <span className="shrink-0">•</span>
                        <span className="capitalize truncate">{talent.location || 'Nepal'}</span>
                      </div>
                      <div className="mt-2 truncate">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-nc-muted uppercase tracking-wider group-hover:border-nc-accent/20 truncate max-w-full">
                          {talent.role?.split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Status */}
                  <div className="text-right flex flex-col items-end gap-1 px-2 shrink-0">
                    <span className="text-[10px] sm:text-xs font-black text-sky-400 tracking-widest uppercase animate-pulse">New</span>
                    <div className="mt-auto">
                      <p className="text-nc-muted text-[10px] sm:text-xs font-medium">
                        <span className="text-white font-bold">
                          {(talent.followers || 0) >= 1000 
                            ? `${((talent.followers || 0)/1000).toFixed(1).replace(/\.0$/, '')}K` 
                            : (talent.followers || 0)}
                        </span> followers
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}



        </>
      )}

      {/* CTA Section - Only show if not logged in */}
      {!isLoggedIn && (
        <section className="py-8 sm:py-12 lg:py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <GlassCard strong className="p-6 sm:p-12 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-nc-accent/10 rounded-full blur-3xl" />
              <div className="relative z-10 space-y-4 sm:space-y-6">
                <h2 className="text-3xl sm:text-4xl font-black text-white px-2">
                  Ready to Get Discovered?
                </h2>
                <p className="text-nc-secondary text-sm sm:text-lg max-w-xl mx-auto px-2">
                  Join 25,000+ talents on NC Network. Create your profile and start getting noticed by top productions today.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2">
                  <Button size="lg" className="w-full sm:w-auto" onClick={() => onNavigate('profile-create')}>Create Your Profile</Button>
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={() => onNavigate('listing')}>Browse Talent</Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>
      )}



    </div>
  );
}
