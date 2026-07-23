import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X,
  ArrowLeft, MapPin, MoreVertical, Share2, ChevronLeft, SlidersHorizontal
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
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
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

  const matchesCategory = (talent, categoryFilter) => {
    if (!categoryFilter || categoryFilter === 'All') return true;
    const filterClean = categoryFilter.trim().toLowerCase();
    
    const roleClean = (talent.role || '').trim().toLowerCase();
    const catClean = (talent.category || '').trim().toLowerCase();

    const isMatch = (val) => {
      if (!val) return false;
      if (val === filterClean) return true;
      if (val === filterClean + 's' || val + 's' === filterClean) return true;
      if (filterClean === 'actor' && (val === 'actor' || val === 'actress' || val.includes('actor') || val.includes('actress'))) return true;
      if (filterClean === 'voiceover' && (val === 'voice over' || val === 'voiceover' || val.includes('voice'))) return true;
      if (filterClean === 'vfx' && (val === 'vfx' || val.includes('vfx') || val.includes('visual effects'))) return true;
      return val.includes(filterClean) || filterClean.includes(val);
    };

    return isMatch(roleClean) || isMatch(catClean);
  };

  const getFacetedCount = (filterKey, optionValue) => {
    return talents.filter(t => {
      if (t.deactivated === true) return false;

      const matchesSearch = !searchQuery ||
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterKey !== 'category' && selectedFilters.category !== 'All') {
        if (!matchesCategory(t, selectedFilters.category)) return false;
      }
      if (filterKey !== 'location' && selectedFilters.location !== 'All') {
        if (t.location !== selectedFilters.location) return false;
      }
      if (filterKey !== 'experienceLevel' && selectedFilters.experienceLevel !== 'All') {
        if (getExperienceLevel(t) !== selectedFilters.experienceLevel) return false;
      }

      if (filterKey === 'category') {
        if (optionValue === 'All') return true;
        return matchesCategory(t, optionValue);
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
    if (currentUser.uid === talentId) {
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
        t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedFilters.category !== 'All' && !matchesCategory(t, selectedFilters.category)) return false;


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

      <div className="max-w-[1600px] mx-auto px-1 sm:px-8 lg:px-12 relative z-10">

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
                <h1 className="text-3xl sm:text-4xl font-sans font-black text-white tracking-tight leading-none mb-2">Browse by Category</h1>
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
                      className="category-card w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(25%-0.75rem)] p-3.5 sm:p-10 lg:p-12 flex flex-col items-center gap-4 sm:gap-6 lg:gap-8 group cursor-pointer"
                    >
                      {/* Circular icon — same as Home */}
                      <div
                        className="relative z-10 w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
                        style={{
                          backgroundColor: `${detail.color}26`,
                          color: detail.color,
                          boxShadow: `0 0 25px ${detail.color}15`,
                        }}
                      >
                        <Icon className="w-[38px] h-[38px] sm:w-[52px] sm:h-[52px] lg:w-[60px] lg:h-[60px]" strokeWidth={1.5} />
                      </div>

                      <span className="text-base sm:text-xl lg:text-2xl font-black text-white/90 group-hover:text-white transition-colors relative z-10">
                        {detail.label}
                      </span>

                      {count === 0 ? (
                        <span className="text-xs sm:text-base lg:text-lg font-bold text-[#38BDF8] group-hover:text-cyan-400 transition-colors relative z-10">
                          Be the first →
                        </span>
                      ) : (
                        <span className="text-xs sm:text-base lg:text-lg font-semibold text-nc-muted relative z-10">
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
          <div className="animate-fade-in space-y-3 text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/5 mb-6">
              {/* Left Side: Back button & Title */}
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => {
                    setSelectedFilters(prev => ({ ...prev, category: 'All' }));
                    setViewMode('categories');
                  }}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 border border-white/10 flex items-center justify-center text-white transition-colors shadow-md cursor-pointer shrink-0"
                  aria-label="Back to Categories"
                  title="Back to Categories"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-none">
                    {selectedFilters.category === 'All' ? 'All' : getCategoryConfig(selectedFilters.category).label}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-nc-muted mt-1 font-semibold">
                    {filteredTalents.length} {filteredTalents.length === 1 ? 'talent' : 'talents'} found
                  </p>
                </div>
              </div>

              {/* Right Side: Sort dropdown wrapper */}
              <div className="relative self-end sm:self-center">
                <button
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-300 transition-colors duration-200 cursor-pointer"
                  aria-label="Sort options"
                  title="Sort options"
                >
                  <SlidersHorizontal className="w-[18px] h-[18px] text-sky-400" strokeWidth={2} />
                </button>

                <AnimatePresence>
                  {isSortDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsSortDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-36 bg-[#111116] border border-white/10 rounded-xl shadow-2xl py-1 z-40 text-left"
                      >
                        {sortOptions.map(opt => {
                          const isActive = activeSort === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                  setActiveSort(opt.id);
                                  setIsSortDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                                isActive
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
                        className="flex items-center justify-between py-4 active:bg-white/[0.01] transition-all duration-300 cursor-pointer group"
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
                          {talent.id !== auth.currentUser?.uid && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleFollow(e, talent.id)}
                              className={`px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isFollowing
                                  ? 'border border-white/10 text-gray-400 hover:bg-white/5'
                                  : 'bg-gradient-to-br from-sky-400 to-sky-600 text-black hover:brightness-110 shadow-lg shadow-sky-500/10 active:scale-[0.98]'
                                }`}
                            >
                              {isFollowing ? 'Following' : 'Follow'}
                            </button>
                          )}

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
