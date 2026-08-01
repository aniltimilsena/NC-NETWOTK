import { useState, useEffect, useRef } from 'react';
import { CATEGORIES, getCategoryConfig } from '../constants/categories';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import CategorySkeleton from '../components/ui/CategorySkeleton';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { getAvatar } from '../utils/avatars';
import { useTranslation } from 'react-i18next';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';
import { subscribeToTalents, subscribeToCastingCalls } from '../services';

export default function Home({ onNavigate, user }) {
  const { t } = useTranslation();
  const isLoggedIn = !!user;
  const [isLoading, setIsLoading] = useState(true);
  const [talentsReceived, setTalentsReceived] = useState(false);
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

  const getTalentAge = (talent) => {
    if (!talent) return null;
    if (talent.age) return talent.age;
    if (talent.dob || talent.dateOfBirth) {
      const dob = new Date(talent.dob || talent.dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      }
    }
    return null;
  };

  const getTalentRoleAndAge = (talent) => {
    if (!talent) return 'Actor';
    const role = talent.role?.split(',')[0] || talent.category || 'Actor';
    const age = getTalentAge(talent);
    return age ? `${role} (age-${age})` : role;
  };

  const formatTalentName = (name) => {
    if (!name) return 'Talent';
    if (name.length > 14) {
      return name.slice(0, 13) + '...';
    }
    return name;
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
      count: talents.filter(t => (t.role?.toLowerCase() === catId.toLowerCase() || t.category?.toLowerCase() === catId.toLowerCase()) && !t.deactivated).length
    };
  });

  useEffect(() => {
    let unsubUsers = () => { };
    let unsubCalls = () => { };

    const loaderTimeout = setTimeout(() => setIsLoading(false), 3000);

    try {
      unsubUsers = subscribeToTalents((data) => {
        if (Array.isArray(data)) {
          setTalents(data);
          setTalentsReceived(true);
        }
        setIsLoading(false);
      });

      unsubCalls = subscribeToCastingCalls('All', (data, error) => {
        if (error) {
          console.warn("Home query issue:", error);
        }
        if (data) setCastingCalls(data);
        setIsLoading(false);
      });
    } catch (err) {
      console.error("Critical subscription crash:", err);
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

  const activeTalentsList = talents
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

  const actorTalentsList = activeTalentsList.filter(t => {
    const roleStr = (t.role || t.category || '').toLowerCase();
    return !roleStr.includes('model');
  });

  const defaultTalent = {
    id: user?.uid || 'anil-timilsena',
    name: user?.displayName || user?.name || 'Anil Timilsena',
    role: user?.role || 'Model',
    category: user?.role || 'Model',
    photoURL: user?.photoURL || user?.profileImage || user?.image || null,
    coverImage: user?.coverImage || '/hero-bg.png'
  };

  const trendingList = activeTalentsList.length > 0 ? activeTalentsList : talents;
  const currentPremiumUser = trendingList[currentPremiumIdx] || (user ? { ...defaultTalent, ...user } : defaultTalent);

  useEffect(() => {
    if (trendingList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentPremiumIdx((prevIdx) => (prevIdx + 1) % trendingList.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [trendingList.length]);

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

  const heroPhotoURL = currentPremiumUser?.photoURL || currentPremiumUser?.profileImage || currentPremiumUser?.image || (user?.uid === currentPremiumUser?.id ? (user?.photoURL || user?.profileImage || user?.image) : null);
  const hasHeroPhoto = heroPhotoURL && !isDefaultImage(heroPhotoURL) && !heroImageError;

  return (
    <Desktop3ColumnLayout
      user={user}
      onNavigate={onNavigate}
      activeNav="discover"
      featuredTalents={talents}
      trendingCalls={castingCalls}
    >
      <div className="min-h-screen bg-[#070709] text-white">
        {/* Hero Section */}
        <section className="relative flex flex-col justify-end overflow-hidden min-h-[210px] sm:min-h-[360px] px-3 sm:px-6 pb-4 bg-[#091b29]">
          {/* Cover Background Image */}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#092238] to-[#070709]">
            <picture className="absolute inset-0 w-full h-full">
              <source srcSet="/hero-bg.webp" type="image/webp" />
              <img
                src="/hero-bg.png"
                alt="Hero Background"
                fetchpriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </picture>
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(7,7,9,0.95) 100%)' }}
            />
          </div>

          {/* Overlaid Inset Profile Card (Featured Talent Spotlight) */}
          {currentPremiumUser && (
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentPremiumUser?.id || currentPremiumIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="relative z-20 flex items-end gap-3.5 mt-12 sm:mt-16"
              >
                {/* Rectangular Portrait Photo with Blue Accent Line */}
                <div className="relative shrink-0 flex flex-col items-center overflow-hidden rounded-md shadow-2xl border border-white/10 bg-[#10151c]">
                  {hasHeroPhoto ? (
                    <img
                      src={heroPhotoURL}
                      alt={currentPremiumUser?.name || 'Featured Talent'}
                      onError={() => setHeroImageError(true)}
                      className="w-[120px] h-[165px] sm:w-[145px] sm:h-[195px] object-cover transition-all duration-300"
                    />
                  ) : (
                    <div className="w-[120px] h-[165px] sm:w-[145px] sm:h-[195px] bg-gradient-to-b from-[#1a2634] to-[#0a1017] flex items-center justify-center">
                      <Avatar user={currentPremiumUser} size="lg" name={currentPremiumUser?.name} />
                    </div>
                  )}
                  {/* Blue Accent Bar Under Photo */}
                  <div className="w-full h-1.5 bg-[#00BFFF]" />
                </div>

                {/* Talent Meta beside photo */}
                <div className="flex flex-col justify-end items-start gap-1 min-w-0 self-end h-[166px] sm:h-[196px] text-left">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate drop-shadow-lg text-left w-full">
                    {currentPremiumUser.name || 'Anil Timilsena'}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-200 font-medium capitalize drop-shadow-md truncate text-left w-full">
                    {currentPremiumUser.role || currentPremiumUser.category || 'Actor'}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('profile', currentPremiumUser.id)}
                    className="text-[#00BFFF] hover:underline text-sm sm:text-base font-semibold text-left transition-colors cursor-pointer block"
                  >
                    {t('home.viewProfile')}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </section>

        {/* Actor & Actress Section */}
        <section className="px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center">
              <div className="section-accent-bar" />
              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight leading-none">
                {t('home.actorSection')}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('listing')}
              className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm sm:text-base font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {t('btn_view_all')} &gt;
            </button>
          </div>

          {/* Horizontal Scrollable Circular Avatars */}
          <div
            ref={actorsScrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto pt-2 pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
          >
            {(!talentsReceived) ? (
              <div className="text-gray-400 text-sm py-4">{t('home.loadingTalents')}</div>
            ) : actorTalentsList.length > 0 ? (
              actorTalentsList.map((talent) => (
                <div
                  key={talent.id}
                  onClick={() => onNavigate('profile', talent.id)}
                  className="flex flex-col items-center shrink-0 w-[140px] sm:w-[170px] cursor-pointer group transition-transform duration-300 hover:scale-105"
                >
                  <Avatar
                    user={talent}
                    size="none"
                    name={talent.name}
                    className="w-[125px] h-[125px] sm:w-[155px] sm:h-[155px] rounded-full object-cover border-2 border-white/10 shadow-xl group-hover:border-[#00BFFF] transition-all"
                  />
                  <p className="text-white font-bold text-sm sm:text-base text-center mt-2.5 truncate w-full">
                    {formatTalentName(talent.name)}
                  </p>
                  <p className="text-[#00BFFF] text-xs sm:text-sm text-center font-semibold mt-0.5 truncate w-full">
                    {getTalentRoleAndAge(talent)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm py-4">{t('home.noTalentsFound')}</div>
            )}
          </div>
        </section>

        {/* Browse by Category Section */}
        <section className="px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center">
              <div className="section-accent-bar" />
              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight leading-none">
                {t('home.browseCategories')}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('listing')}
              className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm sm:text-base font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {t('btn_view_all')} &gt;
            </button>
          </div>

          {categoriesReady ? (
            <div className="grid grid-cols-2 gap-5 sm:gap-6">
              {categories.slice(0, 2).map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onNavigate('listing', cat.name)}
                    className="p-7 sm:p-9 lg:p-11 rounded-3xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all duration-300 flex flex-col items-center gap-4 sm:gap-5 group cursor-pointer shadow-xl hover:border-[#00BFFF]/30"
                  >
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                        boxShadow: `0 0 35px ${cat.color}15`,
                      }}
                    >
                      {CatIcon && <CatIcon className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14" strokeWidth={1.5} />}
                    </div>
                    <span className="text-lg sm:text-xl lg:text-2xl font-black text-white group-hover:text-[#00BFFF] transition-colors">
                      {t(`categories.${cat.id}`, { defaultValue: cat.name })}
                    </span>
                    <span className="text-sm sm:text-base text-gray-400 font-semibold">
                      {cat.count === 0 ? (
                        <span className="text-[#00BFFF] font-bold">{t('home.beTheFirst')}</span>
                      ) : (
                        `${cat.count} ${cat.count === 1 ? (t('follower') === 'पछ्याउने' ? 'कलाकार' : 'talent') : (t('follower') === 'पछ्याउने' ? 'कलाकारहरू' : 'talents')}`
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <CategorySkeleton />
          )}
        </section>

        {/* Casting Calls & Auditions Section */}
        {castingCalls.length > 0 && (
          <section className="px-3 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <div className="section-accent-bar" />
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight leading-none">
                  {t('home.castingCalls')}
                </h2>
              </div>
              <button
                onClick={() => onNavigate('casting')}
                className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm sm:text-base font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {t('btn_view_all')} &gt;
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex overflow-x-auto gap-4 pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
            >
              {castingCalls.slice(0, 10).map((item, i) => (
                <div
                  key={item.id || i}
                  onClick={() => onNavigate('casting-detail', item.id)}
                  className="flex-shrink-0 w-[240px] sm:w-[280px] bg-white/[0.03] hover:bg-white/[0.07] rounded-2xl flex items-center p-3 gap-3.5 border border-white/5 hover:border-[#00BFFF]/30 transition-all duration-300 cursor-pointer group shadow-lg"
                >
                  <div className="w-16 h-20 sm:w-18 sm:h-24 bg-white/5 overflow-hidden rounded-xl shrink-0 shadow-md border border-white/10 group-hover:border-[#00BFFF]/40 transition-colors">
                    <img src={item.thumbnail || '/movie-banner.png'} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="text-white font-bold leading-snug truncate text-xs sm:text-sm group-hover:text-[#00BFFF] transition-colors">{item.title}</h4>
                    <p className="text-gray-400 text-[11px] mt-0.5 mb-1.5 line-clamp-2 leading-relaxed">{item.type || 'Casting Call'}</p>
                    <span className="text-[#00BFFF] text-[11px] font-bold uppercase tracking-wider hover:underline">{t('view_details')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Now Section */}
        {activeTalentsList.length > 0 && (
          <section className="px-3 sm:px-6 py-4 pb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <div className="section-accent-bar" />
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight leading-none">
                  {t('trending_now')}
                </h2>
              </div>
              <button
                onClick={() => onNavigate('trending')}
                className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm sm:text-base font-semibold transition-all cursor-pointer"
              >
                {t('btn_view_all')} &gt;
              </button>
            </div>
            <div className="flex flex-col gap-3.5">
              {activeTalentsList
                .slice()
                .sort((a, b) => {
                  const followersA = a.followers || 0;
                  const followersB = b.followers || 0;
                  if (followersB !== followersA) return followersB - followersA;
                  const ratingA = parseFloat(a.rating) || 0;
                  const ratingB = parseFloat(b.rating) || 0;
                  return ratingB - ratingA;
                })
                .slice(0, 3)
                .map((talent, idx) => (
                  <div
                    key={talent.id}
                    onClick={() => onNavigate('profile', talent.id)}
                    className="group flex items-center justify-between py-4 px-2 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer gap-4 rounded-xl"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Rank Number */}
                      <span className="font-sans text-2xl sm:text-3xl font-black text-white/20 group-hover:text-[#00BFFF]/60 transition-colors w-8 text-center shrink-0 select-none">
                        {idx + 1}
                      </span>
                      <Avatar
                        user={talent}
                        size="none"
                        name={talent.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/10 group-hover:border-[#00BFFF]/40 transition-colors shadow-md"
                      />

                      {/* Basic Info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate group-hover:text-[#00BFFF] transition-colors">{talent.name}</h3>
                          {talent.verified && (
                            <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm truncate">
                          <span className="text-sky-400 font-semibold truncate shrink-0">@{(talent.username || talent.name.toLowerCase().replace(/\s+/g, '')).replace(/^@/, '')}</span>
                          <span className="shrink-0 text-gray-600">·</span>
                          <span className="capitalize truncate font-semibold text-gray-300">
                            {t(`categories.${(talent.role?.split(',')[0] || talent.category || '').toLowerCase()}`, { defaultValue: talent.role?.split(',')[0] || talent.category || 'Talent' })}
                          </span>
                          <span className="shrink-0 text-gray-600">·</span>
                          <span className="capitalize truncate">{talent.location || 'Nepal'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Status */}
                    <div className="text-right flex flex-col items-end gap-1 px-1 shrink-0 justify-center">
                      <div className="mt-0.5">
                        <p className="text-gray-400 text-xs sm:text-sm font-medium">
                          <span className="text-white font-bold text-sm sm:text-base">
                            {(talent.followers || 0) >= 1000
                              ? `${((talent.followers || 0) / 1000).toFixed(1).replace(/\.0$/, '')}K`
                              : (talent.followers || 0)}
                          </span> {((talent.followers || 0) === 1) ? t('follower') : t('followers')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </Desktop3ColumnLayout>
  );
}

