import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X,
  ArrowLeft, MapPin, MoreVertical, Share2
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
  const [viewMode, setViewMode] = useState(() => {
    if (initialCategory && initialCategory !== 'All' && CATEGORIES.includes(initialCategory)) {
      return 'talents';
    }
    return 'categories';
  });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    category: initialCategory || 'All',
    location: 'All',
    experienceLevel: 'All',
  });
  
  const [activeSort, setActiveSort] = useState('trending'); // 'trending', 'newest', 'followers'
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

  // Subscribe to real follows status
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

  // Delayed reveal for skeleton
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

      // Search Query
      const matchesSearch = !searchQuery || 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Selected Category (If not currently the one being counted)
      if (filterKey !== 'category' && selectedFilters.category !== 'All') {
        if (t.role?.toLowerCase() !== selectedFilters.category.toLowerCase()) return false;
      }
      if (filterKey !== 'location' && selectedFilters.location !== 'All') {
        if (t.location !== selectedFilters.location) return false;
      }
      if (filterKey !== 'experienceLevel' && selectedFilters.experienceLevel !== 'All') {
        if (getExperienceLevel(t) !== selectedFilters.experienceLevel) return false;
      }

      // Check count option
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
        // Unfollow
        await deleteDoc(followDocRef);
        await updateDoc(doc(db, "profiles", talentId), { followers: increment(-1) });
        await updateDoc(doc(db, "profiles", currentUser.uid), { following: increment(-1) });
      } else {
        // Follow
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
          followingId: talentId,
          createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, "profiles", talentId), { followers: increment(1) });
        await updateDoc(doc(db, "profiles", currentUser.uid), { following: increment(1) });
        
        // Create notification
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

      // Search Query
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

      return true;
    })
    .sort((a, b) => {
      if (activeSort === 'followers') return (b.followers || 0) - (a.followers || 0);
      if (activeSort === 'trending') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0) || (b.followers || 0) - (a.followers || 0);
      
      // Newest
      const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

  const handleClearFilters = () => {
    setSelectedFilters({
      category: selectedFilters.category, // Keep the category context
      location: 'All',
      experienceLevel: 'All',
    });
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-32 md:pb-20 relative font-sans">
      <SEO 
        title="Browse Professional Talent | NC Network" 
        description="Premium directory of cinema professionals in Nepal." 
      />
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">

        {/* VIEW 1: CATEGORIES GRID SELECTION */}
        {viewMode === 'categories' && (
          <div className="animate-fade-in space-y-10 text-left">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Browse by Category</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Find talent by profession</p>
            </div>

            {loading ? (
              <TalentCardSkeleton count={8} />
            ) : (
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {CATEGORIES.map((cat, idx) => {
                  const count = getFacetedCount('category', cat);
                  const detail = getCategoryConfig(cat);
                  const Icon = detail.icon; // must be capitalized for JSX

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
                      className="category-card w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(25%-0.75rem)] p-4 flex flex-col items-center gap-2.5 group cursor-pointer"
                    >
                      {/* Circular icon — same as Home */}
                      <div
                        className="relative z-10 w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
                        style={{
                          backgroundColor: `${detail.color}26`,
                          color: detail.color,
                          boxShadow: `0 0 15px ${detail.color}15`,
                        }}
                      >
                        <Icon size={26} strokeWidth={1.5} />
                      </div>

                      <span className="text-sm sm:text-base font-extrabold text-white/90 group-hover:text-white transition-colors relative z-10">
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
                className="flex items-center gap-1.5 text-sm font-bold text-[#0099FF] hover:opacity-85 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Categories
              </button>
              <div className="text-right">
                <h2 className="text-2xl font-black text-white">
                  {selectedFilters.category === 'All' ? 'All' : getCategoryConfig(selectedFilters.category).label}
                </h2>
                <p className="text-xs text-gray-500">{filteredTalents.length} {filteredTalents.length === 1 ? 'talent' : 'talents'} found</p>
              </div>
            </div>

            {/* Search, Sort, and Filters Panel */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={`Search ${selectedFilters.category === 'All' ? 'talents' : getCategoryConfig(selectedFilters.category).pluralLabel.toLowerCase()} by name or location...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#0099FF] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,153,255,0.15)]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Right: Filters & Sort */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Location Filter */}
                <select
                  value={selectedFilters.location}
                  onChange={e => setSelectedFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#0099FF] cursor-pointer"
                >
                  <option value="All">All Locations</option>
                  {locationsList.filter(l => l !== 'All').map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>

                {/* Experience Level Filter */}
                <select
                  value={selectedFilters.experienceLevel}
                  onChange={e => setSelectedFilters(prev => ({ ...prev, experienceLevel: e.target.value }))}
                  className="bg-[#1a1a1a] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#0099FF] cursor-pointer"
                >
                  <option value="All">All Experience</option>
                  {experienceLevels.filter(l => l !== 'All').map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>

                {/* Sort Option */}
                <div className="flex bg-[#1a1a1a] border border-white/5 rounded-xl p-1">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setActiveSort(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider ${
                        activeSort === opt.id
                          ? 'bg-[#0099FF] text-black shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
              /* Grid of talent cards (2 col mobile, 3-4 col desktop) */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredTalents.map((talent) => {
                  const isFollowing = followingIds.includes(talent.id);
                  const joinYear = talent.joinedYear || (talent.createdAt?.toDate ? talent.createdAt.toDate().getFullYear() : 2025);
                  
                  return (
                    <div
                      key={talent.id}
                      onClick={() => onNavigate('profile', talent.id)}
                      className="group relative bg-[#111] border border-white/5 hover:border-[#0099FF]/30 rounded-[2rem] p-5 text-center flex flex-col items-center justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_15px_30px_rgba(0,153,255,0.06)]"
                    >
                      {/* 3-Dot Options/Share Menu */}
                      <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === talent.id ? null : talent.id)}
                          className="w-8 h-8 rounded-full bg-black/40 hover:bg-[#222] border border-white/5 hover:border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-95"
                          aria-label="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeMenuId === talent.id && (
                          <>
                            {/* Invisible click-away backdrop */}
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-0 mt-2 w-36 bg-[#181818]/95 border border-white/10 rounded-2xl shadow-2xl z-20 py-1.5 backdrop-blur-lg overflow-hidden">
                              <button
                                onClick={() => {
                                  setActiveShareTalent(talent);
                                  setActiveMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                              >
                                <Share2 size={14} className="text-[#0099FF]" />
                                Share Profile
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {/* Real circular profile photo */}
                      <div className="relative mb-4">
                        <Avatar
                          user={talent}
                          size="lg"
                          name={talent.name}
                        />
                        {talent.openToWork && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border border-[#111]"></span>
                          </span>
                        )}
                      </div>

                      {/* Name & Joined subtitle */}
                      <div className="mb-4 w-full">
                        <h3 className="font-bold text-white text-sm sm:text-base tracking-tight truncate px-2 flex items-center justify-center gap-1">
                          <span className="truncate">{talent.name}</span>
                          {talent.verified && (
                            <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                          )}
                        </h3>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">Since {joinYear}</p>
                      </div>

                      {/* Location with pin icon */}
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-5 w-full justify-center px-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{talent.location || 'Nepal'}</span>
                      </div>

                      {/* Follow button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFollow(e, talent.id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${
                          isFollowing
                            ? 'bg-transparent border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 text-gray-300'
                            : 'bg-[#0099FF] text-black hover:opacity-95 shadow-lg shadow-[#0099FF]/10 active:scale-[0.98]'
                        }`}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
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
