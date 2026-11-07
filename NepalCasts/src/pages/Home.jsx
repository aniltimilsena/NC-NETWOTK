import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import Avatar from '../components/ui/Avatar';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';
import { subscribeToTalents, subscribeToCastingCalls } from '../services';
import { matchesCategory } from '../constants/categories';
import { subscribeToProfile } from '../features/profile/services/profile';
import { AvatarScrollSkeleton, CastingPosterScrollSkeleton } from '../components/ui/Skeleton';
import PullToRefresh from '../components/ui/PullToRefresh';
import { ChevronRight, MapPin } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { formatRole, isDefaultImage, isCastingCallClosed } from '../utils';
import { subscribeToUserFollows, toggleFollowUser } from '../features/profile/services/users';
import { getOptimizedImageUrl, getImageSrcSet } from '../utils/media';
import { prefetchRoute, prefetchProfile, prefetchCasting } from '../utils/prefetchRoute';
import GoalsBannerCard from '../components/ui/GoalsBannerCard';
import RegionalFilmHubs from '../components/ui/RegionalFilmHubs';

/* eslint-disable no-secrets/no-secrets */
const HERO_BACKGROUND_PHOTOS = [
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=75',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=75',
  'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=75',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=75',
  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1200&q=75',
];

// Continuous Typewriter Effect for Hero Slogan (isolated to prevent re-rendering Home tree)
const HeroTypewriter = memo(function HeroTypewriter() {
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
        setPhraseIdx((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
      }
    }

    return () => clearTimeout(timer);
  }, [typewriterText, isDeleting, phraseIdx]);

  return (
    <div className="absolute top-16 sm:top-18 right-3 sm:right-5 z-20 pointer-events-none flex items-center justify-end">
      <h1 className="font-mono font-bold text-xs sm:text-sm md:text-base lg:text-lg whitespace-nowrap tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] flex items-center gap-1.5 sm:gap-2">
        <span className="text-white shrink-0">Discover</span>
        <span className="text-white">{typewriterText}</span>
        <span className="inline-block w-1.5 sm:w-2 h-3.5 sm:h-4 bg-[#522C69] ml-0.5 animate-pulse shrink-0" />
      </h1>
    </div>
  );
});
HeroTypewriter.displayName = 'HeroTypewriter';
/* eslint-enable no-secrets/no-secrets */

function getInitials(name) {
  if (!name) return 'NC';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  const { user: clerkUser } = useUser();
  const activeUser = user || (clerkUser ? {
    uid: clerkUser.id,
    id: clerkUser.id,
    displayName: clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || "Someone",
    photoURL: (clerkUser.imageUrl && !isDefaultImage(clerkUser.imageUrl)) ? clerkUser.imageUrl : "",
  } : null);
  const [followingIds, setFollowingIds] = useState([]);

  useEffect(() => {
    const userId = activeUser?.uid || clerkUser?.id;
    if (userId) {
      return subscribeToUserFollows(userId, setFollowingIds);
    } else {
      setFollowingIds([]);
    }
  }, [activeUser?.uid, clerkUser?.id]);

  const handleToggleFollow = useCallback(async (e, talentId) => {
    e.stopPropagation();
    const currentUser = activeUser;
    if (!currentUser) {
      if (typeof onNavigate === 'function') {
        onNavigate('signin');
      }
      return;
    }
    const isFollowing = followingIds.includes(talentId);
    setFollowingIds(prev => isFollowing ? prev.filter(id => id !== talentId) : [...prev, talentId]);
    await toggleFollowUser({
      currentUserId: currentUser.uid,
      targetUserId: talentId,
      isCurrentlyFollowing: isFollowing,
      senderInfo: {
        displayName: currentUser.displayName || "Someone",
        photoURL: currentUser.photoURL || "",
      }
    });
  }, [activeUser, followingIds, onNavigate]);

  const [talentsReceived, setTalentsReceived] = useState(false);
  const [callsReceived, setCallsReceived] = useState(false);
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
    let unsubDeferredUsers = () => { };
    let deferredTimer = null;

    try {
      unsubUsers = subscribeToTalents((data) => {
        if (Array.isArray(data)) {
          setTalents(data);
          setTalentsReceived(true);
        }
      }, 12);

      unsubCalls = subscribeToCastingCalls('All', (data, error) => {
        if (error) {
          console.warn("Home query issue:", error);
        }
        if (data) {
          setCastingCalls(data);
          setCallsReceived(true);
        }
      }, 6);

      const scheduleDeferred = () => {
        deferredTimer = setTimeout(() => {
          unsubDeferredUsers = subscribeToTalents((moreData) => {
            if (Array.isArray(moreData) && moreData.length > 0) {
              setTalents(moreData);
            }
          }, 30);
        }, 1200);
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => scheduleDeferred(), { timeout: 2000 });
      } else {
        scheduleDeferred();
      }
    } catch (err) {
      console.error("Critical subscription crash:", err);
    }

    return () => {
      if (deferredTimer) clearTimeout(deferredTimer);
      if (typeof unsubUsers === 'function') unsubUsers();
      if (typeof unsubCalls === 'function') unsubCalls();
      if (typeof unsubDeferredUsers === 'function') unsubDeferredUsers();
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
  const displayFeaturedList = useMemo(() => {
    return featuredTalentsList.length > 0 ? featuredTalentsList : activeTalentsList;
  }, [featuredTalentsList, activeTalentsList]);

  const getTalentCreatedTime = useCallback((talent) => {
    if (!talent) return 0;
    const val = talent.createdAt || talent.created_at || talent.joinedAt || talent.updatedAt;
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val?.toMillis === 'function') return val.toMillis();
    if (typeof val?.toDate === 'function') return val.toDate().getTime();
    if (val.seconds) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const newBornTalents = useMemo(() => {
    return [...activeTalentsList]
      .sort((a, b) => getTalentCreatedTime(b) - getTalentCreatedTime(a))
      .slice(0, 5);
  }, [activeTalentsList, getTalentCreatedTime]);

  const trendingTalents = useMemo(() => {
    return [...activeTalentsList]
      .sort((a, b) => {
        const scoreA = getTalentFollowersCount(a) * 2 + (a.views || 0);
        const scoreB = getTalentFollowersCount(b) * 2 + (b.views || 0);
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [activeTalentsList]);

  const activeCastingCalls = useMemo(() => {
    return castingCalls.filter(c => !isCastingCallClosed(c) && (c.title || c.project || c.roleName));
  }, [castingCalls]);

  const [spotlightProfile, setSpotlightProfile] = useState(null);
  const [spotlightImageError, setSpotlightImageError] = useState(false);

  const currentSpotlightUser = displayFeaturedList[currentSpotlightIdx] || activeTalentsList[0];
  const spotlightUserId = currentSpotlightUser?.id || currentSpotlightUser?.uid;

  useEffect(() => {
    if (displayFeaturedList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSpotlightIdx((prevIdx) => (prevIdx + 1) % displayFeaturedList.length);
    }, 4000);
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

  const hasRealPhoto = Boolean(rawPhoto && !isDefaultImage(rawPhoto));
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
      trendingCalls={activeCastingCalls}
      loading={!talentsReceived || !callsReceived}
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-[#FAF8F4] text-[#202923] pt-0 pb-6 selection:bg-[#194332]/10 selection:text-[#194332]">

          {/* ================= HERO SECTION (Overlayed under top navbar on mobile) ================= */}
          <section className="relative w-full h-[260px] sm:h-[280px] lg:h-[310px] -mt-14 sm:mt-0 pt-14 sm:pt-16 overflow-hidden bg-black select-none rounded-none rounded-b-2xl border-b border-white/5 m-0 p-0 mb-4 sm:mb-5">
            {/* 5 Smoothly Rotating Background Images (Every 4s) */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={heroImageIdx}
                  src={getOptimizedImageUrl(HERO_BACKGROUND_PHOTOS[heroImageIdx], { width: 1200, quality: 'auto', format: 'auto' })}
                  srcSet={getImageSrcSet(HERO_BACKGROUND_PHOTOS[heroImageIdx], [640, 1080, 1440])}
                  sizes="100vw"
                  alt="NepalCasts Hero"
                  fetchPriority={heroImageIdx === 0 ? "high" : "auto"}
                  loading={heroImageIdx === 0 ? "eager" : "lazy"}
                  decoding="async"
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
            <HeroTypewriter />

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
                    onMouseEnter={() => currentSpotlightUser?.id && prefetchProfile(currentSpotlightUser.id)}
                    onTouchStart={() => currentSpotlightUser?.id && prefetchProfile(currentSpotlightUser.id)}
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
                          loading="eager"
                          fetchPriority="auto"
                          decoding="async"
                          onError={() => setSpotlightImageError(true)}
                          className="w-full h-full object-cover rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm border-0"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1C1C24] to-[#121216] p-1.5 text-center select-none rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm border-0">
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/5 border-0 flex items-center justify-center mb-1 text-white font-bold text-sm sm:text-base tracking-tight shadow-inner">
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
                      <h2 className="font-apple text-base sm:text-xl font-medium text-white leading-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-[140px] sm:max-w-[200px] tracking-wide">
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

          {/* Lower Sections Container */}
          <div className="space-y-4 sm:space-y-5">

            {/* ===== STAT STRIP — Nepal Cinema at a Glance ===== */}
            <div className="bg-white border border-[#E7E5E0] rounded-2xl px-5 py-3 shadow-card">
              <div className="flex items-center justify-between gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <div className="flex flex-col items-center shrink-0 px-3 text-center">
                  <span className="font-devanagari text-[#194332] font-semibold text-lg sm:text-xl leading-tight">7</span>
                  <span className="text-[9px] sm:text-[10px] text-[#777C75] uppercase tracking-widest mt-0.5 whitespace-nowrap">Provinces</span>
                </div>
                <span className="w-px h-8 bg-[#E7E5E0] shrink-0" />
                <div className="flex flex-col items-center shrink-0 px-3 text-center">
                  <span className="font-devanagari text-[#194332] font-semibold text-lg sm:text-xl leading-tight">{talents.length > 0 ? `${talents.length}+` : '—'}</span>
                  <span className="text-[9px] sm:text-[10px] text-[#777C75] uppercase tracking-widest mt-0.5 whitespace-nowrap">Talent Profiles</span>
                </div>
                <span className="w-px h-8 bg-[#E7E5E0] shrink-0" />
                <div className="flex flex-col items-center shrink-0 px-3 text-center">
                  <span className="font-devanagari text-[#194332] font-semibold text-lg sm:text-xl leading-tight">{activeCastingCalls.length > 0 ? activeCastingCalls.length : '—'}</span>
                  <span className="text-[9px] sm:text-[10px] text-[#777C75] uppercase tracking-widest mt-0.5 whitespace-nowrap">Open Castings</span>
                </div>
                <span className="w-px h-8 bg-[#E7E5E0] shrink-0" />
                <div className="flex flex-col items-center shrink-0 px-3 text-center">
                  <span className="font-devanagari text-[#194332] font-semibold text-lg sm:text-xl leading-tight">नेपाल</span>
                  <span className="text-[9px] sm:text-[10px] text-[#777C75] uppercase tracking-widest mt-0.5 whitespace-nowrap">Made in Nepal</span>
                </div>
              </div>
            </div>

            {/* ================= HIRING NOW (CASTING CALLS) ================= */}
            <section className="bg-white rounded-2xl border border-[#E7E5E0] p-5 sm:p-6 text-[#202923] shadow-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#194332] rounded-full inline-block" />
                    <h2 className="font-devanagari font-semibold text-xl sm:text-2xl text-[#202923] tracking-tight">
                      Hiring Now
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#626860] font-normal font-inter pl-3.5">
                    Open auditions — your next role is here
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('casting')}
                  onMouseEnter={() => prefetchRoute('casting')}
                  onTouchStart={() => prefetchRoute('casting')}
                  className="text-[#194332] hover:text-[#102F28] text-xs sm:text-sm font-semibold flex items-center gap-0.5 cursor-pointer shrink-0 pt-1 transition-colors font-inter"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scroll Carousel */}
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-1 pb-2 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth">
                {!callsReceived ? (
                  <CastingPosterScrollSkeleton count={3} />
                ) : activeCastingCalls.length > 0 ? (
                  activeCastingCalls.slice(0, 8).map((call) => {
                    const thumbnail = getCastingThumbnail(call);
                    return (
                      <div
                        key={call.id}
                        onClick={() => onNavigate('casting-detail', call.id)}
                        onMouseEnter={() => prefetchCasting(call.id)}
                        onTouchStart={() => prefetchCasting(call.id)}
                        className="flex flex-col shrink-0 w-[52vw] sm:w-56 md:w-64 cursor-pointer bg-[#FAF8F4] hover:bg-[#F3F0E9] border border-[#E7E5E0] hover:border-[#D5D1C7] rounded-xl overflow-hidden p-3 transition-all duration-200 shadow-card"
                      >
                        {/* Poster Thumbnail */}
                        <div className="relative w-full aspect-[9/13] rounded-lg overflow-hidden bg-[#F3F0E9] border border-[#E7E5E0] shadow-sm mb-3">
                          {thumbnail ? (
                            <img
                              src={getOptimizedImageUrl(thumbnail, { width: 480, quality: 'auto', format: 'auto' })}
                              srcSet={getImageSrcSet(thumbnail, [320, 480, 720])}
                              sizes="(max-width: 640px) 52vw, 256px"
                              alt={call.title || 'Casting'}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-thumb');
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="default-clapper-thumb w-full h-full flex flex-col items-center justify-center bg-[#F3F0E9] p-3 text-center"
                            style={{ display: thumbnail ? 'none' : 'flex' }}
                          >
                            <svg className="w-10 h-10 text-[#777C75] fill-current" viewBox="0 0 24 24">
                              <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
                            </svg>
                          </div>

                          {/* Category Tag */}
                          <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-sm border border-[#E7E5E0] text-[10px] font-semibold text-[#194332] uppercase tracking-wider">
                            {Array.isArray(call.roles) && call.roles.length > 0
                              ? call.roles.map(r => (typeof r === 'string' ? r : r?.name)).filter(Boolean).join(' • ') || (call.type || call.category || 'Audition')
                              : (call.type || call.category || 'Audition')}
                          </div>

                          {/* Deadline Badge */}
                          {call.deadline && (
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-sm border border-[#E7E5E0] text-[10px] font-medium text-[#946019]">
                              Due {new Date(call.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>

                        {/* Details & Apply Action */}
                        <div className="space-y-1 text-left flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-inter text-[#202923] font-semibold text-sm sm:text-base truncate">
                              {call.title || call.project || 'Untitled Casting Call'}
                            </h3>
                            <p className="text-xs text-[#626860] font-normal truncate mt-0.5 font-inter">
                              {call.company || call.director || 'Production'} • {call.location || 'Nepal'}
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('casting-apply', call.id);
                              }}
                              className="w-full py-2 rounded-lg bg-[#194332] hover:bg-[#102F28] text-white font-semibold text-xs tracking-wide transition-all shadow-sm cursor-pointer text-center font-inter"
                            >
                              Apply Now
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full text-center py-6 bg-[#FAF8F4] rounded-xl border border-[#E7E5E0]">
                    <p className="text-[#626860] text-sm mb-3 font-inter">No active calls at the moment</p>
                    <button
                      onClick={() => onNavigate('casting-create')}
                      className="text-xs bg-[#194332] hover:bg-[#102F28] text-white font-semibold px-4 py-2 rounded-lg shadow-sm cursor-pointer font-inter"
                    >
                      + Post a Casting Call
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ================= FEATURED TALENTS SECTION ================= */}
            <section className="bg-white rounded-2xl border border-[#E7E5E0] p-5 sm:p-6 text-[#202923] shadow-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#194332] rounded-full inline-block" />
                    <h2 className="font-devanagari font-semibold text-xl sm:text-2xl text-[#202923] tracking-tight">
                      Featured Talents
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#626860] font-normal font-inter pl-3.5">
                    Nepal's most compelling faces, right now
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('listing')}
                  className="text-[#194332] hover:text-[#102F28] text-xs sm:text-sm font-semibold flex items-center gap-0.5 cursor-pointer shrink-0 pt-1 transition-colors font-inter"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scroll Carousel */}
              <div
                ref={actorsScrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto pt-1 pb-2 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
              >
                {!talentsReceived ? (
                  <AvatarScrollSkeleton count={4} />
                ) : displayFeaturedList.length > 0 ? (
                  displayFeaturedList.map((talent) => (
                    <div
                      key={talent.id}
                      onClick={() => onNavigate('profile', talent.id)}
                      onMouseEnter={() => prefetchProfile(talent.id)}
                      onTouchStart={() => prefetchProfile(talent.id)}
                      className="flex flex-col items-center shrink-0 w-28 sm:w-36 cursor-pointer p-2 rounded-xl hover:bg-[#FAF8F4] transition-all"
                    >
                      <Avatar
                        userId={talent.id || talent.uid}
                        user={talent}
                        size="none"
                        name={talent.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border border-[#E7E5E0] shadow-sm mb-2"
                      />
                      <p className="font-inter text-[#202923] font-semibold text-sm sm:text-base text-center truncate w-full px-0.5">
                        {formatTalentName(talent.name)}
                      </p>
                      <p className="font-inter text-[#194332] font-medium text-xs text-center truncate w-full px-0.5 mt-0.5">
                        {getTalentRole(talent)}
                      </p>
                      {getTalentAge(talent) ? (
                        <p className="font-inter text-[#777C75] text-xs text-center truncate w-full px-0.5">
                          ({getTalentAge(talent)})
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-[#626860] text-sm py-4">No talents found</div>
                )}
              </div>
            </section>

            {/* ================= TALENTS BY CATEGORY SECTION ================= */}
            <section className="bg-white rounded-2xl border border-[#E7E5E0] p-5 sm:p-6 text-[#202923] shadow-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#194332] rounded-full inline-block" />
                    <h2 className="font-devanagari font-semibold text-xl sm:text-2xl text-[#202923] tracking-tight">
                      Talents by Category
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#626860] font-normal font-inter pl-3.5">
                    Every craft has its master — find yours
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('discover')}
                  className="text-[#194332] hover:text-[#102F28] text-xs sm:text-sm font-semibold flex items-center gap-0.5 cursor-pointer shrink-0 pt-1 transition-colors font-inter"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Horizontal Scroll Carousel */}
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-1 pb-2 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth">
                {HOME_CATEGORY_CARDS.map((cat) => {
                  const count = getCategoryCount(cat.filter);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => onNavigate('talents', cat.filter)}
                      className="rounded-2xl p-4 sm:p-5 aspect-square shrink-0 w-36 sm:w-44 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#FAF8F4] hover:bg-[#F3F0E9] border border-[#E7E5E0] hover:border-[#D5D1C7] shadow-card gap-2 active:scale-[0.98]"
                    >
                      <CategoryCardIcon
                        type={cat.iconType}
                        color="#194332"
                        className="w-10 h-10 sm:w-12 sm:h-12 fill-current text-[#194332] shrink-0 mb-1"
                      />
                      <div className="w-full flex flex-col items-center justify-center shrink-0">
                        <span className="font-inter text-[#202923] font-semibold text-sm sm:text-base leading-tight whitespace-pre-line text-center">
                          {cat.label}
                        </span>
                        <span className="font-inter text-[#777C75] text-xs mt-1">
                          ({count} {count === 1 ? 'talent' : 'talents'})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ================= RECENTLY JOINED TALENTS SECTION ================= */}
            <section className="bg-white rounded-2xl border border-[#E7E5E0] p-5 sm:p-6 text-[#202923] shadow-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#194332] rounded-full inline-block" />
                    <h2 className="font-devanagari font-semibold text-xl sm:text-2xl text-[#202923] tracking-tight">
                      Recently Joined
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#626860] font-normal font-inter pl-3.5">
                    Fresh faces stepping into Nepal's creative scene
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('listing')}
                  className="text-[#194332] hover:text-[#102F28] text-xs sm:text-sm font-semibold flex items-center gap-0.5 cursor-pointer shrink-0 pt-1 transition-colors font-inter"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Ranked Card List Container */}
              <div className="divide-y divide-[#E7E5E0]">
                {!talentsReceived ? (
                  [1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="flex items-center justify-between gap-3 sm:gap-4 py-3">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full skeleton shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="w-32 h-3.5 skeleton rounded" />
                          <div className="w-24 h-2.5 skeleton rounded" />
                        </div>
                      </div>
                      <div className="w-20 h-8 rounded-lg skeleton shrink-0 hidden sm:block" />
                    </div>
                  ))
                ) : newBornTalents.length > 0 ? (
                  newBornTalents.slice(0, 5).map((talent, idx) => {
                    const isSelf = activeUser && (talent.id === activeUser.uid || talent.uid === activeUser.uid);
                    const isFollowing = followingIds.includes(talent.id);
                    const location = formatTalentLocation(talent) || talent.location || 'Kathmandu';
                    const role = formatRole(talent.role || talent.category);
                    return (
                      <div
                        key={talent.id || idx}
                        onClick={() => onNavigate('profile', talent.id)}
                        onMouseEnter={() => prefetchProfile(talent.id)}
                        onTouchStart={() => prefetchProfile(talent.id)}
                        className="flex items-center justify-between gap-3 sm:gap-4 py-3 cursor-pointer group hover:bg-[#FAF8F4] px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          <Avatar
                            userId={talent.id}
                            user={talent}
                            size="none"
                            name={talent.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0 border border-[#E7E5E0]"
                          />

                          <div className="flex-1 min-w-0 space-y-0.5 text-left">
                            <p className="font-inter text-sm sm:text-base font-semibold text-[#202923] truncate group-hover:text-[#194332] transition-colors">
                              {talent.name}
                            </p>
                            <p className="text-xs text-[#777C75] truncate font-inter">
                              @{talent.username || talent.name?.toLowerCase().replace(/\s+/g, '')}
                            </p>
                            <p className="text-xs text-[#626860] font-normal truncate flex items-center gap-1.5 font-inter">
                              <MapPin className="w-3.5 h-3.5 text-[#777C75] shrink-0" />
                              <span>{location}</span>
                              <span className="text-[#D5D1C7]">•</span>
                              <span>{role}</span>
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleFollow(e, talent.id)}
                              className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer font-inter ${
                                isFollowing
                                  ? 'bg-[#194332] text-white border-0 hover:bg-[#102F28]'
                                  : 'border border-[#194332] text-[#194332] hover:bg-[#194332]/10 bg-transparent'
                              }`}
                            >
                              {isFollowing ? 'Connected' : 'Connect'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[#626860] text-sm py-4 text-center font-inter">No new talents found</div>
                )}
              </div>
            </section>

            {/* ================= REGIONAL FILM HUBS SECTION ================= */}
            <RegionalFilmHubs onNavigate={onNavigate} />

            {/* ================= TRENDING TALENTS SECTION ================= */}
            <section className="bg-white rounded-2xl border border-[#E7E5E0] p-5 sm:p-6 text-[#202923] shadow-card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#194332] rounded-full inline-block" />
                    <h2 className="font-devanagari font-semibold text-xl sm:text-2xl text-[#202923] tracking-tight">
                      Trending Talents
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#626860] font-normal font-inter pl-3.5">
                    Nepal's rising stars — most viewed this week
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('trending')}
                  className="text-[#194332] hover:text-[#102F28] text-xs sm:text-sm font-semibold flex items-center gap-0.5 cursor-pointer shrink-0 pt-1 transition-colors font-inter"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Ranked Trending List Container */}
              <div className="divide-y divide-[#E7E5E0]">
                {!talentsReceived ? (
                  [1, 2, 3, 4, 5].map((num) => (
                    <div key={num} className="flex items-center gap-3 sm:gap-4 py-3">
                      <div className="w-12 h-12 rounded-full skeleton shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-full h-3.5 skeleton rounded" />
                        <div className="w-3/4 h-2.5 skeleton rounded" />
                      </div>
                    </div>
                  ))
                ) : trendingTalents.length > 0 ? (
                  trendingTalents.slice(0, 5).map((talent, idx) => (
                    <div
                      key={talent.id || idx}
                      onClick={() => onNavigate('profile', talent.id)}
                      onMouseEnter={() => prefetchProfile(talent.id)}
                      onTouchStart={() => prefetchProfile(talent.id)}
                      className="flex items-center gap-3 sm:gap-4 py-3 cursor-pointer group hover:bg-[#FAF8F4] px-2 rounded-lg transition-colors"
                    >
                      <Avatar
                        userId={talent.id}
                        user={talent}
                        size="none"
                        name={talent.name}
                        className="w-12 h-12 rounded-full object-cover shrink-0 border border-[#E7E5E0]"
                      />

                      <div className="flex-1 min-w-0 space-y-0.5 text-left">
                        <div className="flex items-center justify-between">
                          <p className="font-inter text-sm sm:text-base font-semibold text-[#202923] truncate group-hover:text-[#194332] transition-colors">
                            {talent.name}
                          </p>
                          <span className="text-xs text-[#194332] font-semibold shrink-0 font-inter">
                            {getTalentRoleAndAge(talent)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#777C75] font-inter">
                          <p className="truncate">
                            @{talent.username || talent.name?.toLowerCase().replace(/\s+/g, '')}
                          </p>
                          <span className="text-[#626860] font-medium shrink-0">
                            {getTalentFollowersCount(talent)} {getTalentFollowersCount(talent) === 1 ? 'connect' : 'connects'}
                          </span>
                        </div>

                        {formatTalentLocation(talent) && (
                          <p className="text-xs text-[#777C75] truncate flex items-center gap-1 font-inter">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {formatTalentLocation(talent)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#626860] text-sm py-4 text-center font-inter">No trending talents found</div>
                )}
              </div>
            </section>

            {/* ================= OUR GOALS SECTION ================= */}
            <GoalsBannerCard onNavigate={onNavigate} />

          </div>
        </div>
      </PullToRefresh>
    </Desktop3ColumnLayout>
  );
}
