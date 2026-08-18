import { useState, useEffect, useRef } from 'react';
import { CATEGORIES, getCategoryConfig, matchesCategory } from '../constants/categories';
import { motion, AnimatePresence } from 'framer-motion';
import CategorySkeleton from '../components/ui/CategorySkeleton';
import Avatar from '../components/ui/Avatar';
import { useTranslation } from 'react-i18next';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';
import { subscribeToTalents, subscribeToCastingCalls } from '../services';
import { SpotlightHeroSkeleton, AvatarScrollSkeleton, TrendingListSkeleton } from '../components/ui/Skeleton';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Home({ onNavigate, user }) {
  const { t } = useTranslation();
  const isLoggedIn = !!user;
  const [isLoading, setIsLoading] = useState(true);
  const [talentsReceived, setTalentsReceived] = useState(false);
  const [currentSpotlightIdx, setCurrentSpotlightIdx] = useState(0);
  const [talents, setTalents] = useState([]);
  const [castingCalls, setCastingCalls] = useState([]);
  const scrollRef = useRef(null);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);
  const [spotlightProfile, setSpotlightProfile] = useState(null);

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
      count: talents.filter(t => matchesCategory(t, catId)).length
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

  const [isCastingHovered, setIsCastingHovered] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || castingCalls.length <= 1) return;

    let animationId;
    const speed = 0.5;

    const animate = () => {
      if (!isCastingHovered && container) {
        const maxScroll = container.scrollWidth - container.offsetWidth;
        if (maxScroll > 0) {
          let currentScroll = container.scrollLeft + speed;
          if (currentScroll >= maxScroll - 1) {
            currentScroll = 0;
          }
          container.scrollLeft = currentScroll;
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [castingCalls.length, isCastingHovered]);

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
    id: user?.uid || 'user_default_id_nepalcasts',
    name: user?.displayName || user?.name || 'Anil Timilsena',
    role: user?.role || 'Model',
    category: user?.role || 'Model',
    photoURL: user?.photoURL || user?.profileImage || user?.image || null,
    coverImage: user?.coverImage || '/hero-bg.png'
  };

  const featuredOnlyList = activeTalentsList.filter(t => t.featured === true);
  const trendingList = (featuredOnlyList.length > 0 ? featuredOnlyList : activeTalentsList).slice(0, 50);
  const currentSpotlightUser = trendingList[currentSpotlightIdx] || activeTalentsList[0] || (user ? { ...defaultTalent, ...user } : defaultTalent);

  useEffect(() => {
    if (trendingList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSpotlightIdx((prevIdx) => (prevIdx + 1) % trendingList.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [trendingList.length]);

  useEffect(() => {
    setHeroImageError(false);
  }, [currentSpotlightUser?.id]);

  const spotlightUserId = currentSpotlightUser?.id || currentSpotlightUser?.uid;

  useEffect(() => {
    if (!spotlightUserId) {
      setSpotlightProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'profiles', spotlightUserId), (docSnap) => {
      if (docSnap.exists()) {
        setSpotlightProfile({ id: docSnap.id, uid: docSnap.id, ...docSnap.data() });
      } else {
        setSpotlightProfile(null);
      }
    }, (_err) => {
      setSpotlightProfile(null);
    });
    return () => unsub();
  }, [spotlightUserId]);

  const isDefaultImage = (url) => {
    if (!url) return true;
    return url.includes('default-avatar.png') ||
      url.includes('default-male.png') ||
      url.includes('default-female.png') ||
      url.startsWith('data:image/svg+xml');
  };

  // Resolve hero photo from the live spotlightProfile, then fall back to the spotlight user's fields, then user image
  const heroPhotoURL =
    spotlightProfile?.image ||
    spotlightProfile?.photoURL ||
    spotlightProfile?.profileImage ||
    currentSpotlightUser?.image ||
    currentSpotlightUser?.photoURL ||
    currentSpotlightUser?.profileImage ||
    currentSpotlightUser?.avatar ||
    currentSpotlightUser?.picture ||
    currentSpotlightUser?.photo ||
    user?.photoURL ||
    user?.profileImage ||
    user?.image ||
    null;
  const hasHeroPhoto = heroPhotoURL && !isDefaultImage(heroPhotoURL) && !heroImageError;

  const spotlightName =
    spotlightProfile?.name ||
    spotlightProfile?.fullName ||
    [spotlightProfile?.firstName, spotlightProfile?.lastName].filter(Boolean).join(' ') ||
    currentSpotlightUser?.name ||
    'Talent Member';

  const spotlightRole =
    spotlightProfile?.role ||
    spotlightProfile?.category ||
    currentSpotlightUser?.role ||
    currentSpotlightUser?.category ||
    'Actor';

  const heroCoverURL =
    spotlightProfile?.coverImage ||
    currentSpotlightUser?.coverImage ||
    '/hero-bg.webp';

  return (
    <Desktop3ColumnLayout
      user={user}
      onNavigate={onNavigate}
      activeNav="discover"
      featuredTalents={trendingList}
      trendingCalls={castingCalls}
      loading={!talentsReceived}
    >
      <div className="min-h-screen bg-[#070709] text-white">
        {/* Hero Section */}
        <section className="relative flex flex-col justify-end overflow-hidden min-h-[210px] sm:min-h-[360px] px-3 sm:px-6 pb-4 bg-[#070709]">
          {/* Cover Background Image (Ultra-Smooth Crossfade) */}
          <div className="absolute inset-0 z-0 bg-[#0A0A0F] overflow-hidden">
            <AnimatePresence mode="popLayout">
              <motion.img
                key={heroCoverURL}
                src={heroCoverURL}
                alt="Hero Cover"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 0.85, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.85, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="w-full h-full object-cover object-center absolute inset-0"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/30 to-transparent pointer-events-none z-10" />
          </div>

          {/* Overlaid Inset Profile Card (Featured Talent Spotlight - Horizontal Scrolling Slide) */}
          {(!talentsReceived) ? (
            <SpotlightHeroSkeleton />
          ) : currentSpotlightUser && (
            <div className="relative z-20 mt-12 sm:mt-16 py-1 min-h-[170px] sm:min-h-[200px] flex items-end overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentSpotlightUser?.id || currentSpotlightIdx}
                  initial={{ opacity: 0, x: 65, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -65, scale: 0.97 }}
                  transition={{ duration: 0.55, ease: [0.25, 1, 0.5, 1] }}
                  className="flex items-end gap-4 w-full"
                >
                  {/* Rectangular Portrait Photo Card */}
                  <div className="relative shrink-0 flex flex-col items-center overflow-hidden rounded-lg shadow-[0_10px_35px_rgba(0,0,0,0.6)] border border-white/10 bg-[#10151c]">
                    {hasHeroPhoto ? (
                      <img
                        src={heroPhotoURL}
                        alt={currentSpotlightUser?.name || 'Featured Talent'}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          if (parent) {
                            const placeholder = parent.querySelector('.placeholder-svg-container');
                            if (placeholder) placeholder.style.display = 'flex';
                          }
                        }}
                        className="w-[120px] h-[165px] sm:w-[145px] sm:h-[195px] object-cover transition-all duration-300"
                      />
                    ) : null}

                    {/* Fallback Placeholder (shown when hasHeroPhoto is false or image fails to load) */}
                    <div
                      className="placeholder-svg-container w-[120px] h-[165px] sm:w-[145px] sm:h-[195px] bg-gradient-to-b from-[#1a2634] to-[#0a1017] flex items-center justify-center"
                      style={{ display: hasHeroPhoto ? 'none' : 'flex' }}
                    >
                      <svg viewBox="0 0 100 100" fill="#5A5A75" className="w-12 h-12">
                        <circle cx="50" cy="35" r="20"/>
                        <ellipse cx="50" cy="85" rx="35" ry="25"/>
                      </svg>
                    </div>

                    {/* Blue Accent Bar Under Photo */}
                    <div className="w-full h-1.5 bg-[#00BFFF]" />
                  </div>

                  {/* Talent Meta beside photo */}
                  <div className="flex flex-col justify-end items-start gap-1 min-w-0 self-end h-[166px] sm:h-[196px] text-left pb-0.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight truncate drop-shadow-lg text-left w-full">
                      {spotlightName}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-200 font-normal capitalize drop-shadow-md truncate text-left w-full">
                      {spotlightRole}
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('profile', currentSpotlightUser.id)}
                      className="text-[#00BFFF] hover:underline text-sm sm:text-base font-normal text-left transition-colors cursor-pointer block mt-0.5"
                    >
                      {t('home.viewProfile')}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
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
              className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm sm:text-base font-normal flex items-center gap-1 transition-colors cursor-pointer"
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
              <AvatarScrollSkeleton count={5} />
            ) : actorTalentsList.length > 0 ? (
              actorTalentsList.map((talent) => (
                <div
                  key={talent.id}
                  onClick={() => onNavigate('profile', talent.id)}
                  className="flex flex-col items-center shrink-0 w-[140px] sm:w-[170px] cursor-pointer group transition-transform duration-300 hover:scale-105"
                >
                  <Avatar
                    userId={talent.id || talent.uid}
                    user={talent}
                    size="none"
                    name={talent.name}
                    className="w-[125px] h-[125px] sm:w-[155px] sm:h-[155px] rounded-full object-cover border-2 border-white/10 shadow-xl group-hover:border-white/20 transition-all"
                  />
                  <p className="text-white font-bold text-sm sm:text-base text-center mt-2.5 truncate w-full">
                    {formatTalentName(talent.name)}
                  </p>
                  <p className="text-[#00BFFF] text-xs sm:text-sm text-center font-normal mt-0.5 truncate w-full">
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
              className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm sm:text-base font-normal flex items-center gap-1 transition-colors cursor-pointer"
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
                    className="p-7 sm:p-9 lg:p-11 rounded-3xl bg-white/[0.03] border border-white/5 flex flex-col items-center gap-4 sm:gap-5 cursor-pointer shadow-xl"
                  >
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                        boxShadow: `0 0 35px ${cat.color}15`,
                      }}
                    >
                      {CatIcon && <CatIcon className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14" strokeWidth={1.5} />}
                    </div>
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                      {t(`categories.${cat.id}`, { defaultValue: cat.name })}
                    </span>
                    <span className="text-sm sm:text-base text-gray-400 font-normal">
                      {cat.count === 0 ? (
                        <span className="text-[#00BFFF] font-normal">{t('home.beTheFirst')}</span>
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
                className="text-[#00BFFF] text-sm sm:text-base font-normal flex items-center gap-1 cursor-pointer"
              >
                {t('btn_view_all')} &gt;
              </button>
            </div>

            <div
              ref={scrollRef}
              onMouseEnter={() => setIsCastingHovered(true)}
              onMouseLeave={() => setIsCastingHovered(false)}
              onTouchStart={() => setIsCastingHovered(true)}
              onTouchEnd={() => setIsCastingHovered(false)}
              className="flex overflow-x-auto gap-4 pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
              {castingCalls.slice(0, 10).map((item, i) => (
                <div
                  key={item.id || i}
                  onClick={() => onNavigate('casting-detail', item.id)}
                  className="relative flex-shrink-0 w-[220px] sm:w-[260px] h-[150px] sm:h-[170px] rounded-2xl overflow-hidden border border-white/10 cursor-pointer shadow-xl flex flex-col justify-end p-4 bg-[#111]"
                >
                  <img
                    src={(item.thumbnail && item.thumbnail !== 'has-file') ? item.thumbnail : '/movie-banner.png'}
                    alt={item.title || 'Casting Call'}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/movie-banner.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/75 to-transparent" />

                  <div className="relative z-10 space-y-1 text-left">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#00BFFF]/20 text-[#00BFFF] border border-[#00BFFF]/30 text-[9px] font-normal uppercase tracking-wider mb-0.5">
                      {item.type || 'Casting Call'}
                    </span>
                    <h4 className="text-white font-normal text-sm sm:text-base leading-tight truncate drop-shadow-md">
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[#00BFFF] text-[10px] font-normal tracking-wide flex items-center gap-1">
                        {t('view_details')} &gt;
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trending Now Section */}
        <section className="px-3 sm:px-6 py-4 pb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center">
              <div className="section-accent-bar" />
              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight leading-none">
                {t('trending_now')}
              </h2>
            </div>
            {talentsReceived && activeTalentsList.length > 0 && (
              <button
                onClick={() => onNavigate('trending')}
                className="text-[#00BFFF] hover:text-[#00BFFF]/80 text-sm sm:text-base font-normal transition-all cursor-pointer"
              >
                {t('btn_view_all')} &gt;
              </button>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {(!talentsReceived) ? (
              <TrendingListSkeleton count={3} />
            ) : activeTalentsList.length > 0 ? (
              activeTalentsList
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
                    className="group flex items-center justify-between py-1.5 px-2 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer gap-4 rounded-xl"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Rank Number */}
                      <span className="font-sans text-2xl sm:text-3xl font-normal text-white/20 group-hover:text-[#00BFFF]/60 transition-colors w-8 text-center shrink-0 select-none">
                        {idx + 1}
                      </span>
                      <Avatar
                        user={talent}
                        size="none"
                        name={talent.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/10 group-hover:border-white/20 transition-colors shadow-md"
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
                          <span className="text-sky-400 font-normal truncate shrink-0">@{(talent.username || talent.name.toLowerCase().replace(/\s+/g, '')).replace(/^@/, '')}</span>
                          <span className="shrink-0 text-gray-600">·</span>
                          <span className="capitalize truncate font-normal text-gray-300">
                            {t(`categories.${(talent.role?.split(',')[0] || talent.category || '').toLowerCase()}`, { defaultValue: talent.role?.split(',')[0] || talent.category || 'Talent' })}
                          </span>
                          <span className="shrink-0 text-gray-600">·</span>
                          <span className="capitalize truncate font-normal">{talent.location || 'Nepal'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Status */}
                    <div className="text-right flex flex-col items-end gap-1 px-1 shrink-0 justify-center">
                      <div className="mt-0.5">
                        <p className="text-gray-400 text-xs sm:text-sm font-normal">
                          <span className="text-white font-normal text-sm sm:text-base">
                            {(talent.followers || 0) >= 1000
                              ? `${((talent.followers || 0) / 1000).toFixed(1).replace(/\.0$/, '')}K`
                              : (talent.followers || 0)}
                          </span> {((talent.followers || 0) === 1) ? t('follower') : t('followers')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-gray-400 text-sm py-4">{t('home.noTalentsFound')}</div>
            )}
          </div>
        </section>
      </div>
    </Desktop3ColumnLayout>
  );
}

