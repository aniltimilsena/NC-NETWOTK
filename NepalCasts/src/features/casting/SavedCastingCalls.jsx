import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, limit } from 'firebase/firestore';
import { Bookmark, ChevronLeft, Trash2, MapPin, ArrowRight, BookmarkX } from 'lucide-react';
import { getCastingCallById } from './services/casting';
import { db } from '../../lib/firebase';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';
import Button from '../../components/ui/Button';
import { SavedCallSkeleton } from '../../components/ui/Skeleton';

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
      <div className="min-h-screen bg-[#0A0A0A] text-white relative font-sans">
        <SEO title="Saved Casting Calls | NepalCasts" description="View and manage your bookmarked casting opportunities." />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Bookmark className="w-6 h-6 text-white" />
                  <span>Saved Casting Calls</span>
                </h1>
              </div>
            </div>

            <span className="text-xs font-extrabold text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              {savedCalls.length} Saved
            </span>
          </div>



          {/* Loading Skeletons */}
          {loading && (
            <SavedCallSkeleton count={3} />
          )}

          {/* Empty State */}
          {!loading && savedCalls.length === 0 && (
            <div className="py-16 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] flex items-center justify-center mx-auto shadow-2xl">
                <BookmarkX className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">No Saved Casting Calls Yet</h3>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Bookmark interesting auditions while browsing to revisit and apply later.
                </p>
              </div>
              <Button onClick={handleBrowse} variant="primary" size="lg" className="rounded-2xl font-extrabold px-6">
                Browse Active Casting Calls
              </Button>
            </div>
          )}

          {/* Saved Calls List */}
          {!loading && savedCalls.length > 0 && (
            <div className="space-y-4">
              {savedCalls.map((call) => {
                const rolesSummary = Array.isArray(call.roles)
                  ? call.roles.map(r => typeof r === 'string' ? r : (r.name || 'Role')).join(', ')
                  : (typeof call.roles === 'object' && call.roles !== null
                      ? (call.roles.name || 'Role')
                      : (call.roles || call.description || 'Audition Opportunity')
                    );
                const bannerImage = call.bannerImage || call.thumbnail || call.image || '/movie-banner.png';

                return (
                  <div
                    key={call.saveId}
                    onClick={() => handleViewDetails(call.castingId)}
                    className="flex items-start justify-between py-3 sm:py-3.5 border-b border-white/10 transition-all cursor-pointer gap-3 sm:gap-6"
                  >
                    {/* Left: Poster + Details */}
                    <div className="flex items-start gap-3 sm:gap-5 flex-1 min-w-0">
                      {/* Poster Thumbnail */}
                      <div className="w-36 sm:w-52 h-24 sm:h-32 rounded-xl overflow-hidden relative shrink-0 bg-[#111] border border-white/10">
                        <img
                          src={bannerImage}
                          alt={call.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/movie-banner.png';
                          }}
                        />
                      </div>

                      {/* Text content details */}
                      <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                            {call.category || call.type || 'Nepali Project'}
                          </span>
                        </div>

                        <h2 className="text-base sm:text-2xl font-bold text-white leading-tight truncate">
                          {call.title}
                        </h2>

                        <p className="text-xs text-gray-400 font-medium line-clamp-1 leading-relaxed">
                          Looking for: {rolesSummary}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-gray-400 pt-0.5">
                          {call.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#00BFFF] shrink-0" />
                              <span className="truncate max-w-[100px] sm:max-w-none">{call.location}</span>
                            </span>
                          )}
                          {call.budget && (
                            <span className="flex items-center gap-1 text-[#00BFFF] font-bold">
                              Salary: {call.budget}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Column */}
                    <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnsave(call.saveId, call.title);
                        }}
                        disabled={removing === call.saveId}
                        className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
                        title="Remove Bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <span
                        onClick={() => handleViewDetails(call.castingId)}
                        className="text-xs font-bold text-[#00BFFF] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <span>View Role</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div className="flex justify-center mt-6 py-2">
                  <button
                    onClick={() => setVisibleLimit(prev => prev + 20)}
                    className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
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
