import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { FileText, ChevronLeft, Clock, CheckCircle2, XCircle, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { db } from '../../lib/firebase';
import SEO from '../../components/SEO';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';

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
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const appData = await Promise.all(
        snap.docs.map(async (appDoc) => {
          const data = appDoc.data();
          try {
            const castingDoc = await getDoc(doc(db, 'casting_calls', data.castingId));
            return {
              appId: appDoc.id,
              ...data,
              castingCall: castingDoc.exists() ? castingDoc.data() : null
            };
          } catch {
            return {
              appId: appDoc.id,
              ...data,
              castingCall: null
            };
          }
        })
      );
      setApplications(appData);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser?.uid]);

  const handleCancel = async (appId: string) => {
    try {
      setCancellingId(appId);
      await deleteDoc(doc(db, 'applications', appId));
    } catch (err) {
      console.error('Error cancelling application:', err);
    } finally {
      setCancellingId(null);
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
    else navigate(-1);
  };

  return (
    <Desktop3ColumnLayout user={currentUser} onNavigate={onNavigate} activeNav="applications">
      <div className="min-h-screen bg-[#0A0A0A] text-white relative font-sans">
        <SEO title="My Applications | NepalCasts Auditions" description="Track your submitted audition applications." />

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
                  <FileText className="w-6 h-6 text-[#00BFFF]" />
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
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF]'
                      : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* List Content */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))}
            </div>
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
                className="px-6 py-2.5 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
              >
                Browse Casting Calls
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app) => {
                const call = app.castingCall;
                const title = call?.title || 'Casting Notice';
                const thumbnail = call?.thumbnail || '/movie-banner.png';
                const roleName = app.roleName || app.role || 'Performer Role';

                return (
                  <div
                    key={app.appId}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <img
                        src={thumbnail}
                        alt={title}
                        className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <h3
                          onClick={() =>
                            onNavigate
                              ? onNavigate('casting-detail', app.castingId)
                              : navigate(`/casting/${app.castingId}`)
                          }
                          className="font-bold text-white text-base truncate hover:text-[#00BFFF] cursor-pointer transition-colors"
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
                          onClick={() => handleCancel(app.appId)}
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
                        <ArrowRight className="w-3.5 h-3.5 text-[#00BFFF]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Desktop3ColumnLayout>
  );
}
