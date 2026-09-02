import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  MapPin, Plus, Search, AlertCircle, Clock, SlidersHorizontal, ChevronLeft
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { subscribeToCastingCalls } from '../../services';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';
import { CastingCallSkeleton } from '../../components/ui/Skeleton';
import { getOptimizedImageUrl, getImageSrcSet } from '../../utils/media';

const formatDeadlineDate = (deadlineStr) => {
  if (!deadlineStr) return 'No deadline';
  const dDate = new Date(deadlineStr);
  if (isNaN(dDate.getTime())) return deadlineStr;
  return dDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDeadlineBadge = (deadlineStr) => {
  if (!deadlineStr) return { label: 'OPEN', isClosed: false };
  const dDate = new Date(deadlineStr);
  if (isNaN(dDate.getTime())) return { label: 'OPEN', isClosed: false };
  const now = new Date();
  const diffTime = dDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'CLOSED', isClosed: true };
  }
  if (diffDays === 0) {
    return { label: 'TODAY', isClosed: false };
  }
  return { label: `${diffDays}D LEFT`, isClosed: false };
};

const getRolesSummary = (call) => {
  if (call.roles && Array.isArray(call.roles) && call.roles.length > 0) {
    const summaries = call.roles
      .map((r) => {
        if (typeof r === 'string') return r;
        const name = r?.name || '';
        if (!name) return null;
        const age = r.ageRange ? ` (${r.ageRange})` : '';
        return `${name}${age}`;
      })
      .filter(Boolean);
    if (summaries.length > 0) {
      return `Looking for: ${summaries.join(' • ')}`;
    }
  }
  if (call.type) {
    return `Looking for: ${call.type}`;
  }
  return 'Looking for: All Roles';
};

const isMockOrInvalidImage = (url) => {
  if (!url || typeof url !== 'string') return true;
  const lower = url.toLowerCase();
  return (
    url === 'has-file' ||
    lower.includes('placeholder') ||
    lower.includes('dummy') ||
    lower.includes('sample') ||
    lower.includes('fake') ||
    lower.includes('test') ||
    lower.includes('movie-banner.png') ||
    lower.includes('movie-banner.webp') ||
    lower.includes('images.unsplash.com') ||
    lower.includes('via.placeholder.com')
  );
};

const getCastingThumbnail = (call) => {
  if (!call) return null;
  const raw = call.thumbnail || call.image || call.coverImage || call.posterUrl || call.poster || call.bannerUrl || call.media?.[0]?.url || call.photoURL || null;
  return raw && !isMockOrInvalidImage(raw) ? raw : null;
};

const formatCategoryTag = (call) => {
  const cat = call.category || call.type || 'Project';
  if (cat.toLowerCase().startsWith('nepali')) {
    return cat.toUpperCase();
  }
  return `NEPALI ${cat.toUpperCase()}`;
};

const CastingCallItem = memo(({ call, isSaved, isApplied, onNavigate, toggleSave }) => {
  const bannerImage = getCastingThumbnail(call);
  const deadlineBadge = getDeadlineBadge(call.deadline);
  const formattedDate = formatDeadlineDate(call.deadline);
  const roleNeeded = getRolesSummary(call);
  const categoryTag = formatCategoryTag(call);

  return (
    <div
      onClick={() => onNavigate('casting-detail', call.id)}
      className="bg-black rounded-2xl border border-white/5 overflow-hidden cursor-pointer flex flex-row shadow-xl"
    >
      {/* Full-Bleed Poster Thumbnail (No empty black padding around it) */}
      <div className="w-28 sm:w-40 md:w-44 aspect-[9/13] self-stretch relative shrink-0 bg-[#121212] overflow-hidden flex items-center justify-center">
        {bannerImage ? (
          <img
            src={getOptimizedImageUrl(bannerImage, { width: 400, quality: 'auto', format: 'auto' })}
            srcSet={getImageSrcSet(bannerImage, [240, 400, 600])}
            sizes="(max-width: 640px) 112px, 176px"
            alt={call.title || 'Casting Call'}
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

        {/* Default Clapperboard Thumbnail Fallback */}
        <div
          className="default-clapper-thumb w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c1c] via-[#121212] to-[#080808] p-2 text-center"
          style={{ display: bannerImage ? 'none' : 'flex' }}
        >
          <svg className="w-9 h-9 sm:w-11 sm:h-11 text-white fill-current drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24">
            <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
          </svg>
        </div>

        {isApplied && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-white text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider z-10 shadow">
            Applied
          </div>
        )}
      </div>

      {/* Info & Content Column */}
      <div className="flex-1 p-3.5 sm:p-5 flex flex-col justify-between gap-3 min-w-0">
        <div className="space-y-1 sm:space-y-1.5">
          {/* Top Row: Category Tag & Bookmark */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#522C69] font-bold text-[10px] sm:text-[11px] tracking-wider uppercase truncate">
              {categoryTag}
            </span>

            <button
              onClick={(e) => toggleSave(e, call.id)}
              className="p-1 text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
              title={isSaved ? "Saved" : "Save casting call"}
              aria-label="Save"
            >
              <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} className="text-white" />
            </button>
          </div>

          {/* Project Title */}
          <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
            {call.title || 'Untitled Casting Call'}
          </h3>

          {/* Looking for */}
          <p className="text-xs sm:text-sm text-gray-300 font-medium line-clamp-1">
            {roleNeeded}
          </p>

          {/* Location */}
          <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
            <span>{call.location || 'Kathmandu'}</span>
          </p>

          {/* Salary / Compensation */}
          <p className="text-xs sm:text-sm font-bold text-[#522C69] pt-0.5 truncate">
            Salary: {call.budget || call.salary || 'NPR Negotiable'}
          </p>
        </div>

        {/* Bottom Status Row / Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs">
          {/* Left Deadline */}
          <div className="flex items-center gap-1.5 text-gray-400 text-[11px] sm:text-xs">
            <Clock className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Deadline: {formattedDate}</span>
          </div>

          {/* Right Status Badge */}
          <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[9px] sm:text-xs font-black tracking-wider uppercase border ${
            deadlineBadge.isClosed
              ? 'bg-[#222] border-white/10 text-gray-400'
              : 'bg-[#522C69]/15 border-[#522C69]/30 text-[#522C69]'
          }`}>
            {deadlineBadge.label}
          </span>
        </div>
      </div>
    </div>
  );
});
CastingCallItem.displayName = 'CastingCallItem';

const CATEGORY_TABS = [
  'All',
  'Feature Film',
  'Short Film',
  'Web Series',
  'Commercial',
  'Music Video',
  'Theatre',
  'Documentary'
];

export default function CastingCall({ onNavigate, user, isAdmin, filter = 'All' }) {
  const { t } = useTranslation();
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('All');
  const [activeFilter, setActiveFilter] = useState(filter === 'my-calls' ? 'My Applications' : 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const triggerSearchLoading = () => {
    setIsSearching(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 450);
  };
  const [calls, setCalls] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [appliedCastingIds, setAppliedCastingIds] = useState([]);
  const [activeSort, setActiveSort] = useState('Latest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedPayStatus, setSelectedPayStatus] = useState('All');
  const [visibleLimit, setVisibleLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const LOCATIONS = [
    'All',
    'Kathmandu',
    'Pokhara',
    'Lalitpur',
    'Bhaktapur',
    'Chitwan',
    'Biratnagar',
    'Dharan',
    'Butwal',
    'Bhairahawa',
    'Nepalgunj',
    'Birgunj',
    'Janakpur',
    'Hetauda',
    'Dhangadhi',
    'Itahari',
    'Birtamod',
    'Surkhet',
    'Gorkha',
    'Mustang',
    'International'
  ];
  const PAY_OPTIONS = [
    { id: 'All', label: 'All Compensation' },
    { id: 'Paid', label: 'Paid Roles Only' },
    { id: 'Stipend', label: 'Stipend Offered' },
    { id: 'Unpaid', label: 'Unpaid / Indie' }
  ];

  const filterPills = [
    { id: 'All', label: 'All' },
    { id: 'Open', label: 'Open' },
    { id: 'Closing Soon', label: 'Closing Soon' },
    { id: 'My Applications', label: 'My Applications' }
  ];

  const sortOptions = [
    { id: 'Latest', label: 'Latest Posted' },
    { id: 'Deadline', label: 'Deadline' },
    { id: 'Category', label: 'Category' }
  ];

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToCastingCalls('All', (data) => {
      setCalls(data);
      setIsLoading(false);
      setHasMore(data.length >= visibleLimit);
    }, undefined, visibleLimit);
    return () => unsubscribe();
  }, [visibleLimit]);

  useEffect(() => {
    setActiveFilter(filter === 'my-calls' ? 'My Applications' : 'All');
  }, [filter]);

  useEffect(() => {
    if (!user) {
      setSavedIds([]);
      return;
    }
    const q = query(
      collection(db, "saved_calls"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const ids = snap.docs.map(doc => doc.data().castingId);
      setSavedIds(ids);
    }, (err) => {
      console.warn("Saved calls subscription failed:", err);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      setAppliedCastingIds([]);
      return;
    }
    const q = query(
      collection(db, "applications"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const ids = snap.docs.map(doc => doc.data().castingId);
      setAppliedCastingIds(ids);
    }, (err) => {
      console.warn("Applications subscription failed:", err);
    });
    return () => unsub();
  }, [user?.uid]);

  const canPostCall = user && (user.role === 'Director' || user.role === 'Directors' || isAdmin);

  const filteredCalls = calls
    .filter(call => {
      const matchesSearch = !searchQuery ||
        call.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.production?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.type?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category Horizontal Tabs Filter
      if (selectedCategoryTab !== 'All') {
        const catStr = (call.category || call.type || '').toLowerCase();
        if (!catStr.includes(selectedCategoryTab.toLowerCase())) return false;
      }

      // Location Filter
      if (selectedLocation !== 'All') {
        const locLower = (call.location || '').toLowerCase();
        if (!locLower.includes(selectedLocation.toLowerCase())) return false;
      }

      // Pay Status Filter
      if (selectedPayStatus !== 'All') {
        const budgetStr = (call.budget || call.salary || '').toLowerCase();
        if (selectedPayStatus === 'Paid') {
          if (budgetStr.includes('unpaid') || budgetStr.includes('volunteer')) return false;
        } else if (selectedPayStatus === 'Stipend') {
          if (!budgetStr.includes('stipend')) return false;
        } else if (selectedPayStatus === 'Unpaid') {
          if (budgetStr && !budgetStr.includes('unpaid') && !budgetStr.includes('volunteer')) return false;
        }
      }

      if (activeFilter === 'Open') {
        if (!call.deadline) return true;
        const dDate = new Date(call.deadline);
        if (isNaN(dDate.getTime())) return true;
        return dDate.getTime() >= new Date().getTime();
      }

      if (activeFilter === 'Closing Soon') {
        if (!call.deadline) return false;
        const dDate = new Date(call.deadline);
        if (isNaN(dDate.getTime())) return false;
        const diffDays = Math.ceil((dDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays < 3;
      }

      if (activeFilter === 'My Applications') {
        return appliedCastingIds.includes(call.id);
      }

      return true;
    })
    .sort((a, b) => {
      if (activeSort === 'Deadline') {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return (isNaN(dateA) ? Infinity : dateA) - (isNaN(dateB) ? Infinity : dateB);
      }
      if (activeSort === 'Category') {
        const catA = a.category || a.type || '';
        const catB = b.category || b.type || '';
        return catA.localeCompare(catB);
      }

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  const toggleSave = useCallback(async (e, callId) => {
    e.stopPropagation();
    if (!user) {
      onNavigate('signin');
      return;
    }
    const isSaved = savedIds.includes(callId);
    // Optimistically update saved state immediately for instant feedback
    if (isSaved) {
      setSavedIds(prev => prev.filter(id => id !== callId));
    } else {
      setSavedIds(prev => [...prev, callId]);
    }
    try {
      const q = query(
        collection(db, "saved_calls"),
        where("userId", "==", user.uid),
        where("castingId", "==", callId)
      );
      const { deleteDoc, addDoc, getDocs } = await import('firebase/firestore');
      if (isSaved) {
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } else {
        await addDoc(collection(db, "saved_calls"), {
          userId: user.uid,
          castingId: callId,
          savedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      // Revert state if error
      if (isSaved) {
        setSavedIds(prev => [...prev, callId]);
      } else {
        setSavedIds(prev => prev.filter(id => id !== callId));
      }
      console.error("Error toggling save:", err);
    }
  }, [user, savedIds, onNavigate]);

  return (
    <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting" trendingCalls={calls}>
      <div className="min-h-screen bg-[#141414] text-white relative font-sans pb-12">
        <SEO
          title="Casting Calls & Auditions | NepalCasts"
          description="Find Nepali movie casting calls, short films, models, and dancers auditions."
        />

        {/* Main Feed Container */}
        <div className="max-w-4xl mx-auto px-0 sm:px-6 w-full pt-4 space-y-4">

          {/* PAGE TITLE */}
          <div className="flex items-center justify-between px-3 sm:px-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('back')}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
                aria-label="Back"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                CASTING CALLS & AUDITIONS
              </h1>
            </div>

            {canPostCall && (
              <button
                onClick={() => onNavigate('casting-create')}
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm text-xs font-bold uppercase px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus size={14} strokeWidth={3} />
                Post Call
              </button>
            )}
          </div>

          {/* SEARCH BAR & FILTER TOGGLE */}
          <div className="relative flex items-center w-full px-3 sm:px-0">
            <Search className="absolute left-4 w-4 h-4 text-white pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search casting calls..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                triggerSearchLoading();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  triggerSearchLoading();
                }
              }}
              className="w-full bg-black border border-white/10 focus:border-white/30 rounded-xl py-3 pl-11 pr-12 text-sm text-white placeholder-gray-500 outline-none transition-all shadow-inner"
            />
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="absolute right-3.5 p-1.5 text-white hover:text-white/80 transition-colors cursor-pointer"
              title="Filter options"
              aria-label="Filter options"
            >
              <SlidersHorizontal className="w-4 h-4 text-white" strokeWidth={2.2} />
            </button>

            {/* Filter Dropdown */}
            <AnimatePresence>
              {isSortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsSortOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-52 bg-black border border-white/15 rounded-xl shadow-2xl py-3 z-40 text-left"
                  >
                    {/* Status Filter */}
                    <div className="px-4 py-1 text-[9px] text-gray-400 uppercase tracking-widest font-black mb-1">Status</div>
                    {filterPills.map(pill => {
                      const isActive = activeFilter === pill.id;
                      return (
                        <button
                          key={pill.id}
                          onClick={() => {
                            setActiveFilter(pill.id);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive
                              ? 'text-[#522C69] bg-[#522C69]/10'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                          {pill.label}
                        </button>
                      );
                    })}

                    {/* Region */}
                    <div className="h-px bg-white/5 my-2" />
                    <div className="px-4 py-1 text-[9px] text-gray-400 uppercase tracking-widest font-black mb-1">Region</div>
                    <div className="px-3">
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full bg-[#141414] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none cursor-pointer"
                      >
                        {LOCATIONS.map((loc) => (
                          <option key={loc} value={loc} className="bg-black text-white">
                            {loc === 'All' ? 'All Regions' : loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Compensation */}
                    <div className="h-px bg-white/5 my-2" />
                    <div className="px-4 py-1 text-[9px] text-gray-400 uppercase tracking-widest font-black mb-1">Compensation</div>
                    <div className="px-3">
                      <select
                        value={selectedPayStatus}
                        onChange={(e) => setSelectedPayStatus(e.target.value)}
                        className="w-full bg-[#141414] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold outline-none cursor-pointer"
                      >
                        {PAY_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id} className="bg-black text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div className="h-px bg-white/5 my-2" />
                    <div className="px-4 py-1 text-[9px] text-gray-400 uppercase tracking-widest font-black mb-1">Sort By</div>
                    {sortOptions.map(opt => {
                      const isActive = activeSort === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setActiveSort(opt.id);
                            setIsSortOpen(false);
                          }}
                          className={`w-full text-left px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive
                              ? 'text-[#522C69] bg-[#522C69]/10'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* CATEGORY TABS (HORIZONTAL SCROLL) */}
          <div className="flex items-center gap-6 overflow-x-auto pb-1 px-3 sm:px-0 border-b border-white/10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategoryTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setSelectedCategoryTab(tab)}
                  className={`relative py-1.5 text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#522C69] font-extrabold'
                      : 'text-gray-400 hover:text-white font-medium'
                  }`}
                >
                  <span>{tab}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#522C69] shadow-[0_0_8px_rgba(82,44,105,0.8)]"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* LISTINGS FEED */}
          <div className="space-y-3.5 pt-1">
            {isLoading || isSearching ? (
              <CastingCallSkeleton count={3} />
            ) : filteredCalls.length === 0 ? (
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-12 px-6 bg-black rounded-xl border border-white/10 w-full">
                <AlertCircle size={44} className="text-gray-600 mb-3" />
                <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5">No Casting Calls Found</h3>
                <p className="text-gray-400 text-xs sm:text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                  Try adjusting your category filter, location, or check back later for new auditions.
                </p>
                {canPostCall && (
                  <button
                    onClick={() => onNavigate('casting-create')}
                    className="bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={3} />
                    Post a Call
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredCalls.map(call => (
                  <CastingCallItem
                    key={call.id}
                    call={call}
                    isSaved={savedIds.includes(call.id)}
                    isApplied={appliedCastingIds.includes(call.id)}
                    onNavigate={onNavigate}
                    toggleSave={toggleSave}
                  />
                ))}
                {hasMore && (
                  <div className="flex justify-center pt-3 pb-6">
                    <button
                      onClick={() => setVisibleLimit(prev => prev + 20)}
                      className="px-6 py-2.5 rounded-full bg-[#1c1c1c] hover:bg-[#282828] border border-white/10 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-md"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </Desktop3ColumnLayout>
  );
}
