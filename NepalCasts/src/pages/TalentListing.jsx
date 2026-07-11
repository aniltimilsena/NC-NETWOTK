import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X,
  ArrowLeft, MapPin, MoreVertical, Share2, ChevronLeft
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, setDoc, updateDoc, increment, addDoc, serverTimestamp, where } from 'firebase/firestore';
import Avatar from '../components/ui/Avatar';
import SEO from '../components/SEO';
import Tag from '../components/ui/Tag';
import TalentCardSkeleton from '../components/ui/TalentCardSkeleton';
import ShareSheet from '../components/ui/ShareSheet';
import { CATEGORIES, getCategoryConfig } from '../constants/categories';



export default function TalentListing({ onNavigate, initialCategory = 'All' }) {
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profilesReady, setProfilesReady] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);
  const [hoveredTalent, setHoveredTalent] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    if (initialCategory && initialCategory !== 'All' && CATEGORIES.includes(initialCategory)) {
      return 'talents';
    }
    return 'categories';
  });

  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    category: initialCategory || 'All',
    location: 'All',
    experienceLevel: 'All',
  });
  
  const [activeSort, setActiveSort] = useState('trending'); 
  const [notifySaved, setNotifySaved] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeShareTalent, setActiveShareTalent] = useState(null);

  const experienceLevels = ['All', 'Beginner', 'Intermediate', 'Expert', 'Pro'];
  const locationsList = ['All', ...new Set(talents.map(t => t.location).filter(Boolean))];

  const sortOptions = [
    { id: 'trending', label: 'Trending' },
    { id: 'newest', label: 'Newest' },
    { id: 'followers', label: 'Most Followed' }
  ];

  useEffect(() => {
    const resolveCategory = (catStr) => {
      if (!catStr) return null;
      const clean = catStr.trim().toLowerCase();
      return CATEGORIES.find(cat => 
        cat.toLowerCase() === clean || 
        cat.toLowerCase() + 's' === clean ||
        cat.toLowerCase() === clean + 's' ||
        (cat === 'voiceover' && (clean === 'voice over' || clean === 'voiceover'))
      ) || null;
    };

    const resolved = resolveCategory(initialCategory);
    if (resolved) {
      setSelectedFilters(prev => ({ ...prev, category: resolved }));
      setViewMode('talents');
    } else if (initialCategory === 'All') {
      setSelectedFilters(prev => ({ ...prev, category: 'All' }));
      setViewMode('categories');
    }
  }, [initialCategory]);

  useEffect(() => {
    
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

  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const q = query(collection(db, "follows"), where("followerId", "==", currentUser.uid));
        const unsub = onSnapshot(q, (snapshot) => {
          const ids = snapshot.docs.map(doc => doc.data().followingId);
          setFollowingIds(ids);
        }, (err) => {
          console.warn("Follows listener error:", err);
        });
        return () => unsub();
      } else {
        setFollowingIds([]);
      }
    });
    return () => unsubscribe();
  }, []);

  
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setProfilesReady(true), 80);
      return () => clearTimeout(t);
    }
    setProfilesReady(false);
  }, [loading]);

  const getExperienceLevel = (talent) => {
    const count = Array.isArray(talent.experience) ? talent.experience.length : 0;
    if (count === 0) return 'Beginner';
    if (count <= 2) return 'Intermediate';
    if (count <= 4) return 'Expert';
    return 'Pro';
  };

  const getFacetedCount = (filterKey, optionValue) => {
    return talents.filter(t => {
      if (t.deactivated === true) return false;

      
      const matchesSearch = !searchQuery || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      
      if (filterKey !== 'category' && selectedFilters.category !== 'All') {
        if (t.role?.toLowerCase() !== selectedFilters.category.toLowerCase()) return false;
      }
      if (filterKey !== 'location' && selectedFilters.location !== 'All') {
        if (t.location !== selectedFilters.location) return false;
      }
      if (filterKey !== 'experienceLevel' && selectedFilters.experienceLevel !== 'All') {
        if (getExperienceLevel(t) !== selectedFilters.experienceLevel) return false;
      }

      
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
      return true;
    }).length;
  };

  const handleToggleFollow = async (e, talentId) => {
    e.stopPropagation();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please sign in to follow talents.");
      return;
    }
    
    const followId = `${currentUser.uid}_${talentId}`;
    const followDocRef = doc(db, "follows", followId);
    const isFollowing = followingIds.includes(talentId);
    
    try {
      if (isFollowing) {
        
        await deleteDoc(followDocRef);
        await updateDoc(doc(db, "profiles", talentId), { followers: increment(-1) });
        await updateDoc(doc(db, "profiles", currentUser.uid), { following: increment(-1) });
      } else {
        
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
          followingId: talentId,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "profiles", talentId), { followers: increment(1) });
        await updateDoc(doc(db, "profiles", currentUser.uid), { following: increment(1) });
        
        
        await addDoc(collection(db, "notifications"), {
          userId: talentId,
          recipientId: talentId,
          receiverId: talentId,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || "Someone",
          senderAvatar: currentUser.photoURL || "",
          title: "New Follower",
          body: `${currentUser.displayName || "Someone"} started following you.`,
          type: "follow",
          notificationType: "follow",
          isRead: false,
          read: false,
          createdAt: serverTimestamp(),
          targetUrl: `/profile/${currentUser.uid}`
        });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const filteredTalents = talents
    .filter(t => {
      if (t.deactivated === true) return false;

      
      const matchesSearch = !searchQuery || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      
      if (selectedFilters.category !== 'All' && t.role?.toLowerCase() !== selectedFilters.category.toLowerCase()) return false;

      
      if (selectedFilters.location !== 'All' && t.location !== selectedFilters.location) return false;

      
      if (selectedFilters.experienceLevel !== 'All' && getExperienceLevel(t) !== selectedFilters.experienceLevel) return false;

      return true;
    })
    .sort((a, b) => {
      if (activeSort === 'followers') return (b.followers || 0) - (a.followers || 0);
      if (activeSort === 'trending') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0) || (b.followers || 0) - (a.followers || 0);
      
      
      const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

  const handleClearFilters = () => {
    setSelectedFilters({
      category: selectedFilters.category, 
      location: 'All',
      experienceLevel: 'All',
    });
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-32 md:pb-20 relative font-sans">
      <SEO 
        title="Browse Professional Talent | NepalCasts" 
        description="Premium directory of cinema professionals in Nepal." 
      />

      {/* Obsidian Gallery Portrait Reveal Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <AnimatePresence>
          {hoveredTalent && (hoveredTalent.photoURL || hoveredTalent.profileImage || hoveredTalent.image) && (
            <motion.div
              key={hoveredTalent.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 0.35, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 bottom-0 w-[45vw] h-full hidden md:block"
            >
              <img
                src={hoveredTalent.photoURL || hoveredTalent.profileImage || hoveredTalent.image}
                alt={hoveredTalent.name}
                className="w-full h-full object-cover filter grayscale brightness-50 contrast-125 transition-all duration-300"
              />
              {/* Subtle overlay gradients to blend portrait into pure black backdrop */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">

        {/* VIEW 1: CATEGORIES GRID SELECTION */}
        {viewMode === 'categories' && (
          <div className="animate-fade-in space-y-10 text-left">
            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
              <button
                onClick={() => onNavigate('back')}
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 flex items-center justify-center text-white transition-colors shadow-md shrink-0 cursor-pointer"
                aria-label="Back"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl sm:text-4xl font-serif italic font-medium text-white tracking-tight leading-none mb-1.5">Browse by Category</h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[1.5px]">Discover Nepal's finest cinema professionals</p>
              </div>
            </div>

            {loading ? (
              <TalentCardSkeleton count={8} />
            ) : (
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {CATEGORIES.map((cat, idx) => {
                  const count = getFacetedCount('category', cat);
                  const detail = getCategoryConfig(cat);
                  const Icon = detail.icon; 

                  return (
                    <motion.button
                      key={cat}
                      onClick={() => {
                        setSelectedFilters(prev => ({ ...prev, category: cat }));
                        setViewMode('talents');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="category-card w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(25%-0.75rem)] p-5 sm:p-6 flex flex-col items-center gap-3 sm:gap-4 group cursor-pointer"
                    >
                      {/* Circular icon — same as Home */}
                      <div
                        className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
                        style={{
                          backgroundColor: `${detail.color}26`,
                          color: detail.color,
                          boxShadow: `0 0 15px ${detail.color}15`,
                        }}
                      >
                        <Icon size={38} className="w-[38px] h-[38px] sm:w-[44px] sm:h-[44px]" strokeWidth={1.5} />
                      </div>

                      <span className="text-base sm:text-lg font-extrabold text-white/90 group-hover:text-white transition-colors relative z-10">
                        {detail.label}
                      </span>

                      {count === 0 ? (
                        <span className="text-xs sm:text-sm font-bold text-[#38BDF8] group-hover:text-cyan-400 transition-colors relative z-10">
                          Be the first →
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-semibold text-nc-muted relative z-10">
                          {count} {count === 1 ? 'talent' : 'talents'}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* VIEW 2: TALENTS GRID LISTING */}
        {viewMode === 'talents' && (
          <div className="animate-fade-in space-y-8 text-left">
            
            {/* Filter header showing selected category */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <button
                onClick={() => {
                  setSelectedFilters(prev => ({ ...prev, category: 'All' }));
                  setViewMode('categories');
                }}
                className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 flex items-center justify-center text-white transition-colors shadow-md z-20 cursor-pointer"
                aria-label="Back to Categories"
                title="Back to Categories"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-right">
                <h2 className="text-2xl font-black text-white">
                  {selectedFilters.category === 'All' ? 'All' : getCategoryConfig(selectedFilters.category).label}
                </h2>
                <p className="text-xs text-gray-500">{filteredTalents.length} {filteredTalents.length === 1 ? 'talent' : 'talents'} found</p>
              </div>
            </div>

            {/* Search, Sort, and Filters Panel */}
            <div className="flex flex-col gap-6 pt-2 pb-6 border-b border-white/5">
              
              {/* Row 1: Search & Filter Selects */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                
                {/* Search Box */}
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder={`Search ${selectedFilters.category === 'All' ? 'talents' : getCategoryConfig(selectedFilters.category).pluralLabel.toLowerCase()} by name or location...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-b border-white/10 focus:border-sky-400 pl-7 pr-8 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all duration-300 focus:shadow-[0_1px_0_0_#38bdf8]"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdowns (Location & Experience) */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {/* Location Filter */}
                  <select
                    value={selectedFilters.location}
                    onChange={e => setSelectedFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="flex-1 sm:flex-initial bg-transparent border-b border-white/10 text-xs text-gray-400 py-2 px-1 outline-none focus:border-sky-400 cursor-pointer transition-all duration-300"
                  >
                    <option value="All" className="bg-[#111] text-white">All Locations</option>
                    {locationsList.filter(l => l !== 'All').map(loc => (
                      <option key={loc} value={loc} className="bg-[#111] text-white">{loc}</option>
                    ))}
                  </select>

                  {/* Experience Level Filter */}
                  <select
                    value={selectedFilters.experienceLevel}
                    onChange={e => setSelectedFilters(prev => ({ ...prev, experienceLevel: e.target.value }))}
                    className="flex-1 sm:flex-initial bg-transparent border-b border-white/10 text-xs text-gray-400 py-2 px-1 outline-none focus:border-sky-400 cursor-pointer transition-all duration-300"
                  >
                    <option value="All" className="bg-[#111] text-white">All Experience</option>
                    {experienceLevels.filter(l => l !== 'All').map(lvl => (
                      <option key={lvl} value={lvl} className="bg-[#111] text-white">{lvl}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Row 2: Sort Toggle Options */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide w-full">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mr-2 shrink-0">Sort By:</span>
                {sortOptions.map(opt => {
                  const isActive = activeSort === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setActiveSort(opt.id)}
                      className={`flex-shrink-0 px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        isActive
                          ? 'border border-sky-400 bg-gradient-to-b from-sky-400/10 to-transparent text-sky-400 shadow-md shadow-sky-500/5'
                          : 'bg-transparent text-gray-500 hover:text-white border border-transparent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Clear Filters Indicator */}
            {(selectedFilters.location !== 'All' || selectedFilters.experienceLevel !== 'All' || searchQuery) && (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-gray-500 font-bold">Active filters:</span>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {selectedFilters.location !== 'All' && (
                    <Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5 uppercase">
                      LOC: {selectedFilters.location}
                      <button onClick={() => setSelectedFilters(prev => ({ ...prev, location: 'All' }))}><X size={10} /></button>
                    </Tag>
                  )}
                  {selectedFilters.experienceLevel !== 'All' && (
                    <Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5 uppercase">
                      EXP: {selectedFilters.experienceLevel}
                      <button onClick={() => setSelectedFilters(prev => ({ ...prev, experienceLevel: 'All' }))}><X size={10} /></button>
                    </Tag>
                  )}
                  {searchQuery && (
                    <Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5 uppercase">
                      SEARCH: "{searchQuery}"
                      <button onClick={() => setSearchQuery('')}><X size={10} /></button>
                    </Tag>
                  )}
                  <button 
                    onClick={handleClearFilters}
                    className="text-[10px] font-black text-gray-400 hover:text-white transition-colors ml-2 underline underline-offset-4 uppercase"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            )}

            {/* List Content */}
            {loading ? (
              <TalentCardSkeleton count={8} />
            ) : !profilesReady ? (
              <TalentCardSkeleton count={8} />
            ) : filteredTalents.length === 0 ? (
              <div className="text-center py-20 bg-[#111] border border-dashed border-white/5 rounded-[2rem]">
                <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No talents found</h3>
                <p className="text-gray-500 text-sm mt-1.5 max-w-xs mx-auto">Try adjusting your filters or search query to find matching talent.</p>
              </div>
            ) : (
              <>
                {/* Unified Cardless List View (Desktop & Mobile) */}
                <div className="space-y-1">
                  {filteredTalents.map((talent, idx) => {
                    const isFollowing = followingIds.includes(talent.id);
                    
                    let createdDate = null;
                    if (talent.createdAt) {
                      createdDate = talent.createdAt.toDate ? talent.createdAt.toDate() : new Date(talent.createdAt);
                    } else if (talent.joinedYear) {
                      createdDate = new Date(`${talent.joinedYear}-01-01`);
                    }
                    
                    if (!createdDate) {
                      createdDate = new Date('2026-07-01');
                    }

                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);

                    const isNew = diffDays <= 2;
                    const joinYear = createdDate.getFullYear();
                    const expLevel = getExperienceLevel(talent);

                    return (
                      <div
                        key={talent.id}
                        onMouseEnter={() => setHoveredTalent(talent)}
                        onMouseLeave={() => setHoveredTalent(null)}
                        onClick={() => onNavigate('profile', talent.id)}
                        className="flex items-center justify-between py-5 border-b border-white/5 hover:border-white/10 active:bg-white/[0.01] transition-all duration-300 cursor-pointer group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <Avatar
                            user={talent}
                            size="lg"
                            name={talent.name}
                            className="w-12 h-12 md:w-14 md:h-14 transition-transform group-hover:scale-105 duration-300"
                          />
                          <div className="min-w-0 text-left">
                            <h3 className="font-bold text-white text-base md:text-lg tracking-tight truncate flex items-center gap-1.5 group-hover:text-sky-400 transition-colors duration-300">
                              {talent.name}
                              {talent.verified && (
                                <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                              )}
                              {talent.openToWork && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 ring-2 ring-green-500/20" title="Open to Work" />
                              )}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                              {talent.role || 'Talent'} • {expLevel} Level • {isNew ? 'New' : `Since ${joinYear}`}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {talent.location || 'Nepal'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleFollow(e, talent.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                              isFollowing
                                ? 'border border-white/10 text-gray-400 hover:bg-white/5'
                                : 'bg-gradient-to-br from-sky-400 to-sky-600 text-black hover:brightness-110 shadow-lg shadow-sky-500/10 active:scale-[0.98]'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === talent.id ? null : talent.id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white relative bg-transparent hover:bg-white/5 transition-colors"
                          >
                            <MoreVertical size={16} />
                            {activeMenuId === talent.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                <div className="absolute right-0 top-10 mt-1 w-36 bg-[#121212]/95 border border-white/10 rounded-xl shadow-2xl z-20 py-1.5 backdrop-blur-lg overflow-hidden text-left">
                                  <button
                                    onClick={() => {
                                      setActiveShareTalent(talent);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                                  >
                                    <Share2 size={12} className="text-sky-400" />
                                    Share Profile
                                  </button>
                                </div>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

      {activeShareTalent && (
        <ShareSheet
          profile={{
            id: activeShareTalent.id,
            name: activeShareTalent.name,
            role: activeShareTalent.role || 'Talent',
            location: activeShareTalent.location || 'Nepal',
            followers: activeShareTalent.followers || 0,
            rating: parseFloat(activeShareTalent.rating) || 0,
            image: activeShareTalent.photoURL || activeShareTalent.profileImage || activeShareTalent.image || null,
            verified: activeShareTalent.verified || false,
            username: activeShareTalent.username || null,
          }}
          onClose={() => setActiveShareTalent(null)}
        />
      )}
      </div>
    </div>
  );
}
