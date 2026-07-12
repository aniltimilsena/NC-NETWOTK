import { useState, useEffect, useRef } from 'react';



import { CATEGORIES, getCategoryConfig } from '../constants/categories';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import CategorySkeleton from '../components/ui/CategorySkeleton';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { subscribeToTalents } from '../services/users';
import { subscribeToCastingCalls } from '../services/casting';






export default function Home({ onNavigate, user }) {
  const isLoggedIn = !!user;
  const [showAllCategories, setShowAllCategories] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [currentPremiumIdx, setCurrentPremiumIdx] = useState(0);
  const [talents, setTalents] = useState([]);
  const [castingCalls, setCastingCalls] = useState([]);
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

  const getActorJoinStatus = (actor) => {
    let createdDate = null;
    if (actor.createdAt) {
      createdDate = actor.createdAt.toDate ? actor.createdAt.toDate() : new Date(actor.createdAt);
    } else if (actor.memberSince) {
      const year = parseInt(actor.memberSince);
      if (!isNaN(year)) createdDate = new Date(`${year}-01-01`);
    } else if (actor.joined) {
      const year = parseInt(actor.joined);
      if (!isNaN(year)) createdDate = new Date(`${year}-01-01`);
    }

    if (!createdDate) {
      createdDate = new Date('2026-07-01');
    }

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays <= 2) {
      return "New";
    }
    return `Since ${createdDate.getFullYear()}`;
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



  const categories = CATEGORIES.map((catId) => {
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

  useEffect(() => {
    let unsubUsers = () => { };
    let unsubCalls = () => { };


    const loaderTimeout = setTimeout(() => setIsLoading(false), 3000);

    try {
      unsubUsers = subscribeToTalents((data) => {
        setTalents(data);
        setIsLoading(false);
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


  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setCategoriesReady(true), 80);
      return () => clearTimeout(t);
    }
    setCategoriesReady(false);
  }, [isLoading]);



  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || castingCalls.length === 0) return;

    const checkScroll = () => {

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
        <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] bg-gradient-to-br from-[#FACC15]/8 via-sky-400/5 to-transparent rounded-full blur-3xl z-[1] animate-pulse" style={{ animationDuration: '6s' }} />

        <div className="relative z-10 max-w-4xl space-y-2 -ml-6 sm:-ml-8 lg:-ml-20">
          <h1 
            className="font-sans font-bold text-[36px] hero-text-shadow leading-tight"
            style={{ color: '#FACC15' }}
          >
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
            className="relative z-30 cursor-pointer group mt-12 sm:mt-20 self-start -ml-6 sm:-ml-8 lg:-ml-20"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
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
                className="w-[110px] h-[160px] sm:w-[140px] sm:h-[200px] object-cover flex-shrink-0"
                style={{
                  borderRadius: '0px',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.15)'
                }}
              />
            ) : (
              <div 
                className="w-[110px] h-[160px] sm:w-[140px] sm:h-[200px] flex-shrink-0 flex items-center justify-center bg-[#3a3a3a]"
                style={{
                  borderRadius: '0px',
                  boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.15)'
                }}
              >
                <svg viewBox="0 0 100 100" fill="#888888" className="w-12 h-12">
                  <circle cx="50" cy="35" r="20"/>
                  <ellipse cx="50" cy="85" rx="35" ry="25"/>
                </svg>
              </div>
            )}

            <div className="flex flex-col justify-center min-w-0" style={{ gap: '6px' }}>
              <h3 
                className="font-bold text-white truncate"
                style={{
                  fontSize: window.innerWidth < 640 ? '20px' : '23px',
                  background: 'none',
                  textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                  lineHeight: '1.2'
                }}
              >
                {currentPremiumUser.name}
              </h3>
              <p 
                className="capitalize truncate"
                style={{
                  color: '#aaa',
                  fontSize: window.innerWidth < 640 ? '15px' : '17px',
                  textShadow: '0 1px 4px rgba(0,0,0,0.85)',
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
                className="hover:text-[#00BFFF]/80 transition-all cursor-pointer text-left font-semibold"
                style={{
                  color: '#00BFFF',
                  fontSize: window.innerWidth < 640 ? '14px' : '16px',
                  lineHeight: '1.2',
                  background: 'none',
                  border: 'none',
                  padding: 0
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
            <div className="flex flex-col">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-5 border-b border-white/5 gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Rank Number Placeholder */}
                    <div className="w-8 h-8 rounded-lg skeleton shrink-0" />
                    {/* Avatar Placeholder */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full skeleton shrink-0" />
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
            <section className="pt-2 pb-0 bg-nc-dark relative overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-20">
                {/* Editorial Header */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center">
                    <div className="section-accent-bar"></div>
                    <h2 className="font-sans text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Actor & Actress</h2>
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
                          className="flex flex-col items-center w-[140px] min-w-[140px] flex-shrink-0 cursor-pointer transition-all duration-300 hover:-translate-y-1 group/actor"
                        >
                          <Avatar
                            user={actor}
                            size="none"
                            name={actor.name}
                            className="w-[110px] h-[110px] shadow-md border border-white/5"
                          />
                          <p className="text-white font-bold text-[13px] text-center mt-2 truncate w-full">{actor.name}</p>
                          <p className="text-nc-muted text-xs text-center mt-0.5 font-medium truncate w-full flex items-center justify-center gap-1">
                            <span>{actor.location || 'Nepal'}</span>
                            <span>•</span>
                            {getActorJoinStatus(actor) === 'New' ? (
                              <span className="px-1.5 py-0.5 rounded-md text-[7px] bg-[#00BFFF]/10 border border-[#00BFFF]/25 text-[#00BFFF] font-extrabold uppercase tracking-wide animate-pulse shrink-0">New</span>
                            ) : (
                              <span>{getActorJoinStatus(actor)}</span>
                            )}
                          </p>
                        </div>
                      ))}
                  </div>

                  {showRightArrow && (
                    <button
                      onClick={scrollRight}
                      className="absolute right-0 top-[55px] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#12121A]/90 border border-white/10 flex items-center justify-center text-white font-black text-lg hover:bg-nc-accent hover:border-nc-accent transition-all shadow-xl shadow-black/40"
                    >
                      &gt;
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Categories */}
          <section className="pt-2 pb-10 lg:pt-2 lg:pb-14 bg-nc-dark">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-20">
              {/* Editorial Header */}
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center">
                  <div className="section-accent-bar"></div>
                  <h2 className="font-sans text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Browse by Category</h2>
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
                    const CatIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => onNavigate('listing', cat.name)}
                        style={{ animationDelay: `${idx * 40}ms` }}
                        className={`cat-card-reveal category-card w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(25%-0.75rem)] p-5 sm:p-6 flex flex-col items-center gap-3 sm:gap-4 group ${idx >= 4 && !showAllCategories ? 'hidden sm:flex' : 'flex'
                          }`}
                      >
                        {/* Circular glow background container with accent color at 15% opacity */}
                        <div
                          className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
                          style={{
                            backgroundColor: `${categoryColor}26`,
                            color: categoryColor,
                            boxShadow: `0 0 15px ${categoryColor}15`
                          }}
                        >
                          <CatIcon size={38} className="w-[38px] h-[38px] sm:w-[44px] sm:h-[44px]" strokeWidth={1.5} />
                        </div>

                        <span className="text-base sm:text-lg font-extrabold text-white/90 group-hover:text-white transition-colors relative z-10">{cat.name}</span>

                        {/* Talent count or Be the first invite */}
                        {cat.count === 0 ? (
                          <span className="text-xs sm:text-sm font-bold text-[#38BDF8] group-hover:text-cyan-400 transition-colors relative z-10">
                            Be the first →
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm font-semibold text-nc-muted relative z-10">
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
                <div className="mt-6 lg:mt-8">
                  {/* Editorial Header */}
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center">
                      <div className="section-accent-bar"></div>
                      <h2 className="font-sans text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Casting Calls & Auditions</h2>
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
                            <img src={item.thumbnail || '/movie-banner.png'} alt={item.title} className="w-full h-full object-cover" />
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
            <section className="pt-2 pb-8 lg:pt-2 lg:pb-10">
              <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-20">
                {/* Editorial Header */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center">
                    <div className="section-accent-bar"></div>
                    <h2 className="font-sans text-2xl sm:text-3xl font-bold text-white tracking-tight leading-none">Trending Now</h2>
                  </div>
                  <button
                    onClick={() => onNavigate('trending')}
                    className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm font-semibold transition-all mt-1"
                  >
                    View all
                  </button>
                </div>
                <div className="flex flex-col">
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
                    .slice(0, 3)
                    .map((talent, idx) => (
                      <div
                        key={talent.id}
                        onClick={() => onNavigate('profile', talent.id)}
                        className="group flex items-center justify-between py-5 border-b border-white/5 hover:border-white/10 active:bg-white/[0.01] transition-all duration-300 cursor-pointer text-left gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {/* Rank Number */}
                          <span className="font-sans text-2xl sm:text-3xl font-black text-white/10 group-hover:text-sky-400/30 transition-colors w-8 text-center shrink-0 select-none">
                            {idx + 1}
                          </span>
                          <Avatar
                            user={talent}
                            size="none"
                            name={talent.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 border-white/5"
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
                        <div className="text-right flex flex-col items-end gap-1 px-2 shrink-0 justify-center">
                          <span className="px-1.5 py-0.5 rounded-md text-[7px] bg-[#00BFFF]/10 border border-[#00BFFF]/25 text-[#00BFFF] font-extrabold uppercase tracking-wide animate-pulse shrink-0">New</span>
                          <div className="mt-auto">
                            <p className="text-nc-muted text-[10px] sm:text-xs font-medium">
                              <span className="text-white font-bold">
                                {(talent.followers || 0) >= 1000
                                  ? `${((talent.followers || 0) / 1000).toFixed(1).replace(/\.0$/, '')}K`
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
        <section className="pt-2 pb-12 sm:pt-2 sm:pb-16 lg:pt-2 lg:pb-20">
          <div className="max-w-4xl mx-auto px-6">
            <GlassCard strong className="p-8 sm:p-14 relative overflow-hidden">
              <div className="absolute top-0 left-1/3 w-72 h-72 bg-nc-accent/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-[#FACC15]/8 rounded-full blur-3xl" />
              <div className="relative z-10 space-y-5 sm:space-y-7 text-center">
                <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold text-white px-2 leading-tight">
                  Ready to Get Discovered?
                </h2>
                <p className="text-nc-secondary text-sm sm:text-lg max-w-xl mx-auto px-2 leading-relaxed">
                  Join 25,000+ talents on NepalCasts. Create your profile and start getting noticed by top productions today.
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
