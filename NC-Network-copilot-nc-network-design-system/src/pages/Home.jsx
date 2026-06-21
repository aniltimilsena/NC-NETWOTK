import { useState, useEffect, useRef } from 'react';

import {
  Plus,
  Check,
  Play,
  ArrowRight
} from 'lucide-react';
import { CATEGORIES, getCategoryConfig } from '../constants/categories';
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
  onSnapshot,
  addDoc 
} from 'firebase/firestore';

// Category colors and icons are now sourced from src/config/categories.tsx

export default function Home({ onNavigate, user }) {
  const isLoggedIn = !!user;
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
  const [heroImageError, setHeroImageError] = useState(false);

  const [showRightArrow, setShowRightArrow] = useState(false);
  const actorsScrollRef = useRef(null);

  const checkScrollPosition = () => {
    const container = actorsScrollRef.current;
    if (!container) return;
    const canScrollRight = container.scrollWidth > container.clientWidth + container.scrollLeft + 10;
    setShowRightArrow(canScrollRight);
  };

  const scrollRight = (e) => {
    e.stopPropagation();
    const container = actorsScrollRef.current;
    if (!container) return;
    container.scrollBy({ left: 300, behavior: 'smooth' });
  };

  const getActorYear = (actor) => {
    if (actor.memberSince) return actor.memberSince;
    if (actor.joined) return actor.joined;
    if (actor.createdAt) {
      const date = actor.createdAt.toDate ? actor.createdAt.toDate() : new Date(actor.createdAt);
      if (date && !isNaN(date.getFullYear())) {
        return date.getFullYear();
      }
    }
    const hash = actor.id ? actor.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    return 2018 + (hash % 7);
  };

  useEffect(() => {
    const container = actorsScrollRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    const timeout = setTimeout(checkScrollPosition, 500);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      clearTimeout(timeout);
    };
  }, [talents]);



  const categories = CATEGORIES.map((catId, idx) => {
    const cfg = getCategoryConfig(catId);
    return {
      id: catId,
      name: cfg.label,
      icon: cfg.icon,
      color: cfg.color,
      bgColor: cfg.bgColor,
      count: talents.filter(t => t.role?.toLowerCase() === catId.toLowerCase() && !t.deactivated).length
    };
  });

  const premiumTalents = talents.filter(t => (t.premium || t.verified) && !t.deactivated);

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

        // Send notification
        try {
          await addDoc(collection(db, "notifications"), {
            userId: targetId,
            title: "New Follower",
            body: `${user.displayName || user.email || 'Someone'} started following you.`,
            type: "system",
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (nErr) {
          console.warn("Could not send follow notification in Home:", nErr);
        }
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

  // Get top 10 trending talents for hero rotation
  const trendingList = talents
    .filter(t => !t.deactivated)
    .sort((a, b) => {
      const followersA = a.followers || 0;
      const followersB = b.followers || 0;
      if (followersB !== followersA) return followersB - followersA;
      const ratingA = parseFloat(a.rating) || 0;
      const ratingB = parseFloat(b.rating) || 0;
      return ratingB - ratingA;
    })
    .slice(0, 10);

  useEffect(() => {
    if (trendingList.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentPremiumIdx(prev => {
        let next = Math.floor(Math.random() * trendingList.length);
        // Avoid repeating the same index if possible
        if (trendingList.length > 1) {
          while (next === prev) {
            next = Math.floor(Math.random() * trendingList.length);
          }
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [talents]);

  const currentPremiumUser = trendingList[currentPremiumIdx] || trendingList[0] || null;

  useEffect(() => {
    setHeroImageError(false);
  }, [currentPremiumUser?.id]);

  const isDefaultImage = (url) => {
    if (!url) return true;
    return url.includes('default-avatar.png') || 
           url.includes('default-male.png') || 
           url.includes('default-female.png') || 
           url.includes('achyut.png') ||
           url.startsWith('data:image/svg+xml');
  };

  const heroPhotoURL = currentPremiumUser?.photoURL || currentPremiumUser?.profileImage || currentPremiumUser?.image;
  const hasHeroPhoto = heroPhotoURL && !isDefaultImage(heroPhotoURL) && !heroImageError;

  return (
    <div className="min-h-screen bg-nc-dark">
      {/* Hero Section */}
      <section className="relative flex flex-col justify-start items-start overflow-hidden pt-16 pb-4 px-6 sm:px-8 lg:px-20">
        {/* Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/hero-bg.png"
            alt="Hero Background"
            className="w-full h-full object-cover animate-kenburns"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }} />
        </div>

        {/* Animated gradient orb for depth */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#FACC15]/8 via-sky-400/5 to-transparent rounded-full blur-3xl z-[1] animate-pulse" style={{ animationDuration: '6s' }} />

        <div className="relative z-10 max-w-4xl space-y-2">
          <h1 className="font-display italic font-bold text-[36px] text-[#00BFFF] hero-text-shadow leading-tight">
            Discover
          </h1>
          <h2 className="text-[18px] font-bold text-white hero-text-shadow">
            Multiple Talents in one place
          </h2>
        </div>

        {/* Profile Card */}
        {currentPremiumUser && (
          <motion.div 
            key={currentPremiumUser.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            onClick={() => currentPremiumUser.id && onNavigate('profile', currentPremiumUser.id)}
            className="relative z-30 cursor-pointer group mt-16 sm:mt-20"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'none',
              border: 'none',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              padding: 0,
              boxShadow: 'none',
              marginBottom: '12px'
            }}
          >
            {/* Tall portrait photo on LEFT */}
            {hasHeroPhoto ? (
              <img 
                src={heroPhotoURL} 
                alt={currentPremiumUser.name} 
                onError={() => setHeroImageError(true)}
                className="w-[70px] h-[110px] object-cover flex-shrink-0"
                style={{
                  borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.15)'
                }}
              />
            ) : (
              <div 
                className="w-[70px] h-[110px] flex-shrink-0 flex items-center justify-center bg-[#3a3a3a]"
                style={{
                  borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.15)'
                }}
              >
                <svg viewBox="0 0 100 100" fill="#888888" className="w-8 h-8">
                  <circle cx="50" cy="35" r="20"/>
                  <ellipse cx="50" cy="85" rx="35" ry="25"/>
                </svg>
              </div>
            )}

            <div className="flex flex-col justify-center min-w-0" style={{ gap: '4px' }}>
              <h3 
                className="font-bold text-white truncate" 
                style={{ 
                  fontSize: '16px', 
                  background: 'none',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  lineHeight: '1.2'
                }}
              >
                {currentPremiumUser.name}
              </h3>
              <p 
                className="capitalize truncate" 
                style={{ 
                  color: '#999', 
                  fontSize: '13px',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  lineHeight: '1.2'
                }}
              >
                {currentPremiumUser.category || currentPremiumUser.role || 'Actor'}
              </p>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentPremiumUser.id) {
                    onNavigate('profile', currentPremiumUser.id);
                  }
                }}
                className="hover:text-[#00BFFF]/80 transition-all cursor-pointer text-left"
                style={{
                  color: '#00BFFF',
                  fontSize: '13px',
                  lineHeight: '1.2',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontWeight: 'normal'
                }}
              >
                Browse profile &gt;
              </button>
            </div>
          </motion.div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-nc-dark to-transparent z-10" />
      </section>



      {isLoading ? (
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-20 py-14 space-y-12">
          {/* 1. Actors/Actress Horizontal Showcase Skeleton */}
          <section className="pt-2 pb-6">
            <div className="flex items-center mb-6">
              <div className="section-accent-bar"></div>
              <div className="h-7 skeleton w-48" />
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 scroll-smooth scrollbar-hide">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div 
                  key={idx} 
                  className="flex flex-col items-center w-[120px] min-w-[120px] flex-shrink-0"
                >
                  <div className="w-[90px] h-[90px] rounded-full skeleton" />
                  <div className="h-4 skeleton w-20 mt-3" />
                  <div className="h-3.5 skeleton w-24 mt-1.5" />
                </div>
              ))}
            </div>
          </section>

          {/* 2. Browse by Category Skeleton */}
          <section className="py-6">
            <div className="flex items-center mb-8">
              <div className="section-accent-bar"></div>
              <div className="h-7 skeleton w-56" />
            </div>
            <CategorySkeleton />
          </section>

          {/* 3. Trending Now Skeleton */}
          <section className="py-6">
            <div className="flex items-center mb-8">
              <div className="section-accent-bar"></div>
              <div className="h-7 skeleton w-40" />
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-[#111] border border-white/5 rounded-3xl p-4 sm:p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Rank Number Placeholder */}
                    <div className="w-8 h-8 rounded-lg skeleton shrink-0" />
                    {/* Avatar Placeholder */}
                    <div className="w-12 h-12 rounded-full skeleton shrink-0" />
                    {/* Basic Info Placeholder */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="h-4 skeleton w-1/3" />
                      <div className="h-3.5 skeleton w-1/2" />
                      <div className="h-5 skeleton w-20 mt-1" />
                    </div>
                  </div>
                  {/* Arrow Button Placeholder */}
                  <div className="w-8 h-8 rounded-full skeleton shrink-0" />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <>
          {/* Featured Actors Showcase */}
          {talents.filter(t => t.role?.toLowerCase().includes('actor') && !t.deactivated).length > 0 && (
            <section className="pt-2 pb-8 bg-nc-dark relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-20">
                {/* Editorial Header */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center">
                    <div className="section-accent-bar"></div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Actor & Actress</h2>
                  </div>
                  <button 
                    onClick={() => onNavigate('listing', 'actor')} 
                    className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm font-semibold transition-all mt-1"
                  >
                    View all
                  </button>
                </div>

                {/* Horizontal Scroll Area */}
                <div className="relative group">
                  <div 
                    ref={actorsScrollRef}
                    className="flex gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
                  >
                    {talents
                      .filter(t => t.role?.toLowerCase().includes('actor') && !t.deactivated)
                      .sort((a, b) => {
                        const followersA = a.followers || 0;
                        const followersB = b.followers || 0;
                        if (followersB !== followersA) {
                          return followersB - followersA;
                        }
                        const ratingA = parseFloat(a.rating) || 0;
                        const ratingB = parseFloat(b.rating) || 0;
                        return ratingB - ratingA;
                      })
                      .slice(0, 10)
                      .map((actor) => (
                        <div 
                          key={actor.id} 
                          onClick={() => onNavigate('profile', actor.id)}
                          className="flex flex-col items-center w-[120px] min-w-[120px] flex-shrink-0 cursor-pointer transition-all duration-300 hover:-translate-y-1 group/actor"
                        >
                          <Avatar 
                            src={actor.photoURL || actor.profileImage || actor.image}
                            size={90}
                            name={actor.name}
                            className="shadow-md"
                          />
                          <p className="text-white font-bold text-[13px] text-center mt-2 truncate w-full">{actor.name}</p>
                          <p className="text-nc-muted text-xs text-center mt-0.5 font-medium truncate w-full">
                            {actor.location || 'Nepal'} - Since {getActorYear(actor)}
                          </p>
                        </div>
                      ))}
                  </div>

                  {showRightArrow && (
                    <button 
                      onClick={scrollRight}
                      className="absolute right-0 top-[45px] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#12121A]/90 border border-white/10 flex items-center justify-center text-white font-black text-lg hover:bg-nc-accent hover:border-nc-accent transition-all shadow-xl shadow-black/40"
                    >
                      &gt;
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Categories */}
          <section className="pt-12 pb-10 lg:pt-16 lg:pb-14 bg-nc-dark">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-20">
            {/* Editorial Header */}
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center">
                <div className="section-accent-bar"></div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Browse by Category</h2>
              </div>
              <button 
                onClick={() => setShowAllCategories(!showAllCategories)} 
                className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm font-semibold transition-all mt-1"
              >
                {showAllCategories ? 'Show less' : 'View all'}
              </button>
            </div>
          {/* ── Category cards with staggered reveal ────────── */}
          {categoriesReady ? (
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {categories?.map((cat, idx) => {
                const categoryColor = cat.color;
                const CatIcon = cat.icon; // must be capitalized for JSX
                return (
                  <button
                    key={cat.id}
                    onClick={() => onNavigate('listing', cat.name)}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className={`cat-card-reveal category-card w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(25%-0.75rem)] p-4 flex-col items-center gap-2.5 group ${
                      idx >= 4 && !showAllCategories ? 'hidden sm:flex' : 'flex'
                    }`}
                  >
                    {/* Circular glow background container with accent color at 15% opacity */}
                    <div 
                      className="relative z-10 w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
                      style={{ 
                        backgroundColor: `${categoryColor}26`, 
                        color: categoryColor,
                        boxShadow: `0 0 15px ${categoryColor}15`
                      }}
                    >
                      <CatIcon size={32} strokeWidth={1.5} />
                    </div>
                    
                    <span className="text-xs sm:text-sm font-bold text-white/80 group-hover:text-white transition-colors relative z-10">{cat.name}</span>
                    
                    {/* Talent count or Be the first invite */}
                    {cat.count === 0 ? (
                      <span className="text-[10px] font-bold text-[#38BDF8] group-hover:text-cyan-400 transition-colors relative z-10">
                        Be the first →
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-nc-muted relative z-10">
                        {cat.count} {cat.count === 1 ? 'talent' : 'talents'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <CategorySkeleton />
          )}

          {/* CastingCall & Audition Update Strip */}
          {castingCalls.length > 0 && (
            <div className="mt-14 lg:mt-16">
                {/* Editorial Header */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center">
                    <div className="section-accent-bar"></div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Casting Calls & Auditions</h2>
                  </div>
                  <button 
                    onClick={() => onNavigate('casting')} 
                    className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm font-semibold transition-all mt-1"
                  >
                    View all
                  </button>
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
                      className="flex-shrink-0 w-[240px] sm:w-[280px] bg-nc-card rounded-3xl flex items-center p-3 gap-4 border border-transparent snap-start hover:brightness-110 transition-all duration-300 cursor-pointer group"
                    >
                    <div className="w-16 h-20 sm:w-16 sm:h-24 bg-nc-surface overflow-hidden rounded-xl shadow-md border border-white/[0.06] group-hover:border-nc-accent/30 transition-colors">
                      {item.img ? <img src={item.img} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-nc-muted">LOGO</div>}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="text-white font-bold leading-tight truncate text-sm">{item.title}</h4>
                      <p className="text-nc-muted text-xs mt-1 mb-2.5 line-clamp-2 leading-relaxed">{item.type}</p>
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
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-20">
            {/* Editorial Header */}
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center">
                <div className="section-accent-bar"></div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Trending Now</h2>
              </div>
              <button 
                onClick={() => onNavigate('listing')} 
                className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm font-semibold transition-all mt-1"
              >
                View all
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              {talents
                .filter(t => !t.deactivated)
                .slice()
                .sort((a, b) => {
                  const followersA = a.followers || 0;
                  const followersB = b.followers || 0;
                  if (followersB !== followersA) {
                    return followersB - followersA;
                  }
                  const ratingA = parseFloat(a.rating) || 0;
                  const ratingB = parseFloat(b.rating) || 0;
                  return ratingB - ratingA;
                })
                .slice(0, 5)
                .map((talent, idx) => (
                <div
                  key={talent.id}
                  onClick={() => onNavigate('profile', talent.id)}
                  className="bg-nc-card hover:brightness-110 border border-transparent rounded-3xl p-4 sm:p-5 transition-all duration-300 cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Rank Number */}
                    <span className="font-display text-2xl sm:text-3xl font-black text-white/10 group-hover:text-sky-400/30 transition-colors w-8 text-center shrink-0 select-none">
                      {idx + 1}
                    </span>
                    <Avatar 
                      user={talent}
                      size="md"
                      name={talent.name}
                    />

                    {/* Basic Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">{talent.name}</h3>
                        {talent.verified && (
                          <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-nc-muted text-xs sm:text-sm truncate">
                        <span className="text-sky-400 font-medium truncate shrink-0">@{(talent.username || talent.name.toLowerCase().replace(/\s+/g, '')).replace(/^@/, '')}</span>
                        <span className="shrink-0">•</span>
                        <span className="capitalize truncate">{talent.location || 'Nepal'}</span>
                      </div>
                      <div className="mt-2 truncate">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/[0.06] text-[10px] font-bold text-nc-muted uppercase tracking-wider group-hover:border-nc-accent/20 truncate max-w-full">
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
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-4xl mx-auto px-6">
            <GlassCard strong className="p-8 sm:p-14 relative overflow-hidden">
              <div className="absolute top-0 left-1/3 w-72 h-72 bg-nc-accent/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-[#FACC15]/8 rounded-full blur-3xl" />
              <div className="relative z-10 space-y-5 sm:space-y-7 text-center">
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white px-2 leading-tight">
                  Ready to Get Discovered?
                </h2>
                <p className="text-nc-secondary text-sm sm:text-lg max-w-xl mx-auto px-2 leading-relaxed">
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
