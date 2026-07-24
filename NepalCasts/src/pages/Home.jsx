import { useState, useEffect, useRef } from 'react';
import { CATEGORIES, getCategoryConfig } from '../constants/categories';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import CategorySkeleton from '../components/ui/CategorySkeleton';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { AdBanner } from '../components/ui/AdBanner';
import { subscribeToTalents, subscribeToCastingCalls } from '../services';

export default function Home({ onNavigate, user }) {
  const isLoggedIn = !!user;
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
    container.scrollBy({ left: 320, behavior: 'smooth' });
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

    setIsLoading(true);

    unsubUsers = subscribeToTalents((data) => {
      setTalents(data || []);
      setIsLoading(false);
      setCategoriesReady(true);
    });

    unsubCalls = subscribeToCastingCalls((data) => {
      setCastingCalls(data || []);
    });

    return () => {
      unsubUsers();
      unsubCalls();
    };
  }, []);

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
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Desktop Hero Section */}
      <section className="relative overflow-hidden py-12 lg:py-16 px-4 sm:px-8 lg:px-12 max-w-[1720px] mx-auto">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-500/10 via-sky-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-nc-accent/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-center">
          {/* Left Widescreen Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#facc15]" />
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                NEPALCASTS CINEMA & TALENT NETWORK
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white font-sans">
              Discover & Book <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-sky-400 bg-clip-text text-transparent">
                Nepal's Top Talent.
              </span>
            </h1>

            <p className="text-gray-400 text-base sm:text-xl font-medium max-w-2xl leading-relaxed">
              Connect directly with verified actors, directors, models, cinematographers, and production teams across Pokhara, Kathmandu, and nationwide.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onNavigate('listing')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-nc-accent to-sky-500 text-black font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-xl shadow-nc-accent/25 active:scale-95 cursor-pointer"
              >
                Browse Talent Directory →
              </button>

              <button
                onClick={() => onNavigate('casting')}
                className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/15 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              >
                Explore Casting Calls
              </button>
            </div>
          </div>

          {/* Right Spotlight Card */}
          {currentPremiumUser && (
            <div className="lg:col-span-5">
              <motion.div
                key={currentPremiumUser.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                onClick={() => onNavigate('profile', currentPremiumUser.id)}
                className="studio-card studio-card-gold p-6 rounded-3xl cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center gap-6">
                  {hasHeroPhoto ? (
                    <img 
                      src={heroPhotoURL} 
                      alt={currentPremiumUser.name} 
                      onError={() => setHeroImageError(true)}
                      className="w-28 h-36 sm:w-32 sm:h-40 object-cover rounded-2xl border-2 border-amber-500/30 group-hover:scale-105 transition-transform duration-500 shrink-0 shadow-2xl"
                    />
                  ) : (
                    <div className="w-28 h-36 sm:w-32 sm:h-40 rounded-2xl bg-gradient-to-b from-[#1E1E26] to-[#111116] border border-white/10 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" fill="#5A5A75" className="w-14 h-14">
                        <circle cx="50" cy="35" r="20"/>
                        <ellipse cx="50" cy="85" rx="35" ry="25"/>
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0 text-left space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                      ★ Featured Spotlight
                    </div>

                    <h3 className="text-2xl font-black text-white truncate group-hover:text-amber-300 transition-colors">
                      {currentPremiumUser.name}
                    </h3>

                    <p className="text-sm font-semibold text-gray-400 capitalize truncate">
                      {currentPremiumUser.category || currentPremiumUser.role || 'Actor'}
                    </p>

                    <p className="text-xs text-nc-accent font-bold">
                      {currentPremiumUser.location || 'Nepal'} • {currentPremiumUser.followers || 0} Followers
                    </p>

                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 group-hover:translate-x-1 transition-transform">
                        View Full Studio Profile →
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 space-y-16 pb-20">
        {/* Featured Actors Grid Showcase */}
        {talents.filter(t => t.role?.toLowerCase().includes('actor') && !t.deactivated).length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Actors & Actresses</h2>
                <p className="text-xs text-gray-400 font-semibold mt-1">Leading film & theater talent ready for casting</p>
              </div>
              <button
                onClick={() => onNavigate('listing', 'actor')}
                className="text-nc-accent hover:text-sky-300 text-xs font-black uppercase tracking-wider transition-all"
              >
                View All Actors →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {talents
                .filter(t => t.role?.toLowerCase().includes('actor') && !t.deactivated)
                .slice(0, 10)
                .map((actor) => (
                  <motion.div
                    key={actor.id}
                    whileHover={{ y: -6 }}
                    onClick={() => onNavigate('profile', actor.id)}
                    className="studio-card p-4 rounded-2xl cursor-pointer text-center group space-y-3"
                  >
                    <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28">
                      <Avatar
                        user={actor}
                        size="none"
                        name={actor.name}
                        className="w-full h-full border-2 border-white/10 group-hover:border-nc-accent transition-colors shadow-xl"
                      />
                    </div>

                    <div>
                      <h4 className="text-white font-bold text-sm truncate group-hover:text-nc-accent transition-colors">{actor.name}</h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{actor.location || 'Nepal'}</p>
                    </div>

                    <span className="inline-block px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                      {getActorJoinStatus(actor)}
                    </span>
                  </motion.div>
                ))}
            </div>
          </section>
        )}

        {/* Categories Bento Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Explore Categories</h2>
              <p className="text-xs text-gray-400 font-semibold mt-1">Discover specialized cinema professionals</p>
            </div>
            <button
              onClick={() => onNavigate('listing')}
              className="text-nc-accent hover:text-sky-300 text-xs font-black uppercase tracking-wider transition-all"
            >
              All Categories →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories?.slice(0, 8).map((cat) => {
              const CatIcon = cat.icon;
              return (
                <motion.button
                  key={cat.id}
                  whileHover={{ y: -4 }}
                  onClick={() => onNavigate('listing', cat.name)}
                  className="studio-card p-6 rounded-2xl flex flex-col items-start gap-4 text-left group cursor-pointer"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                    style={{
                      backgroundColor: `${cat.color}20`,
                      color: cat.color,
                      border: `1px solid ${cat.color}40`,
                    }}
                  >
                    <CatIcon className="w-6 h-6" strokeWidth={1.75} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-nc-accent transition-colors">{cat.name}</h3>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">
                      {cat.count === 0 ? 'Be the first talent' : `${cat.count} verified talents`}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Open Casting Calls Feed */}
        {castingCalls.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Open Casting Calls</h2>
                <p className="text-xs text-gray-400 font-semibold mt-1">Live audition opportunities from verified studios</p>
              </div>
              <button
                onClick={() => onNavigate('casting')}
                className="text-nc-accent hover:text-sky-300 text-xs font-black uppercase tracking-wider transition-all"
              >
                View Casting Board →
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {castingCalls.slice(0, 6).map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  onClick={() => onNavigate('casting-detail', item.id)}
                  className="studio-card p-5 rounded-2xl flex items-center gap-4 cursor-pointer group"
                >
                  <div className="w-20 h-24 rounded-xl bg-nc-surface overflow-hidden border border-white/10 shrink-0 shadow-lg">
                    <img src={item.thumbnail || '/movie-banner.png'} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-[10px] font-black text-sky-400 uppercase tracking-wider">
                      {item.type || 'Feature Film'}
                    </span>
                    <h4 className="text-white font-bold text-base truncate group-hover:text-nc-accent transition-colors">{item.title}</h4>
                    <p className="text-xs text-gray-400 truncate">{item.location || 'Kathmandu, Nepal'}</p>
                    <span className="text-xs font-bold text-nc-accent inline-block pt-1">View Project Details →</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
