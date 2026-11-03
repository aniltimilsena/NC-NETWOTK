import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, limit } from 'firebase/firestore';
import { ChevronLeft, Trash2, MapPin, Clock, BookmarkX, AlertCircle } from 'lucide-react';
import { getCastingCallById } from './services/casting';
import { db } from '../../lib/firebase';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';
import Button from '../../components/ui/Button';
import { SavedCallSkeleton } from '../../components/ui/Skeleton';
import { getOptimizedImageUrl, getImageSrcSet } from '../../utils/media';
import { cacheManager } from '../../utils/cacheManager';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

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

const formatCategoryTag = (call) => {
  const cat = call.category || call.type || 'Project';
  if (cat.toLowerCase().startsWith('nepali')) {
    return cat.toUpperCase();
  }
  return `NEPALI ${cat.toUpperCase()}`;
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

const SavedCastingCalls = ({ user: propUser, onNavigate, showToast: propShowToast, activeTab }) => {
  const navigate = useNavigate();
  const context = useOutletContext();
  const currentUser = propUser || context?.user;
  const showToast = propShowToast || context?.showToast || ((msg) => console.log(msg));
  const [savedCalls, setSavedCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(16);
  const [hasMore, setHasMore] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const handleLoadMore = useCallback(() => {
    setVisibleLimit(prev => prev + 16);
  }, []);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: loading,
  });

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = cacheManager.subscribePooled(`user_saved_calls_${currentUser.uid}_${visibleLimit}`, (pooledCb) => {
      const q = query(collection(db, 'saved_calls'), where('userId', '==', currentUser.uid), limit(visibleLimit + 1));
      return onSnapshot(q, async (snapshot) => {
        const getTimestampMs = (val) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (typeof val.seconds === 'number') return val.seconds * 1000;
          if (val instanceof Date) return val.getTime();
          const parsed = new Date(val).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };

        const sortedDocs = [...snapshot.docs].sort((a, b) => {
          const timeA = getTimestampMs(a.data().savedAt);
          const timeB = getTimestampMs(b.data().savedAt);
          return timeB - timeA;
        });

        const docsData = sortedDocs.map(d => ({ id: d.id, data: d.data() }));
        const hasMoreData = docsData.length > visibleLimit;
        const slicedDocs = hasMoreData ? docsData.slice(0, visibleLimit) : docsData;

        const castingIds = slicedDocs.map(item => item.data.castingId).filter(Boolean);
        const uniqueCastingIds = Array.from(new Set(castingIds));
        
        const castingCallsMap = new Map();
        
        await Promise.all(uniqueCastingIds.map(async (id) => {
          try {
            const data = await getCastingCallById(id);
            if (data) {
              castingCallsMap.set(id, data);
            }
          } catch (err) {
            console.warn(`Failed to fetch casting call ${id}:`, err);
          }
        }));
        
        const savedData = [];
        for (const item of slicedDocs) {
          const castingData = castingCallsMap.get(item.data.castingId);
          if (castingData) {
            savedData.push({
              saveId: item.id,
              savedAt: item.data.savedAt,
              castingId: item.data.castingId,
              ...castingData,
            });
          } else {
            deleteDoc(doc(db, 'saved_calls', item.id)).catch(err => console.warn(err));
          }
        }
        pooledCb({ savedData, hasMoreData }, null);
      }, (err) => {
        console.error("Saved casting calls subscription error:", err);
        pooledCb(null, err);
      });
    }, (result, err) => {
      clearTimeout(timeoutId);
      if (err) {
        setError(err.message || 'Failed to load saved casting calls. Please check your connection.');
      } else if (result) {
        setError(null);
        setHasMore(result.hasMoreData);
        setSavedCalls(result.savedData || []);
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [currentUser?.uid, visibleLimit, reloadKey]);

  const handleUnsave = async (saveId, castingTitle) => {
    try {
      setRemoving(saveId);
      await deleteDoc(doc(db, 'saved_calls', saveId));
      showToast(`Removed "${castingTitle}" from saved calls`, 'success');
    } catch (error) {
      showToast('Failed to remove casting call', 'error');
    } finally {
      setRemoving(null);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('back');
    } else {
      if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  const handleBrowse = () => {
    if (onNavigate) {
      onNavigate('casting');
    } else {
      navigate('/casting');
    }
  };

  const handleViewDetails = (castingId) => {
    if (onNavigate) {
      onNavigate('casting-detail', castingId);
    } else {
      navigate(`/casting/${castingId}`);
    }
  };

  return (
    <Desktop3ColumnLayout user={currentUser} onNavigate={onNavigate} activeNav="saved-castings" trendingCalls={savedCalls}>
      <div className="min-h-screen bg-[#FAF8F4] text-[#202923] relative font-sans pb-16">
        <SEO title="Saved Calls | NepalCasts" description="View and manage your bookmarked casting opportunities." />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full pt-4 space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                type="button"
                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9] transition-colors cursor-pointer shrink-0"
                title="Go Back"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2} />
              </button>
              <h1 className="text-xl sm:text-2xl font-serif font-medium text-[#202923] tracking-tight">
                Saved Calls
              </h1>
            </div>

            <span className="text-xs font-semibold text-[#626860] bg-white px-3.5 py-1.5 rounded-full border border-[#E7E5E0] shadow-card">
              {savedCalls.length} Saved
            </span>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <SavedCallSkeleton count={3} />
          )}

          {/* Error State */}
          {error && savedCalls.length === 0 && (
            <div className="py-16 text-center space-y-5 bg-white rounded-2xl border border-[#E7E5E0] p-6 sm:p-10 shadow-card">
              <div className="w-16 h-16 rounded-full bg-red-50 text-[#B42318] flex items-center justify-center mx-auto shadow-sm">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-serif font-semibold text-[#202923]">Failed to Load Saved Calls</h3>
                <p className="text-xs sm:text-sm text-[#B42318] max-w-sm mx-auto leading-relaxed">
                  {error}
                </p>
              </div>
              <Button onClick={() => setReloadKey(k => k + 1)} variant="primary" size="lg" className="rounded-lg font-semibold px-6 text-xs tracking-wider">
                Try Again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && savedCalls.length === 0 && (
            <div className="py-16 text-center space-y-5 bg-white rounded-2xl border border-[#E7E5E0] p-6 sm:p-10 shadow-card">
              <div className="w-16 h-16 rounded-full bg-[#EAF2ED] text-[#194332] flex items-center justify-center mx-auto shadow-sm">
                <BookmarkX className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-serif font-semibold text-[#202923]">No Saved Calls Yet</h3>
                <p className="text-xs sm:text-sm text-[#626860] max-w-sm mx-auto leading-relaxed">
                  Bookmark interesting auditions while browsing to revisit and apply later.
                </p>
              </div>
              <Button onClick={handleBrowse} variant="primary" size="lg" className="rounded-lg font-semibold px-6 text-xs tracking-wider">
                Browse Active Calls
              </Button>
            </div>
          )}

          {/* Saved Calls List */}
          {!loading && savedCalls.length > 0 && (
            <div className="space-y-3.5">
              {savedCalls.map((call) => {
                const rolesSummary = Array.isArray(call.roles)
                  ? call.roles.map(r => typeof r === 'string' ? r : (r.name ? `${r.name}${r.ageRange ? `, ${r.ageRange}` : ''}` : 'Role')).join(', ')
                  : (typeof call.roles === 'object' && call.roles !== null
                      ? (call.roles.name || 'Role')
                      : (call.roles || call.description || 'Audition Opportunity')
                    );
                const rawBanner = call.bannerImage || call.thumbnail || call.image || call.coverImage || call.posterUrl || call.poster || call.bannerUrl || call.media?.[0]?.url || call.photoURL || null;
                const bannerImage = rawBanner && !isMockOrInvalidImage(rawBanner) ? rawBanner : null;
                const deadlineBadge = getDeadlineBadge(call.deadline);
                const formattedDate = formatDeadlineDate(call.deadline);
                const categoryTag = formatCategoryTag(call);

                return (
                  <div
                    key={call.saveId}
                    onClick={() => handleViewDetails(call.castingId)}
                    className="bg-white rounded-2xl border border-[#E7E5E0] hover:border-[#D5D1C7] overflow-hidden cursor-pointer flex flex-row shadow-card hover:shadow-elevated transition-all text-[#202923] group select-none"
                  >
                    {/* Full-Bleed Poster Thumbnail */}
                    <div className="w-28 sm:w-40 md:w-44 self-stretch relative shrink-0 bg-[#F3F0E9] overflow-hidden flex items-center justify-center">
                      {bannerImage ? (
                        <img
                          src={getOptimizedImageUrl(bannerImage, { width: 400, quality: 'auto', format: 'auto' })}
                          srcSet={getImageSrcSet(bannerImage, [240, 400, 600])}
                          sizes="(max-width: 640px) 112px, 176px"
                          alt={call.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-thumb');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}

                      {/* Default Clapperboard Thumbnail Fallback */}
                      <div
                        className="default-clapper-thumb w-full h-full flex flex-col items-center justify-center bg-[#F3F0E9] p-2 text-center"
                        style={{ display: bannerImage ? 'none' : 'flex' }}
                      >
                        <svg className="w-9 h-9 sm:w-11 sm:h-11 text-[#777C75] fill-current" viewBox="0 0 24 24">
                          <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
                        </svg>
                      </div>
                    </div>

                    {/* Info & Content Column */}
                    <div className="flex-1 p-3.5 sm:p-5 flex flex-col justify-between gap-3 min-w-0">
                      <div className="space-y-1 sm:space-y-1.5">
                        {/* Top Row: Category Tag & Delete action */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#194332] font-semibold text-[11px] tracking-wider uppercase truncate">
                            {categoryTag}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnsave(call.saveId, call.title);
                            }}
                            disabled={removing === call.saveId}
                            className="p-1 text-[#777C75] hover:text-[#B42318] transition-colors cursor-pointer shrink-0"
                            title="Remove Bookmark"
                            aria-label="Remove Bookmark"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Project Title */}
                        <h3 className="text-base sm:text-lg font-serif font-semibold text-[#202923] group-hover:text-[#194332] leading-tight truncate transition-colors">
                          {call.title || 'Untitled Casting Call'}
                        </h3>

                        {/* Looking for */}
                        <p className="text-xs sm:text-sm text-[#414840] font-normal line-clamp-1">
                          Looking for: {rolesSummary}
                        </p>

                        {/* Location */}
                        <p className="text-xs text-[#777C75] flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#777C75] shrink-0" />
                          <span>{call.location || 'Kathmandu'}</span>
                        </p>

                        {/* Salary / Compensation */}
                        <p className="text-xs sm:text-sm font-semibold text-[#202923] pt-0.5 truncate">
                          Salary: {call.budget || call.salary || 'NPR Negotiable'}
                        </p>
                      </div>

                      {/* Bottom Status Row / Footer */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-[#E7E5E0] text-xs">
                        {/* Left Deadline */}
                        <div className="flex items-center gap-1.5 text-[#777C75] text-[11px] sm:text-xs">
                          <Clock className="w-3.5 h-3.5 text-[#777C75] shrink-0" />
                          <span>Deadline: {formattedDate}</span>
                        </div>

                        {/* Right Status Badge */}
                        <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold tracking-wider uppercase border ${
                          deadlineBadge.isClosed
                            ? 'bg-[#F3F0E9] border-[#E7E5E0] text-[#777C75]'
                            : 'bg-[#EAF2ED] border-[#194332]/20 text-[#194332] shadow-sm'
                        }`}>
                          {deadlineBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div ref={sentinelRef} className="flex flex-col items-center justify-center gap-2.5 pt-4 pb-8">
                  <div className="flex items-center gap-2 text-xs text-[#626860]">
                    <span className="w-4 h-4 border-2 border-[#194332] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Loading more saved calls...</span>
                  </div>
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-2.5 rounded-lg bg-white hover:bg-[#F3F0E9] border border-[#D5D1C7] text-xs font-semibold tracking-wide text-[#202923] transition-all cursor-pointer shadow-card active:scale-95"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </Desktop3ColumnLayout>
  );
};

export default SavedCastingCalls;
