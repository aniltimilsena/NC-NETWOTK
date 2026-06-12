import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, SortDesc, ChevronDown, Search, X, Check, Shield, Award, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import Avatar from '../components/ui/Avatar';
import SEO from '../components/SEO';
import Tag from '../components/ui/Tag';
import TalentCardSkeleton from '../components/ui/TalentCardSkeleton';
import { CATEGORIES } from '../constants/categories';

export default function TalentListing({ onNavigate, initialCategory = 'All' }) {
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profilesReady, setProfilesReady] = useState(false);

  // Advanced Faceted Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    category: initialCategory || 'All',
    location: 'All',
    experienceLevel: 'All',
    gender: 'All',
    availability: 'All', // 'All', 'Available'
    verifiedOnly: false,
    premiumOnly: false
  });
  
  const [activeSort, setActiveSort] = useState('recent'); // 'recent', 'followers', 'rating'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [notifySaved, setNotifySaved] = useState(false);

  const categoriesList = ['All', ...CATEGORIES];
  const experienceLevels = ['All', 'Beginner', 'Intermediate', 'Expert', 'Pro'];
  const gendersList = ['All', 'Male', 'Female', 'Other'];
  
  // Extract dynamic locations from currently loaded talents
  const locationsList = ['All', ...new Set(talents.map(t => t.location).filter(Boolean))];

  const sortOptions = [
    { id: 'recent', label: 'Recently Active' },
    { id: 'followers', label: 'Most Followers' },
    { id: 'rating', label: 'Highest Rated' }
  ];

  useEffect(() => {
    if (initialCategory) {
      setSelectedFilters(prev => ({ ...prev, category: initialCategory }));
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

  // Helper to determine experience level dynamically based on past projects count
  const getExperienceLevel = (talent) => {
    const count = Array.isArray(talent.experience) ? talent.experience.length : 0;
    if (count === 0) return 'Beginner';
    if (count <= 2) return 'Intermediate';
    if (count <= 4) return 'Expert';
    return 'Pro';
  };

  // Progressive profile completion percentage helper
  const getProfileCompletionPercentage = (t) => {
    let score = 0;
    if (t.bio && t.bio.trim().length > 0 && t.bio !== "No bio yet." && t.bio !== "No bio added yet." && t.bio !== "No bio provided yet.") score += 15;
    if (t.image && t.image.trim().length > 0) score += 15;
    if (t.skills && t.skills.length > 0) score += 20;
    if (t.media && t.media.length > 0) score += 20;
    if (t.introVideo && t.introVideo.trim().length > 0) score += 20;
    if (t.verified) score += 10;
    return score;
  };

  // Calculate faceted count dynamically for any filter option
  const getFacetedCount = (filterKey, optionValue) => {
    return talents.filter(t => {
      // Exclude deactivated profiles
      if (t.deactivated === true) return false;

      // 1. Apply Search Query
      const matchesSearch = !searchQuery || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Apply all other selected filters EXCEPT the one being counted
      if (filterKey !== 'category' && selectedFilters.category !== 'All') {
        if (t.role?.toLowerCase() !== selectedFilters.category.toLowerCase()) return false;
      }
      if (filterKey !== 'location' && selectedFilters.location !== 'All') {
        if (t.location !== selectedFilters.location) return false;
      }
      if (filterKey !== 'experienceLevel' && selectedFilters.experienceLevel !== 'All') {
        if (getExperienceLevel(t) !== selectedFilters.experienceLevel) return false;
      }
      if (filterKey !== 'gender' && selectedFilters.gender !== 'All') {
        if (t.gender?.toLowerCase() !== selectedFilters.gender.toLowerCase()) return false;
      }
      if (filterKey !== 'availability' && selectedFilters.availability === 'Available') {
        if (!t.openToWork) return false;
      }
      if (filterKey !== 'verifiedOnly' && selectedFilters.verifiedOnly) {
        if (!t.verified) return false;
      }
      if (filterKey !== 'premiumOnly' && selectedFilters.premiumOnly) {
        if (!t.premium) return false;
      }

      // 3. Evaluate the target value match for the counted filter
      if (filterKey === 'category') {
        if (optionValue === 'All') return true;
        return t.role?.toLowerCase() === optionValue.toLowerCase();
      }
      if (filterKey === 'location') {
        if (optionValue === 'All') return true;
        return t.location === optionValue;
      }
      if (filterKey === 'experienceLevel') {
        if (optionValue === 'All') return true;
        return getExperienceLevel(t) === optionValue;
      }
      if (filterKey === 'gender') {
        if (optionValue === 'All') return true;
        return t.gender?.toLowerCase() === optionValue.toLowerCase();
      }
      if (filterKey === 'availability') {
        if (optionValue === 'All') return true;
        return t.openToWork;
      }
      if (filterKey === 'verifiedOnly') {
        return t.verified;
      }
      if (filterKey === 'premiumOnly') {
        return t.premium;
      }
      return true;
    }).length;
  };

  const filteredTalents = talents
    .filter(t => {
      // Exclude deactivated profiles
      if (t.deactivated === true) return false;

      // Search Input
      const matchesSearch = !searchQuery || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Category
      if (selectedFilters.category !== 'All' && t.role?.toLowerCase() !== selectedFilters.category.toLowerCase()) return false;

      // Location
      if (selectedFilters.location !== 'All' && t.location !== selectedFilters.location) return false;

      // Experience Level
      if (selectedFilters.experienceLevel !== 'All' && getExperienceLevel(t) !== selectedFilters.experienceLevel) return false;

      // Gender
      if (selectedFilters.gender !== 'All' && t.gender?.toLowerCase() !== selectedFilters.gender.toLowerCase()) return false;

      // Availability (Open to work)
      if (selectedFilters.availability === 'Available' && !t.openToWork) return false;

      // Verified Only
      if (selectedFilters.verifiedOnly && !t.verified) return false;

      // Premium Only
      if (selectedFilters.premiumOnly && !t.premium) return false;

      return true;
    })
    .sort((a, b) => {
      if (activeSort === 'followers') return (b.followers || 0) - (a.followers || 0);
      if (activeSort === 'rating') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
      
      // Default Sort ('recent'): Boost by Profile Completion first, then updatedAt!
      const completionA = getProfileCompletionPercentage(a);
      const completionB = getProfileCompletionPercentage(b);
      if (completionA !== completionB) {
        return completionB - completionA;
      }
      
      const timeA = a.updatedAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

  const handleClearFilters = () => {
    setSelectedFilters({
      category: 'All',
      location: 'All',
      experienceLevel: 'All',
      gender: 'All',
      availability: 'All',
      verifiedOnly: false,
      premiumOnly: false
    });
    setSearchQuery('');
  };

  const FilterControls = () => (
    <div className="bg-nc-card border border-nc-border rounded-[2rem] p-6 space-y-6 text-left shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="font-bold text-white text-xs uppercase tracking-[0.15em] flex items-center gap-1.5">
          <Filter size={12} className="text-nc-accent" /> Filters
        </h3>
        <button 
          onClick={handleClearFilters}
          className="text-[10px] font-black text-nc-accent uppercase tracking-widest hover:underline"
        >
          Reset All
        </button>
      </div>

      {/* Category Section */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-black text-nc-muted uppercase tracking-widest block">Category</label>
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 no-scrollbar">
          {categoriesList.map(cat => {
            const count = getFacetedCount('category', cat);
            const isSelected = selectedFilters.category === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedFilters(prev => ({ ...prev, category: cat }))}
                className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  isSelected 
                    ? 'bg-nc-accent text-nc-darker font-bold' 
                    : 'text-nc-secondary hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] ${isSelected ? 'text-nc-darker/60 font-black' : 'text-nc-muted'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Section */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-black text-nc-muted uppercase tracking-widest block">Location</label>
        <select
          value={selectedFilters.location}
          onChange={e => setSelectedFilters(prev => ({ ...prev, location: e.target.value }))}
          className="w-full bg-nc-surface border border-nc-border rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-nc-accent transition-colors"
        >
          {locationsList.map(loc => {
            const count = getFacetedCount('location', loc);
            return (
              <option key={loc} value={loc} className="bg-nc-dark">
                {loc === 'All' ? 'All Locations' : loc} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Experience Level Section */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-black text-nc-muted uppercase tracking-widest block">Experience</label>
        <div className="flex flex-col gap-1">
          {experienceLevels.map(lvl => {
            const count = getFacetedCount('experienceLevel', lvl);
            const isSelected = selectedFilters.experienceLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setSelectedFilters(prev => ({ ...prev, experienceLevel: lvl }))}
                className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  isSelected 
                    ? 'bg-nc-accent text-nc-darker font-bold' 
                    : 'text-nc-secondary hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{lvl}</span>
                <span className={`text-[10px] ${isSelected ? 'text-nc-darker/60 font-black' : 'text-nc-muted'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gender Section */}
      <div className="space-y-2.5">
        <label className="text-[10px] font-black text-nc-muted uppercase tracking-widest block">Gender</label>
        <div className="flex flex-col gap-1">
          {gendersList.map(g => {
            const count = getFacetedCount('gender', g);
            const isSelected = selectedFilters.gender === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedFilters(prev => ({ ...prev, gender: g }))}
                className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                  isSelected 
                    ? 'bg-nc-accent text-nc-darker font-bold' 
                    : 'text-nc-secondary hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{g}</span>
                <span className={`text-[10px] ${isSelected ? 'text-nc-darker/60 font-black' : 'text-nc-muted'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Switches Section */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        {/* Availability Switch */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-white block">Open to Work</label>
            <span className="text-[10px] text-nc-muted">Open to casting calls ({getFacetedCount('availability', 'Available')})</span>
          </div>
          <button 
            onClick={() => setSelectedFilters(prev => ({ ...prev, availability: prev.availability === 'Available' ? 'All' : 'Available' }))}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${selectedFilters.availability === 'Available' ? 'bg-nc-accent' : 'bg-white/10'}`}
          >
            <div className={`w-4 h-4 bg-[#0A0A0A] rounded-full shadow-md transform duration-300 ${selectedFilters.availability === 'Available' ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Verified Switch */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-white block">Verified Only</label>
            <span className="text-[10px] text-nc-muted">Credentials approved ({getFacetedCount('verifiedOnly', true)})</span>
          </div>
          <button 
            onClick={() => setSelectedFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${selectedFilters.verifiedOnly ? 'bg-nc-accent' : 'bg-white/10'}`}
          >
            <div className={`w-4 h-4 bg-[#0A0A0A] rounded-full shadow-md transform duration-300 ${selectedFilters.verifiedOnly ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {/* Premium Switch */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold text-white block">Premium Only</label>
            <span className="text-[10px] text-nc-muted">Pro membership tags ({getFacetedCount('premiumOnly', true)})</span>
          </div>
          <button 
            onClick={() => setSelectedFilters(prev => ({ ...prev, premiumOnly: !prev.premiumOnly }))}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${selectedFilters.premiumOnly ? 'bg-nc-accent' : 'bg-white/10'}`}
          >
            <div className={`w-4 h-4 bg-[#0A0A0A] rounded-full shadow-md transform duration-300 ${selectedFilters.premiumOnly ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-nc-dark pt-2 pb-20">
      <SEO 
        title="Browse Professional Talent | NC Network" 
        description="Premium directory of cinema professionals in Nepal." 
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Browse Talents</h1>
            <p className="text-xs sm:text-sm text-nc-muted mt-0.5 font-medium">Discover Nepal's top cinema performers and casting-ready professionals</p>
          </div>
          
          <div className="flex gap-2">
            {/* Search Input */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nc-muted group-focus-within:text-nc-accent transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name, role or location..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-nc-surface border border-nc-border rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-nc-muted focus:outline-none focus:border-nc-accent/50 focus:bg-nc-surface/80 transition-all shadow-xl"
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

            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 bg-nc-card border border-nc-border rounded-full text-xs font-bold text-nc-secondary hover:text-white transition-all"
            >
              <Filter size={14} /> Filters
            </button>

            {/* Sort Toggle */}
            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 bg-nc-card border rounded-full text-xs sm:text-sm font-bold transition-all ${
                  isSortOpen ? 'border-nc-accent text-nc-accent' : 'border-nc-border text-nc-secondary hover:text-white'
                }`}
              >
                <SortDesc size={14} /> Sort
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-nc-surface border border-nc-border rounded-[2.5rem] shadow-2xl z-[100] p-2 backdrop-blur-xl"
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

        {/* Clear Filters Indicator */}
        {(selectedFilters.category !== 'All' || 
          selectedFilters.location !== 'All' || 
          selectedFilters.experienceLevel !== 'All' || 
          selectedFilters.gender !== 'All' || 
          selectedFilters.availability !== 'All' || 
          selectedFilters.verifiedOnly || 
          selectedFilters.premiumOnly || 
          searchQuery) && (
          <div className="flex items-center gap-2 mb-6 flex-wrap animate-in slide-in-from-left duration-300">
            <span className="text-xs text-nc-muted font-bold">Active filters:</span>
            <div className="flex gap-1.5 flex-wrap">
              {selectedFilters.category !== 'All' && (
                <Tag color="accent" className="flex items-center gap-1.5 text-[9px] py-0.5">
                  ROLE: {selectedFilters.category.toUpperCase()}
                  <button onClick={() => setSelectedFilters(prev => ({ ...prev, category: 'All' }))}><X size={10} /></button>
                </Tag>
              )}
              {selectedFilters.location !== 'All' && (
                <Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5">
                  LOC: {selectedFilters.location.toUpperCase()}
                  <button onClick={() => setSelectedFilters(prev => ({ ...prev, location: 'All' }))}><X size={10} /></button>
                </Tag>
              )}
              {selectedFilters.experienceLevel !== 'All' && (
                <Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5">
                  EXP: {selectedFilters.experienceLevel.toUpperCase()}
                  <button onClick={() => setSelectedFilters(prev => ({ ...prev, experienceLevel: 'All' }))}><X size={10} /></button>
                </Tag>
              )}
              {selectedFilters.gender !== 'All' && (
                <Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5">
                  GENDER: {selectedFilters.gender.toUpperCase()}
                  <button onClick={() => setSelectedFilters(prev => ({ ...prev, gender: 'All' }))}><X size={10} /></button>
                </Tag>
              )}
              {selectedFilters.availability !== 'All' && (
                <Tag color="blue" className="flex items-center gap-1.5 text-[9px] py-0.5">
                  AVAILABLE ONLY
                  <button onClick={() => setSelectedFilters(prev => ({ ...prev, availability: 'All' }))}><X size={10} /></button>
                </Tag>
              )}
              {selectedFilters.verifiedOnly && (
                <Tag color="blue" className="flex items-center gap-1.5 text-[9px] py-0.5">
                  VERIFIED ONLY
                  <button onClick={() => setSelectedFilters(prev => ({ ...prev, verifiedOnly: false }))}><X size={10} /></button>
                </Tag>
              )}
              {selectedFilters.premiumOnly && (
                <Tag color="accent" className="flex items-center gap-1.5 text-[9px] py-0.5">
                  PRO MEMBERS ONLY
                  <button onClick={() => setSelectedFilters(prev => ({ ...prev, premiumOnly: false }))}><X size={10} /></button>
                </Tag>
              )}
              {searchQuery && (
                <Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5 bg-white/5 border-white/10 text-white">
                  SEARCH: "{searchQuery.toUpperCase()}"
                  <button onClick={() => setSearchQuery('')}><X size={10} /></button>
                </Tag>
              )}
              <button 
                onClick={handleClearFilters}
                className="text-[10px] font-black text-nc-muted hover:text-white transition-colors ml-2 underline underline-offset-4"
              >
                CLEAR ALL
              </button>
            </div>
          </div>
        )}

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block lg:col-span-1">
            <FilterControls />
          </div>

          {/* Listing Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <TalentCardSkeleton count={10} />
            ) : !profilesReady ? (
              <TalentCardSkeleton count={10} />
            ) : filteredTalents.length === 0 ? (
              <div className="text-center py-16 px-4 bg-nc-card border border-nc-border border-dashed rounded-[2.5rem] backdrop-blur-sm text-left">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-nc-muted opacity-20" />
                </div>
                <h3 className="text-2xl font-black text-white text-center">No talents found</h3>
                <p className="text-nc-muted mt-2 max-w-sm mx-auto text-sm text-center">We couldn't find any professionals matching your specific filter criteria.</p>
                
                {/* Notify Me / Clear Filters */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8">
                  <button 
                    onClick={() => {
                      setNotifySaved(true);
                      setTimeout(() => setNotifySaved(false), 4000);
                    }}
                    className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                      notifySaved 
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                        : 'bg-nc-accent text-nc-darker shadow-lg shadow-nc-accent/20'
                    }`}
                  >
                    {notifySaved ? '✓ Notification Saved' : 'Notify Me When Available'}
                  </button>
                  
                  <button 
                    onClick={handleClearFilters}
                    className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-wider hover:bg-white/10 transition-all active:scale-95"
                  >
                    Clear Filters
                  </button>
                </div>

                {notifySaved && (
                  <p className="text-green-400 text-[10px] font-bold mt-3 text-center animate-fade-in">
                    We'll alert you as soon as new professionals match your filter criteria!
                  </p>
                )}

                {/* Similar Categories Suggestions */}
                {(() => {
                  const activeCats = CATEGORIES.filter(cat => getFacetedCount('category', cat) > 0 && selectedFilters.category !== cat);
                  if (activeCats.length === 0) return null;
                  return (
                    <div className="mt-12 max-w-xl mx-auto border-t border-white/5 pt-8">
                      <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-nc-accent" /> Try other active categories
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {activeCats.slice(0, 5).map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedFilters(prev => ({ ...prev, category: cat }))}
                            className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-nc-accent/30 hover:text-nc-accent text-xs text-nc-secondary transition-all"
                          >
                            {cat} ({getFacetedCount('category', cat)})
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Suggested Profiles */}
                <div className="mt-12 max-w-xl mx-auto border-t border-white/5 pt-8">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Award size={12} className="text-nc-accent" /> Suggested profiles for you
                  </h4>
                  <div className="space-y-3">
                    {talents
                      .slice()
                      .sort((a, b) => (b.followers || 0) - (a.followers || 0))
                      .slice(0, 3)
                      .map(talent => (
                        <div 
                          key={talent.id} 
                          onClick={() => onNavigate('profile', talent.id)}
                          className="bg-nc-surface border border-nc-border hover:border-white/10 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01]"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar user={talent} size="sm" name={talent.name} />
                            <div>
                              <h5 className="font-bold text-white text-xs">{talent.name}</h5>
                              <p className="text-nc-accent text-[10px] mt-0.5">{talent.role} • {talent.location || 'Nepal'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-nc-muted block font-black uppercase tracking-wider">Followers</span>
                            <span className="text-white font-bold text-xs">{talent.followers || 0}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {filteredTalents.map((talent, idx) => (
                  <div 
                    key={talent.id} 
                    onClick={() => onNavigate('profile', talent.id)}
                    className="group cursor-pointer talent-card-reveal"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="bg-nc-card border border-nc-border rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 hover:border-nc-accent/30 transition-all flex items-center gap-3 sm:gap-4 shadow-lg group-hover:shadow-nc-accent/5">
                      <div className="shrink-0 relative">
                        <Avatar 
                          user={talent} 
                          size="md" 
                          name={talent.name}
                        />
                        {talent.openToWork && (
                          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-nc-dark"></span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <h3 className="font-bold text-white tracking-tight text-sm sm:text-base truncate">{talent.name}</h3>
                          {talent.verified && (
                            <span className="text-nc-accent text-xs" title="Verified Member">✓</span>
                          )}
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
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {(talent.skills || []).slice(0, 3).map((skill, idx) => (
                            <Tag key={idx} className="text-[9px] py-0.5 px-2 bg-white/5 border border-white/5 text-nc-secondary">
                              {typeof skill === 'string' ? skill : (skill?.name || 'Skill')}
                            </Tag>
                          ))}
                        </div>
                      </div>
    
                      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-auto text-right">
                        <div className="text-nc-accent font-black text-xs sm:text-sm flex items-center gap-1">
                          ★ {talent.rating || 'New'}
                        </div>
                        <div className="text-nc-muted text-[10px] sm:text-xs">
                          {talent.followers ? `${((talent.followers || 0)/1000).toFixed(1)}K` : '0.0K'} followers
                        </div>
                        {getProfileCompletionPercentage(talent) === 100 && (
                          <span className="text-[8px] font-black bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Boosted</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Slide-over Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xs h-full bg-nc-dark border-l border-[#1A1A1A] p-6 overflow-y-auto z-10 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 shrink-0">
                <h3 className="font-bold text-white uppercase text-sm tracking-wider">Filters</h3>
                <button onClick={() => setIsFilterOpen(false)} className="text-nc-muted hover:text-white p-2">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <FilterControls />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
