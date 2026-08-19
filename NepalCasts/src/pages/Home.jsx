import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../components/ui/Avatar';
import { useTranslation } from 'react-i18next';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';
import { subscribeToTalents, subscribeToCastingCalls } from '../services';
import { SpotlightHeroSkeleton, AvatarScrollSkeleton } from '../components/ui/Skeleton';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { matchesCategory } from '../constants/categories';

// Category Definitions matching the exact design & color palette
const HOME_CATEGORY_CARDS = [
  {
    id: 'actor',
    filter: 'actor',
    label: 'Actor/\nActress',
    bgColor: '#72c3be', // Soft Aqua / Mint
    iconType: 'masks',
  },
  {
    id: 'director',
    filter: 'director',
    label: 'Director',
    bgColor: '#ff1e1e', // Vibrant Red
    iconType: 'director',
  },
  {
    id: 'writer',
    filter: 'writer',
    label: 'Script\nWriter',
    bgColor: '#34d399', // Emerald Green
    iconType: 'script',
  },
  {
    id: 'dop',
    filter: 'cinematographer',
    label: 'DOP\nCinematographar',
    bgColor: '#ffb26b', // Peach / Pastel Orange
    iconType: 'text',
  },
  {
    id: 'model',
    filter: 'model',
    label: 'Model',
    bgColor: '#7c9bf2', // Periwinkle Blue
    iconType: 'text',
  },
  {
    id: 'musician',
    filter: 'musician',
    label: 'Song writer/\nSinger',
    bgColor: '#9d71c7', // Purple / Lilac
    iconType: 'text',
  },
  {
    id: 'vfx',
    filter: 'vfx',
    label: 'Editer/\nVFX',
    bgColor: '#ffff00', // Electric Yellow
    iconType: 'text',
  },
  {
    id: 'producer',
    filter: 'producer',
    label: 'Productor\nmanager',
    bgColor: '#ffffff', // Crisp White
    iconType: 'text',
  },
];

function CategoryCardIcon({ type }) {
  if (type === 'masks') {
    return (
      <svg className="w-8 h-8 sm:w-9 sm:h-9 text-black fill-current mb-1" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-5 8c.83 0 1.5.67 1.5 1.5S7.83 13 7 13s-1.5-.67-1.5-1.5S6.17 10 7 10zm10 0c.83 0 1.5.67 1.5 1.5S17.83 13 17 13s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-5 8.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" />
      </svg>
    );
  }
  if (type === 'director') {
    return (
      <svg className="w-8 h-8 sm:w-9 sm:h-9 text-black fill-current mb-1" viewBox="0 0 24 24">
        <path d="M4 3h16v2H4V3zm1 3h14l-1 5H6L5 6zm-1 6h16l-2 9H6l-2-9zm4 2l1 5h6l1-5H8z" />
        <path d="M18 3l3-2v5l-3-2z" />
      </svg>
    );
  }
  if (type === 'script') {
    return (
      <svg className="w-8 h-8 sm:w-9 sm:h-9 text-black fill-current mb-1" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        <path d="M9 10h2v2H9v-2z" />
      </svg>
    );
  }
  return null;
}

export default function Home({ onNavigate, user }) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [talentsReceived, setTalentsReceived] = useState(false);
  const [currentSpotlightIdx, setCurrentSpotlightIdx] = useState(0);
  const [talents, setTalents] = useState([]);
  const [castingCalls, setCastingCalls] = useState([]);
  const [heroImageError, setHeroImageError] = useState(false);
  const [spotlightProfile, setSpotlightProfile] = useState(null);

  const actorsScrollRef = useRef(null);

  const getTalentAge = (talent) => {
    if (!talent) return 25;
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
        return age > 0 ? age : 25;
      }
    }
    return 25;
  };

  const getTalentRoleAndAge = (talent) => {
    if (!talent) return 'Actor (age-25)';
    const role = talent.role?.split(',')[0] || talent.category || 'Actor';
    const age = getTalentAge(talent);
    return `${role} (age-${age})`;
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

  // New Born Talents: Sorted by newest creation or fallback to active talents
  const newBornTalents = [...activeTalentsList]
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 4);

  const defaultTalent = {
    id: user?.uid || 'talent_default_bhupendra',
    name: 'Bhupendra Pandey',
    role: 'Actor',
    category: 'Actor',
    age: 25,
    photoURL: '/hero-talent.jpg',
    coverImage: '/hero-talent.jpg'
  };

  const currentSpotlightUser = displayFeaturedList[currentSpotlightIdx] || activeTalentsList[0] || defaultTalent;

  useEffect(() => {
    if (displayFeaturedList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSpotlightIdx((prevIdx) => (prevIdx + 1) % displayFeaturedList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayFeaturedList.length]);

  const spotlightUserId = currentSpotlightUser?.id || currentSpotlightUser?.uid;

  useEffect(() => {
    if (!spotlightUserId || spotlightUserId.startsWith('talent_default')) {
      setSpotlightProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'profiles', spotlightUserId), (docSnap) => {
      if (docSnap.exists()) {
        setSpotlightProfile({ id: docSnap.id, uid: docSnap.id, ...docSnap.data() });
      } else {
        setSpotlightProfile(null);
      }
    }, () => {
      setSpotlightProfile(null);
    });
    return () => unsub();
  }, [spotlightUserId]);

  const spotlightName =
    spotlightProfile?.name ||
    spotlightProfile?.fullName ||
    currentSpotlightUser?.name ||
    'Bhupendra Pandey';

  const spotlightRole =
    spotlightProfile?.role ||
    spotlightProfile?.category ||
    currentSpotlightUser?.role ||
    currentSpotlightUser?.category ||
    'Actor';

  const spotlightAge = getTalentAge(spotlightProfile || currentSpotlightUser);

  const heroCoverURL =
    spotlightProfile?.coverImage ||
    spotlightProfile?.image ||
    currentSpotlightUser?.coverImage ||
    currentSpotlightUser?.photoURL ||
    '/hero-talent.jpg';

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
      <div className="min-h-screen bg-white text-black pb-2 font-sans selection:bg-blue-600 selection:text-white">
        {/* ================= HERO SECTION ================= */}
        <section className="relative w-full h-[320px] sm:h-[400px] lg:h-[460px] overflow-hidden bg-black select-none">
          {/* Cover Background Image */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="popLayout">
              <motion.img
                key={heroCoverURL}
                src={heroCoverURL}
                alt="Talent Spotlight"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.9, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                onError={(e) => {
                  if (!heroImageError) {
                    setHeroImageError(true);
                    e.currentTarget.src = '/hero-talent.jpg';
                  }
                }}
                className="w-full h-full object-cover object-center"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
          </div>



          {/* Hero Body Content */}
          <div className="relative z-20 h-[calc(100%-50px)] flex flex-col justify-between px-4 sm:px-6 pb-4">
            {/* Top Right Bold Slogan */}
            <div className="flex justify-end pt-28 sm:pt-36">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] text-right">
                show<br />
                Your talent<br />
                here
              </h1>
            </div>

            {/* Bottom Left Spotlight Talent Info with Actual Photo */}
            <div className="mt-auto flex flex-col items-start gap-2.5">
              {/* Organic Shape Profile Photo */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (currentSpotlightUser?.id) {
                    onNavigate('profile', currentSpotlightUser.id);
                  } else {
                    onNavigate('listing');
                  }
                }}
                className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-[45%_55%_65%_35%/50%_45%_55%_50%] bg-[#7cc5ba] overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.6)] border-2 border-white/40 cursor-pointer flex items-center justify-center"
              >
                <Avatar
                  userId={spotlightUserId}
                  user={spotlightProfile || currentSpotlightUser}
                  size="none"
                  name={spotlightName}
                  className="w-full h-full object-cover rounded-none"
                />
              </motion.div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight drop-shadow-lg">
                  {spotlightName}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (currentSpotlightUser?.id) {
                      onNavigate('profile', currentSpotlightUser.id);
                    } else {
                      onNavigate('listing');
                    }
                  }}
                  className="text-[#1d61f2] hover:text-[#38bdf8] font-bold text-sm sm:text-base transition-colors flex items-center gap-1 mt-0.5"
                >
                  {spotlightRole} (age-{spotlightAge}) &gt;
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================= AD SECTION ================= */}
        <section className="pt-2 pb-1 bg-white">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {/* Ad Card 1 */}
            <div
              onClick={() => onNavigate('casting')}
              className="flex-1 min-w-[220px] sm:min-w-[260px] bg-[#1c1c1e] hover:bg-[#252528] transition-colors rounded-2xl h-28 sm:h-32 flex items-center justify-center cursor-pointer border border-white/5 shadow-md group"
            >
              <span className="text-2xl sm:text-3xl font-black text-white tracking-wide group-hover:scale-105 transition-transform">
                Ad
              </span>
            </div>
            {/* Ad Card 2 */}
            <div
              onClick={() => onNavigate('listing')}
              className="flex-1 min-w-[220px] sm:min-w-[260px] bg-[#1c1c1e] hover:bg-[#252528] transition-colors rounded-2xl h-28 sm:h-32 flex items-center justify-center cursor-pointer border border-white/5 shadow-md group"
            >
              <span className="text-2xl sm:text-3xl font-black text-white tracking-wide group-hover:scale-105 transition-transform">
                Ad
              </span>
            </div>
          </div>
        </section>

        {/* ================= FEATURED TALENTS SECTION (BLACK CARD) ================= */}
        <section className="my-1.5 bg-black rounded-3xl p-3.5 sm:p-4 text-white shadow-xl">
          <div className="flex items-center justify-between mb-2.5">
            <span className="bg-[#1d61f2] text-white font-bold text-xs sm:text-sm px-3.5 py-1 rounded-full tracking-wide shadow-sm">
              Featured talents :
            </span>
            <button
              onClick={() => onNavigate('listing')}
              className="text-white hover:text-gray-300 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              View all talents &gt;
            </button>
          </div>

          {/* Horizontal Scroll Carousel with Tight Spacing */}
          <div
            ref={actorsScrollRef}
            className="flex gap-0 overflow-x-auto pt-0.5 pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
          >
            {!talentsReceived ? (
              <AvatarScrollSkeleton count={4} />
            ) : displayFeaturedList.length > 0 ? (
              displayFeaturedList.map((talent) => (
                <div
                  key={talent.id}
                  onClick={() => onNavigate('profile', talent.id)}
                  className="flex flex-col items-center shrink-0 w-[115px] sm:w-[145px] cursor-pointer group"
                >
                  <Avatar
                    userId={talent.id || talent.uid}
                    user={talent}
                    size="none"
                    name={talent.name}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-2 border-white/20 shadow-md group-hover:border-white/60 transition-all duration-300"
                  />
                  <p className="text-white font-bold text-[11px] sm:text-xs text-center mt-1.5 truncate w-full px-0.5">
                    {formatTalentName(talent.name)}
                  </p>
                  <p className="text-[#1d61f2] font-semibold text-[10px] sm:text-[11px] text-center mt-0.5 truncate w-full px-0.5">
                    {getTalentRoleAndAge(talent)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-xs py-4">No talents found</div>
            )}
          </div>
        </section>

        {/* ================= TALENTS BY CATEGORY SECTION (BLACK CARD) ================= */}
        <section className="my-1.5 bg-black rounded-3xl p-3.5 sm:p-4 text-white shadow-xl">
          <div className="mb-3.5">
            <span className="bg-[#1d61f2] text-white font-bold text-xs sm:text-sm px-3.5 py-1 rounded-full tracking-wide shadow-sm">
              Talents by catagory :
            </span>
          </div>

          {/* 3-Column Grid of 8 Colorful Category Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            {HOME_CATEGORY_CARDS.map((cat) => {
              const count = getCategoryCount(cat.filter);
              return (
                <motion.div
                  key={cat.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate('listing', cat.filter)}
                  style={{ backgroundColor: cat.bgColor }}
                  className="rounded-2xl p-2.5 sm:p-4 aspect-square flex flex-col items-center justify-center text-center cursor-pointer shadow-lg transition-transform border border-black/5"
                >
                  <CategoryCardIcon type={cat.iconType} />
                  <span className="text-black font-extrabold text-xs sm:text-sm leading-tight whitespace-pre-line mt-0.5">
                    {cat.label}
                  </span>
                  <span className="text-black/70 font-medium text-[10px] sm:text-xs mt-1">
                    ({count} {count === 1 ? 'talent' : 'talents'})
                  </span>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ================= NEW BORN SECTION (BLACK CARD) ================= */}
        <section className="my-3 bg-black rounded-3xl p-4 sm:p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <span className="bg-[#1d61f2] text-white font-bold text-xs sm:text-sm px-3.5 py-1 rounded-full tracking-wide shadow-sm">
              New born
            </span>
            <button
              onClick={() => onNavigate('listing')}
              className="text-white hover:text-gray-300 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              View all &gt;
            </button>
          </div>

          {/* Ranked Card List Container */}
          <div className="space-y-4 pt-1">
            {!talentsReceived ? (
              [1, 2, 3, 4].map((num) => (
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
              newBornTalents.map((talent, idx) => (
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
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-white/20 bg-white group-hover:border-[#1d61f2] transition-colors shrink-0"
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
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {talent.location || talent.city || 'Nepal'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-xs py-4 text-center">No talents found</div>
            )}
          </div>
        </section>

        {/* ================= OUR GOALS SECTION (BLACK CARD) ================= */}
        <section className="my-3 mb-6 bg-black rounded-3xl p-5 sm:p-6 text-white shadow-xl">
          <h3 className="text-base sm:text-lg font-black text-white tracking-wide mb-3 text-center">
            Our goals :
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-[#1d61f2] font-bold mt-0.5">•</span>
              <span>Connect Nepal&apos;s finest actors, directors, writers, and film technicians with leading casting agencies.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1d61f2] font-bold mt-0.5">•</span>
              <span>Provide a unified platform for talent discovery and casting opportunities across Nepal.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1d61f2] font-bold mt-0.5">•</span>
              <span>Empower emerging artists by giving them visibility to global production houses.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1d61f2] font-bold mt-0.5">•</span>
              <span>Simplify the casting process for producers, directors, and agencies.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1d61f2] font-bold mt-0.5">•</span>
              <span>Build a strong community that supports and grows Nepal&apos;s entertainment industry.</span>
            </li>
          </ul>
        </section>
      </div>
    </Desktop3ColumnLayout>
  );
}
