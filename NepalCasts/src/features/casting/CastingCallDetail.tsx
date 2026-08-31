import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Bookmark,
  User,
  MapPin,
  Briefcase,
  Globe,
  ShoppingBag,
  Calendar,
  Clapperboard,
  Sparkles,
  X,
  Trash2,
  Printer,
  Video,
  CheckCircle2,
  Inbox,
  Clock,
  Upload
} from 'lucide-react';
import Button from '../../components/ui/Button';
import SEO from '../../components/SEO';
import { InlineAlert } from '../../components/ui/AlertBanner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { db } from '../../lib/firebase';
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';
import Avatar from '../../components/ui/Avatar';
import { getProfile } from '../profile/services/profile';
import Desktop3ColumnLayout from '../../components/layout/Desktop3ColumnLayout';

const isMockOrInvalidImage = (url: string | null | undefined) => {
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

const getCastingThumbnail = (call: any) => {
  if (!call) return null;
  const raw =
    call.horizontalThumbnail ||
    call.bannerUrl ||
    call.bannerImage ||
    call.coverImage ||
    call.thumbnail ||
    call.image ||
    call.posterUrl ||
    call.poster ||
    call.media?.[0]?.url ||
    call.photoURL ||
    null;
  return raw && !isMockOrInvalidImage(raw) ? raw : null;
};

const formatDeadline = (dl?: string) => {
  if (!dl) return 'Open';
  const d = new Date(dl);
  if (isNaN(d.getTime())) return dl;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDeadline = (dl?: string) => {
  if (!dl) return 'Open';
  const d = new Date(dl);
  if (isNaN(d.getTime())) return dl;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function CastingCallDetail({ onNavigate, castingId, user, showAlert, activeTab }: any) {
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyAlert, setApplyAlert] = useState<{ type: string | null; message: string | null; detail?: string | null }>({
    type: null,
    message: null,
    detail: null,
  });
  const [saved, setSaved] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [directorProfile, setDirectorProfile] = useState<any>(null);

  const [isApplyView, setIsApplyView] = useState(activeTab === 'apply');
  const [selectedRole, setSelectedRole] = useState('');
  const [selfTapeUrl, setSelfTapeUrl] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pipelineFilter, setPipelineFilter] = useState('all');

  const [confirmConfig, setConfirmConfig] = useState<any>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    type: 'default',
    onConfirm: () => { },
  });

  const isCreator = user && call && (call.creatorId === user.uid || call.createdBy === user.uid);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!call?.deadline) return;
    const deadlineDate = new Date(call.deadline);
    if (!isNaN(deadlineDate.getTime())) {
      setIsExpired(deadlineDate.getTime() <= new Date().getTime());
    }
  }, [call?.deadline]);

  useEffect(() => {
    if (!castingId) return;
    const unsub = onSnapshot(
      doc(db, 'casting_calls', castingId),
      (snap) => {
        if (snap.exists()) {
          const data: any = { id: snap.id, ...snap.data() };
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
    getProfile(call.creatorId)
      .then((res) => {
        if (res.data) {
          setDirectorProfile(res.data);
        }
      })
      .catch((err) => console.warn(err));
  }, [call?.creatorId]);

  useEffect(() => {
    if (!castingId || !user?.uid) {
      setSaved(false);
      return;
    }
    const q = query(
      collection(db, 'saved_calls'),
      where('userId', '==', user.uid),
      where('castingId', '==', castingId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSaved(!snap.empty);
      },
      (err) => console.warn('Saved check failed:', err)
    );
    return () => unsub();
  }, [castingId, user?.uid]);

  useEffect(() => {
    if (!castingId || !user) return;
    const q = query(
      collection(db, 'applications'),
      where('castingId', '==', castingId),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          setApplied(true);
          setApplicationId(snap.docs[0].id);
          setApplicationStatus(snap.docs[0].data().status || 'pending');
        } else {
          setApplied(false);
          setApplicationId(null);
          setApplicationStatus(null);
        }
      },
      (error) => {
        console.error('Checking applied status failed:', error);
      }
    );
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
    const unsub = onSnapshot(
      q,
      (snap) => {
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
      },
      (error) => {
        console.error('Applications snapshot listener failed:', error);
        setLoadingApps(false);
      }
    );
    return () => unsub();
  }, [castingId, isCreator, user?.uid]);

  const handleToggleSave = async () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    try {
      const q = query(
        collection(db, 'saved_calls'),
        where('userId', '==', user.uid),
        where('castingId', '==', castingId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
        showAlert?.('Removed from saved casting calls', 'info');
      } else {
        await addDoc(collection(db, 'saved_calls'), {
          userId: user.uid,
          castingId: castingId,
          savedAt: new Date().toISOString(),
        });
        showAlert?.('Saved casting call!', 'success');
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const openApplyModal = () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (applied || applying) return;
    if (call?.roles && call.roles.length > 0 && !selectedRole) {
      setSelectedRole(call.roles[0]?.name || '');
    }
    setIsApplyView(true);
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
        roleName: selectedRole || call.roles?.[0]?.name || call.category || 'General Role',
        selfTapeUrl: selfTapeUrl.trim(),
        coverNote: coverNote.trim(),
        fileName: attachedFile ? attachedFile.name : null,
        appliedAt: serverTimestamp(),
        status: 'pending',
        creatorId: creatorId,
      });
      setApplied(true);
      setIsApplyView(false);
      setApplyAlert({
        type: 'success',
        message: `Audition submitted for "${selectedRole || call.title}"`,
        detail: 'The casting team has received your profile.',
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
    if (!call) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const appsList = apps
      .map(
        (a: any, i: number) => `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #64748b;">${i + 1}</td>
          <td><strong>${a.userName || 'Unnamed'}</strong><br/><span style="color:#64748b; font-size: 10px;">${a.userEmail || ''}</span></td>
          <td><span style="font-weight: 700; color: #0284c7;">${a.roleName || 'General Role'}</span></td>
          <td style="text-align: center;"><span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 9px; text-transform: uppercase; background: #e2e8f0;">${a.status || 'pending'}</span></td>
          <td>${a.coverNote ? `<div><em>"${a.coverNote}"</em></div>` : ''}${a.selfTapeUrl ? `<div><a href="${a.selfTapeUrl}">Video Reel Link</a></div>` : ''}</td>
          <td style="text-align: right; color: #64748b; font-size: 10px;">${a.appliedAtFormatted || 'N/A'}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${call.title} - Candidate Roster</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h2>${call.title} - Candidate Roster (${apps.length})</h2>
          <p>Generated on ${dateStr}</p>
          <table>
            <thead>
              <tr><th>#</th><th>Applicant</th><th>Role</th><th>Status</th><th>Notes</th><th>Date</th></tr>
            </thead>
            <tbody>${appsList}</tbody>
          </table>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const bannerImage = getCastingThumbnail(call);
  const primaryRole = call?.roles?.[0]?.name || call?.category || call?.role || 'WRITER';
  const shortDeadline = formatShortDeadline(call?.deadline);
  const fullDeadline = formatDeadline(call?.deadline);

  if (loading) {
    return (
      <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
        <div className="min-h-screen bg-[#141414] text-white p-4 sm:p-6 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#00BFFF]/30 border-t-[#00BFFF] animate-spin" />
        </div>
      </Desktop3ColumnLayout>
    );
  }

  if (!call) {
    return (
      <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
        <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Casting Call Not Found</h2>
          <p className="text-gray-400 text-xs mb-6">This casting call may have been removed or closed.</p>
          <button
            onClick={() => onNavigate('casting')}
            className="px-6 py-2.5 rounded-xl bg-[#00BFFF] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Back to Casting Calls
          </button>
        </div>
      </Desktop3ColumnLayout>
    );
  }

  if (isApplyView) {
    return (
      <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
        <div className="min-h-screen bg-[#141414] text-white pb-24 font-sans select-none">
          <SEO
            title={`Apply - ${call.title} | NepalCasts`}
            description={`Submit your audition application for ${call.title}`}
          />

          <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
            {/* Top Header: ← Apply for Casting */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsApplyView(false)}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
                title="Back"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
                Apply for Casting
              </h1>
            </div>

            {/* Casting Call Preview Card (Header Card from screenshot) */}
            <div className="bg-[#18181c] border border-white/5 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-lg">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/5">
                {bannerImage ? (
                  <img src={bannerImage} alt={call.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1a1f2e] to-[#0d0d12]">
                    <Clapperboard className="w-6 h-6 text-white/50" />
                  </div>
                )}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <span className="uppercase text-xs font-extrabold text-white tracking-wider block">
                  {selectedRole || primaryRole}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#00BFFF] lowercase truncate">
                  {call.title}
                </h2>
                <p className="text-xs text-amber-400 font-medium">
                  Deadline: {fullDeadline}
                </p>
              </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleConfirmSubmitApplication} className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">Your Application</h3>
              </div>

              {/* Role Selection if multiple roles exist */}
              {call.roles && call.roles.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-gray-300">
                    Select Role *
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    required
                    className="w-full bg-[#16161b] border border-white/10 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-white outline-none focus:border-[#00BFFF]"
                  >
                    {call.roles.map((r: any, idx: number) => (
                      <option key={idx} value={r.name} className="bg-[#18181c] text-white">
                        {r.name} {r.ageRange ? `(${r.ageRange})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cover Letter */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-gray-300">
                  Cover Letter
                </label>
                <div className="relative">
                  <textarea
                    rows={5}
                    maxLength={500}
                    placeholder="Tell us why you are the right fit for this role..."
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    className="w-full bg-[#16161b] border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#00BFFF] resize-none pb-7 leading-relaxed"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-gray-500 font-medium select-none">
                    {coverNote.length}/500
                  </span>
                </div>
              </div>

              {/* Portfolio / Work Samples */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-gray-300">
                  Portfolio / Work Samples
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/15 hover:border-white/30 rounded-xl bg-[#16161b]/50 p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all hover:bg-[#16161b]/80 group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg"
                  />
                  <Upload className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  <div>
                    {attachedFile ? (
                      <p className="text-xs font-bold text-cyan-400 truncate max-w-xs">
                        ✓ {attachedFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs sm:text-sm font-semibold text-gray-200">
                          Upload files (PDF, DOC, ZIP)
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          or drag and drop
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Links (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-gray-300">
                  Additional Links (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={selfTapeUrl}
                  onChange={(e) => setSelfTapeUrl(e.target.value)}
                  className="w-full bg-[#16161b] border border-white/10 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#00BFFF]"
                />
              </div>

              {/* Submit Application Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  loading={applying}
                  disabled={applying}
                  className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Inbox className="w-4 h-4" />
                  <span>Submit Application</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Desktop3ColumnLayout>
    );
  }

  return (
    <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
      <div className="min-h-screen bg-[#141414] text-white pb-24 font-sans select-none">
      <SEO
        title={`${call.title} | NepalCasts Casting Call`}
        description={call.description}
        image={bannerImage || undefined}
        url={`${typeof window !== 'undefined' ? window.location.origin : 'https://nepalcasts.com'}/casting/${castingId}`}
      />

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

      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2 sm:pt-3 space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('casting')}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
              title="Back"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Casting Call
            </h1>
          </div>

          {isCreator && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer p-1"
              title="Delete Casting Call"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}
        </div>

        {applyAlert.type && (
          <InlineAlert
            type={applyAlert.type as any}
            message={applyAlert.message || ''}
            detail={applyAlert.detail}
            onDismiss={() => setApplyAlert({ type: null, message: null, detail: null })}
          />
        )}

        {/* Main Card Container (Solid Black matching Home page) */}
        <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-6 md:p-8 space-y-6 text-left">
          {/* Hero Banner with Badge & Bookmark (9:16 Aspect Ratio) */}
          <div className="relative w-full aspect-[9/16] max-h-[85vh] mx-auto rounded-2xl overflow-hidden bg-[#111111]">
            {bannerImage ? (
              <img
                src={bannerImage}
                alt={call.title}
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-banner');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
            ) : null}

            <div
              className="default-clapper-banner w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1f2e] to-[#0d0d12] p-4 text-center"
              style={{ display: bannerImage ? 'none' : 'flex' }}
            >
              <Clapperboard className="w-16 h-16 text-cyan-400/50" />
            </div>

            {/* Gradient Overlay for bottom text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Bookmark button top-right (No background box/container, clean white icon) */}
            <button
              onClick={handleToggleSave}
              className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 p-1.5 text-white hover:text-white transition-all cursor-pointer drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] active:scale-90 z-10"
              title={saved ? 'Remove bookmark' : 'Bookmark casting call'}
              aria-label="Bookmark"
            >
              <Bookmark
                className={`w-6 h-6 sm:w-7 sm:h-7 ${saved ? 'fill-white text-white' : 'text-white'}`}
                strokeWidth={2.2}
              />
            </button>

            {/* Tag on bottom of image: ROLE • Deadline */}
            <div className="absolute bottom-3.5 left-3.5 sm:bottom-4 sm:left-4 flex items-center gap-2 text-xs sm:text-sm font-bold text-white drop-shadow-md bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10">
              <span className="uppercase tracking-wider text-white font-extrabold">{primaryRole}</span>
              <span className="text-amber-400 font-bold">•</span>
              <span className="text-amber-400 font-semibold">Deadline: {shortDeadline}</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#00BFFF] lowercase tracking-tight">
              {call.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-400 font-medium">
              {call.category || call.type || 'Production'} • {call.location || 'Kathmandu'}
            </p>
          </div>

          {/* About the Project */}
          <div className="space-y-2 pt-1">
            <h3 className="text-base sm:text-lg font-bold text-white">
              About the Project
            </h3>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line font-normal">
              {call.description || 'We are looking for passionate talent to join this creative project.'}
            </p>
          </div>

          {/* Structured Details Grid / Key-Value Rows (Responsive 2-column on tablet/desktop with White Icons) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-2">
            {/* Role */}
            <div className="flex items-center justify-between text-sm sm:text-base py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-gray-300">
                <User className="w-4.5 h-4.5 text-white shrink-0" strokeWidth={2} />
                <span>Role</span>
              </div>
              <span className="font-semibold text-white text-right">
                {call.roles?.[0]?.name || call.category || 'Writer'}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center justify-between text-sm sm:text-base py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-gray-300">
                <MapPin className="w-4.5 h-4.5 text-white shrink-0" strokeWidth={2} />
                <span>Location</span>
              </div>
              <span className="font-semibold text-white text-right">
                {call.location || 'Kathmandu'}
              </span>
            </div>

            {/* Type */}
            <div className="flex items-center justify-between text-sm sm:text-base py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-gray-300">
                <Briefcase className="w-4.5 h-4.5 text-white shrink-0" strokeWidth={2} />
                <span>Type</span>
              </div>
              <span className="font-semibold text-white text-right">
                {call.compensationType || call.type || 'Paid'}
              </span>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between text-sm sm:text-base py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-gray-300">
                <Globe className="w-4.5 h-4.5 text-white shrink-0" strokeWidth={2} />
                <span>Language</span>
              </div>
              <span className="font-semibold text-white text-right">
                {call.language || 'Nepali / English'}
              </span>
            </div>

            {/* Budget */}
            <div className="flex items-center justify-between text-sm sm:text-base py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-gray-300">
                <ShoppingBag className="w-4.5 h-4.5 text-white shrink-0" strokeWidth={2} />
                <span>Budget</span>
              </div>
              <span className="font-semibold text-white text-right">
                {call.budget || 'Negotiable'}
              </span>
            </div>

            {/* Application Deadline */}
            <div className="flex items-center justify-between text-sm sm:text-base py-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 text-gray-300">
                <Calendar className="w-4.5 h-4.5 text-white shrink-0" strokeWidth={2} />
                <span>Application Deadline</span>
              </div>
              <span className="font-semibold text-white text-right">
                {fullDeadline}
              </span>
            </div>
          </div>

          <div className="pt-2">
            {isCreator ? (
              <div className="space-y-2">
                <div className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs font-bold text-cyan-400">
                  You created this casting call ({apps.length} applicants)
                </div>
              </div>
            ) : applied ? (
              <div className="flex items-center gap-2">
                <div
                  className={`flex-1 py-3.5 px-4 rounded-xl text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2 ${applicationStatus === 'accepted'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : applicationStatus === 'rejected'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-[#2563EB]/20 text-blue-300 border border-blue-500/30'
                    }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {applicationStatus === 'accepted'
                      ? 'Application Accepted'
                      : applicationStatus === 'rejected'
                        ? 'Application Rejected'
                        : 'Applied (Pending Review)'}
                  </span>
                </div>
                {applicationStatus === 'pending' && applicationId && (
                  <button
                    onClick={handleCancelApplication}
                    disabled={cancelling}
                    className="px-4 py-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            ) : isExpired ? (
              <button
                disabled
                className="w-full py-3.5 px-6 rounded-xl bg-white/5 border border-white/10 text-gray-500 font-bold text-sm text-center cursor-not-allowed"
              >
                Audition Closed
              </button>
            ) : (
              <button
                onClick={openApplyModal}
                disabled={applying}
                className="w-full py-3.5 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Clapperboard className="w-4 h-4" />
                <span>{applying ? 'Submitting...' : 'Apply Now'}</span>
              </button>
            )}
          </div>
        </div>

        {isCreator && (
          <div className="bg-black border border-white/5 rounded-3xl p-4 sm:p-6 space-y-4 text-left shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-cyan-400" />
                <span>Applications Received ({apps.length})</span>
              </h3>
              <button
                onClick={handlePrintRoster}
                className="text-cyan-400 hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: `All (${apps.length})` },
                { id: 'pending', label: 'Pending' },
                { id: 'shortlisted', label: 'Shortlisted' },
                { id: 'accepted', label: 'Cast' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPipelineFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${pipelineFilter === tab.id
                      ? 'bg-[#00BFFF] text-black shadow-sm shadow-[#00BFFF]/20'
                      : 'bg-[#18181c] text-gray-400 hover:text-white border border-white/5'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loadingApps ? (
              <div className="py-8 text-center text-xs text-gray-500">Loading applicants...</div>
            ) : apps.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
                No applications received yet.
              </div>
            ) : (
              <div className="divide-y divide-white/5 space-y-3">
                {apps
                  .filter((a) => {
                    if (pipelineFilter === 'all') return true;
                    return (a.status || 'pending').toLowerCase() === pipelineFilter;
                  })
                  .map((app) => (
                    <div key={app.id} className="pt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar userId={app.userId} src={app.userPhoto} name={app.userName} size="sm" />
                          <div>
                            <span className="font-bold text-white block">{app.userName}</span>
                            <span className="text-[11px] text-cyan-400">{app.roleName || 'General Role'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate('profile', app.userId)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-300 hover:text-white cursor-pointer"
                        >
                          Profile
                        </button>
                      </div>

                      {app.coverNote && (
                        <p className="text-gray-400 italic bg-black/40 p-2 rounded-lg text-[11px]">
                          "{app.coverNote}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-500">{app.appliedAtFormatted}</span>
                        <div className="flex items-center gap-1">
                          {['shortlisted', 'accepted', 'rejected'].map((st) => (
                            <button
                              key={st}
                              onClick={() => handleUpdateAppStatus(app.id, st)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${app.status === st
                                  ? 'bg-cyan-500 text-black'
                                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                                }`}
                            >
                              {st}
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
      </div>
    </Desktop3ColumnLayout>
  );
}
