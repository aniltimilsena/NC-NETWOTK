import { useState, useEffect, useMemo, useCallback, memo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Search, X, MoreVertical, MoreHorizontal, Share2, ChevronLeft, MapPin, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useApp } from '../providers/AppProviders';
import Avatar from '../components/ui/Avatar';
import SEO from '../components/SEO';
import Tag from '../components/ui/Tag';
import { CategoryGridSkeleton, TalentCardSkeleton } from '../components/ui/Skeleton';
import ShareSheet from '../components/ui/ShareSheet';
import Desktop3ColumnLayout from '../components/layout/Desktop3ColumnLayout';
import { CATEGORIES, getCategoryConfig, matchesCategory } from '../constants/categories';
import { HOME_CATEGORY_CARDS, CategoryCardIcon } from '../components/ui/CategoryCards';
import { cacheManager } from '../utils/cacheManager';
import { formatRole, isDefaultImage } from '../utils';
import { subscribeToTalents, subscribeToUserFollows, toggleFollowUser } from '../features/profile/services/users';
import { prefetchProfile } from '../utils/prefetchRoute';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

const TalentListItem = memo(function TalentListItem({
    talent,
    isFollowing,
    isSelf,
    isMenuOpen,
    onToggleMenu,
    onCloseMenu,
    onNavigate,
    onToggleFollow,
    onShareTalent,
    expLevel,
}) {
    let createdDate = null;
    if (talent.createdAt) {
        createdDate = talent.createdAt.toDate ? talent.createdAt.toDate() : new Date(talent.createdAt);
    } else if (talent.joinedYear) {
        createdDate = new Date(`${talent.joinedYear}-01-01`);
    }
    if (!createdDate || isNaN(createdDate.getTime())) {
        createdDate = new Date('2026-07-01');
    }
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const isNew = diffDays <= 2;
    const joinYear = createdDate.getFullYear();
    const talentPhoto = talent.image || talent.photoURL || talent.profileImage || talent.avatar || talent.photo;

    return (
        <div
            onMouseEnter={() => prefetchProfile(talent.id)}
            onTouchStart={() => prefetchProfile(talent.id)}
            onClick={() => onNavigate('profile', talent.id)}
            className="flex items-center justify-between py-3.5 px-1 border-b border-white/[0.06] hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group select-none"
        >
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div className="relative shrink-0">
                    <Avatar
                        userId={talent.id || talent.uid}
                        user={talent}
                        src={talentPhoto}
                        size="none"
                        name={talent.name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/10 group-hover:border-purple-500/40 transition-colors"
                    />
                    {talent.openToWork && (
                        <span
                            className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-black absolute bottom-0 right-0 shadow-sm"
                            title="Open to Work"
                        />
                    )}
                </div>
                <div className="min-w-0 text-left">
                    <h3 className="font-bold text-white text-base sm:text-lg tracking-tight truncate flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
                        {talent.name}
                        {talent.verified && (<span className="verified-badge shrink-0 text-sky-400 text-xs" title="Verified Talent">✓</span>)}
                    </h3>
                    <p className="text-xs text-gray-400 font-normal mt-0.5 truncate">
                        {formatRole(talent.role)} • {expLevel} Level • Since {joinYear}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 font-normal mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>{talent.location || 'Nepal'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                {!isSelf && (
                    <button
                        type="button"
                        onClick={(e) => onToggleFollow(e, talent.id)}
                        className={`px-4 sm:px-5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer shadow-none ${isFollowing
                            ? 'bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white border-0'
                            : 'border border-[#522C69]/70 hover:border-[#522C69] text-purple-200 hover:bg-[#522C69]/20'
                            }`}
                    >
                        {isFollowing ? 'Connected' : 'Connect'}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onToggleMenu(talent.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white relative hover:bg-white/5 transition-colors cursor-pointer"
                >
                    <MoreVertical size={16} />
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={onCloseMenu} />
                            <div className="absolute right-0 top-10 mt-1 w-36 bg-[#121216] border border-white/10 rounded-xl shadow-2xl z-20 py-1.5 backdrop-blur-lg overflow-hidden text-left">
                                <button
                                    onClick={() => {
                                        onShareTalent(talent);
                                        onCloseMenu();
                                    }}
                                    className="w-full px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                                >
                                    <Share2 size={14} className="text-white" />
                                    Share Profile
                                </button>
                            </div>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});

/**
 * @param {{ onNavigate?: any, user?: any, initialCategory?: string, initialMode?: string }} props
 */
export default function TalentListing({ onNavigate, user, initialCategory = 'All', initialMode = '' }) {
    const navigate = useNavigate();
    const { user: clerkUser } = useUser();
    const activeUser = user || (clerkUser ? {
        uid: clerkUser.id,
        displayName: clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || "Someone",
        photoURL: (clerkUser.imageUrl && !isDefaultImage(clerkUser.imageUrl)) ? clerkUser.imageUrl : "",
    } : null);
    const { showToast } = useApp();
    const [talents, setTalents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [profilesReady, setProfilesReady] = useState(false);
    const [followingIds, setFollowingIds] = useState([]);
    const [viewMode, setViewMode] = useState(() => {
        if (initialMode) return initialMode;
        if (initialCategory && initialCategory !== 'All' && CATEGORIES.includes(initialCategory)) {
            return 'talents';
        }
        return 'categories';
    });
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [selectedFilters, setSelectedFilters] = useState({
        category: initialCategory || 'All',
        location: 'All',
        experienceLevel: 'All',
    });
    const [activeSort, setActiveSort] = useState('trending');
    const [visibleCount, setVisibleCount] = useState(12);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [notifySaved, setNotifySaved] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [activeShareTalent, setActiveShareTalent] = useState(null);

    const handleToggleMenu = useCallback((id) => {
        setActiveMenuId(prev => (prev === id ? null : id));
    }, []);

    const handleCloseMenu = useCallback(() => {
        setActiveMenuId(null);
    }, []);

    const handleShareTalent = useCallback((talent) => {
        setActiveShareTalent(talent);
    }, []);

    const experienceLevels = ['All', 'Beginner', 'Intermediate', 'Expert', 'Pro'];
    const locationsList = ['All', ...new Set(talents.map(t => t.location).filter(Boolean))];
    const sortOptions = [
        { id: 'trending', label: 'Trending' },
        { id: 'newest', label: 'Newest' },
        { id: 'followers', label: 'Most Connected' }
    ];

    useEffect(() => {
        setVisibleCount(12);
    }, [selectedFilters, deferredSearchQuery, activeSort]);
    useEffect(() => {
        const resolveCategory = (catStr) => {
            if (!catStr)
                return null;
            const clean = catStr.trim().toLowerCase();
            return CATEGORIES.find(cat => cat.toLowerCase() === clean ||
                cat.toLowerCase() + 's' === clean ||
                cat.toLowerCase() === clean + 's' ||
                (cat === 'voiceover' && (clean === 'voice over' || clean === 'voiceover'))) || null;
        };
        const resolved = resolveCategory(initialCategory);
        if (resolved) {
            setSelectedFilters(prev => ({ ...prev, category: resolved }));
            setViewMode('talents');
        }
        else {
            setSelectedFilters(prev => ({ ...prev, category: 'All' }));
            if (initialMode) {
                setViewMode(initialMode);
            } else {
                setViewMode('categories');
            }
        }
    }, [initialCategory, initialMode]);
    useEffect(() => {
        setLoading(true);
        setError(null);
        return subscribeToTalents((data, err) => {
            if (err) {
                setError(err.message || 'Failed to load talents. Please check your connection.');
            } else {
                setError(null);
                setTalents(data || []);
            }
            setLoading(false);
        });
    }, [reloadKey]);
    useEffect(() => {
        const userId = clerkUser?.id;
        if (userId) {
            return subscribeToUserFollows(userId, setFollowingIds);
        } else {
            setFollowingIds([]);
        }
    }, [clerkUser]);
    useEffect(() => {
        if (!loading) {
            const t = setTimeout(() => setProfilesReady(true), 80);
            return () => clearTimeout(t);
        }
        setProfilesReady(false);
    }, [loading]);
    const getExperienceLevel = (talent) => {
        const count = Array.isArray(talent.experience) ? talent.experience.length : 0;
        if (count === 0)
            return 'Beginner';
        if (count <= 2)
            return 'Intermediate';
        if (count <= 4)
            return 'Expert';
        return 'Pro';
    };
    const getFacetedCount = (filterKey, optionValue) => {
        return talents.filter(t => {
            if (t.deactivated === true)
                return false;
            const matchesSearch = !deferredSearchQuery ||
                t.name?.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                t.role?.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                t.category?.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                t.location?.toLowerCase().includes(deferredSearchQuery.toLowerCase());
            if (!matchesSearch)
                return false;
            if (filterKey !== 'category' && selectedFilters.category !== 'All') {
                if (!matchesCategory(t, selectedFilters.category))
                    return false;
            }
            if (filterKey !== 'location' && selectedFilters.location !== 'All') {
                if (t.location !== selectedFilters.location)
                    return false;
            }
            if (filterKey !== 'experienceLevel' && selectedFilters.experienceLevel !== 'All') {
                if (getExperienceLevel(t) !== selectedFilters.experienceLevel)
                    return false;
            }
            if (filterKey === 'category') {
                if (optionValue === 'All')
                    return true;
                return matchesCategory(t, optionValue);
            }
            if (filterKey === 'location') {
                if (optionValue === 'All')
                    return true;
                return t.location === optionValue;
            }
            if (filterKey === 'experienceLevel') {
                if (optionValue === 'All')
                    return true;
                return getExperienceLevel(t) === optionValue;
            }
            return true;
        }).length;
    };
    const handleToggleFollow = useCallback(async (e, talentId) => {
        e.stopPropagation();
        const currentUser = activeUser;
        if (!currentUser) {
            onNavigate('/signin');
            return;
        }
        const previousFollowing = followingIds;
        const isFollowing = followingIds.includes(talentId);
        setFollowingIds(prev => isFollowing ? prev.filter(id => id !== talentId) : [...prev, talentId]);
        try {
            const res = await toggleFollowUser({
                currentUserId: currentUser.uid,
                targetUserId: talentId,
                isCurrentlyFollowing: isFollowing,
                senderInfo: {
                    displayName: currentUser.displayName || "Someone",
                    photoURL: currentUser.photoURL || "",
                }
            });
            if (res && res.success === false) {
                throw new Error(res.error || 'Failed to update connection');
            }
        } catch (err) {
            console.error("Error toggling follow in TalentListing:", err);
            setFollowingIds(previousFollowing);
            showToast?.('Failed to update connection. Please try again.', 'error');
        }
    }, [activeUser, followingIds, onNavigate, showToast]);

    const filteredTalents = useMemo(() => {
        return talents
            .filter(t => {
                const talentName = t.name || t.displayName || t.fullName || t.username;
                if (t.deactivated === true || t.isAdmin === true || t.role?.toLowerCase() === 'admin' || t.email?.toLowerCase() === 'aniltimilsena53@gmail.com' || !talentName || talentName.trim() === '')
                    return false;
                const matchesSearch = !deferredSearchQuery ||
                    talentName.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                    t.role?.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                    t.category?.toLowerCase().includes(deferredSearchQuery.toLowerCase()) ||
                    t.location?.toLowerCase().includes(deferredSearchQuery.toLowerCase());
                if (!matchesSearch)
                    return false;
                if (selectedFilters.category !== 'All' && !matchesCategory(t, selectedFilters.category))
                    return false;
                if (selectedFilters.location !== 'All' && t.location !== selectedFilters.location)
                    return false;
                if (selectedFilters.experienceLevel !== 'All' && getExperienceLevel(t) !== selectedFilters.experienceLevel)
                    return false;
                return true;
            })
            .reduce((acc, current) => {
                const currentName = (current.name || current.displayName || current.fullName || '').trim().toLowerCase();
                const currentEmail = (current.email || '').trim().toLowerCase();
                const isDuplicate = acc.some(item => {
                    if (item.id === current.id || item.uid === current.uid) return true;
                    if (currentEmail && item.email && item.email.trim().toLowerCase() === currentEmail) return true;
                    if (currentName && currentName !== 'talent user' && item.name && item.name.trim().toLowerCase() === currentName) return true;
                    return false;
                });
                if (!isDuplicate) {
                    acc.push(current);
                }
                return acc;
            }, [])
            .sort((a, b) => {
                if (activeSort === 'followers')
                    return (b.followers || 0) - (a.followers || 0);
                if (activeSort === 'trending')
                    return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0) || (b.followers || 0) - (a.followers || 0);
                const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
                const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
            });
    }, [talents, deferredSearchQuery, selectedFilters, activeSort]);
    const handleClearFilters = () => {
        setSelectedFilters({
            category: selectedFilters.category,
            location: 'All',
            experienceLevel: 'All',
        });
        setSearchQuery('');
    };
    const featuredTalents = useMemo(() => {
        const featuredOnly = talents.filter(t => !t.deactivated && t.featured === true);
        const allActive = talents.filter(t => !t.deactivated);
        return (featuredOnly.length > 0 ? featuredOnly : allActive).slice(0, 50);
    }, [talents]);

    const handleLoadMore = useCallback(() => {
        setVisibleCount(prev => Math.min(filteredTalents.length, prev + 12));
    }, [filteredTalents.length]);

    const hasMoreTalents = filteredTalents.length > visibleCount;
    const sentinelRef = useInfiniteScroll({
        onLoadMore: handleLoadMore,
        hasMore: hasMoreTalents,
        isLoading: loading || !profilesReady,
    });

    return (
        <Desktop3ColumnLayout user={activeUser} onNavigate={onNavigate} activeNav="talent" featuredTalents={featuredTalents}>
            <div className="min-h-screen bg-[#141414] text-white pt-2 sm:pt-4 pb-6 relative font-sans">
                <SEO title="Browse Professional Talent | NepalCasts" description="Premium directory of cinema professionals in Nepal." />



                <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 relative z-10">


                    {viewMode === 'categories' && (
                        <div className="animate-fade-in space-y-6 text-left">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                                <button onClick={() => onNavigate('home')} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0" aria-label="Back" title="Go Back">
                                    <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
                                </button>
                                <div>
                                    <h1 className="text-2xl sm:text-4xl font-sans font-black text-white tracking-tight leading-none">Talents by Category</h1>
                                </div>
                            </div>

                            {loading ? (
                                <CategoryGridSkeleton count={6} />
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full">
                                    {HOME_CATEGORY_CARDS.map((cat, idx) => {
                                        const count = getFacetedCount('category', cat.filter);
                                        return (
                                            <motion.div
                                                key={cat.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                whileHover={{ scale: 1.03, y: -3 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setSelectedFilters(prev => ({ ...prev, category: cat.filter }));
                                                    setViewMode('talents');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    if (typeof onNavigate === 'function') {
                                                        onNavigate('talents', cat.filter);
                                                    } else {
                                                        navigate(`/talents/${cat.filter}`);
                                                    }
                                                }}
                                                className="rounded-3xl p-4 sm:p-6 lg:p-8 aspect-square w-full h-full flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-black hover:bg-[#1c1c1c] shadow-xl group border border-white/5 gap-2 sm:gap-3"
                                            >
                                                <CategoryCardIcon
                                                    type={cat.iconType}
                                                    color="#ffffff"
                                                    className="w-18 h-18 sm:w-24 sm:h-24 lg:w-28 lg:h-28 fill-current text-white transition-transform duration-300 group-hover:scale-105"
                                                />
                                                <div className="w-full flex flex-col items-center justify-center shrink-0">
                                                    <span className="font-apple text-white font-bold text-base sm:text-2xl lg:text-3xl leading-tight whitespace-pre-line text-center tracking-tight">
                                                        {cat.label}
                                                    </span>
                                                    <span className="font-apple text-neutral-400 font-normal text-xs sm:text-base lg:text-lg mt-1 tracking-normal">
                                                        ({count} {count === 1 ? 'talent' : 'talents'})
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {viewMode === 'talents' && (<div className="animate-fade-in space-y-4 text-left relative">
                        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.06] mb-4 relative z-10">

                            <div className="flex items-center gap-3 min-w-0">
                                <button onClick={() => {
                                    setSelectedFilters(prev => ({ ...prev, category: 'All' }));
                                    setViewMode('categories');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    if (typeof onNavigate === 'function') {
                                        onNavigate('listing');
                                    } else {
                                        navigate('/talents');
                                    }
                                }} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0" aria-label="Back to Categories" title="Back to Categories">
                                    <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
                                </button>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">
                                        TALENTS
                                    </p>
                                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight truncate">
                                        {selectedFilters.category === 'All' ? 'All' : getCategoryConfig(selectedFilters.category).label}
                                    </h1>
                                    <p className="text-xs text-gray-400 font-medium mt-1">
                                        {filteredTalents.length} {filteredTalents.length === 1 ? 'talent' : 'talents'} found
                                    </p>
                                </div>
                            </div>

                            <div className="relative shrink-0 pt-1">
                                <button onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer" aria-label="Sort options" title="Sort options">
                                    <MoreHorizontal className="w-5 h-5 text-white" />
                                </button>

                                <AnimatePresence>
                                    {isSortDropdownOpen && (<>
                                        <div className="fixed inset-0 z-30" onClick={() => setIsSortDropdownOpen(false)} />
                                        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-40 bg-[#111116] border border-white/10 rounded-xl shadow-2xl py-1 z-40 text-left">
                                            {sortOptions.map(opt => {
                                                const isActive = activeSort === opt.id;
                                                return (<button key={opt.id} onClick={() => {
                                                    setActiveSort(opt.id);
                                                    setIsSortDropdownOpen(false);
                                                }} className={`w-full text-left px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${isActive
                                                    ? 'text-purple-400 bg-purple-500/10'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                                    {opt.label}
                                                </button>);
                                            })}
                                        </motion.div>
                                    </>)}
                                </AnimatePresence>
                            </div>

                        </div>


                        {(selectedFilters.location !== 'All' || selectedFilters.experienceLevel !== 'All' || searchQuery) && (<div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs text-gray-500 font-bold">Active filters:</span>
                            <div className="flex gap-1.5 flex-wrap items-center">
                                {selectedFilters.location !== 'All' && (<Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5 uppercase">
                                    LOC: {selectedFilters.location}
                                    <button onClick={() => setSelectedFilters(prev => ({ ...prev, location: 'All' }))}><X size={10} /></button>
                                </Tag>)}
                                {selectedFilters.experienceLevel !== 'All' && (<Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5 uppercase">
                                    EXP: {selectedFilters.experienceLevel}
                                    <button onClick={() => setSelectedFilters(prev => ({ ...prev, experienceLevel: 'All' }))}><X size={10} /></button>
                                </Tag>)}
                                {searchQuery && (<Tag color="default" className="flex items-center gap-1.5 text-[9px] py-0.5 uppercase">
                                    SEARCH: "{searchQuery}"
                                    <button onClick={() => setSearchQuery('')}><X size={10} /></button>
                                </Tag>)}
                                <button onClick={handleClearFilters} className="text-[10px] font-black text-gray-400 hover:text-white transition-colors ml-2 underline underline-offset-4 uppercase">
                                    Reset filters
                                </button>
                            </div>
                        </div>)}


                        {error && talents.length === 0 ? (
                            <div className="text-center py-16 px-4 bg-red-500/10 border border-red-500/20 rounded-[2rem] space-y-4">
                                <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-white">Failed to Load Talents</h3>
                                    <p className="text-xs text-red-200 max-w-sm mx-auto">{error}</p>
                                </div>
                                <button
                                    onClick={() => setReloadKey(k => k + 1)}
                                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : loading ? (<TalentCardSkeleton count={8} />) : !profilesReady ? (<TalentCardSkeleton count={8} />) : filteredTalents.length === 0 ? (
                            <div className="text-center py-16 px-4 bg-[#111] border border-dashed border-white/10 rounded-[2rem] space-y-4">
                                <Search className="w-12 h-12 text-gray-600 mx-auto" />
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-white">No talents found</h3>
                                    <p className="text-xs text-gray-400">No profiles match your current search and filter settings.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md inline-flex items-center gap-2"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        ) : (<>
                            <div className="space-y-1">
                                {filteredTalents.slice(0, visibleCount).map((talent) => (
                                    <TalentListItem
                                        key={talent.id}
                                        talent={talent}
                                        isFollowing={followingIds.includes(talent.id)}
                                        isSelf={talent.id === activeUser?.uid}
                                        isMenuOpen={activeMenuId === talent.id}
                                        onToggleMenu={handleToggleMenu}
                                        onCloseMenu={handleCloseMenu}
                                        onNavigate={onNavigate}
                                        onToggleFollow={handleToggleFollow}
                                        onShareTalent={handleShareTalent}
                                        expLevel={getExperienceLevel(talent)}
                                    />
                                ))}
                            </div>

                            {hasMoreTalents && (
                                <div ref={sentinelRef} className="pt-6 pb-4 flex flex-col items-center justify-center gap-2.5">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span className="w-4 h-4 border-2 border-[#522C69] border-t-transparent rounded-full animate-spin shrink-0" />
                                        <span>Loading more profiles...</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleLoadMore}
                                        className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold tracking-wide uppercase transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer shadow-md"
                                    >
                                        Load more talents ({filteredTalents.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}
                        </>)}
                    </div>)}

                    {activeShareTalent && (<ShareSheet profile={{
                        id: activeShareTalent.id,
                        name: activeShareTalent.name,
                        role: formatRole(activeShareTalent.role),
                        location: activeShareTalent.location || 'Nepal',
                        followers: activeShareTalent.followers || 0,
                        rating: parseFloat(activeShareTalent.rating) || 0,
                        image: activeShareTalent.photoURL || activeShareTalent.profileImage || activeShareTalent.image || null,
                        verified: activeShareTalent.verified || false,
                        username: activeShareTalent.username || null,
                    }} onClose={() => setActiveShareTalent(null)} />)}
                </div>
            </div>
        </Desktop3ColumnLayout>
    );
}
