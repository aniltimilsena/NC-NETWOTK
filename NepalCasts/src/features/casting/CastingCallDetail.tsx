import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, MapPin, Video, Printer, Sparkles, X, Trash2, FileText, Users, Inbox } from 'lucide-react';
import Button from '../../components/ui/Button';
import SEO from '../../components/SEO';
import { InlineAlert } from '../../components/ui/AlertBanner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc, updateDoc, query, where, getDocs, limit } from 'firebase/firestore';
import Avatar from '../../components/ui/Avatar';
import { getProfile } from '../profile/services/profile';

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
  const raw = call.thumbnail || call.image || call.coverImage || call.posterUrl || call.poster || call.bannerUrl || call.media?.[0]?.url || call.photoURL || null;
  return raw && !isMockOrInvalidImage(raw) ? raw : null;
};

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
    onConfirm: () => { },
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
    getProfile(call.creatorId).then((res) => {
      if (res.data) {
        setDirectorProfile(res.data);
      }
    }).catch((err) => console.warn(err));
  }, [call?.creatorId]);

  useEffect(() => {
    if (!call?.type) return;
    const q = query(
      collection(db, 'casting_calls'),
      where('type', '==', call.type),
      limit(10)
    );
    getDocs(q).then((snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.id !== call.id)
        .slice(0, 3);
      setRelatedCalls(data);
    }).catch((err) => console.warn(err));
  }, [call?.id, call?.type]);

  useEffect(() => {
    if (!castingId || !user) return;
    const q = query(
      collection(db, 'applications'),
      where('castingId', '==', castingId),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(q,
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
        console.error("Checking applied status failed:", error);
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
    const unsub = onSnapshot(q,
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
        console.error("Applications snapshot listener failed:", error);
        setLoadingApps(false);
      }
    );
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
    if (!call) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const rolesList = (call.roles || []).map((r: any) => `
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${r.name || 'General'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${r.ageRange || 'Any'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #0284c7; font-weight: bold;">${r.pay || 'Paid'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${r.description || '-'}</td>
      </tr>
    `).join('');

    const appsList = (apps || []).map((app: any, idx: number) => `
      <tr style="page-break-inside: avoid;">
        <td style="padding: 10px 12px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #64748b;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${app.userName || 'Applicant'}</div>
          <div style="font-size: 11px; color: #64748b;">${app.userEmail || ''}</div>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0284c7;">
          ${app.roleName || 'General Role'}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
            ${app.status === 'accepted' || app.status === 'cast' ? 'background: #dcfce7; color: #166534; border: 1px solid #86efac;' :
              app.status === 'shortlisted' ? 'background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;' :
              app.status === 'rejected' ? 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;' :
              'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
            }">
            ${app.status || 'pending'}
          </span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #334155;">
          ${app.selfTapeUrl ? `<a href="${app.selfTapeUrl}" target="_blank" style="color: #0284c7; text-decoration: underline; font-weight: 600;">Watch Self-Tape</a>` : '-'}
          ${app.coverNote ? `<div style="font-style: italic; margin-top: 4px; color: #64748b; font-size: 10.5px;">"${app.coverNote}"</div>` : ''}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: right;">
          ${app.appliedAtFormatted || '-'}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${call.title} - Official Casting Roster | NepalCasts</title>
          <style>
            @page {
              size: A4;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2.5px solid #00bfff;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }
            .logo-brand {
              display: flex;
              align-items: center;
              gap: 14px;
            }
            .logo-img {
              height: 44px;
              max-width: 160px;
              object-fit: contain;
            }
            .brand-title {
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #00bfff;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .doc-title {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .header-meta {
              text-align: right;
              font-size: 10.5px;
              color: #475569;
              line-height: 1.5;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 20px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 3px;
            }
            .meta-value {
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
            }
            .section-heading {
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #0f172a;
              margin: 20px 0 10px 0;
              border-bottom: 1.5px solid #0f172a;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11px;
            }
            th {
              background: #0f172a;
              color: #ffffff;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding: 8px 12px;
              text-align: left;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            .footer {
              margin-top: 30px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="logo-brand">
              <img src="${logoUrl}" alt="NepalCasts Logo" class="logo-img" onError="this.style.display='none'" />
              <div>
                <div class="brand-title">NEPALCASTS • OFFICIAL AUDITION ROSTER</div>
                <h1 class="doc-title">${call.title}</h1>
              </div>
            </div>
            <div class="header-meta">
              <div><strong>Date Generated:</strong> ${dateStr}</div>
              <div><strong>Total Applicants:</strong> ${apps.length}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Category</span>
              <span class="meta-value">${call.category || call.type || 'Film/TV'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Location</span>
              <span class="meta-value">${call.location || 'Nepal'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Deadline</span>
              <span class="meta-value">${call.deadline || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Salary / Budget</span>
              <span class="meta-value" style="color: #0284c7;">${call.budget || 'Negotiable'}</span>
            </div>
          </div>

          ${rolesList ? `
            <div class="section-heading">Roles Open for Audition</div>
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Age Range</th>
                  <th>Pay Rate</th>
                  <th>Role Description</th>
                </tr>
              </thead>
              <tbody>
                ${rolesList}
              </tbody>
            </table>
          ` : ''}

          <div class="section-heading">Candidate Roster (${apps.length})</div>
          ${apps.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th>Applicant Name & Email</th>
                  <th>Applied Role</th>
                  <th style="text-align: center;">Status</th>
                  <th>Audition Material / Notes</th>
                  <th style="text-align: right;">Applied Date</th>
                </tr>
              </thead>
              <tbody>
                ${appsList}
              </tbody>
            </table>
          ` : `
            <div style="padding: 20px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 11px;">
              No applications recorded for this casting call yet.
            </div>
          `}

          <div class="footer">
            <span>Confidential • Official Casting Roster Document generated via NepalCasts Platform</span>
            <span>NepalCasts Network</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
      <div className="min-h-screen bg-[#0A0A0A] text-white pt-12 pb-20 px-4 sm:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8 animate-pulse text-left">
          <div className="h-4 skeleton rounded-md w-28" />
          <div className="rounded-[2.5rem] border border-white/10 bg-[#111] overflow-hidden space-y-4">
            <div className="h-64 sm:h-80 w-full skeleton" />
            <div className="p-6 sm:p-10 space-y-4">
              <div className="flex gap-2">
                <div className="h-6 skeleton rounded-full w-20" />
                <div className="h-6 skeleton rounded-full w-32" />
              </div>
              <div className="h-10 skeleton rounded-xl w-3/4" />
              <div className="flex gap-4">
                <div className="h-4 skeleton rounded w-24" />
                <div className="h-4 skeleton rounded w-32" />
                <div className="h-4 skeleton rounded w-20" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="h-6 skeleton rounded-md w-40 mb-3" />
                <div className="space-y-2">
                  <div className="h-4 skeleton rounded w-full" />
                  <div className="h-4 skeleton rounded w-11/12" />
                  <div className="h-4 skeleton rounded w-4/5" />
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-4">
                <div className="h-6 skeleton rounded-md w-28 mb-3" />
                <div className="h-12 skeleton rounded-2xl w-full" />
              </div>
            </div>
          </div>
        </div>
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
      <SEO
        title={`${call.title} | NepalCasts Casting Call`}
        description={call.description}
        image={call.thumbnailUrl || call.mediaUrl || undefined}
        url={`${typeof window !== 'undefined' ? window.location.origin : 'https://nepalcasts.com'}/casting/${castingId}`}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: call.title,
          description: call.description,
          datePosted: call.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          validThrough: call.deadline ? new Date(call.deadline).toISOString() : undefined,
          hiringOrganization: {
            '@type': 'Organization',
            name: directorProfile?.name || call.directorName || 'NepalCasts',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: call.location || 'Nepal',
              addressCountry: 'NP',
            },
          },
          baseSalary: call.budget ? {
            '@type': 'MonetaryAmount',
            currency: 'NPR',
            value: {
              '@type': 'QuantitativeValue',
              value: call.budget,
              unitText: 'PROJECT'
            }
          } : undefined,
          employmentType: 'CONTRACTOR',
          industry: 'Entertainment',
          url: `${typeof window !== 'undefined' ? window.location.origin : 'https://nepalcasts.com'}/casting/${castingId}`,
        }}
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

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Hero Banner with subtle rounded-xl curved edges */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0E0E12] shadow-2xl">
          {/* Floating Consistent Back Button */}
          <button
            onClick={() => onNavigate('casting')}
            className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-all cursor-pointer shadow-lg flex items-center justify-center active:scale-95"
            aria-label="Back"
            title="Back to Casting Calls"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          {(() => {
            const bannerImage = getCastingThumbnail(call);
            return (
              <div className="h-72 sm:h-96 w-full relative bg-[#141418] overflow-hidden flex items-center justify-center">
                {bannerImage ? (
                  <img
                    src={bannerImage}
                    alt={call.title || 'Casting Call'}
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-banner');
                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="default-clapper-banner w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#22222a] via-[#1a1a20] to-[#0e0e12] p-4 text-center"
                  style={{ display: bannerImage ? 'none' : 'flex' }}
                >
                  <svg className="w-16 h-16 sm:w-24 sm:h-24 text-indigo-300/60 fill-current drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] -mt-10 sm:-mt-14" viewBox="0 0 24 24">
                    <path d="M19.8 4H4.2C3 4 2 5 2 6.2v11.6C2 19 3 20 4.2 20h15.6c1.2 0 2.2-1 2.2-2.2V6.2c0-1.2-1-2.2-2.2-2.2zM8.3 6l2.1 3H7.6L5.5 6h2.8zm5.2 0l2.1 3h-2.8l-2.1-3h2.8zm5.2 0l.9 1.3-1.3 1.7h-2.4l-2.1-3h4.9zM4 18V10h16v8H4z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/75 via-50% to-transparent pointer-events-none" />
              </div>
            );
          })()}

          <div className="p-6 sm:p-10 -mt-32 sm:-mt-36 relative z-10 space-y-4 text-left">
            <div>
              <span className="px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                {call.category || call.type || 'Nepali Film'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
              {call.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex flex-wrap items-center gap-6 text-xs text-gray-300 font-semibold">
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#00BFFF]" />
                  {call.location}
                </span>
                <span className="flex items-center gap-2">
                  <Clock size={14} className="text-[#00BFFF]" />
                  Deadline: {call.deadline} {timeLeft ? `(${timeLeft})` : ''}
                </span>
                <span className="flex items-center gap-2 text-[#00BFFF] font-bold text-sm sm:text-base">
                  Salary: {call.budget}
                </span>
              </div>

              {/* Action Buttons beside Salary */}
              <div className="flex flex-wrap items-center gap-2">
                {isCreator ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    loading={deleting}
                    disabled={deleting}
                    className="rounded-full font-semibold text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Call</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      className={`rounded-xl font-black uppercase tracking-wider text-xs transition-all cursor-pointer px-6 py-2 ${
                        applicationStatus === 'accepted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : applicationStatus === 'rejected'
                          ? 'bg-red-600/20 text-red-400 border border-red-500/30 cursor-default'
                          : 'bg-[#00BFFF] text-black hover:bg-[#00BFFF]/90 shadow-lg shadow-[#00BFFF]/20'
                      }`}
                      size="sm"
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
                        className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Withdraw
                      </button>
                    )}

                    <button
                      onClick={handleSave}
                      disabled={saved}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl border border-white/10 bg-white/10 transition-colors cursor-pointer ${
                        saved ? 'text-[#00BFFF] cursor-default' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      {saved ? 'Saved' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Clean Content Layout (No Extra Card Boxes) */}
        <div className="space-y-8 text-left pt-2">
          {applyAlert.type && (
            <InlineAlert
              type={applyAlert.type as any}
              message={applyAlert.message || ''}
              detail={applyAlert.detail}
              onDismiss={() => setApplyAlert({ type: null, message: null, detail: null })}
            />
          )}

          {/* Merged Overview & Roles Section */}
          <div className="space-y-6 pt-2">
            {/* Overview */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span>Project Overview</span>
              </h2>
              <p className="text-gray-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line pl-6">
                {call.description || 'No detailed description provided.'}
              </p>
            </div>

            {/* Roles Open for Audition */}
            <div className="space-y-3 pt-5 border-t border-white/5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <span>Roles Open for Audition</span>
              </h2>
              <div className="space-y-3 pl-6">
                {call.roles && call.roles.length > 0 ? (
                  call.roles.map((role: any, idx: number) => (
                    <div
                      key={idx}
                      className="py-2 border-b border-white/5 last:border-b-0 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-white text-sm sm:text-base">{role.name}</h3>
                          {role.ageRange && (
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-300 font-semibold">
                              Age: {role.ageRange}
                            </span>
                          )}
                        </div>
                        <span className="text-[#00BFFF] text-xs font-bold uppercase tracking-wider shrink-0">
                          {role.pay || 'Paid'}
                        </span>
                      </div>
                      {role.description && (
                        <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xl whitespace-pre-line">
                          {role.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs italic">General roles available.</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Applications Received (if Creator) */}
          {isCreator && (
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-white" />
                  <span>Applications Received ({apps.length})</span>
                </h2>

                <button
                  onClick={handlePrintRoster}
                  className="text-[#00BFFF] hover:underline text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#00BFFF]" />
                  <span>Print Roster</span>
                </button>
              </div>

              {/* Pipeline Tabs (Compact Pill Row) */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full">
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
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      pipelineFilter === tab.id
                        ? 'bg-[#00BFFF]/20 border border-[#00BFFF] text-[#00BFFF]'
                        : 'bg-[#1A1A1E] border border-white/10 text-gray-300 hover:text-white'
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
                <div className="text-center py-12 border border-dashed border-white/5 rounded-xl">
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    No applications in this status stage
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApps.map((app) => (
                    <div
                      key={app.id}
                      className="py-4 border-b border-white/5 last:border-b-0 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            userId={app.userId}
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
                            { id: 'accepted', label: 'Cast', color: 'hover:bg-emerald-500/20 text-emerald-400' },
                            { id: 'rejected', label: 'Reject', color: 'hover:bg-red-500/20 text-red-400' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              onClick={() => handleUpdateAppStatus(app.id, st.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-white/10 transition-all cursor-pointer ${app.status === st.id ? 'bg-white/15 text-white border-white/30' : st.color
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
