import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bookmark, SortDesc, ChevronDown, Check, 
  MapPin, Plus, Search, AlertCircle, Clock 
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { subscribeToCastingCalls } from '../services/casting';
import SEO from '../components/SEO';

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

export default function CastingCall({ onNavigate, user, isAdmin }) {
  const [activeFilter, setActiveFilter] = useState('All'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [calls, setCalls] = useState([]);
  const [savedIds, setSavedIds] = useState([]); 
  const [appliedCastingIds, setAppliedCastingIds] = useState([]);
  const [activeSort, setActiveSort] = useState('Latest'); 
  const [isSortOpen, setIsSortOpen] = useState(false);

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
    });
    return () => unsubscribe();
  }, []);

  
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

  const toggleSave = async (e, callId) => {
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
      const { deleteDoc, addDoc } = await import('firebase/firestore');
      if (isSaved) {
        onSnapshot(q, (snap) => {
          snap.docs.forEach(async (d) => {
            await deleteDoc(d.ref);
          });
        });
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
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative font-sans">
      <SEO 
        title="Casting Calls & Auditions | NepalCasts" 
        description="Find Nepali movie casting calls, short films, models, and dancers auditions." 
      />

      {/* Main Feed: Full width centered on desktop */}
      <main className="max-w-5xl mx-auto px-6 sm:px-12 md:px-16 py-12 md:py-20 w-full">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Opportunities</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">Open casting calls from verified productions</p>
          </div>
          {canPostCall && (
            <button
              onClick={() => onNavigate('casting-create')}
              className="bg-gradient-to-br from-sky-400 to-sky-600 text-black px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-sky-500/10 active:scale-[0.98] flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} strokeWidth={3} />
              Post a Call
            </button>
          )}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-10">
          
          {/* Filter pills */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide w-full border-b border-white/5">
            {filterPills.map(pill => {
              const isActive = activeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setActiveFilter(pill.id)}
                  className={`flex-shrink-0 px-4 md:px-8 py-2 rounded-full text-[10px] md:text-xs font-medium uppercase tracking-wider md:tracking-[0.2em] transition-all duration-300 ${
                    isActive
                      ? 'border border-sky-400 bg-gradient-to-b from-sky-400/10 to-transparent text-sky-400 shadow-lg shadow-sky-500/5'
                      : 'bg-transparent text-gray-500 hover:text-white border border-transparent'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Search Input & Sort dropdown */}
          <div className="flex items-center justify-between gap-4 w-full pt-1 md:pt-2">
            {/* Search Box */}
            <div className="relative flex-1 max-w-[200px] sm:max-w-xs">
              <Search className="absolute left-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b border-white/10 focus:border-sky-400 pl-7 pr-2 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all duration-300 focus:shadow-[0_1px_0_0_#38bdf8]"
              />
            </div>

            {/* Sort Toggle */}
            <div className="relative shrink-0">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center gap-1.5 px-1 py-2 bg-transparent border-b border-white/10 text-xs font-medium uppercase tracking-[0.1em] md:tracking-[0.2em] text-gray-400 hover:text-white transition-all duration-300 ${isSortOpen ? 'border-sky-400 text-sky-400 shadow-[0_1px_0_0_#38bdf8]' : ''}`}
              >
                <span>{activeSort}</span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-44 bg-[#111] border border-white/5 rounded-2xl shadow-2xl z-[100] py-1.5 overflow-hidden"
                  >
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setActiveSort(opt.id); setIsSortOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-all uppercase tracking-wider ${
                          activeSort === opt.id 
                            ? 'bg-sky-400/10 text-sky-400' 
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {opt.label}
                        {activeSort === opt.id && <Check size={12} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* LISTINGS */}
        <div className="flex flex-col">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between py-8 border-b border-white/5 gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1 w-full">
                    <div className="w-full sm:w-48 h-28 rounded-xl bg-white/5 shrink-0" />
                    <div className="space-y-3 flex-1">
                      <div className="h-3 bg-white/5 rounded w-1/4" />
                      <div className="h-6 bg-white/5 rounded w-1/2" />
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                    </div>
                  </div>
                  <div className="h-10 bg-white/5 rounded w-28 shrink-0" />
                </div>
              ))}
            </>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-24 border-b border-white/5 px-6">
              <AlertCircle size={40} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Casting Calls Found</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8">
                Try adjusting your filters, search term, or check back later for new auditions.
              </p>
              {canPostCall && (
                <button
                  onClick={() => onNavigate('casting-create')}
                  className="bg-gradient-to-br from-sky-400 to-sky-600 text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-sky-500/10 hover:brightness-110 active:scale-[0.98]"
                >
                  Create Casting Call
                </button>
              )}
            </div>
          ) : (
            filteredCalls.map(call => {
              const bannerImage = call.thumbnail || '/movie-banner.png';
              const isSaved = savedIds.includes(call.id);
              const isApplied = appliedCastingIds.includes(call.id);
              const deadlineInfo = getDeadlineStatus(call.deadline);
              const roleNeeded = getRolesSummary(call);

              return (
                 <div
                   key={call.id}
                   onClick={() => onNavigate('casting-detail', call.id)}
                   className="group flex flex-col sm:flex-row items-start sm:items-center justify-between py-8 border-b border-white/10 hover:border-sky-400/50 transition-all duration-300 cursor-pointer gap-6"
                 >
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1 w-full min-w-0">
                     {/* Widescreen image thumbnail */}
                     <div className="w-full sm:w-48 h-28 rounded-xl overflow-hidden relative shrink-0 bg-[#111] border border-white/5">
                       <img 
                         src={bannerImage} 
                         alt={call.title} 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onError={(e) => {
                           e.currentTarget.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=640&auto=format&fit=crop';
                         }}
                       />
                       {isApplied && (
                         <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-sky-400 text-black text-[9px] font-black uppercase tracking-wider">
                           Applied
                         </div>
                       )}
                     </div>

                     {/* Text content details */}
                     <div className="space-y-2 flex-1 min-w-0">
                       <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                           {call.category || call.type || 'Nepali Project'}
                         </span>
                       </div>
                       
                       <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-sky-400 transition-colors leading-tight truncate">
                         {call.title}
                       </h2>
                       
                       <p className="text-sm text-gray-400 font-medium line-clamp-1 leading-relaxed">
                         {roleNeeded}
                       </p>

                       <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                         <span className="flex items-center gap-1.5">
                           <MapPin className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                           {call.location || 'Nepal'}
                         </span>
                         {call.budget && (
                           <span className="flex items-center gap-1 text-emerald-400 font-bold">
                             <span className="text-gray-600 text-[10px] font-black">Rs.</span>
                             {call.budget}
                           </span>
                         )}
                       </div>
                     </div>
                   </div>

                   {/* Right: Deadline & Action */}
                   <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                     <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${deadlineInfo.color}`}>
                       <Clock className="w-3 h-3 shrink-0" />
                       {deadlineInfo.label}
                     </span>
                     
                     <div className="flex items-center gap-3">
                       <button
                         onClick={(e) => toggleSave(e, call.id)}
                         className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-gray-400 hover:text-white"
                       >
                         <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} className={isSaved ? 'text-sky-400' : ''} />
                       </button>
                       <span className="text-xs font-bold text-sky-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 whitespace-nowrap">
                         View Role &gt;
                       </span>
                     </div>
                   </div>
                </div>
              );
            })
          )}
        </div>

      </main>
    </div>
  );
}
