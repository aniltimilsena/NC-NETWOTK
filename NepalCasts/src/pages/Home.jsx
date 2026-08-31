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
import { Megaphone, Tag, ExternalLink, Flame, Clapperboard, LayoutGrid, ChevronRight, Crown, Sprout } from 'lucide-react';

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
    if (!talent) return 'Actor / Actress';
    const role = talent.role?.split(',')[0] || talent.category;
    if (!role) return 'Actor / Actress';
    if (role.toLowerCase() === 'actor' || role.toLowerCase() === 'actress') return 'Actor / Actress';
    return role;
  };

  const getTalentRoleAndAge = (talent) => {
    if (!talent) return 'Actor / Actress';
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
        <div className="min-h-screen bg-[#141414] text-white pt-0 pb-6 font-sans selection:bg-blue-600 selection:text-white">
          {/* ================= HERO SECTION (Compact, flush with top navbar) ================= */}
          <section className="relative w-full h-[190px] sm:h-[220px] lg:h-[250px] overflow-hidden bg-black select-none rounded-none rounded-b-2xl border-b border-white/5 m-0 p-0">
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
                  className="w-full h-full object-cover object-center absolute inset-0"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/85 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/25 to-transparent pointer-events-none" />
            </div>

            {/* Top Right Slogan in One Line with Typewriter Font & Live Typing Animation */}
            <div className="absolute top-2.5 sm:top-3.5 right-3 sm:right-5 z-20 pointer-events-none flex items-baseline justify-end gap-1.5 sm:gap-2">
              <span className="font-script text-xl sm:text-2xl lg:text-3xl text-cyan-400 font-normal drop-shadow-[0_2px_8px_rgba(34,211,238,0.7)] leading-none shrink-0">
                Discover
              </span>
              <h1 className="font-mono font-bold text-xs sm:text-sm md:text-base lg:text-lg text-white whitespace-nowrap tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] flex items-center">
                <span>{typewriterText}</span>
                <span className="inline-block w-1.5 sm:w-2 h-3.5 sm:h-4 bg-cyan-400 ml-1 animate-pulse" />
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
                    <div className="relative shrink-0 w-[82px] h-[112px] sm:w-[100px] sm:h-[136px] flex flex-col items-center justify-center overflow-hidden rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm shadow-[0_10px_30px_rgba(0,0,0,0.9)] border border-white/20 bg-gradient-to-b from-[#1c2333] to-[#0d121c] group-hover:border-white/40 transition-all">
                      {hasRealPhoto ? (
                        <img
                          src={rawPhoto}
                          alt={spotlightName}
                          onError={() => setSpotlightImageError(true)}
                          className="w-full h-full object-cover rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1e283d] via-[#141b2a] to-[#0a0e17] p-1.5 text-center select-none rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm">
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-1 text-white font-black text-sm sm:text-base tracking-tight shadow-inner">
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
                      <h2 className="text-sm sm:text-lg font-bold text-white leading-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] max-w-[140px] sm:max-w-[200px] tracking-normal">
                        {spotlightName}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-slate-300 font-normal capitalize drop-shadow-md truncate tracking-normal">
                        {spotlightRole} {spotlightAge ? `(${spotlightAge})` : ''}
                      </p>
                      <span className="text-rose-500 group-hover:text-rose-400 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors">
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

            {/* ================= CASTING CALLS / HIRING NOW SECTION ================= */}
            <section className="bg-black rounded-lg border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="relative inline-flex items-center pb-1 text-white font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase select-none">
                  <span className="absolute bottom-0 left-0 w-1/2 border-b-2 border-rose-600 pointer-events-none" />
                  Hiring now
                </span>
                <button
                  onClick={() => onNavigate('casting')}
                  className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-all group cursor-pointer"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
                        className="flex flex-col shrink-0 w-[46vw] sm:w-52 md:w-60 cursor-pointer group"
                      >
                        {/* Borderless Tall Cinematic Poster Thumbnail (Half Mobile Screen Coverage) */}
                        <div className="relative w-full aspect-[9/14] rounded-t-2xl rounded-b-none overflow-hidden bg-black shadow-md group-hover:scale-[1.02] transition-transform duration-300">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={call.title || 'Casting'}
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
                          {/* Category badge on top left */}
                          <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white shadow-sm truncate max-w-[85%]">
                            {call.type || call.category || 'Audition'}
                          </div>
                          {/* Deadline on bottom right */}
                          {call.deadline && (
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] sm:text-[10px] font-medium text-rose-400 shadow-sm">
                              Due {new Date(call.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>

                        {/* Details under thumbnail with side Apply Now button */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
                          <div className="min-w-0 flex-1 space-y-0.5 text-left">
                            <p className="font-apple text-white font-bold text-sm sm:text-base md:text-lg truncate w-full tracking-tight group-hover:text-rose-400 transition-colors">
                              {call.title || call.project || 'Untitled Casting Call'}
                            </p>
                            <p className="font-apple text-slate-300 font-medium text-xs sm:text-sm truncate w-full">
                              {call.company || call.director || 'Production'} • {call.location || 'Nepal'}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('casting-detail', call.id);
                            }}
                            className="shrink-0 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md bg-[#E50914] hover:bg-[#ff1e27] text-white font-apple font-bold text-[11px] sm:text-xs leading-snug tracking-wide transition-all shadow-sm shadow-rose-900/30 group-hover:scale-105"
                          >
                            Apply Now
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full text-center py-5 bg-[#141416] rounded-xl border border-white/5">
                    <p className="text-gray-400 text-xs mb-2">No active casting calls at the moment</p>
                    <button
                      onClick={() => onNavigate('casting-create')}
                      className="text-xs bg-[#E50914] hover:bg-[#ff1e27] text-white font-bold px-3 py-1.5 rounded-md transition-colors shadow-sm shadow-rose-900/30"
                    >
                      + Post a Casting Call
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ================= FEATURED TALENTS SECTION ================= */}
            <section className="bg-black rounded-lg border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="relative inline-flex items-center pb-1 text-white font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase select-none">
                  <span className="absolute bottom-0 left-0 w-1/2 border-b-2 border-rose-600 pointer-events-none" />
                  Featured talents
                </span>
                <button
                  onClick={() => onNavigate('listing')}
                  className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-0.5 transition-all group cursor-pointer"
                >
                  <span>View all</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
                      className="flex flex-col items-center shrink-0 w-[calc((100vw-36px)/2.5)] sm:w-36 cursor-pointer group"
                    >
                      <Avatar
                        userId={talent.id || talent.uid}
                        user={talent}
                        size="none"
                        name={talent.name}
                        className="w-[calc((100vw-44px)/2.5)] h-[calc((100vw-44px)/2.5)] sm:w-36 sm:h-36 rounded-full object-cover shadow-lg transition-all duration-300 group-hover:scale-105"
                      />
                      <p className="font-apple text-white font-bold text-xs sm:text-sm text-center mt-2.5 truncate w-full px-0.5 tracking-tight group-hover:text-rose-400 transition-colors">
                        {formatTalentName(talent.name)}
                      </p>
                      <p className="font-apple text-rose-400 font-semibold text-[11px] sm:text-xs text-center mt-0.5 truncate w-full px-0.5 tracking-normal">
                        {getTalentRole(talent)}
                      </p>
                      {getTalentAge(talent) ? (
                        <p className="font-apple text-slate-300 font-normal text-[11px] sm:text-xs text-center mt-0.5 truncate w-full px-0.5 tracking-normal">
                          ({getTalentAge(talent)})
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-xs py-4">No talents found</div>
                )}
              </div>
            </section>

            {/* ================= TALENTS BY CATEGORY SECTION ================= */}
            <section className="bg-[#141416] rounded-lg border border-white/[0.08] p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="relative inline-flex items-center pb-1 text-white font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase select-none">
                  <span className="absolute bottom-0 left-0 w-1/2 border-b-2 border-rose-600 pointer-events-none" />
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

              {/* Horizontal Scroll Carousel: All Category Cards */}
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pt-0.5 pb-1.5 px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth">
                {HOME_CATEGORY_CARDS.map((cat) => {
                  const count = getCategoryCount(cat.filter);
                  return (
                    <motion.div
                      key={cat.id}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onNavigate('talents', cat.filter)}
                      className="rounded-2xl p-2.5 sm:p-3.5 aspect-square shrink-0 w-[calc((100vw-48px)/3)] sm:w-32 md:w-36 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[#0a0a0a] hover:bg-[#141414] shadow-md group border border-white/5 gap-1 sm:gap-1.5"
                    >
                      <CategoryCardIcon
                        type={cat.iconType}
                        color="#ffffff"
                        className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 fill-current text-white transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="w-full flex flex-col items-center justify-center shrink-0">
                        <span className="font-apple text-white font-bold text-xs sm:text-sm leading-tight whitespace-pre-line text-center tracking-tight">
                          {cat.label}
                        </span>
                        <span className="font-apple text-neutral-400 font-normal text-[10px] sm:text-xs mt-0.5 tracking-normal">
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
                <span className="relative inline-flex items-center pb-1 text-white font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase select-none">
                  <span className="absolute bottom-0 left-0 w-1/2 border-b-2 border-rose-600 pointer-events-none" />
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
                          <p className="text-sm sm:text-base font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                            {talent.name}
                          </p>
                          <span className="text-xs text-rose-400 font-semibold shrink-0">
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

            {/* ================= TRENDING TALENTS SECTION ================= */}
            <section className="bg-black rounded-lg border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="relative inline-flex items-center pb-1 text-white font-apple font-bold text-[11px] sm:text-xs tracking-wider uppercase select-none">
                  <span className="absolute bottom-0 left-0 w-1/2 border-b-2 border-rose-600 pointer-events-none" />
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
                      <span className={`text-xl sm:text-2xl font-black w-5 text-center shrink-0 ${idx === 0 ? 'text-rose-500' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-rose-700' : 'text-white'}`}>
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
                          <p className="text-sm sm:text-base font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                            {talent.name}
                          </p>
                          <span className="text-xs text-rose-400 font-semibold shrink-0">
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
                  <span className="text-rose-500 font-black text-base leading-none mt-0.5">•</span>
                  <span>Connect Nepal&apos;s finest actors, directors, writers, and film technicians with leading casting agencies.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base leading-none mt-0.5">•</span>
                  <span>Provide a unified platform for talent discovery and casting opportunities across Nepal.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base leading-none mt-0.5">•</span>
                  <span>Empower emerging artists by giving them visibility to global production houses.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base leading-none mt-0.5">•</span>
                  <span>Simplify the casting process for producers, directors, and agencies.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-500 font-black text-base leading-none mt-0.5">•</span>
                  <span>Build a strong community that supports and grows Nepal&apos;s entertainment industry.</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </PullToRefresh>
    </Desktop3ColumnLayout>
  );
}
