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
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-32 md:pb-20 relative font-sans">
      <SEO 
        title="Casting Calls & Auditions | NC Network" 
        description="Find Nepali movie casting calls, short films, models, and dancers auditions." 
      />
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/5 pb-8 mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-[4px] h-9 bg-[#FACC15] rounded-full" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Casting Calls</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Open opportunities from verified productions</p>
            </div>
          </div>
          {canPostCall && (
            <button
              onClick={() => onNavigate('casting-create')}
              className="bg-[#00BFFF] hover:opacity-95 text-[#0A0A0A] px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#00BFFF]/10 active:scale-[0.98] flex items-center gap-1.5 shrink-0"
            >
              <Plus size={15} strokeWidth={3} />
              Post a Call
            </button>
          )}
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          
          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1 pr-2">
            {filterPills.map(pill => {
              const isActive = activeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setActiveFilter(pill.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all uppercase tracking-wider ${
                    isActive
                      ? 'bg-white text-black shadow-lg shadow-white/5'
                      : 'bg-[#111] border border-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Search Input & Sort dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Search Box */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-white/5 focus:border-[#00BFFF] rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
              />
            </div>

            {/* Sort Toggle */}
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111] border border-white/5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all ${isSortOpen ? 'border-[#00BFFF] text-[#00BFFF]' : ''}`}
              >
                <SortDesc size={13} />
                <span>{activeSort}</span>
                <ChevronDown size={13} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
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
                            ? 'bg-[#00BFFF]/10 text-[#00BFFF]' 
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
        <div className="space-y-6">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-[#111] border border-white/5 rounded-[2rem] overflow-hidden">
                  <div className="h-40 bg-white/5 w-full" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 bg-white/5 rounded w-1/3" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                    <div className="h-8 bg-white/5 rounded w-full" />
                  </div>
                </div>
              ))}
            </>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-20 bg-[#111]/85 border border-white/5 rounded-[2rem] px-6">
              <AlertCircle size={40} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Casting Calls Found</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                Try adjusting your filters, search term, or check back later for new auditions.
              </p>
              {canPostCall && (
                <button
                  onClick={() => onNavigate('casting-create')}
                  className="bg-[#00BFFF] text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-md shadow-[#00BFFF]/10"
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
                  className="group relative bg-[#111]/85 border border-white/5 hover:border-[#00BFFF]/30 rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,191,255,0.04)] flex flex-col"
                >
                  {/* Photo Banner with height 160px */}
                  <div className="h-40 w-full overflow-hidden relative shrink-0">
                    <img 
                      src={bannerImage} 
                      alt={call.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=640&auto=format&fit=crop';
                      }}
                    />
                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent" />
                    
                    {/* Urgently highlighted deadline tag or bookmark overlay */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={(e) => toggleSave(e, call.id)}
                        className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white"
                      >
                        <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} className={isSaved ? 'text-[#00BFFF]' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex flex-col justify-between flex-grow">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        {/* Project title bold white */}
                        <h2 className="text-xl font-black text-white group-hover:text-[#00BFFF] transition-colors leading-tight truncate max-w-sm sm:max-w-md">
                          {call.title}
                        </h2>

                        {/* Category badge: Nepali Short Film grey pill */}
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-gray-400 border border-white/5">
                          {call.category || call.type || ' Nepali Project'}
                        </span>
                      </div>

                      {/* Role needed: Looking for: Lead Actor, 20-30 yrs */}
                      <p className="text-xs text-gray-300 font-medium line-clamp-1 leading-relaxed">
                        {roleNeeded}
                      </p>

                      {/* Location, Deadline, and Pay Row */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-4 flex-wrap gap-4">
                        <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                          {/* Location: with pin icon */}
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            {call.location || 'Nepal'}
                          </span>

                          {/* Deadline: color coded */}
                          <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-widest ${deadlineInfo.color}`}>
                            <Clock className="w-3 h-3 shrink-0" />
                            {deadlineInfo.label}
                          </span>

                          {/* Pay: shown if specified */}
                          {call.budget && (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                              <span className="text-gray-500 text-[10px] font-black shrink-0">Rs.</span>
                              {call.budget}
                            </span>
                          )}
                        </div>

                        {/* View More button (right aligned) */}
                        <div className="flex items-center gap-2">
                          {isApplied && (
                            <span className="px-2.5 py-1 rounded bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] text-[9px] font-bold uppercase tracking-wider">
                              Applied
                            </span>
                          )}
                          <span className="text-xs font-bold text-[#00BFFF] uppercase tracking-wider group-hover:underline flex items-center gap-1">
                            View Details &gt;
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
