import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../components/ui/Avatar';
import { useTranslation } from 'react-i18next';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';
import { subscribeToTalents, subscribeToCastingCalls } from '../services';
import { matchesCategory } from '../constants/categories';
import { subscribeToProfile } from '../features/profile/services/profile';
import { AvatarScrollSkeleton } from '../components/ui/Skeleton';
import PullToRefresh from '../components/ui/PullToRefresh';
import { ChevronRight, Pin } from 'lucide-react';
import { getOptimizedImageUrl, getImageSrcSet } from '../utils/media';

/* eslint-disable no-secrets/no-secrets */
const HERO_BACKGROUND_PHOTOS = [
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1920&q=80',
];
/* eslint-enable no-secrets/no-secrets */

function getInitials(name) {
  if (!name) return 'NC';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isMockOrInvalidImage(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  const lower = url.toLowerCase();
  if (
    lower.includes('hero-talent') ||
    lower.includes('default-avatar') ||
    lower.includes('default-male') ||
    lower.includes('default-female') ||
    lower.includes('achyut') ||
    lower.includes('img.clerk.com') ||
    lower.includes('clerk.dev') ||
    lower.startsWith('data:image/svg+xml')
  ) {
    return true;
  }
  return false;
}

function getCastingThumbnail(call) {
  if (!call) return null;
  const raw =
    call.verticalPoster ||
    call.thumbnail ||
    call.posterUrl ||
    call.poster ||
    call.image ||
    call.coverImage ||
    call.horizontalThumbnail ||
    call.bannerUrl ||
    call.bannerImage ||
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
    const directAge =
      talent.age ||
      talent.attributes?.age ||
      talent.specs?.age ||
      talent.physicalSpecs?.age ||
      talent.physicalAttributes?.age ||
      talent.personalDetails?.age ||
      talent.personalInfo?.age ||
      talent.details?.age ||
      talent.profile?.age ||
      talent.user?.age;

    if (directAge !== undefined && directAge !== null && directAge !== '') {
      if (typeof directAge === 'number' && directAge > 0 && directAge < 120) return directAge;
      const match = String(directAge).match(/\d+/);
      if (match) {
        const parsed = parseInt(match[0], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 120) return parsed;
      }
    }

    const rawDob =
      talent.dob ||
      talent.dateOfBirth ||
      talent.birthDate ||
      talent.birth_date ||
      talent.birthdate ||
      talent.birthYear ||
      talent.birth_year ||
      talent.birthday ||
      talent.birthDay ||
      talent.yearOfBirth ||
      talent.attributes?.dob ||
      talent.attributes?.dateOfBirth ||
      talent.attributes?.birthDate ||
      talent.attributes?.birthYear ||
      talent.specs?.dob ||
      talent.specs?.dateOfBirth ||
      talent.specs?.birthYear ||
      talent.physicalSpecs?.dob ||
      talent.physicalSpecs?.dateOfBirth ||
      talent.physicalSpecs?.birthYear ||
      talent.physicalAttributes?.dob ||
      talent.physicalAttributes?.dateOfBirth ||
      talent.physicalAttributes?.birthYear ||
      talent.personalDetails?.dob ||
      talent.personalDetails?.dateOfBirth ||
      talent.personalDetails?.birthYear ||
      talent.personalInfo?.dob ||
      talent.personalInfo?.dateOfBirth ||
      talent.details?.dob ||
      talent.details?.dateOfBirth ||
      talent.profile?.dob ||
      talent.profile?.dateOfBirth ||
      talent.user?.dob ||
      talent.user?.dateOfBirth;

    if (rawDob !== undefined && rawDob !== null && rawDob !== '') {
      const currentYear = new Date().getFullYear();
      if (typeof rawDob === 'number') {
        if (rawDob > 1900 && rawDob <= currentYear) {
          return currentYear - rawDob;
        }
        if (rawDob > 0 && rawDob < 120) {
          return rawDob;
        }
      }

      let dobDate = null;
      if (typeof rawDob?.toDate === 'function') {
        dobDate = rawDob.toDate();
      } else if (typeof rawDob?.toMillis === 'function') {
        dobDate = new Date(rawDob.toMillis());
      } else if (rawDob.seconds) {
        dobDate = new Date(rawDob.seconds * 1000);
      } else if (typeof rawDob === 'string') {
        const trimmed = rawDob.trim();
        if (/^\d{4}$/.test(trimmed)) {
          const y = parseInt(trimmed, 10);
          if (y > 1900 && y <= currentYear) return currentYear - y;
        }
        const parts = trimmed.split(/[-/.]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            dobDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          } else if (parts[2].length === 4) {
            dobDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          }
        }
        if (!dobDate || isNaN(dobDate.getTime())) {
          dobDate = new Date(trimmed);
        }
      } else if (typeof rawDob === 'number') {
        dobDate = new Date(rawDob);
      }

      if (dobDate && !isNaN(dobDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          age--;
        }
        if (age > 0 && age < 120) return age;
      }
    }
    return null;
  };

  const getTalentRole = (talent) => {
    if (!talent) return 'Actor';
    const role = talent.role?.split(',')[0] || talent.category;
    if (!role) return 'Actor';
    if (role.toLowerCase().includes('actor') || role.toLowerCase().includes('actress')) return 'Actor';
    return role;
  };

  const getTalentRoleAndAge = (talent) => {
    if (!talent) return 'Actor';
    const role = getTalentRole(talent);
    const age = getTalentAge(talent);
    return age ? `${role} (${age})` : role;
  };

  const getTalentFollowersCount = (talent) => {
    if (!talent) return 0;
    const raw = talent.followersCount ?? talent.followerCount ?? (Array.isArray(talent.followers) ? talent.followers.length : talent.followers);
    const num = typeof raw === 'number' ? raw : parseInt(raw, 10);
    return !isNaN(num) && num > 0 ? num : 0;
  };

  const formatTalentLocation = (talent) => {
    if (!talent) return null;
    const loc = talent.location || talent.city || talent.address;
    if (loc && typeof loc === 'string') {
      const trimmed = loc.trim();
      if (trimmed.length > 0 && !trimmed.toLowerCase().includes('undefined') && !trimmed.toLowerCase().includes('null')) {
        return trimmed;
      }
    }
    return null;
  };

  const formatTalentName = (name) => {
    if (!name) return 'Talent';
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
    .filter(t => {
      if (t.deactivated || t.isAdmin === true || t.role?.toLowerCase() === 'admin' || t.email?.toLowerCase() === 'aniltimilsena53@gmail.com') return false;
      const tName = t.name || t.displayName || t.fullName || t.username;
      return Boolean(tName);
    })
    .reduce((acc, current) => {
      const currentName = current.name || current.displayName || current.fullName || current.username;
      const isDuplicate = acc.some(item =>
        item.id === current.id ||
        (item.name && currentName && item.name.trim().toLowerCase() === currentName.trim().toLowerCase())
      );
      if (!isDuplicate) {
        acc.push({ ...current, name: currentName });
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

  // Continuous Typewriter Effect for Hero Slogan
  const TYPEWRITER_PHRASES = [
    'Multiple Talents In One Place',
    'Actors, Models & Creators',
    'Auditions & Casting Calls',
    'Nepal’s Creative Network',
  ];
  const [typewriterText, setTypewriterText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = TYPEWRITER_PHRASES[phraseIdx % TYPEWRITER_PHRASES.length];
    let timer;

    if (!isDeleting) {
      if (typewriterText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setTypewriterText(currentPhrase.slice(0, typewriterText.length + 1));
        }, 70);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1800);
      }
    } else {
      if (typewriterText.length > 0) {
        timer = setTimeout(() => {
          setTypewriterText(currentPhrase.slice(0, typewriterText.length - 1));
        }, 35);
      } else {
        setIsDeleting(false);
        setPhraseIdx(prev => (prev + 1) % TYPEWRITER_PHRASES.length);
      }
    }

    return () => clearTimeout(timer);
  }, [typewriterText, isDeleting, phraseIdx]);

  // Spotlight user rotation for overlaid rectangular portrait card
  const [spotlightProfile, setSpotlightProfile] = useState(null);
  const [spotlightImageError, setSpotlightImageError] = useState(false);

  const currentSpotlightUser = displayFeaturedList[currentSpotlightIdx] || activeTalentsList[0];
  const spotlightUserId = currentSpotlightUser?.id || currentSpotlightUser?.uid;

  useEffect(() => {
    if (displayFeaturedList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSpotlightIdx((prevIdx) => (prevIdx + 1) % displayFeaturedList.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [displayFeaturedList.length]);

  useEffect(() => {
    if (!spotlightUserId) {
      setSpotlightProfile(null);
      return;
    }
    setSpotlightImageError(false);
    const unsub = subscribeToProfile(spotlightUserId, (profData) => {
      if (profData) {
        setSpotlightProfile(profData);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [spotlightUserId]);

  const rawPhoto =
    !spotlightImageError &&
    (spotlightProfile?.profilePhoto ||
      spotlightProfile?.photoURL ||
      spotlightProfile?.avatarUrl ||
      spotlightProfile?.avatar ||
      currentSpotlightUser?.profilePhoto ||
      currentSpotlightUser?.photoURL ||
      currentSpotlightUser?.avatarUrl ||
      currentSpotlightUser?.avatar);

  const hasRealPhoto = Boolean(rawPhoto && !isMockOrInvalidImage(rawPhoto));
  const spotlightName = spotlightProfile?.name || currentSpotlightUser?.name || 'Talent';
  const rawSpotlightRole =
    spotlightProfile?.role?.split(',')[0] ||
    spotlightProfile?.category ||
    currentSpotlightUser?.role?.split(',')[0] ||
    currentSpotlightUser?.category ||
    'Actor';
  const spotlightRole = (rawSpotlightRole.toLowerCase().includes('actor') || rawSpotlightRole.toLowerCase().includes('actress')) ? 'Actor' : rawSpotlightRole;

  const spotlightAge = getTalentAge(spotlightProfile || currentSpotlightUser);
  const spotlightInitials = getInitials(spotlightName);

  const getCategoryCount = (filter) => {
    return talents.filter(t => matchesCategory(t, filter)).length;
  };

  const handleRefresh = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 800);
    });
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
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-[#141414] text-white pt-0 pb-1 font-sans selection:bg-[#522C69] selection:text-black">
          {/* ================= HERO SECTION (Overlayed under top navbar on mobile) ================= */}
          <section className="relative w-full h-[260px] sm:h-[280px] lg:h-[310px] -mt-14 sm:mt-0 pt-14 sm:pt-16 overflow-hidden bg-black select-none rounded-none rounded-b-2xl border-b border-white/5 m-0 p-0">
            {/* 5 Smoothly Rotating Background Images (Every 4s) */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={heroImageIdx}
                  src={HERO_BACKGROUND_PHOTOS[heroImageIdx]}
                  alt="NepalCasts Hero"
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1.0] }}
                  className="w-full h-full object-cover object-center absolute inset-0 grayscale contrast-110"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/85 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/30 to-transparent pointer-events-none" />
            </div>

            {/* Top Right Slogan in One Line with Typewriter Font & Live Typing Animation */}
            <div className="absolute top-16 sm:top-18 right-3 sm:right-5 z-20 pointer-events-none flex items-center justify-end">
              <h1 className="font-mono font-bold text-xs sm:text-sm md:text-base lg:text-lg whitespace-nowrap tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] flex items-center gap-1.5 sm:gap-2">
                <span className="text-white shrink-0">Discover</span>
                <span className="text-white">{typewriterText}</span>
                <span className="inline-block w-1.5 sm:w-2 h-3.5 sm:h-4 bg-[#522C69] ml-0.5 animate-pulse shrink-0" />
              </h1>
            </div>



            {/* Overlaid Inset Spotlight Card (Bottom Left, Inverted Rounded Corner Profile) */}
            {currentSpotlightUser && (
              <div className="absolute bottom-2 sm:bottom-3 left-1.5 sm:left-2.5 z-20 flex items-end">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSpotlightUser?.id || currentSpotlightIdx}
                    initial={{ opacity: 0, x: -8, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 8, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-end gap-2.5 sm:gap-3.5 cursor-pointer group"
                    onClick={() => {
                      if (currentSpotlightUser?.id) {
                        onNavigate('profile', currentSpotlightUser.id);
                      } else {
                        onNavigate('listing');
                      }
                    }}
                  >
                    {/* Portrait Photo Card with Top-Left & Bottom-Right Rounded Corners */}
                    <div className="relative shrink-0 w-[82px] h-[112px] sm:w-[100px] sm:h-[136px] flex flex-col items-center justify-center overflow-hidden rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm shadow-[0_10px_30px_rgba(0,0,0,0.9)] border-0 bg-[#16161C] transition-all">
                      {hasRealPhoto ? (
                        <img
                          src={getOptimizedImageUrl(rawPhoto, { width: 300, quality: 'auto', format: 'auto' })}
                          srcSet={getImageSrcSet(rawPhoto, [200, 320, 480])}
                          sizes="(max-width: 640px) 100px, 136px"
                          alt={spotlightName}
                          loading="lazy"
                          decoding="async"
                          onError={() => setSpotlightImageError(true)}
                          className="w-full h-full object-cover rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm border-0"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1C24] to-[#121216] p-1.5 text-center select-none rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm border-0">
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/5 border-0 flex items-center justify-center mb-1 text-white font-black text-sm sm:text-base tracking-tight shadow-inner">
                            {spotlightInitials}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate w-full px-0.5">
                            {spotlightRole}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Talent Meta beside photo */}
                    <div className="flex flex-col justify-end items-start gap-0.5 min-w-0 pb-0.5 text-left font-apple">
                      <h2 className="font-apple text-base sm:text-xl font-bold text-white leading-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-[140px] sm:max-w-[200px] tracking-normal">
                        {spotlightName}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 font-normal capitalize drop-shadow-md truncate tracking-normal">
                        {spotlightRole} {spotlightAge ? `(${spotlightAge})` : ''}
                      </p>
                      <span className="text-[#522C69] text-xs sm:text-sm font-semibold flex items-center gap-1">
                        View profile &gt;
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Lower Cards Container */}
          <div className="px-0 sm:px-1.5 space-y-2 sm:space-y-2">

            {/* ================= CASTING CALLS / HIRING NOW SECTION ================= */}
            <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <span className="relative inline-flex items-center pb-2 text-white font-apple font-black text-lg sm:text-xl md:text-2xl tracking-wider uppercase select-none">
                    <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-[#522C69] to-[#522C69]/10 rounded-full pointer-events-none" />
                    Hiring now
                  </span>
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 font-normal">
                    Discover active auditions and verified casting calls across Nepal
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('casting')}
                  className="text-gray-300 hover:text-white text-sm sm:text-base font-bold flex items-center gap-0.5 cursor-pointer shrink-0 pt-0.5 transition-colors"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scroll Carousel: Borderless Poster Thumbnails with Call Details */}
              <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pt-0.5 pb-1.5 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth">
                {activeCastingCalls.length > 0 ? (
                  activeCastingCalls.slice(0, 8).map((call) => {
                    const thumbnail = getCastingThumbnail(call);
                    return (
                      <div
                        key={call.id}
                        onClick={() => onNavigate('casting-detail', call.id)}
                        className="flex flex-col shrink-0 w-[46vw] sm:w-52 md:w-60 cursor-pointer"
                      >
                        {/* Borderless Tall Cinematic Poster Thumbnail (Half Mobile Screen Coverage) */}
                        <div className="relative w-full aspect-[9/14] rounded-t-2xl rounded-b-none overflow-hidden bg-black shadow-md">
                          {thumbnail ? (
                            <img
                              src={getOptimizedImageUrl(thumbnail, { width: 480, quality: 'auto', format: 'auto' })}
                              srcSet={getImageSrcSet(thumbnail, [320, 480, 720])}
                              sizes="(max-width: 640px) 46vw, 240px"
                              alt={call.title || 'Casting'}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover rounded-t-2xl rounded-b-none"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-thumb');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          {/* Default Clapperboard Fallback */}
                          <div
                            className="default-clapper-thumb w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c20] to-[#121214] p-3 text-center"
                            style={{ display: thumbnail ? 'none' : 'flex' }}
                          >
                            <svg className="w-10 h-10 text-white/70 fill-current drop-shadow-sm" viewBox="0 0 24 24">
                              <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
                            </svg>
                          </div>
                          {/* Category / Roles tag - Watermark Translucent Hanging Style */}
                          <div
                            className="absolute top-0 left-3 sm:left-4 z-10 px-3.5 pt-1.5 pb-2 rounded-b-xl bg-gradient-to-b from-[#522C69]/45 via-[#522C69]/20 to-transparent backdrop-blur-[2px] flex items-center justify-center max-w-[85%] border-0 outline-none select-none"
                            title={
                              Array.isArray(call.roles) && call.roles.length > 0
                                ? call.roles.map(r => (typeof r === 'string' ? r : r?.name)).filter(Boolean).join(' • ')
                                : (call.type || call.category || 'Audition')
                            }
                          >
                            <span className="text-white font-black text-xs sm:text-sm uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate">
                              {Array.isArray(call.roles) && call.roles.length > 0
                                ? call.roles.map(r => (typeof r === 'string' ? r : r?.name)).filter(Boolean).join(' • ') || (call.type || call.category || 'Audition')
                                : (call.type || call.category || 'Audition')}
                            </span>
                          </div>
                          {/* Deadline on bottom right */}
                          {call.deadline && (
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[11px] sm:text-xs font-medium text-[#522C69] shadow-sm">
                              Due {new Date(call.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>

                        {/* Details under thumbnail with side Apply Now button */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
                          <div className="min-w-0 flex-1 space-y-0.5 text-left">
                            <p className="font-apple text-white font-bold text-base sm:text-lg md:text-xl truncate w-full tracking-normal">
                              {call.title || call.project || 'Untitled Casting Call'}
                            </p>
                            <p className="font-apple text-slate-300 font-medium text-sm sm:text-base truncate w-full">
                              {call.company || call.director || 'Production'} • {call.location || 'Nepal'}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('casting-apply', call.id);
                            }}
                            className="shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full text-center py-5 bg-[#141416] rounded-xl border border-white/5">
                    <p className="text-gray-400 text-sm mb-2">No active calls at the moment</p>
                    <button
                      onClick={() => onNavigate('casting-create')}
                      className="text-sm bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white font-bold px-4 py-2 rounded-md shadow-sm shadow-amber-950/20 cursor-pointer"
                    >
                      + Post a Casting Call
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ================= FEATURED TALENTS SECTION ================= */}
            <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <span className="relative inline-flex items-center pb-2 text-white font-apple font-black text-lg sm:text-xl md:text-2xl tracking-wider uppercase select-none">
                    <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-[#522C69] to-[#522C69]/10 rounded-full pointer-events-none" />
                    Featured talents
                  </span>
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 font-normal">
                    Handpicked verified actors, models, and industry professionals
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('listing')}
                  className="text-gray-300 hover:text-white text-sm sm:text-base font-bold flex items-center gap-0.5 cursor-pointer shrink-0 pt-0.5 transition-colors"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scroll Carousel: 2.5 cards on mobile, tight padding */}
              <div
                ref={actorsScrollRef}
                className="flex gap-1.5 sm:gap-2.5 overflow-x-auto pt-0.5 pb-1.5 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
              >
                {!talentsReceived ? (
                  <AvatarScrollSkeleton count={4} />
                ) : displayFeaturedList.length > 0 ? (
                  displayFeaturedList.map((talent) => (
                    <div
                      key={talent.id}
                      onClick={() => onNavigate('profile', talent.id)}
                      className="flex flex-col items-center shrink-0 w-[calc((100vw-36px)/2.5)] sm:w-36 cursor-pointer"
                    >
                      <Avatar
                        userId={talent.id || talent.uid}
                        user={talent}
                        size="none"
                        name={talent.name}
                        className="w-[calc((100vw-44px)/2.5)] h-[calc((100vw-44px)/2.5)] sm:w-36 sm:h-36 rounded-full object-cover shadow-lg"
                      />
                      <p className="font-apple text-white font-bold text-lg sm:text-xl md:text-2xl text-center mt-2.5 truncate w-full px-0.5 tracking-wide">
                        {formatTalentName(talent.name)}
                      </p>
                      <p className="font-apple text-[#522C69] font-semibold text-base sm:text-lg text-center mt-1 truncate w-full px-0.5 tracking-normal">
                        {getTalentRole(talent)}
                      </p>
                      {getTalentAge(talent) ? (
                        <p className="font-apple text-slate-300 font-medium text-base sm:text-lg text-center mt-0.5 truncate w-full px-0.5 tracking-normal">
                          ({getTalentAge(talent)})
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm py-4">No talents found</div>
                )}
              </div>
            </section>

            {/* ================= TALENTS BY CATEGORY SECTION ================= */}
            <section className="bg-[#131418] rounded-2xl p-3.5 sm:p-4 text-white shadow-md border-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <span className="relative inline-flex items-center pb-2 text-white font-apple font-black text-lg sm:text-xl md:text-2xl tracking-wider uppercase select-none">
                    <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-[#522C69] to-[#522C69]/10 rounded-full pointer-events-none" />
                    Talents by category
                  </span>
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 font-normal">
                    Explore skilled professionals across every creative discipline
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('discover')}
                  className="text-gray-300 hover:text-white text-sm sm:text-base font-bold flex items-center gap-0.5 cursor-pointer shrink-0 pt-0.5 transition-colors"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scroll Carousel: All Category Cards */}
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-1 pb-2 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth">
                {HOME_CATEGORY_CARDS.map((cat) => {
                  const count = getCategoryCount(cat.filter);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => onNavigate('talents', cat.filter)}
                      className="rounded-2xl p-4 sm:p-6 aspect-square shrink-0 w-44 sm:w-48 md:w-52 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0a0a0a] shadow-lg border border-white/5 gap-2.5 sm:gap-3.5 hover:border-white/20 active:scale-[0.98]"
                    >
                      <CategoryCardIcon
                        type={cat.iconType}
                        color="#ffffff"
                        className="w-14 h-14 sm:w-18 sm:h-18 lg:w-20 lg:h-20 fill-current text-white shrink-0"
                      />
                      <div className="w-full flex flex-col items-center justify-center shrink-0">
                        <span className="font-apple text-white font-bold text-lg sm:text-xl md:text-2xl leading-tight whitespace-pre-line text-center tracking-normal">
                          {cat.label}
                        </span>
                        <span className="font-apple text-neutral-400 font-medium text-sm sm:text-base mt-1 tracking-normal">
                          ({count} {count === 1 ? 'talent' : 'talents'})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ================= RECENTLY JOINED TALENTS SECTION ================= */}
            <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <span className="relative inline-flex items-center pb-2 text-white font-apple font-black text-lg sm:text-xl md:text-2xl tracking-wider uppercase select-none">
                    <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-[#522C69] to-[#522C69]/10 rounded-full pointer-events-none" />
                    Recently joined
                  </span>
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 font-normal">
                    New artists and emerging creators who recently joined NepalCasts
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('listing')}
                  className="text-gray-300 hover:text-white text-sm sm:text-base font-bold flex items-center gap-0.5 cursor-pointer shrink-0 pt-0.5 transition-colors"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Ranked Card List Container */}
              <div className="space-y-2.5 pt-1">
                {!talentsReceived ? (
                  [1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="flex items-center gap-3 sm:gap-4 py-1">
                      <span className="text-2xl sm:text-3xl font-black text-white w-6 text-center shrink-0">
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
                      className="flex items-center gap-3 sm:gap-4 py-1.5 cursor-pointer"
                    >
                      {/* Rank Number */}
                      <span className="text-2xl sm:text-3xl font-black text-white w-6 text-center shrink-0">
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
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-apple text-base sm:text-lg md:text-xl font-bold text-white truncate tracking-wide">
                            {talent.name}
                          </p>
                          <span className="text-sm sm:text-base text-[#522C69] font-semibold shrink-0">
                            {getTalentRoleAndAge(talent)}
                          </span>
                        </div>

                        {/* Username & Location */}
                        <p className="text-sm text-gray-400 truncate">
                          @{talent.username || talent.name?.toLowerCase().replace(/\s+/g, '')}
                        </p>
                        {formatTalentLocation(talent) && (
                          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {formatTalentLocation(talent)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm py-4 text-center">No new talents found</div>
                )}
              </div>
            </section>

            {/* ================= TRENDING TALENTS SECTION ================= */}
            <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <span className="relative inline-flex items-center pb-2 text-white font-apple font-black text-lg sm:text-xl md:text-2xl tracking-wider uppercase select-none">
                    <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-[#522C69] to-[#522C69]/10 rounded-full pointer-events-none" />
                    Trending talents
                  </span>
                  <p className="text-xs sm:text-sm md:text-base text-gray-400 font-normal">
                    Popular profiles gaining the most attention from directors and producers
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('trending')}
                  className="text-gray-300 hover:text-white text-sm sm:text-base font-bold flex items-center gap-0.5 cursor-pointer shrink-0 pt-0.5 transition-colors"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Ranked Trending List Container */}
              <div className="space-y-2.5 pt-1">
                {!talentsReceived ? (
                  [1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="flex items-center gap-3 sm:gap-4 py-1">
                      <span className="text-2xl sm:text-3xl font-black text-white w-6 text-center shrink-0">
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
                      className="flex items-center gap-3 sm:gap-4 py-1.5 cursor-pointer"
                    >
                      {/* Rank Number */}
                      <span className="text-2xl sm:text-3xl font-black text-white w-6 text-center shrink-0">
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
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-apple text-base sm:text-lg md:text-xl font-bold text-white truncate tracking-wide">
                            {talent.name}
                          </p>
                          <span className="text-sm sm:text-base text-[#522C69] font-semibold shrink-0">
                            {getTalentRoleAndAge(talent)}
                          </span>
                        </div>

                        {/* Username & Location / Followers */}
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <p className="truncate">
                            @{talent.username || talent.name?.toLowerCase().replace(/\s+/g, '')}
                          </p>
                          <span className="text-gray-400 font-medium text-xs sm:text-sm shrink-0">
                            {getTalentFollowersCount(talent)} {getTalentFollowersCount(talent) === 1 ? 'follower' : 'followers'}
                          </span>
                        </div>
                        {formatTalentLocation(talent) && (
                          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            {formatTalentLocation(talent)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-sm py-4 text-center">No trending talents found</div>
                )}
              </div>
            </section>

            {/* ================= OUR GOALS SECTION ================= */}
            <section className="bg-[#131418] rounded-2xl p-3.5 sm:p-5 text-white shadow-md border-0 space-y-3 text-left">
              <div className="space-y-1">
                <span className="relative inline-flex items-center pb-2 text-white font-apple font-black text-lg sm:text-xl md:text-2xl tracking-wider uppercase select-none">
                  <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-[#522C69] to-[#522C69]/10 rounded-full pointer-events-none" />
                  Our Goals
                </span>
              </div>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-normal">
                Building Nepal's most transparent and accessible entertainment network. We connect Nepal's finest actors, directors, writers, and film technicians with leading casting agencies, providing a unified platform for talent discovery and casting opportunities across Nepal. By empowering emerging artists with visibility to global production houses and simplifying the casting process for producers, directors, and agencies, we aim to build a strong community that supports and grows Nepal's entertainment industry.
              </p>
            </section>
          </div>
        </div>
      </PullToRefresh>
    </Desktop3ColumnLayout>
  );
}
