import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, limit } from 'firebase/firestore';
import { Bookmark, ChevronLeft, Trash2, MapPin, ArrowRight, BookmarkX } from 'lucide-react';
import { getCastingCallById } from './services/casting';
import { db } from '../../lib/firebase';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { SavedCallSkeleton } from '../../components/ui/Skeleton';

const SavedCastingCalls = ({ user: propUser, onNavigate, showToast: propShowToast, activeTab }) => {
  const navigate = useNavigate();
  const context = useOutletContext();
  const currentUser = propUser || context?.user;
  const showToast = propShowToast || context?.showToast || ((msg) => alert(msg));
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
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all cursor-pointer"
                title="Go Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Bookmark className="w-6 h-6 text-[#00BFFF]" />
                  <span>Saved Casting Calls</span>
                </h1>
                <p className="text-xs text-gray-400 font-medium">Manage your bookmarked audition opportunities</p>
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
              {savedCalls.map((call) => (
                <GlassCard
                  key={call.saveId}
                  className="p-5 rounded-3xl border border-white/10 hover:border-[#00BFFF]/30 transition-all space-y-4 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30">
                          {call.category || call.type || 'Casting'}
                        </span>
                      </div>
                      <h3
                        onClick={() => handleViewDetails(call.castingId)}
                        className="text-lg sm:text-xl font-black text-white group-hover:text-[#00BFFF] transition-colors cursor-pointer truncate"
                      >
                        {call.title}
                      </h3>
                      <p className="text-xs text-gray-400 line-clamp-1 font-medium">
                        {Array.isArray(call.roles)
                          ? call.roles.map(r => typeof r === 'string' ? r : (r.name || 'Role')).join(' | ')
                          : (typeof call.roles === 'object' && call.roles !== null
                              ? (call.roles.name || 'Role')
                              : (call.roles || call.description || 'Audition Opportunity')
                            )
                        }
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnsave(call.saveId, call.title)}
                      disabled={removing === call.saveId}
                      className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer flex-shrink-0"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                    <div className="flex items-center gap-4">
                      {call.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-500" />
                          {call.location}
                        </span>
                      )}
                      {call.budget && (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          Rs. {call.budget}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleViewDetails(call.castingId)}
                      className="text-xs font-bold text-[#00BFFF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Full Role</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </GlassCard>
              ))}
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
