import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Bookmark,
  MapPin,
  Briefcase,
  Globe,
  ShoppingBag,
  Calendar,
  Clapperboard,
  Trash2,
  Printer,
  Video,
  CheckCircle2,
  Inbox,
  Upload,
  Share2,
  ShieldCheck,
  Check,
  Film,
  Users,
  ListChecks,
  Paperclip,
  ExternalLink,
  FileText
} from 'lucide-react';
import Button from '../../components/ui/Button';
import SEO from '../../components/SEO';
import { InlineAlert } from '../../components/ui/AlertBanner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { uploadMedia } from '../../utils/uploadMedia';
import { db } from '../../lib/firebase';
import {
  doc,
  onSnapshot,
  collection,
  addDoc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs
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

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: call?.title || 'Casting Call on NepalCasts',
          text: `Audition for ${call?.title} on NepalCasts!`,
          url: url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(url);
      showAlert?.('Casting link copied to clipboard!', 'success');
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
      const roleApplied = selectedRole || call.roles?.[0]?.name || call.category || 'General Role';
      
      let fileUrl = null;
      let fileName = null;
      if (attachedFile) {
        fileName = attachedFile.name;
        try {
          const res = await uploadMedia(attachedFile, 'applications');
          if (res?.url) {
            fileUrl = res.url;
          }
        } catch (uploadErr) {
          console.warn('Could not upload attached file to Cloudinary:', uploadErr);
        }
      }

      const appDocRef = await addDoc(collection(db, 'applications'), {
        castingId: call.id,
        castingTitle: call.title,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Anonymous Actor',
        userPhoto: user.photoURL || '',
        roleName: roleApplied,
        selfTapeUrl: selfTapeUrl.trim(),
        coverNote: coverNote.trim(),
        fileName: fileName,
        fileUrl: fileUrl,
        attachmentUrl: fileUrl,
        portfolioUrl: selfTapeUrl.trim() || fileUrl || '',
        appliedAt: serverTimestamp(),
        status: 'pending',
        creatorId: creatorId,
      });

      // Notify the creator of the casting call
      if (creatorId && creatorId !== user.uid) {
        const notifId = `${user.uid}_${call.id}_${appDocRef.id}_application`;
        const actorName = user.displayName || 'An actor';
        await setDoc(
          doc(db, 'notifications', notifId),
          {
            userId: creatorId,
            recipientId: creatorId,
            receiverId: creatorId,
            senderId: user.uid,
            senderName: actorName,
            senderAvatar: user.photoURL || '',
            type: 'casting',
            notificationType: 'casting',
            title: call.title || 'Casting Call',
            body: `${actorName} applied to your casting call: "${call.title || 'Audition'}" for role "${roleApplied}"`,
            message: `${actorName} applied to your casting call: "${call.title || 'Audition'}" for role "${roleApplied}"`,
            targetUrl: `/casting/${call.id}`,
            link: `/casting/${call.id}`,
            profileUrl: `/profile/${user.uid}`,
            castingId: call.id,
            roleName: roleApplied,
            read: false,
            isRead: false,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((notifErr) => {
          console.warn('Could not dispatch application notification to creator:', notifErr);
        });
      }

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

      const appItem = apps.find((a: any) => a.id === appId);
      if (appItem && appItem.userId && appItem.userId !== user?.uid) {
        const notifId = `${user?.uid}_${appId}_${newStatus}_status`;
        const sender = user?.displayName || 'Casting Director';
        let statusMsg = `${sender} updated your application for "${call.title}"`;
        if (newStatus === 'shortlisted') {
          statusMsg = `${sender} shortlisted your application for "${call.title}"`;
        } else if (newStatus === 'accepted') {
          statusMsg = `${sender} accepted your application for "${call.title}"`;
        } else if (newStatus === 'rejected') {
          statusMsg = `${sender} updated your application status for "${call.title}"`;
        }

        await setDoc(
          doc(db, 'notifications', notifId),
          {
            userId: appItem.userId,
            recipientId: appItem.userId,
            receiverId: appItem.userId,
            senderId: user?.uid,
            senderName: sender,
            senderAvatar: user?.photoURL || '',
            type: 'casting_status',
            notificationType: 'casting_status',
            status: newStatus,
            title: call.title || 'Casting Application',
            body: statusMsg,
            message: statusMsg,
            targetUrl: `/casting/${call.id}`,
            link: `/casting/${call.id}`,
            castingId: call.id,
            read: false,
            isRead: false,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((notifErr) => {
          console.warn('Could not dispatch status update notification:', notifErr);
        });
      }

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
  const allRoles = (call?.roles && Array.isArray(call.roles) && call.roles.length > 0)
    ? call.roles.filter((r: any) => r && r.name && r.name.trim())
    : (call?.type || call?.category ? [{ name: call.type || call.category, ageRange: '', description: '' }] : []);
  const allRolesLabel = allRoles.map((r: any) => r.name).join(', ') || call?.category || 'Performer';
  const primaryRole = allRolesLabel;
  const shortDeadline = formatShortDeadline(call?.deadline);
  const fullDeadline = formatDeadline(call?.deadline);

  if (loading) {
    return (
      <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
        <div className="min-h-screen bg-[#141414] text-white p-4 sm:p-6 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#ffb400]/30 border-t-[#ffb400] animate-spin" />
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
            className="px-6 py-2.5 rounded-xl bg-[#ffb400] hover:bg-[#ffa000] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
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
                <h2 className="text-base sm:text-lg font-bold text-[#ffb400] lowercase truncate">
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

              {/* Role Selection */}
              {allRoles.length > 1 ? (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-semibold text-gray-300 block">
                    Select Role to Apply For *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {allRoles.map((r: any, idx: number) => {
                      const isSelected = selectedRole === r.name;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedRole(r.name)}
                          className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-[#ffb400]/15 border-[#ffb400] text-white shadow-sm'
                              : 'bg-[#18181c] border-white/10 text-gray-300 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-[#ffb400]' : 'text-white'}`}>
                              {r.name}
                            </span>
                            {r.ageRange && (
                              <span className="text-[10px] text-amber-300/80 font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10">
                                {r.ageRange}
                              </span>
                            )}
                          </div>
                          {r.description && (
                            <span className="text-[11px] text-gray-400 line-clamp-2">
                              {r.description}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : allRoles.length === 1 ? (
                <div className="space-y-1">
                  <span className="text-xs text-gray-400 font-semibold block">Applying For Role:</span>
                  <div className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs sm:text-sm inline-block">
                    {allRoles[0].name} {allRoles[0].ageRange ? `(${allRoles[0].ageRange})` : ''}
                  </div>
                </div>
              ) : null}

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
                    className="w-full bg-[#16161b] border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#ffb400] resize-none pb-7 leading-relaxed"
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
                      <p className="text-xs font-bold text-[#ffb400] truncate max-w-xs">
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
                  className="w-full bg-[#16161b] border border-white/10 rounded-xl px-3.5 py-3 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#ffb400]"
                />
              </div>

              {/* Submit Application Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  loading={applying}
                  disabled={applying}
                  className="w-full bg-[#ffb400] hover:bg-[#e6a200] text-black font-extrabold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20 cursor-pointer transition-all active:scale-[0.98]"
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
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
              title="Back"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <h1 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Casting Call
            </h1>
          </div>
        </div>

        {applyAlert.type && (
          <InlineAlert
            type={applyAlert.type as any}
            message={applyAlert.message || ''}
            detail={applyAlert.detail}
            onDismiss={() => setApplyAlert({ type: null, message: null, detail: null })}
          />
        )}

        {/* Main Card Container with Rich 2-Column Responsive Layout */}
        <div className="w-full space-y-3.5 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-5 items-start">
                     {/* Left Column: Poster + Quick Actions + Production Card */}
            <div className="lg:col-span-5 space-y-2">
              {/* Hero Banner with Badge & Bookmark (9:16 Aspect Ratio) */}
              <div className="relative w-full aspect-[9/16] max-h-[75vh] mx-auto rounded-2xl overflow-hidden bg-[#111111] shadow-xl">
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
                  <Clapperboard className="w-16 h-16 text-white/50" />
                </div>

                {/* Gradient Overlay for bottom text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

                {/* Tag on bottom of image: ROLES • Deadline */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white drop-shadow-md bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="uppercase tracking-wider text-white font-extrabold truncate max-w-[55%]">
                    {allRolesLabel}
                  </span>
                  <span className="text-[#ffb400] font-semibold shrink-0">
                    Deadline: {shortDeadline}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Share & Save */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5 text-white" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className="w-full py-2.5 px-3 rounded-xl bg-black border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-[#ffb400] text-[#ffb400]' : 'text-gray-400'}`} />
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              {/* Production / Casting Director Card */}
              <div className="bg-black border border-white/10 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Production Team
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar
                    userId={call.creatorId || call.createdBy}
                    src={directorProfile?.photoURL || call.creatorPhoto}
                    name={call.production || directorProfile?.displayName || call.creatorName || 'Production'}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm truncate">
                      {call.production || directorProfile?.displayName || call.creatorName || 'Independent Production'}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">
                      {directorProfile?.role || 'Casting Director'} • {call.location || 'Nepal'}
                    </p>
                  </div>
                </div>

                {call.creatorId && (
                  <button
                    type="button"
                    onClick={() => onNavigate('profile', call.creatorId)}
                    className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer text-center block"
                  >
                    View Director Profile
                  </button>
                )}

                {call.contactInfo && (
                  <div className="pt-2 border-t border-white/5 text-xs text-gray-400 space-y-1">
                    <span className="font-semibold text-gray-300 block">Contact Info:</span>
                    <p className="text-gray-300 font-mono text-[11px] bg-black/40 p-2 rounded-lg break-all">
                      {call.contactInfo}
                    </p>
                  </div>
                )}
              </div>

              {/* Primary Call to Action Button */}
              <div className="pt-0.5">
                {isCreator ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-black border border-white/10 text-center text-xs font-bold text-gray-300">
                    You created this casting call ({apps.length} {apps.length === 1 ? 'applicant' : 'applicants'})
                  </div>
                ) : applied ? (
                  <div className="flex items-center gap-2.5 sm:gap-3 w-full">
                    <div
                      className={`flex-1 py-3 px-4 rounded-full text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border shadow-sm ${
                        applicationStatus === 'accepted'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : applicationStatus === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-white text-black border-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">
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
                        className="py-3 px-4 sm:px-5 rounded-full border border-white/30 bg-white/10 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-50"
                      >
                        {cancelling ? 'Withdrawing...' : 'Withdraw Application'}
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
                    className="w-full py-3.5 px-6 rounded-xl bg-[#ffb400] text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-950/20 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Clapperboard className="w-4 h-4" />
                    <span>{applying ? 'Submitting...' : 'Apply for Audition'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Project Info + Highlights + Roles + Requirements + Timeline */}
            <div className="lg:col-span-7 space-y-2">
              
              {/* Category Badges & Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs text-[#ffb400] font-bold w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="uppercase tracking-wider font-extrabold truncate">
                      {call.category || 'Short Film'}
                    </span>
                    <span className="text-[#ffb400]/40 select-none">•</span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="truncate">{call.location || 'Kathmandu, Nepal'}</span>
                    </span>
                  </div>

                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffb400] animate-pulse" />
                    <span>Active Casting</span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                  {call.title}
                </h2>

                <p className="text-xs sm:text-sm text-gray-400 font-medium">
                  Posted by <span className="text-white font-semibold">{call.production || call.creatorName || 'Production House'}</span> • Deadline: <span className="text-[#ffb400] font-semibold">{fullDeadline}</span>
                </p>
              </div>

              {/* Key Info Highlights Grid (4 Modern Tiles) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-black border border-white/10 rounded-2xl p-3 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <ShoppingBag className="w-3.5 h-3.5 text-white" />
                    <span>Budget</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {call.budget || 'Negotiable'}
                  </p>
                </div>

                <div className="bg-black border border-white/10 rounded-2xl p-3 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span>Deadline</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {shortDeadline}
                  </p>
                </div>

                <div className="bg-black border border-white/10 rounded-2xl p-3 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Briefcase className="w-3.5 h-3.5 text-white" />
                    <span>Compensation</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {call.compensationType || 'Paid Role'}
                  </p>
                </div>

                <div className="bg-black border border-white/10 rounded-2xl p-3 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Globe className="w-3.5 h-3.5 text-white" />
                    <span>Language</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {call.language || 'Nepali'}
                  </p>
                </div>
              </div>

              {/* About the Project (Synopsis) */}
              <div className="bg-black border border-white/10 rounded-2xl p-3.5 space-y-1.5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-white" />
                  <span>About the Project</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line font-normal">
                  {call.description || 'We are looking for passionate talent to join this creative project.'}
                </p>
              </div>

              {/* Open / Available Roles Cards List */}
              {allRoles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-white" />
                      <span>Available Roles ({allRoles.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allRoles.map((role: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-black border border-white/10 space-y-1.5 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-white text-sm sm:text-base">
                            {role.name || `Role ${idx + 1}`}
                          </h4>
                          {role.ageRange && (
                            <span className="text-[11px] font-bold text-[#ffb400]">
                              {role.ageRange}
                            </span>
                          )}
                        </div>
                        {role.description ? (
                          <p className="text-xs text-gray-400 leading-relaxed font-normal">
                            {role.description}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 italic">
                            No specific character description provided.
                          </p>
                        )}
                        {!isCreator && !applied && !isExpired && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRole(role.name);
                              setIsApplyView(true);
                            }}
                            className="pt-1 text-[#ffb400] text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>Audition for {role.name} →</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audition Requirements & Criteria */}
              {call.requirements && Array.isArray(call.requirements) && call.requirements.length > 0 && (
                <div className="bg-black border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-white" />
                    <span>Audition Requirements</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {call.requirements.map((req: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 bg-[#0a0a0a] border border-white/5 p-2 rounded-xl"
                      >
                        <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-300 font-medium leading-tight">
                          {req}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* How Audition Works (3-Step Timeline) */}
              <div className="bg-black border border-white/10 rounded-2xl p-3.5 space-y-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Audition Process & Timeline
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                  <div className="p-2.5 bg-[#0a0a0a] border border-white/5 rounded-xl space-y-1">
                    <div className="w-5 h-5 rounded-full bg-[#ffb400]/20 text-[#ffb400] text-xs font-black flex items-center justify-center">
                      1
                    </div>
                    <h5 className="text-xs font-bold text-white">Apply Online</h5>
                    <p className="text-[11px] text-gray-400 leading-snug">
                      Submit your NepalCasts profile and cover note.
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#0a0a0a] border border-white/5 rounded-xl space-y-1">
                    <div className="w-5 h-5 rounded-full bg-[#ffb400]/20 text-[#ffb400] text-xs font-black flex items-center justify-center">
                      2
                    </div>
                    <h5 className="text-xs font-bold text-white">Director Review</h5>
                    <p className="text-[11px] text-gray-400 leading-snug">
                      The casting team reviews applications & reels.
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#0a0a0a] border border-white/5 rounded-xl space-y-1">
                    <div className="w-5 h-5 rounded-full bg-[#ffb400]/20 text-[#ffb400] text-xs font-black flex items-center justify-center">
                      3
                    </div>
                    <h5 className="text-xs font-bold text-white">Callback & Role</h5>
                    <p className="text-[11px] text-gray-400 leading-snug">
                      Shortlisted candidates receive callback notifications.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {isCreator && (
          <div className="bg-black border border-white/5 rounded-3xl p-4 sm:p-6 space-y-4 text-left shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-white" />
                <span>Applications Received ({apps.length})</span>
              </h3>
              <button
                onClick={handlePrintRoster}
                className="text-[#ffb400] text-xs font-bold flex items-center gap-1 cursor-pointer"
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
                      ? 'bg-[#ffb400] text-black shadow-sm shadow-[#ffb400]/20'
                      : 'bg-[#18181c] text-gray-400 border border-white/5'
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
                            <span className="text-[11px] text-[#ffb400]">{app.roleName || 'General Role'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate('profile', app.userId)}
                          className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-300 cursor-pointer"
                        >
                          Profile
                        </button>
                      </div>

                      {app.coverNote && (
                        <p className="text-gray-300 italic bg-white/[0.04] p-2.5 rounded-xl text-[11px] leading-relaxed border border-white/5">
                          "{app.coverNote}"
                        </p>
                      )}

                      {/* Portfolio & Audition Media Attachments */}
                      {(app.fileUrl || app.attachmentUrl || app.fileName || app.selfTapeUrl || app.portfolioUrl) && (() => {
                        const directFileUrl = app.fileUrl || app.attachmentUrl || (app.selfTapeUrl?.match(/\.(jpeg|jpg|png|webp|gif|pdf|doc|docx|mp4|mov|mkv)$/i) || app.selfTapeUrl?.includes('cloudinary') || app.selfTapeUrl?.includes('firebasestorage') ? app.selfTapeUrl : null);
                        const reelUrl = (app.selfTapeUrl || app.portfolioUrl) && app.selfTapeUrl !== directFileUrl && app.portfolioUrl !== directFileUrl ? (app.selfTapeUrl || app.portfolioUrl) : null;

                        return (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {/* File Attachment / Document */}
                            {directFileUrl ? (
                              <a
                                href={directFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffb400]/10 border border-[#ffb400]/25 text-[10px] text-white font-semibold active:scale-95 transition-all cursor-pointer shadow-sm"
                                title="Click to open attachment"
                              >
                                <Paperclip className="w-3 h-3 text-[#ffb400]" />
                                <span className="truncate max-w-[150px]">{app.fileName || 'Attachment'}</span>
                                <ExternalLink className="w-3 h-3 text-[#ffb400]" />
                              </a>
                            ) : app.fileName ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-300 font-medium"
                                title="File name submitted by applicant"
                              >
                                <FileText className="w-3 h-3 text-[#ffb400]" />
                                <span className="truncate max-w-[150px]">{app.fileName}</span>
                              </span>
                            ) : null}

                            {/* Video Reel / Self Tape Link */}
                            {reelUrl && (
                              <a
                                href={reelUrl.startsWith('http') ? reelUrl : `https://${reelUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-200 font-semibold active:scale-95 transition-all cursor-pointer"
                              >
                                <Video className="w-3 h-3 text-[#ffb400]" />
                                <span className="truncate max-w-[150px]">Reel / Link</span>
                                <ExternalLink className="w-3 h-3 text-gray-400" />
                              </a>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-500">{app.appliedAtFormatted}</span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { id: 'shortlisted', label: 'Shortlist' },
                            { id: 'accepted', label: 'Accept' },
                            { id: 'rejected', label: 'Reject' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              onClick={() => handleUpdateAppStatus(app.id, st.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase transition-all cursor-pointer ${app.status === st.id
                                  ? 'bg-[#ffb400] text-black border border-[#ffb400]'
                                  : 'bg-white/5 text-gray-400 border border-white/10'
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

        {isCreator && (
          <div className="flex justify-end pt-3 pb-6">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-1.5 rounded-full bg-[#ffb400] text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Delete Casting Call"
            >
              <Trash2 className="w-3.5 h-3.5 text-black" />
              <span>{deleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        )}
      </div>
      </div>
    </Desktop3ColumnLayout>
  );
}
