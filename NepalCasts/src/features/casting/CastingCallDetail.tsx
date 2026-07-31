import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, MapPin, Video, Printer, Sparkles, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import SEO from '../../components/SEO';
import { InlineAlert } from '../../components/ui/AlertBanner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import Avatar from '../../components/ui/Avatar';

export default function CastingCallDetail({ onNavigate, castingId, user, showAlert }: any) {
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyAlert, setApplyAlert] = useState<{ type: string | null; message: string | null; detail?: string | null }>({ type: null, message: null, detail: null });
  const [saved, setSaved] = useState(false);
  const [saveAlert, setSaveAlert] = useState<{ type: string | null; message: string | null }>({ type: null, message: null });
  const [apps, setApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [directorProfile, setDirectorProfile] = useState<any>(null);
  const [relatedCalls, setRelatedCalls] = useState<any[]>([]);

  // Apply Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selfTapeUrl, setSelfTapeUrl] = useState('');
  const [coverNote, setCoverNote] = useState('');

  // Roster Filter state for directors
  const [pipelineFilter, setPipelineFilter] = useState('all');

  const [confirmConfig, setConfirmConfig] = useState<any>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    type: 'default',
    onConfirm: () => {},
  });

  const isCreator = user && call && (call.creatorId === user.uid || call.createdBy === user.uid);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!call?.deadline) return;
    const deadlineDate = new Date(call.deadline);
    if (isNaN(deadlineDate.getTime())) {
      setTimeLeft(call.deadline);
      return;
    }
    const updateTimer = () => {
      const diff = deadlineDate.getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('Closed');
        setIsExpired(true);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [call?.deadline]);

  useEffect(() => {
    if (!castingId) return;
    const unsub = onSnapshot(
      doc(db, 'casting_calls', castingId),
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setCall(data);
          if (data.roles && data.roles.length > 0 && !selectedRole) {
            setSelectedRole(data.roles[0].name || 'General Performer Role');
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Casting call snapshot listener failed:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [castingId]);

  useEffect(() => {
    if (!call?.creatorId) return;
    const unsub = onSnapshot(doc(db, 'profiles', call.creatorId), (snap) => {
      if (snap.exists()) {
        setDirectorProfile({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [call?.creatorId]);

  useEffect(() => {
    if (!call?.type) return;
    const q = query(collection(db, 'casting_calls'), where('type', '==', call.type));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.id !== call.id)
        .slice(0, 3);
      setRelatedCalls(data);
    });
    return () => unsub();
  }, [call?.id, call?.type]);

  useEffect(() => {
    if (!castingId || !user) return;
    const q = query(
      collection(db, 'applications'),
      where('castingId', '==', castingId),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setApplied(true);
        setApplicationId(snap.docs[0].id);
        setApplicationStatus(snap.docs[0].data().status || 'pending');
      } else {
        setApplied(false);
        setApplicationId(null);
        setApplicationStatus(null);
      }
    });
    return () => unsub();
  }, [castingId, user]);

  useEffect(() => {
    if (!castingId || !isCreator) {
      setApps([]);
      setLoadingApps(false);
      return;
    }
    setLoadingApps(true);
    const q = query(
      collection(db, 'applications'),
      where('castingId', '==', castingId),
      where('creatorId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      docs.sort((a: any, b: any) => {
        const t1 = a.appliedAt?.toDate ? a.appliedAt.toDate().getTime() : 0;
        const t2 = b.appliedAt?.toDate ? b.appliedAt.toDate().getTime() : 0;
        return t2 - t1;
      });
      const formattedDocs = docs.map((d: any) => ({
        ...d,
        appliedAtFormatted: d.appliedAt?.toDate
          ? d.appliedAt.toDate().toLocaleDateString()
          : 'Just now',
      }));
      setApps(formattedDocs);
      setLoadingApps(false);
    });
    return () => unsub();
  }, [castingId, isCreator, user?.uid]);

  const openApplyModal = () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (applied || applying) return;
    setIsApplyModalOpen(true);
  };

  const handleConfirmSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setApplying(true);
    setApplyAlert({ type: null, message: null, detail: null });
    try {
      const creatorId = call.creatorId || call.createdBy || '';
      await addDoc(collection(db, 'applications'), {
        castingId: call.id,
        castingTitle: call.title,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Anonymous Actor',
        userPhoto: user.photoURL || '',
        roleName: selectedRole || 'General Role',
        selfTapeUrl: selfTapeUrl.trim(),
        coverNote: coverNote.trim(),
        appliedAt: serverTimestamp(),
        status: 'pending',
        creatorId: creatorId,
      });

      if (creatorId) {
        await addDoc(collection(db, 'notifications'), {
          userId: creatorId,
          recipientId: creatorId,
          receiverId: creatorId,
          senderId: user.uid,
          senderName: user.displayName || 'Anonymous Talent',
          senderAvatar: user.photoURL || '',
          title: 'New Audition Application',
          body: `${user.displayName || 'Someone'} applied for "${selectedRole || 'Role'}" on "${call.title}"`,
          type: 'casting',
          notificationType: 'casting',
          isRead: false,
          read: false,
          createdAt: serverTimestamp(),
          targetUrl: `/casting/${call.id}`,
        });
      }

      setApplied(true);
      setIsApplyModalOpen(false);
      setApplyAlert({
        type: 'success',
        message: `Audition submitted for "${selectedRole || call.title}"`,
        detail: 'The casting team has received your self-tape and profile.',
      });
      showAlert?.(`Applied to "${call.title}"`, 'success');
    } catch (err) {
      console.error('[CastingCallDetail] apply error:', err);
      setApplyAlert({
        type: 'error',
        message: 'Could not submit application',
        detail: 'Please check your connection and try again.',
      });
    } finally {
      setApplying(false);
    }
  };

  const handleCancelApplication = async () => {
    if (!applicationId) return;
    setCancelling(true);
    try {
      await deleteDoc(doc(db, 'applications', applicationId));
      setApplied(false);
      setApplicationId(null);
      setApplicationStatus(null);
      showAlert?.('Application withdrawn successfully.', 'info');
    } catch (err) {
      console.error('Error cancelling application:', err);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Casting Call',
      description: 'Are you sure you want to delete this casting call? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await deleteDoc(doc(db, 'casting_calls', castingId));
          showAlert?.('Casting call deleted successfully.', 'success');
          onNavigate('casting');
        } catch (err) {
          console.error('Error deleting casting call:', err);
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleSave = () => {
    setSaved(!saved);
    setSaveAlert({
      type: 'success',
      message: saved ? 'Removed from saved' : 'Saved for later!',
    });
  };

  const handleUpdateAppStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      showAlert?.(`Applicant status updated to ${newStatus.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Error updating app status:', err);
    }
  };

  const handlePrintRoster = () => {
    window.print();
  };

  const getStatusBadgeClass = (statusStr: string) => {
    const s = (statusStr || 'pending').toLowerCase();
    if (s === 'accepted' || s === 'cast') return 'bg-[#00BFFF]/20 text-[#00BFFF] border-[#00BFFF]/30';
    if (s === 'shortlisted') return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
    if (s === 'callback') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (s === 'rejected') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  };

  const filteredApps = apps.filter((app) => {
    const s = (app.status || 'pending').toLowerCase();
    if (pipelineFilter === 'pending') return s === 'pending';
    if (pipelineFilter === 'shortlisted') return s === 'shortlisted';
    if (pipelineFilter === 'callback') return s === 'callback';
    if (pipelineFilter === 'accepted') return s === 'accepted' || s === 'cast';
    if (pipelineFilter === 'rejected') return s === 'rejected';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-[#00BFFF]/30 border-t-[#00BFFF] rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">Loading Audition Details...</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Casting Call Not Found</h2>
        <p className="text-gray-400 text-xs mb-6">This casting call may have been removed or closed.</p>
        <button
          onClick={() => onNavigate('casting')}
          className="px-6 py-2.5 rounded-full bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider"
        >
          Back to Casting Calls
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-4 pb-20 px-4 sm:px-8 font-sans">
      <SEO title={`${call.title} | NepalCasts Casting Call`} description={call.description} />

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation */}
        <button
          onClick={() => onNavigate('casting')}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Back to All Calls</span>
        </button>

        {/* Header Hero Banner */}
        <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-[#111] shadow-2xl">
          <div className="h-64 sm:h-80 w-full relative">
            <img
              src={call.thumbnail || '/movie-banner.png'}
              alt={call.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/60 to-transparent" />
          </div>

          <div className="p-6 sm:p-10 -mt-24 relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#00BFFF] text-black text-xs font-black uppercase tracking-wider">
                {call.category || call.type || 'Nepali Film'}
              </span>
              {call.status === 'active' && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Accepting Auditions
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {call.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-xs text-gray-300 font-semibold pt-2">
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-[#00BFFF]" />
                {call.location}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={14} className="text-[#00BFFF]" />
                Deadline: {call.deadline}
              </span>
              <span className="flex items-center gap-2 text-emerald-400 font-bold">
                Budget: {call.budget}
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-8 text-left">
            {/* Description */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">
                Project Overview
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {call.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Roles Needed */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
              <h2 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">
                Roles Open for Audition
              </h2>

              <div className="space-y-4">
                {call.roles && call.roles.length > 0 ? (
                  call.roles.map((role: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row justify-between items-start gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-white text-base">{role.name}</h3>
                          {role.ageRange && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 font-semibold">
                              Age: {role.ageRange}
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed max-w-xl whitespace-pre-line">
                            {role.description}
                          </p>
                        )}
                      </div>

                      <span className="px-3 py-1.5 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] text-xs font-black uppercase tracking-wider shrink-0">
                        {role.pay || 'Paid'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs italic">General roles available.</p>
                )}
              </div>
            </div>

            {/* Creator Portal / Applications Received */}
            {isCreator && (
              <div className="bg-[#111] border border-white/5 rounded-3xl p-4 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/5 gap-4">
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Applications Received ({apps.length})</span>
                    </h2>
                    <p className="text-xs text-gray-400">Director Candidate Pipeline & Roster</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintRoster}
                      className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-[#00BFFF]" />
                      <span>Print Roster</span>
                    </button>
                  </div>
                </div>

                {/* Pipeline Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {[
                    { id: 'all', label: `All (${apps.length})` },
                    { id: 'pending', label: 'Pending' },
                    { id: 'shortlisted', label: 'Shortlisted' },
                    { id: 'callback', label: 'Callback Invited' },
                    { id: 'accepted', label: 'Cast' },
                    { id: 'rejected', label: 'Rejected' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPipelineFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        pipelineFilter === tab.id
                          ? 'bg-[#00BFFF]/20 border border-[#00BFFF]/40 text-[#00BFFF]'
                          : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {loadingApps ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[#00BFFF]/30 border-t-[#00BFFF] animate-spin" />
                    <p className="text-gray-500 text-xs font-medium">Loading applicants...</p>
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                      No applications in this status stage
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {filteredApps.map((app) => (
                      <div
                        key={app.id}
                        className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 space-y-3 hover:border-[#00BFFF]/20 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={app.userPhoto}
                              size={44}
                              name={app.userName}
                              className="border border-white/10"
                            />
                            <div>
                              <div className="font-bold text-white flex items-center gap-2 text-base">
                                <span>{app.userName}</span>
                                <span
                                  className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                    app.status
                                  )}`}
                                >
                                  {app.status || 'pending'}
                                </span>
                              </div>
                              <div className="text-xs text-[#00BFFF] font-semibold mt-0.5">
                                Applied for: <span className="text-white font-bold">{app.roleName || 'General Role'}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-medium">
                                Submitted: {app.appliedAtFormatted} • {app.userEmail}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => onNavigate('profile', app.userId)}
                              className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all bg-white/5 cursor-pointer"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>

                        {/* Self Tape & Cover note info */}
                        {(app.selfTapeUrl || app.coverNote) && (
                          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
                            {app.selfTapeUrl && (
                              <div className="flex items-center gap-2 text-sky-400 font-semibold">
                                <Video className="w-4 h-4 shrink-0" />
                                <span>Audition Self-Tape:</span>
                                <a
                                  href={app.selfTapeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:text-white truncate"
                                >
                                  {app.selfTapeUrl}
                                </a>
                              </div>
                            )}
                            {app.coverNote && (
                              <div className="text-gray-300 leading-relaxed font-medium">
                                <span className="text-gray-500 font-bold">Cover Note:</span> "{app.coverNote}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status Pipeline Action Controls */}
                        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            Pipeline Stage:
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              { id: 'shortlisted', label: 'Shortlist', color: 'hover:bg-sky-500/20 text-sky-400' },
                              { id: 'callback', label: 'Callback', color: 'hover:bg-purple-500/20 text-purple-400' },
                              { id: 'accepted', label: 'Cast', color: 'hover:bg-emerald-500/20 text-emerald-400' },
                              { id: 'rejected', label: 'Reject', color: 'hover:bg-red-500/20 text-red-400' },
                            ].map((st) => (
                              <button
                                key={st.id}
                                onClick={() => handleUpdateAppStatus(app.id, st.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-white/10 transition-all cursor-pointer ${
                                  app.status === st.id ? 'bg-white/15 text-white border-white/30' : st.color
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar CTA & Info */}
          <div className="space-y-6 text-left lg:sticky lg:top-24 h-fit">
            <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 space-y-6 shadow-xl relative overflow-hidden">
              <div className="text-center bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div
                  className={`text-xl sm:text-2xl font-black ${
                    isExpired ? 'text-red-500' : 'text-[#FACC15]'
                  } font-mono tracking-wider`}
                >
                  {timeLeft || 'Open'}
                </div>
                <div className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1.5">
                  Application Deadline
                </div>
              </div>

              <div className="space-y-3.5 border-t border-b border-white/5 py-4 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase tracking-wider text-[10px]">Pay / Budget</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    {call.budget}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase tracking-wider text-[10px]">Location</span>
                  <span className="text-white flex items-center gap-1 font-bold">
                    <MapPin size={12} className="text-gray-500" />
                    {call.location}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {applyAlert.type && (
                  <InlineAlert
                    type={applyAlert.type as any}
                    message={applyAlert.message || ''}
                    detail={applyAlert.detail}
                    onDismiss={() => setApplyAlert({ type: null, message: null, detail: null })}
                  />
                )}

                {isCreator ? (
                  <Button
                    className="w-full bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white rounded-xl transition-all font-bold uppercase tracking-wider text-xs"
                    size="lg"
                    onClick={handleDelete}
                    loading={deleting}
                    disabled={deleting}
                  >
                    Delete Call
                  </Button>
                ) : (
                  <>
                    <Button
                      className={`w-full rounded-xl transition-all font-bold uppercase tracking-wider text-xs ${
                        applicationStatus === 'accepted'
                          ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default'
                          : applicationStatus === 'rejected'
                          ? 'bg-red-600/20 text-red-400 border border-red-500/30 cursor-default'
                          : 'bg-[#00BFFF] text-black hover:bg-[#0099e6]'
                      }`}
                      size="lg"
                      onClick={openApplyModal}
                      disabled={applied || applying || isExpired}
                    >
                      {applying
                        ? 'Submitting...'
                        : applicationStatus === 'accepted'
                        ? '✓ Application Accepted'
                        : applicationStatus === 'rejected'
                        ? '✕ Application Rejected'
                        : applied
                        ? '✓ Applied (Pending)'
                        : isExpired
                        ? 'Audition Closed'
                        : 'Apply Now'}
                    </Button>

                    {applied && applicationId && applicationStatus === 'pending' && (
                      <button
                        onClick={handleCancelApplication}
                        disabled={cancelling}
                        className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Withdraw Application
                      </button>
                    )}

                    {saveAlert.type && (
                      <InlineAlert
                        type={saveAlert.type as any}
                        message={saveAlert.message || ''}
                        onDismiss={() => setSaveAlert({ type: null, message: null })}
                      />
                    )}

                    <button
                      onClick={handleSave}
                      disabled={saved}
                      className={`w-full text-xs font-bold uppercase tracking-widest py-2.5 rounded-xl border border-white/5 bg-white/5 transition-colors cursor-pointer ${
                        saved ? 'text-[#00BFFF] cursor-default' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {saved ? ' Saved' : ' Save for Later'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audition Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111116] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-full bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 text-left">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00BFFF]" />
                <span>Submit Audition Application</span>
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Audition for "{call.title}"
              </p>
            </div>

            <form onSubmit={handleConfirmSubmitApplication} className="space-y-5 text-left">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Select Role to Audition For *
                </label>
                {call.roles && call.roles.length > 0 ? (
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#00BFFF]"
                  >
                    {call.roles.map((r: any, idx: number) => (
                      <option key={idx} value={r.name} className="bg-[#111116] text-white">
                        {r.name} {r.ageRange ? `(${r.ageRange})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    placeholder="e.g. Lead Actor / Supporting Performer"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none"
                  />
                )}
              </div>

              {/* Self-Tape Video Link */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  <span>Self-Tape Video Reel URL (Optional)</span>
                  <span className="text-[10px] text-[#00BFFF]">YouTube / Drive / Vimeo</span>
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or Drive link"
                  value={selfTapeUrl}
                  onChange={(e) => setSelfTapeUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-[#00BFFF]"
                />
              </div>

              {/* Cover Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                  Custom Cover Note to Director (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Introduce yourself, mention experience or availability..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-[#00BFFF] resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="w-1/3 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  loading={applying}
                  disabled={applying}
                  className="w-2/3 bg-[#00BFFF] text-black hover:bg-[#0099e6] rounded-xl font-bold uppercase tracking-wider text-xs"
                >
                  Confirm & Submit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
