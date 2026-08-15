import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  MapPin, Plus, Search, AlertCircle, Clock, SlidersHorizontal, ChevronLeft, Flame
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { subscribeToCastingCalls } from '../../services';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';
import { CastingCallSkeleton } from '../../components/ui/Skeleton';

const getUrgentStatus = (deadlineStr) => {
  if (!deadlineStr) return null;
  const dDate = new Date(deadlineStr);
  if (isNaN(dDate.getTime())) return null;
  const diffMs = dDate.getTime() - new Date().getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (diffHours >= 0 && diffHours <= 48) {
    return `${diffHours}h left`;
  }
  return null;
};

const getDeadlineStatus = (deadlineStr) => {
  if (!deadlineStr) return { color: 'text-gray-400 border-white/5 bg-white/5', label: 'No deadline' };
  const dDate = new Date(deadlineStr);
  if (isNaN(dDate.getTime())) {

    return { color: 'text-gray-400 border-white/5 bg-white/5', label: deadlineStr };
  }
  const now = new Date();
  const diffTime = dDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { color: 'text-red-500/60 border-red-500/10 bg-red-500/5', label: 'Closed' };
  }
  if (diffDays < 3) {
    return { color: 'text-red-400 border-red-500/20 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)] font-bold', label: `${diffDays}d left` };
  }
  if (diffDays < 7) {
    return { color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10 font-bold', label: `${diffDays}d left` };
  }
  return { color: 'text-gray-400 border-white/5 bg-white/5', label: `${diffDays}d left` };
};

const getRolesSummary = (call) => {
  if (!call.roles || !Array.isArray(call.roles) || call.roles.length === 0) {
    return 'Looking for: Casting Roles';
  }
  const summaries = call.roles.map(r => {
    if (typeof r === 'string') return r;
    const name = r.name || 'Role';
    const age = r.ageRange ? `, ${r.ageRange}` : '';
    return `${name}${age}`;
  });
  return `Looking for: ${summaries.join(' | ')}`;
};

const CastingCallItem = memo(({ call, isSaved, isApplied, onNavigate, toggleSave }) => {
  const bannerImage = (call.thumbnail && call.thumbnail !== 'has-file') ? call.thumbnail : '/movie-banner.png';
  const deadlineInfo = getDeadlineStatus(call.deadline);
  const urgentText = getUrgentStatus(call.deadline);
  const roleNeeded = getRolesSummary(call);

  return (
    <div
      onClick={() => onNavigate('casting-detail', call.id)}
      className="flex items-start justify-between py-3 sm:py-3.5 border-b border-white/10 transition-all cursor-pointer gap-3 sm:gap-6"
    >
      {/* Left: Poster + Details */}
      <div className="flex items-start gap-3 sm:gap-5 flex-1 min-w-0">
        {/* Poster Thumbnail */}
        <div className="w-36 sm:w-52 h-24 sm:h-32 rounded-xl overflow-hidden relative shrink-0 bg-[#111] border border-white/10">
          <img
            src={bannerImage}
            alt={call.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/movie-banner.png';
            }}
          />
          {isApplied && (
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#00BFFF] text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider">
              Applied
            </div>
          )}
          {urgentText && (
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-red-600/90 border border-red-400 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg backdrop-blur-md">
              <Flame className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
              <span>URGENT</span>
            </div>
          )}
        </div>

        {/* Text content details */}
        <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
              {call.category || call.type || 'Nepali Project'}
            </span>
          </div>

          <h2 className="text-base sm:text-2xl font-bold text-white leading-tight truncate">
            {call.title}
          </h2>

          <p className="text-xs text-gray-400 font-medium line-clamp-1 leading-relaxed">
            {roleNeeded}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-gray-400 pt-0.5">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#00BFFF] shrink-0" />
              <span className="truncate max-w-[100px] sm:max-w-none">{call.location || 'Nepal'}</span>
            </span>
            {call.budget && (
              <span className="flex items-center gap-1 text-[#00BFFF] font-bold">
                Salary: {call.budget}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Action & Deadline Column */}
      <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2">
        <button
          onClick={(e) => toggleSave(e, call.id)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-gray-400 hover:text-white"
        >
          <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} className={isSaved ? 'text-[#00BFFF]' : ''} />
        </button>

        <span className={`flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${deadlineInfo.color}`}>
          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
          {deadlineInfo.label}
        </span>
      </div>
    </div>
  );
});
CastingCallItem.displayName = 'CastingCallItem';

export default function CastingCall({ onNavigate, user, isAdmin, filter = 'All' }) {
  const { t } = useTranslation();
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
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
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

      // Location Filter
      if (selectedLocation !== 'All') {
        const locLower = (call.location || '').toLowerCase();
        if (!locLower.includes(selectedLocation.toLowerCase())) return false;
      }

      // Pay Status Filter
      if (selectedPayStatus !== 'All') {
        const budgetStr = (call.budget || '').toLowerCase();
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
      console.error("Error toggling save:", err);
    }
  }, [user, savedIds, onNavigate]);

  return (
    <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting" trendingCalls={calls}>
      <div className="min-h-screen bg-[#0A0A0A] text-white relative font-sans">
      <SEO
        title="Casting Calls & Auditions | NepalCasts"
        description="Find Nepali movie casting calls, short films, models, and dancers auditions."
      />

      {/* Main Feed: Full width centered on desktop */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 md:px-12 w-full">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-8">
          {/* Left Side: Back button & Title */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => onNavigate('back')}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
              aria-label="Back"
              title="Go Back"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase leading-none">
                {t('casting.title')}
              </h2>
            </div>
          </div>

          {/* Right Side: Search, Filters & Post button */}
          <div className="flex items-center gap-3 self-end sm:self-center">

            {/* Always Visible Search Box with Clickable Search Icon on Right Side */}
            <div className="relative flex items-center">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('casting.searchPlaceholder') || 'Search casting calls...'}
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
                className="bg-white/5 border border-white/10 focus:border-sky-400/60 rounded-full py-1.5 pl-4 pr-9 text-xs text-white placeholder-gray-500 outline-none w-36 sm:w-52 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => {
                  triggerSearchLoading();
                  if (searchInputRef.current) {
                    searchInputRef.current.focus();
                  }
                }}
                className="absolute right-2.5 text-gray-400 hover:text-sky-400 transition-colors p-1 cursor-pointer"
                title="Search projects"
                aria-label="Search projects"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Filter/Sort Dropdown Button (Icon Only) */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-300 transition-colors duration-200 cursor-pointer"
                aria-label="Filter and Sort options"
                title="Filter and Sort options"
              >
                <SlidersHorizontal className="w-[18px] h-[18px] text-sky-400" strokeWidth={2} />
              </button>

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
                      className="absolute right-0 mt-2 w-44 bg-[#111116] border border-white/10 rounded-xl shadow-2xl py-2 z-40 text-left"
                    >
                      {/* Section 1: Filter */}
                      <div className="px-4 py-1 text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Filter By</div>
                      {filterPills.map(pill => {
                        const isActive = activeFilter === pill.id;
                        return (
                          <button
                            key={pill.id}
                            onClick={() => {
                              setActiveFilter(pill.id);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive
                                ? 'text-sky-400 bg-sky-400/5'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                              }`}
                          >
                            {pill.label}
                          </button>
                        );
                      })}

                      {/* Section 2: Location */}
                      <div className="h-px bg-white/5 my-2" />
                      <div className="px-4 py-1 text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Region / Location</div>
                      <div className="px-2 space-y-1">
                        <select
                          value={selectedLocation}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-semibold outline-none cursor-pointer"
                        >
                          {LOCATIONS.map((loc) => (
                            <option key={loc} value={loc} className="bg-[#111116] text-white">
                              {loc === 'All' ? 'All Regions' : loc}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Section 3: Pay Status */}
                      <div className="h-px bg-white/5 my-2" />
                      <div className="px-4 py-1 text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Compensation</div>
                      <div className="px-2 space-y-1">
                        <select
                          value={selectedPayStatus}
                          onChange={(e) => setSelectedPayStatus(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-semibold outline-none cursor-pointer"
                        >
                          {PAY_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id} className="bg-[#111116] text-white">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="h-px bg-white/5 my-2" />

                      {/* Section 4: Sort */}
                      <div className="px-4 py-1 text-[9px] text-gray-500 uppercase tracking-widest font-black mb-1">Sort By</div>
                      {sortOptions.map(opt => {
                        const isActive = activeSort === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setActiveSort(opt.id);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive
                                ? 'text-sky-400 bg-sky-400/5'
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


          </div>
        </div>

        {/* LISTINGS */}
        <div className="flex flex-col">
          {isLoading || isSearching ? (
            <CastingCallSkeleton count={3} />
          ) : filteredCalls.length === 0 ? (
            <div className="min-h-[65vh] flex flex-col items-center justify-center text-center py-12 px-6 border-b border-white/5 w-full">
              <AlertCircle size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No Casting Calls Found</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                Try adjusting your filters, search term, or check back later for new auditions.
              </p>
              {canPostCall && (
                <button
                  onClick={() => onNavigate('casting-create')}
                  className="bg-gradient-to-br from-sky-400 to-sky-600 text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-sky-500/10 hover:brightness-110 active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={3} />
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
                <div className="flex justify-center mt-6 py-4">
                  <button
                    onClick={() => setVisibleLimit(prev => prev + 20)}
                    className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
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
