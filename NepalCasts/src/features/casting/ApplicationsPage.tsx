import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, limit, orderBy, getDocs, documentId } from 'firebase/firestore';
import { FileText, ChevronLeft, Clock, CheckCircle2, XCircle, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { getCastingCallById } from './services/casting';
import { db } from '../../lib/firebase';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';
import { ApplicationSkeleton } from '../../components/ui/Skeleton';
import { DeleteDialog } from '../../components/ui/ConfirmDialog';
import { getOptimizedImageUrl } from '../../utils/media';
import { cacheManager } from '../../utils/cacheManager';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

interface ApplicationsPageProps {
  user?: any;
  onNavigate?: (page: string, param?: any) => void;
  initialFilter?: string;
}

export default function ApplicationsPage({ user: propUser, onNavigate, initialFilter = 'all' }: ApplicationsPageProps) {
  const navigate = useNavigate();
  const context = useOutletContext<any>();
  const currentUser = propUser || context?.user;

  const [filter, setFilter] = useState(initialFilter || 'all');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(16);
  const [hasMore, setHasMore] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const castingCacheRef = useRef<Map<string, any>>(new Map());

  const handleLoadMore = useCallback(() => {
    setVisibleLimit(prev => prev + 16);
  }, []);

  const sentinelRef = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore,
    isLoading: loading,
  });

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const poolKey = `user_applications_full_${currentUser.uid}_limit_${visibleLimit}_k_${reloadKey}`;
    const unsub = cacheManager.subscribePooled(poolKey, (pooledCb) => {
      const q = query(
        collection(db, 'applications'),
        where('userId', '==', currentUser.uid),
        orderBy('appliedAt', 'desc'),
        limit(visibleLimit + 1)
      );

      return onSnapshot(q, async (snap) => {
        const docsData = snap.docs.map(d => ({ id: d.id, data: d.data() }));
        const hasMoreData = docsData.length > visibleLimit;
        const slicedDocs = docsData.slice(0, visibleLimit);

        // Batch fetch missing casting call metadata
        const missingCastingIds = [...new Set(slicedDocs
          .map((item) => item.data.castingId)
          .filter((id) => id && !castingCacheRef.current.has(id)))];

        if (missingCastingIds.length > 0) {
          try {
            const chunks: string[][] = [];
            for (let i = 0; i < missingCastingIds.length; i += 30) {
              chunks.push(missingCastingIds.slice(i, i + 30));
            }
            await Promise.all(
              chunks.map(async (chunk) => {
                const chunkQuery = query(
                  collection(db, 'casting_calls'),
                  where(documentId(), 'in', chunk)
                );
                const castingSnap = await getDocs(chunkQuery);
                castingSnap.docs.forEach((d: any) => {
                  castingCacheRef.current.set(d.id, { id: d.id, ...d.data() });
                });
              })
            );
          } catch (e) {
            console.warn('Batch fetch casting calls warning in ApplicationsPage:', e);
          }
        }

        const appData = slicedDocs.map((item) => {
          const castingData = castingCacheRef.current.get(item.data.castingId);
          return {
            appId: item.id,
            ...item.data,
            castingCall: castingData || null
          };
        });

        pooledCb({ appData, hasMoreData }, null);
      }, (err) => {
        console.error('Applications snapshot error:', err);
        pooledCb(null, err);
      });
    }, (result, err) => {
      if (err) {
        setError(err.message || 'Failed to load applications. Please check your connection.');
      } else if (result) {
        setError(null);
        setHasMore(result.hasMoreData);
        setApplications(result.appData || []);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser?.uid, visibleLimit, reloadKey]);

  const handleConfirmCancel = async () => {
    if (!deleteTargetId) return;
    try {
      setCancellingId(deleteTargetId);
      await deleteDoc(doc(db, 'applications', deleteTargetId));
      setApplications(prev => prev.filter(a => a.appId !== deleteTargetId));
      if (context?.showAlert) {
        context.showAlert('Application withdrawn successfully.', 'info');
      }
    } catch (err: any) {
      console.error('Error cancelling application:', err);
      if (context?.showAlert) {
        context.showAlert(err.message || 'Failed to withdraw application. Please try again.', 'error');
      }
    } finally {
      setCancellingId(null);
      setDeleteTargetId(null);
    }
  };

  const filteredApps = applications.filter((app) => {
    const status = (app.status || 'pending').toLowerCase();
    if (filter === 'active') return status === 'pending' || status === 'under_review';
    if (filter === 'shortlisted') return status === 'accepted' || status === 'shortlisted';
    if (filter === 'rejected') return status === 'rejected';
    return true;
  });

  const getStatusBadge = (statusStr: string) => {
    const status = (statusStr || 'pending').toLowerCase();
    if (status === 'accepted' || status === 'shortlisted') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Shortlisted</span>
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider">
          <XCircle className="w-3.5 h-3.5" />
          <span>Not Selected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        <span>Pending Review</span>
      </span>
    );
  };

  const handleBack = () => {
    if (onNavigate) onNavigate('back');
    else {
      if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <Desktop3ColumnLayout user={currentUser} onNavigate={onNavigate} activeNav="applications">
      <div className="min-h-screen bg-[#141414] text-white relative font-sans">
        <SEO title="My Applications | NepalCasts Auditions" description="Track your submitted audition applications." />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                type="button"
                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Go Back"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <FileText className="w-6 h-6 text-white" />
                  <span>My Audition Applications</span>
                </h1>
                <p className="text-xs text-gray-400 font-medium">Track your status across submitted casting calls</p>
              </div>
            </div>

            <span className="text-xs font-extrabold text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              {applications.length} Total
            </span>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-3 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Applications', path: '/applications' },
              { id: 'active', label: 'Active / Pending', path: '/applications/active' },
              { id: 'shortlisted', label: 'Shortlisted', path: '/applications/shortlisted' },
              { id: 'rejected', label: 'Rejected', path: '/applications/rejected' },
            ].map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilter(tab.id);
                    navigate(tab.path);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                      ? 'bg-[#522C69] text-[#0A0A0A] shadow-sm shadow-[#522C69]/20'
                      : 'bg-[#18181c] text-gray-400 hover:text-white border border-white/5'
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* List Content */}
          {error && applications.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-red-500/10 border border-red-500/20 rounded-3xl p-6">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">Failed to Load Applications</h3>
              <p className="text-xs text-red-200 max-w-xs mx-auto">
                {error}
              </p>
              <button
                onClick={() => setReloadKey(k => k + 1)}
                className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <ApplicationSkeleton count={3} />
          ) : filteredApps.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white/[0.02] border border-white/5 rounded-3xl p-6">
              <AlertCircle className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Applications Found</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                {filter === 'all'
                  ? "You haven't submitted any audition applications yet."
                  : `No ${filter} applications match your filter.`}
              </p>
              <button
                onClick={() => (onNavigate ? onNavigate('casting') : navigate('/casting'))}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-md active:scale-95"
              >
                Browse Casting Calls
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app) => {
                const call = app.castingCall;
                const isMockOrInvalid = (url: string | null | undefined) => {
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
                const rawThumb = call?.thumbnail || call?.image || call?.coverImage || call?.posterUrl || call?.poster || call?.bannerUrl || call?.media?.[0]?.url || call?.photoURL || null;
                const thumbnail = rawThumb && !isMockOrInvalid(rawThumb) ? rawThumb : null;
                const title = call?.title || app.castingTitle || 'Casting Call';
                const roleName = app.roleName || app.role || 'Performer Role';

                return (
                  <div
                    key={app.appId}
                    className="p-5 rounded-xl bg-black border border-white/5 hover:border-white/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-16 h-16 rounded-none overflow-hidden relative shrink-0 bg-[#141418] border border-white/10 flex items-center justify-center">
                        {thumbnail ? (
                          <img
                            src={getOptimizedImageUrl(thumbnail, { width: 160, quality: 'auto', format: 'auto' })}
                            alt={title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e: any) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-thumb');
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className="default-clapper-thumb w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#22222a] via-[#1a1a20] to-[#101014] p-1 text-center"
                          style={{ display: thumbnail ? 'none' : 'flex' }}
                        >
                          <svg className="w-8 h-8 text-indigo-300/90 fill-current drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" viewBox="0 0 24 24">
                            <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3
                          onClick={() =>
                            onNavigate
                              ? onNavigate('casting-detail', app.castingId)
                              : navigate(`/casting/${app.castingId}`)
                          }
                          className="font-bold text-white text-base truncate hover:text-[#522C69] cursor-pointer transition-colors"
                        >
                          {title}
                        </h3>
                        <p className="text-xs text-gray-400">
                          Role: <span className="text-white font-semibold">{roleName}</span>
                        </p>
                        <div className="pt-1">{getStatusBadge(app.status)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      {app.status === 'pending' && (
                        <button
                          onClick={() => setDeleteTargetId(app.appId)}
                          disabled={cancellingId === app.appId}
                          className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          onNavigate
                            ? onNavigate('casting-detail', app.castingId)
                            : navigate(`/casting/${app.castingId}`)
                        }
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div ref={sentinelRef} className="flex flex-col items-center justify-center gap-2.5 mt-6 py-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="w-4 h-4 border-2 border-[#522C69] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Loading more applications...</span>
                  </div>
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmCancel}
        title="Withdraw Application"
        description="Are you sure you want to withdraw this audition application? This action cannot be undone."
        confirmText="Withdraw"
        cancelText="Keep Application"
        isLoading={Boolean(cancellingId)}
      />
    </Desktop3ColumnLayout>
  );
}
