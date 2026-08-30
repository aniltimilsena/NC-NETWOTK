import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../components/ui/Avatar';
import { useTranslation } from 'react-i18next';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';
import { subscribeToTalents, subscribeToCastingCalls } from '../services';
import { matchesCategory } from '../constants/categories';
import { subscribeToProfile } from '../features/profile/services/profile';
import { AvatarScrollSkeleton } from '../components/ui/Skeleton';
import { Megaphone, Tag, ExternalLink, Flame, Clapperboard, LayoutGrid, ChevronRight, Crown, Sprout } from 'lucide-react';

const HOME_SPONSORED_ADS = [
  {
    id: 'home-demo-ad-1',
    badge: 'SPONSORED',
    discount: '20% OFF',
    title: 'Kathmandu Acting & Directing Masterclass',
    subtitle: 'Learn directly from National Award Directors in Lalitpur',
    ctaText: 'Explore Now',
    ctaUrl: '/casting',
    image: '/assets/ads/masterclass_promo.png',
  },
  {
    id: 'home-demo-ad-2',
    badge: 'EXCLUSIVE',
    discount: 'FEATURED',
    title: 'Upcoming Nepali Feature Film Auditions',
    subtitle: 'Now casting lead and supporting roles across Nepal',
    ctaText: 'View Calls',
    ctaUrl: '/casting',
    image: '/hero-bg.png',
  }
];

const HERO_BACKGROUND_PHOTOS = [
  '/hero-bg.png',
  '/hero-stage.jpg',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=1920&q=80',
];

function getInitials(name) {
  if (!name) return 'NC';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isMockOrInvalidImage(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  if (
    url.includes('hero-talent') ||
    url.includes('default-avatar') ||
    url.includes('default-male') ||
    url.includes('default-female') ||
    url.includes('achyut') ||
    url.startsWith('data:image/svg+xml')
  ) {
    return true;
  }
  return false;
}

function getCastingThumbnail(call) {
  if (!call) return null;
  const raw =
    call.thumbnail ||
    call.image ||
    call.coverImage ||
    call.posterUrl ||
    call.poster ||
    call.bannerUrl ||
    call.media?.[0]?.url ||
    call.photoURL ||
    null;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (
    trimmed === '' ||
    trimmed === 'has-file' ||
    trimmed.includes('default-') ||
    trimmed.includes('placeholder')
  ) {
    return null;
  }
  return trimmed;
}

import { HOME_CATEGORY_CARDS, CategoryCardIcon } from '../components/ui/CategoryCards';

export default function Home({ onNavigate, user }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [talentsReceived, setTalentsReceived] = useState(false);
  const [currentSpotlightIdx, setCurrentSpotlightIdx] = useState(0);
  const [talents, setTalents] = useState([]);
  const [castingCalls, setCastingCalls] = useState([]);
  const [heroImageIdx, setHeroImageIdx] = useState(0);

  const actorsScrollRef = useRef(null);

  // Rotate 5 hero background photos smoothly every 4 seconds
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setHeroImageIdx((prev) => (prev + 1) % HERO_BACKGROUND_PHOTOS.length);
    }, 4000);
    return () => clearInterval(heroTimer);
  }, []);

  const getTalentAge = (talent) => {
    if (!talent) return null;
    if (talent.age) {
      const parsed = parseInt(talent.age, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 120) return parsed;
    }
    const rawDob = talent.dob || talent.dateOfBirth || talent.birthDate || talent.birthYear || talent.birthday;
    if (rawDob) {
      if (typeof rawDob === 'number' && rawDob > 1900 && rawDob < new Date().getFullYear()) {
        return new Date().getFullYear() - rawDob;
      }
      const dob = new Date(rawDob);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age > 0 && age < 120) return age;
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

  const getTalentFollowersCount = (talent) => {
    if (!talent) return 0;
    const raw = talent.followersCount ?? talent.followerCount ?? (Array.isArray(talent.followers) ? talent.followers.length : talent.followers);
    const num = typeof raw === 'number' ? raw : parseInt(raw, 10);
    return !isNaN(num) && num > 0 ? num : 0;
  };

  const formatTalentLocation = (talent) => {
    if (!talent) return null;
    const rawLoc = (talent.location || talent.city || talent.district || talent.address || '').trim();
    const rawCity = (talent.city || talent.district || '').trim();

    if (!rawLoc && !rawCity) return null;

    if (rawLoc) {
      if (/nepal/i.test(rawLoc)) {
        const parts = rawLoc.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          const cityPart = parts.find(p => !/nepal/i.test(p));
          return cityPart ? `Nepal, ${cityPart}` : 'Nepal';
        }
        if (rawCity && !/nepal/i.test(rawCity)) {
          return `Nepal, ${rawCity}`;
        }
        return 'Nepal';
      }
      return `Nepal, ${rawLoc}`;
    }

    if (rawCity) {
      return /nepal/i.test(rawCity) ? rawCity : `Nepal, ${rawCity}`;
    }

    return null;
  };

  const formatTalentName = (name) => {
    if (!name) return 'Talent';
    if (name.length > 13) {
      return name.slice(0, 12) + '...';
    }
    return name;
  };

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

  const featuredTalentsList = activeTalentsList.filter(t => t.featured === true);
  const displayFeaturedList = featuredTalentsList.length > 0 ? featuredTalentsList : activeTalentsList;

  const getTalentCreatedTime = (talent) => {
    if (!talent) return 0;
    const val = talent.createdAt || talent.created_at || talent.joinedAt || talent.updatedAt;
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val?.toMillis === 'function') return val.toMillis();
    if (typeof val?.toDate === 'function') return val.toDate().getTime();
    if (val.seconds) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  // New Born Talents: Strictly sorted by newest account creation date/time (Top 5)
  const newBornTalents = [...activeTalentsList]
    .sort((a, b) => getTalentCreatedTime(b) - getTalentCreatedTime(a))
    .slice(0, 5);

  // Trending Talents: Sorted by followers count or views
  const trendingTalents = [...activeTalentsList]
    .sort((a, b) => {
      const scoreA = getTalentFollowersCount(a) * 2 + (a.views || 0);
      const scoreB = getTalentFollowersCount(b) * 2 + (b.views || 0);
      return scoreB - scoreA;
    })
    .slice(0, 5);

  // Active Casting Calls: Filter out closed calls
  const activeCastingCalls = castingCalls
    .filter(c => c.status !== 'closed' && (c.title || c.project || c.roleName))
    .slice(0, 3);

  // Spotlight user rotation for overlaid rectangular portrait card
  const [spotlightProfile, setSpotlightProfile] = useState(null);
  const [spotlightImageError, setSpotlightImageError] = useState(false);

  const currentSpotlightUser = displayFeaturedList[currentSpotlightIdx] || activeTalentsList[0];
  const spotlightUserId = currentSpotlightUser?.id || currentSpotlightUser?.uid;

  useEffect(() => {
    if (displayFeaturedList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSpotlightIdx((prevIdx) => (prevIdx + 1) % displayFeaturedList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayFeaturedList.length]);

  useEffect(() => {
    setSpotlightImageError(false);
    if (!spotlightUserId) {
      setSpotlightProfile(null);
      return;
    }
    const unsub = subscribeToProfile(spotlightUserId, (data) => {
      setSpotlightProfile(data);
    });
    return () => unsub();
  }, [spotlightUserId]);

  const rawPhoto =
    spotlightProfile?.image ||
    spotlightProfile?.photoURL ||
    spotlightProfile?.profileImage ||
    spotlightProfile?.avatar ||
    currentSpotlightUser?.image ||
    currentSpotlightUser?.photoURL ||
    currentSpotlightUser?.profileImage ||
    currentSpotlightUser?.avatar ||
    null;

  const hasRealPhoto = Boolean(rawPhoto && !isMockOrInvalidImage(rawPhoto) && !spotlightImageError);

  const spotlightName =
    spotlightProfile?.name ||
    spotlightProfile?.fullName ||
    currentSpotlightUser?.name ||
    'Featured Talent';

  const spotlightRole =
    spotlightProfile?.role?.split(',')[0] ||
    spotlightProfile?.category ||
    currentSpotlightUser?.role?.split(',')[0] ||
    currentSpotlightUser?.category ||
    'Actor';

  const spotlightAge = getTalentAge(spotlightProfile || currentSpotlightUser);
  const spotlightInitials = getInitials(spotlightName);

  const getCategoryCount = (filter) => {
    return talents.filter(t => matchesCategory(t, filter)).length;
  };

  return (
    <Desktop3ColumnLayout
      user={user}
      onNavigate={onNavigate}
      activeNav="discover"
      featuredTalents={displayFeaturedList}
      trendingCalls={castingCalls}
      loading={!talentsReceived}
    >
      <div className="min-h-screen bg-[#141414] text-white pt-0 pb-6 font-sans selection:bg-blue-600 selection:text-white">
        {/* ================= HERO SECTION (Compact, flush with top navbar) ================= */}
        <section className="relative w-full h-[190px] sm:h-[220px] lg:h-[250px] overflow-hidden bg-black select-none rounded-none rounded-b-2xl border-b border-white/5 m-0 p-0">
          {/* 5 Smoothly Rotating Background Images (Every 4s) */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <AnimatePresence>
              <motion.img
                key={heroImageIdx}
                src={HERO_BACKGROUND_PHOTOS[heroImageIdx]}
                alt="NepalCasts Hero"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="w-full h-full object-cover object-bottom sm:object-center absolute inset-0 m-0 p-0"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/50 to-transparent pointer-events-none" />
          </div>

          {/* Subtle Slide Indicators */}
          <div className="absolute top-2.5 right-3 sm:top-3 sm:right-4 z-20 flex items-center gap-1.5 pointer-events-none">
            {HERO_BACKGROUND_PHOTOS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1 rounded-full transition-all duration-500 ${idx === heroImageIdx
                  ? 'w-4 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                  : 'w-1.5 bg-white/30'
                  }`}
              />
            ))}
          </div>

          {/* Right Side Middle Slogan */}
          <div className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-6 lg:right-8 z-20 pointer-events-none text-right">
            <h1 className="font-apple text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              <span className="font-script font-normal text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] block text-white tracking-normal -mb-1 sm:-mb-2">
                Discover
              </span>
              <span className="font-bold text-2xl sm:text-3xl lg:text-4xl xl:text-[42px] leading-[1.08] tracking-tight block">
                Multiple Talents<br />
                In One Place
              </span>
            </h1>
          </div>

          {/* Overlaid Inset Rectangular Spotlight Card (Bottom Left) */}
          {currentSpotlightUser && (
            <div className="absolute bottom-2.5 sm:bottom-3.5 left-3 sm:left-4 z-20 flex items-end">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSpotlightUser?.id || currentSpotlightIdx}
                  initial={{ opacity: 0, x: -12, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 12, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex items-end gap-2.5 sm:gap-3 cursor-pointer group"
                  onClick={() => {
                    if (currentSpotlightUser?.id) {
                      onNavigate('profile', currentSpotlightUser.id);
                    } else {
                      onNavigate('listing');
                    }
                  }}
                >
                  {/* Diagonal Curved Portrait Photo Card */}
                  <div className="relative shrink-0 w-[95px] h-[130px] sm:w-[115px] sm:h-[155px] flex flex-col items-center justify-center overflow-hidden rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm shadow-[0_10px_30px_rgba(0,0,0,0.9)] border border-white/20 bg-gradient-to-b from-[#1c2333] to-[#0d121c] group-hover:border-white/40 transition-all">
                    {hasRealPhoto ? (
                      <img
                        src={rawPhoto}
                        alt={spotlightName}
                        onError={() => setSpotlightImageError(true)}
                        className="w-full h-full object-cover rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e283d] via-[#141b2a] to-[#0a0e17] p-1.5 text-center select-none rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-1 text-white font-black text-base sm:text-lg tracking-tight shadow-inner">
                          {spotlightInitials}
                        </div>
                        <span className="font-apple text-[10px] sm:text-xs font-normal text-slate-300 uppercase tracking-wider truncate w-full px-1">
                          {spotlightRole}
                        </span>
                      </div>
                    )}
                    {/* Blue Accent Bar Under Photo */}
                    <div className="w-full h-1.5 bg-[#1d61f2] shrink-0" />
                  </div>

                  {/* Talent Meta beside photo */}
                  <div className="flex flex-col justify-end items-start gap-0.5 min-w-0 pb-0.5 text-left font-apple">
                    <h2 className="text-sm sm:text-lg font-bold text-white leading-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-[140px] sm:max-w-[200px] tracking-tight">
                      {spotlightName}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-300 font-normal capitalize drop-shadow-md truncate tracking-normal">
                      {spotlightRole} {spotlightAge ? `(${spotlightAge})` : ''}
                    </p>
                    <span className="text-[#38bdf8] group-hover:text-cyan-300 text-[11px] sm:text-xs font-medium flex items-center gap-1 transition-colors">
                      View profile &gt;
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Lower Cards Container */}
        <div className="px-1 sm:px-1.5 space-y-1.5">

          {/* ================= SPONSORED ADS SECTION ================= */}
          <section className="px-1 sm:px-2">
            <div className="flex gap-2 sm:gap-2.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              {HOME_SPONSORED_ADS.map((ad) => (
                <div
                  key={ad.id}
                  onClick={() => ad.ctaUrl && onNavigate(ad.ctaUrl.replace('/', ''))}
                  className="flex-1 min-w-[260px] sm:min-w-[320px] relative group overflow-hidden rounded-lg border border-white/5 p-3.5 sm:p-4 bg-black flex flex-col justify-between cursor-pointer hover:border-white/20 transition-all duration-300 min-h-[135px] sm:min-h-[155px] shadow-lg"
                >
                  {/* Background image */}
                  {ad.image && (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={ad.image}
                        alt={ad.title}
                        className="w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/60" />
                    </div>
                  )}

                  {/* Glowing subtle accent */}
                  <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all z-0" />

                  {/* Content */}
                  <div className="relative z-10 space-y-1.5 sm:space-y-2 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-cyan-300 font-extrabold px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] tracking-wider uppercase border border-white/10 backdrop-blur-md">
                        <Megaphone className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
                        {ad.badge}
                      </span>
                      {ad.discount && (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] tracking-wider uppercase shadow-sm">
                          <Tag className="w-2.5 h-2.5 fill-black text-black" />
                          {ad.discount}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight leading-snug group-hover:text-cyan-200 transition-colors line-clamp-2 drop-shadow">
                      {ad.title}
                    </h3>

                    {ad.subtitle && (
                      <p className="text-gray-300 text-[10px] sm:text-xs line-clamp-1 leading-normal drop-shadow">
                        {ad.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 pt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-600 group-hover:from-cyan-400 group-hover:to-blue-500 text-black font-extrabold px-3 py-1 rounded-lg text-[10px] sm:text-xs transition-all shadow-md shadow-cyan-500/20">
                      <span>{ad.ctaText}</span>
                      <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ================= FEATURED TALENTS SECTION ================= */}
          <section className="bg-black rounded-lg border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black border border-[#0071e3] text-[#2997ff] font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase shadow-sm">
                <Crown className="w-3.5 h-3.5 text-[#2997ff] fill-[#2997ff]/20" />
                Featured talents
              </span>
              <button
                onClick={() => onNavigate('listing')}
                className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-all group cursor-pointer"
              >
                <span>View all talents</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Horizontal Scroll Carousel */}
            <div
              ref={actorsScrollRef}
              className="flex gap-1.5 sm:gap-2.5 overflow-x-auto pt-0.5 pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
            >
              {!talentsReceived ? (
                <AvatarScrollSkeleton count={4} />
              ) : displayFeaturedList.length > 0 ? (
                displayFeaturedList.map((talent) => (
                  <div
                    key={talent.id}
                    onClick={() => onNavigate('profile', talent.id)}
                    className="flex flex-col items-center shrink-0 w-[calc((100vw-36px)/2.5)] sm:w-36 cursor-pointer group"
                  >
                    <Avatar
                      userId={talent.id || talent.uid}
                      user={talent}
                      size="none"
                      name={talent.name}
                      className="w-[calc((100vw-44px)/2.5)] h-[calc((100vw-44px)/2.5)] sm:w-36 sm:h-36 rounded-full object-cover shadow-lg transition-all duration-300 group-hover:scale-105"
                    />
                    <p className="font-apple text-white font-bold text-xs sm:text-sm text-center mt-2.5 truncate w-full px-0.5 tracking-tight group-hover:text-cyan-300 transition-colors">
                      {formatTalentName(talent.name)}
                    </p>
                    <p className="font-apple text-slate-300 font-normal text-[11px] sm:text-xs text-center mt-0.5 truncate w-full px-0.5 tracking-normal">
                      {getTalentRoleAndAge(talent)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-xs py-4">No talents found</div>
              )}
            </div>
          </section>

          {/* ================= TALENTS BY CATEGORY SECTION ================= */}
          <section className="bg-black rounded-lg border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black border border-[#0071e3] text-[#2997ff] font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase shadow-sm">
                <LayoutGrid className="w-3.5 h-3.5 text-[#2997ff]" />
                Talents by category
              </span>
              <button
                onClick={() => onNavigate('discover')}
                className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-all group cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* 3-Column Grid showing the top 3 Category Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {HOME_CATEGORY_CARDS.slice(0, 3).map((cat) => {
                const count = getCategoryCount(cat.filter);
                return (
                  <motion.div
                    key={cat.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate('talents', cat.filter)}
                    style={{ backgroundColor: cat.bgColor }}
                    className="rounded-xl p-3 sm:p-4 aspect-square w-full h-full flex flex-col items-center justify-between text-center cursor-pointer shadow transition-transform border border-black/5"
                  >
                    <div className="flex-1 flex items-center justify-center min-h-0 w-full pt-0.5">
                      <CategoryCardIcon type={cat.iconType} className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 text-black fill-current" />
                    </div>
                    <div className="w-full flex flex-col items-center justify-center shrink-0">
                      <div className="min-h-[2rem] sm:min-h-[2.3rem] flex items-center justify-center w-full">
                        <span className="text-black font-extrabold text-xs sm:text-sm leading-tight whitespace-pre-line text-center">
                          {cat.label}
                        </span>
                      </div>
                      <span className="text-black/70 font-medium text-[10px] sm:text-xs mt-0.5">
                        ({count} {count === 1 ? 'talent' : 'talents'})
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* ================= NEW BORN TALENTS SECTION ================= */}
          <section className="bg-black rounded-lg border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black border border-[#0071e3] text-[#2997ff] font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase shadow-sm">
                <Sprout className="w-3.5 h-3.5 text-[#2997ff]" />
                New born talents
              </span>
              <button
                onClick={() => onNavigate('listing')}
                className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-all group cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Ranked Card List Container */}
            <div className="space-y-2.5 pt-1">
              {!talentsReceived ? (
                [1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="flex items-center gap-3 sm:gap-4 py-1">
                    <span className="text-xl sm:text-2xl font-black text-white w-5 text-center shrink-0">
                      {num}
                    </span>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 shrink-0 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="w-full h-2.5 bg-white/10 rounded-full animate-pulse" />
                      <div className="w-3/4 h-2 bg-white/10 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))
              ) : newBornTalents.length > 0 ? (
                newBornTalents.slice(0, 5).map((talent, idx) => (
                  <div
                    key={talent.id || idx}
                    onClick={() => onNavigate('profile', talent.id)}
                    className="flex items-center gap-3 sm:gap-4 py-1 cursor-pointer group"
                  >
                    {/* Rank Number */}
                    <span className="text-xl sm:text-2xl font-black text-white w-5 text-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Circular Avatar */}
                    <Avatar
                      userId={talent.id}
                      user={talent}
                      size="none"
                      name={talent.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shrink-0"
                    />

                    {/* Metadata Lines & Talent Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm sm:text-base font-bold text-white truncate group-hover:text-[#38bdf8] transition-colors">
                          {talent.name}
                        </p>
                        <span className="text-xs text-[#1d61f2] font-semibold shrink-0">
                          {getTalentRoleAndAge(talent)}
                        </span>
                      </div>

                      {/* Username & Location */}
                      <p className="text-xs text-gray-400 truncate">
                        @{talent.username || talent.name?.toLowerCase().replace(/\s+/g, '')}
                      </p>
                      {formatTalentLocation(talent) && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {formatTalentLocation(talent)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-xs py-4 text-center">No talents found</div>
              )}
            </div>
          </section>

          {/* ================= CASTING CALLS SECTION ================= */}
          <section className="my-1.5 px-2 sm:px-3 text-white">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black border border-[#0071e3] text-[#2997ff] font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase shadow-sm">
                <Clapperboard className="w-3.5 h-3.5 text-[#2997ff]" />
                Casting calls
              </span>
              <button
                onClick={() => onNavigate('casting')}
                className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-all group cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              {activeCastingCalls.length > 0 ? (
                activeCastingCalls.slice(0, 3).map((call) => {
                  const thumbnail = getCastingThumbnail(call);
                  return (
                    <div
                      key={call.id}
                      onClick={() => onNavigate('casting-detail', call.id)}
                      className="p-3 bg-[#141416] hover:bg-[#1c1c20] transition-all rounded-xl border border-white/5 flex items-center justify-between gap-3.5 sm:gap-4 cursor-pointer group shadow-md"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-xl overflow-hidden bg-[#18181c] border border-white/10 shrink-0 flex items-center justify-center shadow-md">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={call.title || 'Casting'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-xl"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-thumb');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Default Clapperboard Thumbnail Fallback */}
                        <div
                          className="default-clapper-thumb w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c20] to-[#121214] p-2 text-center"
                          style={{ display: thumbnail ? 'none' : 'flex' }}
                        >
                          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/70 fill-current drop-shadow-sm" viewBox="0 0 24 24">
                            <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
                          </svg>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-200">
                            {call.type || call.category || 'Audition'}
                          </span>
                          {call.deadline && (
                            <span className="text-[10px] font-medium text-amber-400">
                              • Deadline: {new Date(call.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                          {call.title || call.project || 'Untitled Casting Call'}
                        </h4>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1 font-medium">
                          <span>{call.company || call.director || 'Production'}</span>
                          <span>•</span>
                          <span>{call.location || 'Nepal'}</span>
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[#1d61f2] group-hover:text-cyan-300 transition-colors flex items-center gap-0.5">
                        Apply &gt;
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-5 bg-[#141416] rounded-xl border border-white/5">
                  <p className="text-gray-400 text-xs mb-2">No active casting calls at the moment</p>
                  <button
                    onClick={() => onNavigate('casting-create')}
                    className="text-xs bg-[#1d61f2] hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-md transition-colors shadow-sm"
                  >
                    + Post a Casting Call
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ================= TRENDING TALENTS SECTION ================= */}
          <section className="bg-black rounded-lg border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black border border-[#0071e3] text-[#2997ff] font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase shadow-sm">
                <Flame className="w-3.5 h-3.5 text-[#2997ff] fill-[#2997ff]/30" />
                Trending talents
              </span>
              <button
                onClick={() => onNavigate('trending')}
                className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-all group cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Ranked Trending List Container */}
            <div className="space-y-2.5 pt-1">
              {!talentsReceived ? (
                [1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="flex items-center gap-3 sm:gap-4 py-1">
                    <span className="text-xl sm:text-2xl font-black text-white w-5 text-center shrink-0">
                      {num}
                    </span>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 shrink-0 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="w-full h-2.5 bg-white/10 rounded-full animate-pulse" />
                      <div className="w-3/4 h-2 bg-white/10 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))
              ) : trendingTalents.length > 0 ? (
                trendingTalents.slice(0, 5).map((talent, idx) => (
                  <div
                    key={talent.id || idx}
                    onClick={() => onNavigate('profile', talent.id)}
                    className="flex items-center gap-3 sm:gap-4 py-1 cursor-pointer group"
                  >
                    {/* Rank Number with podium colors */}
                    <span className={`text-xl sm:text-2xl font-black w-5 text-center shrink-0 ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-white'}`}>
                      {idx + 1}
                    </span>

                    {/* Circular Avatar */}
                    <Avatar
                      userId={talent.id}
                      user={talent}
                      size="none"
                      name={talent.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shrink-0"
                    />

                    {/* Metadata Lines & Talent Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm sm:text-base font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {talent.name}
                        </p>
                        <span className="text-xs text-[#1d61f2] font-semibold shrink-0">
                          {getTalentRoleAndAge(talent)}
                        </span>
                      </div>

                      {/* Username & Location / Followers */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <p className="truncate">
                          @{talent.username || talent.name?.toLowerCase().replace(/\s+/g, '')}
                        </p>
                        <span className="text-gray-400 font-medium text-[11px] shrink-0">
                          {getTalentFollowersCount(talent)} {getTalentFollowersCount(talent) === 1 ? 'follower' : 'followers'}
                        </span>
                      </div>
                      {formatTalentLocation(talent) && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {formatTalentLocation(talent)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-xs py-4 text-center">No trending talents found</div>
              )}
            </div>
          </section>

          {/* ================= OUR GOALS SECTION ================= */}
          <section className="my-2 mb-4 px-3 sm:px-4 text-white">
            <h3 className="text-base sm:text-lg font-black text-white tracking-wide mb-3 text-center">
              Our goals
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl mx-auto font-medium">
              <li className="flex items-start gap-2.5">
                <span className="text-[#1d61f2] font-black text-base leading-none mt-0.5">•</span>
                <span>Connect Nepal&apos;s finest actors, directors, writers, and film technicians with leading casting agencies.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#1d61f2] font-black text-base leading-none mt-0.5">•</span>
                <span>Provide a unified platform for talent discovery and casting opportunities across Nepal.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#1d61f2] font-black text-base leading-none mt-0.5">•</span>
                <span>Empower emerging artists by giving them visibility to global production houses.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#1d61f2] font-black text-base leading-none mt-0.5">•</span>
                <span>Simplify the casting process for producers, directors, and agencies.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#1d61f2] font-black text-base leading-none mt-0.5">•</span>
                <span>Build a strong community that supports and grows Nepal&apos;s entertainment industry.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Desktop3ColumnLayout>
  );
}
