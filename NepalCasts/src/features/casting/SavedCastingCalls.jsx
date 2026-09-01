import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, limit } from 'firebase/firestore';
import { ChevronLeft, Trash2, MapPin, Clock, BookmarkX } from 'lucide-react';
import { getCastingCallById } from './services/casting';
import { db } from '../../lib/firebase';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';
import Button from '../../components/ui/Button';
import { SavedCallSkeleton } from '../../components/ui/Skeleton';

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
  const [removing, setRemoving] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const q = query(collection(db, 'saved_calls'), where('userId', '==', currentUser.uid), limit(visibleLimit + 1));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      clearTimeout(timeoutId);
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
      setHasMore(hasMoreData);
      
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
      setSavedCalls(savedData);
      setLoading(false);
    }, (error) => {
      clearTimeout(timeoutId);
      console.error("Saved casting calls subscription error:", error);
      setLoading(false);
    });
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [currentUser?.uid, visibleLimit]);

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
      <div className="min-h-screen bg-[#141414] text-white relative font-sans pb-12">
        <SEO title="Saved Calls | NepalCasts" description="View and manage your bookmarked casting opportunities." />

        <div className="max-w-4xl mx-auto px-3 sm:px-6 w-full pt-4 space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Saved Calls
              </h1>
            </div>

            <span className="text-xs font-black text-gray-400 bg-black px-3.5 py-1.5 rounded-full border border-white/10">
              {savedCalls.length} Saved
            </span>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <SavedCallSkeleton count={3} />
          )}

          {/* Empty State */}
          {!loading && savedCalls.length === 0 && (
            <div className="py-16 text-center space-y-5 bg-black rounded-xl border border-white/10 p-6 sm:p-10">
              <div className="w-16 h-16 rounded-full bg-[#522C69]/10 text-[#522C69] flex items-center justify-center mx-auto shadow-xl">
                <BookmarkX className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-white">No Saved Calls Yet</h3>
                <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Bookmark interesting auditions while browsing to revisit and apply later.
                </p>
              </div>
              <Button onClick={handleBrowse} variant="primary" size="lg" className="rounded-xl font-bold px-6 text-xs uppercase tracking-wider">
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
                    className="bg-black rounded-xl border border-white/5 overflow-hidden cursor-pointer flex flex-row shadow-xl"
                  >
                    {/* Full-Bleed Poster Thumbnail (No empty black padding around it) */}
                    <div className="w-28 sm:w-40 md:w-44 self-stretch relative shrink-0 bg-[#121212] overflow-hidden flex items-center justify-center">
                      {bannerImage ? (
                        <img
                          src={bannerImage}
                          alt={call.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-thumb');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}

                      {/* Default Clapperboard Thumbnail Fallback */}
                      <div
                        className="default-clapper-thumb w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1c1c1c] via-[#121212] to-[#080808] p-2 text-center"
                        style={{ display: bannerImage ? 'none' : 'flex' }}
                      >
                        <svg className="w-9 h-9 sm:w-11 sm:h-11 text-white fill-current drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24">
                          <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
                        </svg>
                      </div>
                    </div>

                    {/* Info & Content Column */}
                    <div className="flex-1 p-3.5 sm:p-5 flex flex-col justify-between gap-3 min-w-0">
                      <div className="space-y-1 sm:space-y-1.5">
                        {/* Top Row: Category Tag & Delete action */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#522C69] font-bold text-[10px] sm:text-[11px] tracking-wider uppercase truncate">
                            {categoryTag}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnsave(call.saveId, call.title);
                            }}
                            disabled={removing === call.saveId}
                            className="p-1 text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                            title="Remove Bookmark"
                            aria-label="Remove Bookmark"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>

                        {/* Project Title */}
                        <h3 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                          {call.title || 'Untitled Casting Call'}
                        </h3>

                        {/* Looking for */}
                        <p className="text-xs sm:text-sm text-gray-300 font-medium line-clamp-1">
                          Looking for: {rolesSummary}
                        </p>

                        {/* Location */}
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>{call.location || 'Kathmandu'}</span>
                        </p>

                        {/* Salary / Compensation */}
                        <p className="text-xs sm:text-sm font-bold text-[#522C69] pt-0.5 truncate">
                          Salary: {call.budget || call.salary || 'NPR Negotiable'}
                        </p>
                      </div>

                      {/* Bottom Status Row / Footer */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-xs">
                        {/* Left Deadline */}
                        <div className="flex items-center gap-1.5 text-gray-400 text-[11px] sm:text-xs">
                          <Clock className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>Deadline: {formattedDate}</span>
                        </div>

                        {/* Right Status Badge */}
                        <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[9px] sm:text-xs font-black tracking-wider uppercase border ${
                          deadlineBadge.isClosed
                            ? 'bg-[#222] border-white/10 text-gray-400'
                            : 'bg-[#522C69]/15 border-[#522C69]/30 text-[#522C69]'
                        }`}>
                          {deadlineBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-3 pb-6">
                  <button
                    onClick={() => setVisibleLimit(prev => prev + 20)}
                    className="px-6 py-2.5 rounded-full bg-[#1c1c1c] hover:bg-[#282828] border border-white/10 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-md"
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

