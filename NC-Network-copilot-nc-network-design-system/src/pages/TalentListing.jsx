import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, SortDesc, ChevronDown, Search, X, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import Avatar from '../components/ui/Avatar';
import SEO from '../components/SEO';
import Tag from '../components/ui/Tag';
import TalentCardSkeleton from '../components/ui/TalentCardSkeleton';

export default function TalentListing({ onNavigate, initialCategory = 'All' }) {
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter/Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState(initialCategory || 'All');
  const [activeSort, setActiveSort] = useState('recent'); // 'recent', 'followers', 'rating'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [profilesReady, setProfilesReady] = useState(false);

  const roles = ['All', 'Actors', 'Directors', 'Models', 'Dancers', 'Musicians', 'Voice Over', 'VFX', 'Writers'];
  const sortOptions = [
    { id: 'recent', label: 'Recently Active' },
    { id: 'followers', label: 'Most Followers' },
    { id: 'rating', label: 'Highest Rated' }
  ];

  useEffect(() => {
    if (initialCategory) {
      setActiveRole(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    // We fetch all profiles for responsive client-side filtering/sorting
    const q = query(collection(db, "profiles"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTalents(data);
      setLoading(false);
    }, (err) => {
      console.warn("Talents snapshot listener failed or permission denied:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Delayed reveal for skeleton → real card transition ───────
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setProfilesReady(true), 80);
      return () => clearTimeout(t);
    }
    setProfilesReady(false);
  }, [loading]);

  const filteredTalents = talents
    .filter(t => {
      const matchesSearch = !searchQuery || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.role?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = activeRole === 'All' || 
        t.role?.toLowerCase().includes(activeRole.toLowerCase().replace(/s$/, '')) ||
        (activeRole === 'Actors' && t.role?.toLowerCase().includes('actor'));
        
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (activeSort === 'followers') return (b.followers || 0) - (a.followers || 0);
      if (activeSort === 'rating') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
      return 0; // 'recent' is already handled by Firestore query
    });

  return (
    <div className="min-h-screen bg-nc-dark pt-24 pb-20">
      <SEO 
        title="Browse Professional Talent | NC Network" 
        description="Premium directory of cinema professionals in Nepal." 
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Browse Talents</h1>
            <p className="text-xs sm:text-sm text-nc-muted mt-0.5 font-medium">Discover {talents.length} cinema professionals in Nepal</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nc-muted group-focus-within:text-nc-accent transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name or role..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 bg-nc-surface border border-nc-border rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-nc-muted focus:outline-none focus:border-nc-accent/50 focus:bg-nc-surface/80 transition-all shadow-xl"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nc-muted hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 relative">
              {/* Filter Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 bg-nc-card border rounded-full text-xs sm:text-sm font-bold transition-all ${
                    isFilterOpen || activeRole !== 'All' 
                      ? 'border-nc-accent text-nc-accent' 
                      : 'border-nc-border text-nc-secondary hover:text-white'
                  }`}
                >
                  <Filter size={14} />
                  {activeRole === 'All' ? 'Filters' : activeRole}
                  <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-1/2 -translate-x-1/2 md:left-auto md:right-0 mt-2 w-64 bg-nc-surface border border-nc-border rounded-[2rem] shadow-2xl z-[100] p-2 backdrop-blur-xl"
                    >
                      <div className="text-[10px] font-black text-nc-muted px-3 py-2 uppercase tracking-widest">Profession</div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {roles.map(role => (
                          <button
                            key={role}
                            onClick={() => { setActiveRole(role); setIsFilterOpen(false); }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-bold transition-all ${
                              activeRole === role 
                                ? 'bg-nc-accent text-nc-darker' 
                                : 'text-nc-secondary hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {role}
                            {activeRole === role && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 bg-nc-card border rounded-full text-xs sm:text-sm font-bold transition-all ${
                    isSortOpen 
                      ? 'border-nc-accent text-nc-accent' 
                      : 'border-nc-border text-nc-secondary hover:text-white'
                  }`}
                >
                  <SortDesc size={14} />
                  Sort
                </button>

                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-1/2 -translate-x-1/2 md:left-auto md:right-0 mt-2 w-48 bg-nc-surface border border-nc-border rounded-[2rem] shadow-2xl z-[100] p-2 backdrop-blur-xl"
                    >
                      {sortOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => { setActiveSort(opt.id); setIsSortOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-bold transition-all ${
                            activeSort === opt.id 
                              ? 'bg-nc-accent text-nc-darker' 
                              : 'text-nc-secondary hover:bg-white/5 hover:text-white'
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
        </div>

        {/* Clear Filters indicator */}
        {(activeRole !== 'All' || searchQuery) && (
          <div className="flex items-center gap-2 mb-6 animate-in slide-in-from-left duration-300">
            <span className="text-xs text-nc-muted">Filtering by:</span>
            <div className="flex gap-2">
              {activeRole !== 'All' && (
                <div className="bg-nc-accent/10 border border-nc-accent/20 text-nc-accent px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2">
                  CATEGORY: {activeRole.toUpperCase()}
                  <button onClick={() => setActiveRole('All')}><X size={10} /></button>
                </div>
              )}
              {searchQuery && (
                <div className="bg-white/5 border border-white/10 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2">
                  SEARCH: "{searchQuery.toUpperCase()}"
                  <button onClick={() => setSearchQuery('')}><X size={10} /></button>
                </div>
              )}
              <button 
                onClick={() => { setActiveRole('All'); setSearchQuery(''); }}
                className="text-[10px] font-black text-nc-muted hover:text-white transition-colors ml-2 underline underline-offset-4"
              >
                CLEAR ALL
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <TalentCardSkeleton count={10} />
        ) : !profilesReady ? (
          <TalentCardSkeleton count={10} />
        ) : filteredTalents.length === 0 ? (
          <div className="text-center py-32 bg-nc-card border border-nc-border rounded-[2rem] border-dashed">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-nc-muted opacity-20" />
             </div>
             <h3 className="text-2xl font-black text-white">No talents found</h3>
             <p className="text-nc-muted mt-2 max-w-sm mx-auto">Try adjusting your filters or search query to find more professionals.</p>
             <button 
               onClick={() => { setActiveRole('All'); setSearchQuery(''); }}
               className="mt-8 text-nc-accent font-black text-xs uppercase tracking-widest hover:underline"
             >
               View All Members
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-3 sm:gap-4 md:gap-5">
            {filteredTalents.map((talent, idx) => (
              <div 
                key={talent.id} 
                onClick={() => onNavigate('profile', talent.id)}
                className="group cursor-pointer talent-card-reveal"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="bg-nc-card border border-nc-border rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-4 hover:border-nc-accent/30 transition-all flex items-center gap-3 sm:gap-4 shadow-lg group-hover:shadow-nc-accent/5">
                  <div className="shrink-0">
                    <Avatar 
                      user={talent} 
                      size="md" 
                      name={talent.name}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <h3 className="font-bold text-white tracking-tight text-sm sm:text-base truncate">{talent.name}</h3>
                      {talent.premium && (
                        <span 
                          className="bg-nc-pro text-black px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-wide shrink-0"
                          style={{ backgroundColor: '#FACC15' }}
                        >
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-nc-accent text-xs sm:text-sm truncate">{talent.role} • {talent.location || 'Nepal'}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {(talent.skills || []).slice(0, 2).map((skill, idx) => (
                        <Tag key={idx} className="text-[9px] py-0.5 px-2">
                          {typeof skill === 'string' ? skill : (skill?.name || 'Skill')}
                        </Tag>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-auto">
                    <div className="text-nc-accent font-black text-xs sm:text-sm">{talent.rating || 'New'}</div>
                    <div className="text-nc-muted text-[9px] sm:text-xs">
                      {talent.followers ? `${((talent.followers || 0)/1000).toFixed(1)}K` : '0.0K'} followers
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
