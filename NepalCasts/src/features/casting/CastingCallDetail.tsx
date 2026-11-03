import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Bookmark,
  MapPin,
  Calendar,
  Clapperboard,
  Trash2,
  Printer,
  Video,
  CheckCircle2,
  Inbox,
  Upload,
  Share2,
  Check,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Eye,
  Download,
  X,
  User,
  Star,
  Coins,
  Edit3,
} from 'lucide-react';
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
import { CastingDetailSkeleton } from '../../components/ui/Skeleton';
import ShareSheet from '../../components/ui/ShareSheet';
import { getOptimizedImageUrl, getImageSrcSet } from '../../utils/media';
import { cacheManager } from '../../utils/cacheManager';
import { AuthService } from '../../services/AuthService';
import apiClient from '../../api/client';

const isMockOrInvalidImage = (url: string | null | undefined) => {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'has-file' || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return true;
  return false;
};

const getCastingThumbnail = (call: any) => {
  if (!call) return null;
  const candidates = [
    call.horizontalThumbnail,
    call.bannerUrl,
    call.bannerImage,
    call.coverImage,
    call.cover,
    call.banner,
    call.thumbnail,
    call.verticalPoster,
    call.posterUrl,
    call.poster,
    call.imageUrl,
    call.image,
    call.media?.[0]?.url,
    call.media?.[0],
    call.photos?.[0]?.url,
    call.photos?.[0],
    call.photoURL,
    call.fileUrl,
    call.attachmentUrl
  ];

  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim() && !isMockOrInvalidImage(raw)) {
      return raw.trim();
    }
  }
  return null;
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

  const [isApplyView, setIsApplyView] = useState(
    activeTab === 'apply' || activeTab === 'apply-for-casting'
  );

  useEffect(() => {
    if (activeTab === 'apply' || activeTab === 'apply-for-casting') {
      setIsApplyView(true);
    }
  }, [activeTab]);

  const [selectedRole, setSelectedRole] = useState('');
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || user?.phoneNumber || '');
  const [applicantAge, setApplicantAge] = useState('');
  const [applicantGender, setApplicantGender] = useState('Male');
  const [applicantExperience, setApplicantExperience] = useState('');
  const [selfTapeUrl, setSelfTapeUrl] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showShareModal, setShowShareModal] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<any>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    type: 'default',
    onConfirm: () => { },
  });

  const currentUid = user?.uid || user?.id;
  const currentUserEmail = (user?.email || '').toLowerCase().trim();

  const isCreator = Boolean(
    user && call && (
      (currentUid && (
        call.creatorId === currentUid ||
        call.createdBy === currentUid ||
        call.created_by === currentUid ||
        call.posted_by === currentUid ||
        call.user_id === currentUid ||
        call.postedBy?.uid === currentUid ||
        call.postedBy?.id === currentUid ||
        call.creator?.uid === currentUid ||
        call.creator?.id === currentUid ||
        (directorProfile?.uid && directorProfile.uid === currentUid) ||
        (directorProfile?.id && directorProfile.id === currentUid) ||
        (directorProfile?.linkedUid && directorProfile.linkedUid === currentUid) ||
        (directorProfile?.canonicalUid && directorProfile.canonicalUid === currentUid)
      )) ||
      (currentUserEmail && (
        (call.creatorEmail && currentUserEmail === call.creatorEmail.toLowerCase().trim()) ||
        (directorProfile?.email && currentUserEmail === directorProfile.email.toLowerCase().trim())
      ))
    )
  );
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
    const unsub = cacheManager.subscribePooled(`casting_call_doc_${castingId}`, (pooledCb) => {
      return onSnapshot(
        doc(db, 'casting_calls', castingId),
        (snap) => {
          if (snap.exists()) {
            const data: any = { id: snap.id, ...snap.data() };
            pooledCb(data, null);
          } else {
            pooledCb(null, null);
          }
        },
        (err) => {
          console.warn('Casting call snapshot listener failed:', err);
          pooledCb(null, err);
        }
      );
    }, (data) => {
      if (data) {
        setCall(data);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [castingId]);

  useEffect(() => {
    const creatorUid =
      call?.creatorId ||
      call?.createdBy ||
      call?.created_by ||
      call?.posted_by ||
      call?.user_id ||
      call?.postedBy?.uid ||
      call?.postedBy?.id ||
      call?.creator?.uid ||
      call?.creator?.id;

    if (!creatorUid) {
      if (call?.postedBy || call?.creator) {
        setDirectorProfile(call.postedBy || call.creator);
      }
      return;
    }

    getProfile(creatorUid)
      .then((res) => {
        if (res.data) {
          setDirectorProfile(res.data);
        } else if (call?.postedBy || call?.creator) {
          setDirectorProfile(call.postedBy || call.creator);
        }
      })
      .catch((err) => {
        console.warn('Failed to load director profile:', err);
        if (call?.postedBy || call?.creator) {
          setDirectorProfile(call.postedBy || call.creator);
        }
      });
  }, [
    call?.creatorId,
    call?.createdBy,
    call?.created_by,
    call?.posted_by,
    call?.user_id,
    call?.postedBy,
    call?.creator,
  ]);

  useEffect(() => {
    if (!castingId || !user?.uid) {
      setSaved(false);
      return;
    }
    const unsub = cacheManager.subscribePooled(`saved_call_${user.uid}_${castingId}`, (pooledCb) => {
      const q = query(
        collection(db, 'saved_calls'),
        where('userId', '==', user.uid),
        where('castingId', '==', castingId)
      );
      return onSnapshot(
        q,
        (snap) => {
          pooledCb(!snap.empty, null);
        },
        (err) => {
          console.warn('Saved check failed:', err);
          pooledCb(false, err);
        }
      );
    }, (isSaved) => setSaved(Boolean(isSaved)));
    return () => unsub();
  }, [castingId, user?.uid]);

  useEffect(() => {
    if (!castingId || !user) return;
    const unsub = cacheManager.subscribePooled(`applied_call_${user.uid}_${castingId}`, (pooledCb) => {
      const q = query(
        collection(db, 'applications'),
        where('castingId', '==', castingId),
        where('userId', '==', user.uid)
      );
      return onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            pooledCb({ applied: true, id: snap.docs[0].id, status: snap.docs[0].data().status || 'pending' }, null);
          } else {
            pooledCb({ applied: false, id: null, status: null }, null);
          }
        },
        (error) => {
          console.error('Checking applied status failed:', error);
          pooledCb({ applied: false, id: null, status: null }, error);
        }
      );
    }, (res) => {
      if (res) {
        setApplied(res.applied);
        setApplicationId(res.id);
        setApplicationStatus(res.status);
      }
    });
    return () => unsub();
  }, [castingId, user]);

  useEffect(() => {
    if (!castingId || !isCreator || !user?.uid) {
      setApps([]);
      setLoadingApps(false);
      return;
    }
    setLoadingApps(true);
    const unsub = cacheManager.subscribePooled(`creator_apps_${user.uid}_${castingId}`, (pooledCb) => {
      const q = query(
        collection(db, 'applications'),
        where('castingId', '==', castingId),
        where('creatorId', '==', user.uid)
      );
      return onSnapshot(
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
          pooledCb(formattedDocs, null);
        },
        (error) => {
          console.error('Applications snapshot listener failed:', error);
          pooledCb([], error);
        }
      );
    }, (formattedDocs) => {
      setApps(formattedDocs || []);
      setLoadingApps(false);
    });
    return () => unsub();
  }, [castingId, isCreator, user?.uid]);

  const handleToggleSave = async () => {
    if (!user) {
      onNavigate ? onNavigate('signin') : (window.location.href = `/signin?redirect_url=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const previousSaved = saved;
    setSaved(!previousSaved);
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
    } catch (err: any) {
      setSaved(previousSaved);
      console.error('Error toggling save:', err);
      showAlert?.(err.message || 'Failed to update saved status.', 'error');
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleDownloadMedia = (url: string, rawFilename?: string) => {
    if (!url) return;
    const filename = rawFilename || 'attachment';
    let downloadUrl = url;
    if (downloadUrl.includes('cloudinary.com') && downloadUrl.includes('/upload/')) {
      downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
    }

    fetch(downloadUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
  };

  const openApplyModal = (roleName?: string) => {
    if (!user) {
      onNavigate ? onNavigate('signin') : (window.location.href = `/signin?redirect_url=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (applied || applying) return;
    if (roleName) {
      setSelectedRole(roleName);
    }
    setIsApplyView(true);
    if (typeof window !== 'undefined' && window.history && call?.id) {
      window.history.pushState(null, '', `/casting/${call.id}/apply`);
    }
  };

  const handleCloseApplyView = () => {
    setIsApplyView(false);
    if (typeof window !== 'undefined' && window.history && call?.id) {
      window.history.pushState(null, '', `/casting/${call.id}`);
    }
  };

  const handleConfirmSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setApplying(true);
    setApplyAlert({ type: null, message: null, detail: null });
    try {
      const currentApplicantUid = AuthService.getUserId() || user?.uid;
      if (!currentApplicantUid) {
        setApplying(false);
        setApplyAlert({
          type: 'error',
          message: 'Authentication required.',
          detail: 'Please sign in to submit your audition application.'
        });
        return;
      }

      const creatorId =
        call.creatorId ||
        call.createdBy ||
        call.created_by ||
        call.posted_by ||
        call.user_id ||
        call.postedBy?.uid ||
        call.postedBy?.id ||
        call.creator?.uid ||
        call.creator?.id ||
        directorProfile?.uid ||
        directorProfile?.id ||
        '';
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
          console.error('Could not upload attached audition file:', uploadErr);
        }

        if (!fileUrl) {
          setApplying(false);
          setApplyAlert({
            type: 'error',
            message: 'File upload failed.',
            detail: 'Please re-attach your audition video and try again.'
          });
          return;
        }
      }

      const applicationPayload = {
        roleName: roleApplied,
        userName: fullName.trim() || user?.displayName || 'Anonymous Actor',
        fullName: fullName.trim() || user?.displayName || 'Anonymous Actor',
        contactEmail: contactEmail.trim() || user?.email,
        userEmail: contactEmail.trim() || user?.email,
        contactPhone: contactPhone.trim(),
        userPhone: contactPhone.trim(),
        phone: contactPhone.trim(),
        age: applicantAge.trim(),
        gender: applicantGender,
        experience: applicantExperience,
        userPhoto: user?.photoURL || '',
        selfTapeUrl: selfTapeUrl.trim(),
        coverNote: coverNote.trim(),
        fileName: fileName,
        fileUrl: fileUrl,
        attachmentUrl: fileUrl,
        portfolioUrl: selfTapeUrl.trim() || fileUrl || '',
      };

      let submittedAppId: string | null = null;
      try {
        const response = await apiClient.post<{ success: boolean; id: string }>(
          `/casting/${call.id}/apply`,
          applicationPayload,
          { timeout: 4000 }
        );
        if (response.data?.id) {
          submittedAppId = response.data.id;
        }
      } catch (backendErr) {
        console.warn('Backend application endpoint failed, falling back to Firestore direct write:', backendErr);
      }

      let appDocRefId = submittedAppId;
      if (!appDocRefId) {
        const appDocRef = await addDoc(collection(db, 'applications'), {
          ...applicationPayload,
          castingId: call.id,
          castingTitle: call.title,
          userId: currentApplicantUid,
          appliedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          status: 'pending',
          creatorId: creatorId,
          createdBy: creatorId,
        });
        appDocRefId = appDocRef.id;

        // Notify the creator of the casting call if direct fallback was used
        if (creatorId && creatorId !== currentApplicantUid) {
          const notifId = `${currentApplicantUid}_${call.id}_${appDocRefId}_application`;
          const actorName = fullName.trim() || user?.displayName || 'An actor';
          await setDoc(
            doc(db, 'notifications', notifId),
            {
              userId: creatorId,
              recipientId: creatorId,
              receiverId: creatorId,
              senderId: currentApplicantUid,
              senderName: actorName,
              senderAvatar: user?.photoURL || '',
              type: 'casting',
              notificationType: 'casting',
              title: call.title || 'Casting Call',
              body: `${actorName} applied to your casting call: "${call.title || 'Audition'}" for role "${roleApplied}"`,
              message: `${actorName} applied to your casting call: "${call.title || 'Audition'}" for role "${roleApplied}"`,
              targetUrl: `/casting/${call.id}`,
              link: `/casting/${call.id}`,
              profileUrl: `/profile/${currentApplicantUid}`,
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

          // Also create conversation thread in messaging under Applications
          try {
            const convoId = `app_${appDocRefId}`;
            const applicationMsgText = `Audition Application for "${roleApplied}" on "${call.title || 'Casting Call'}"${coverNote.trim() ? `\n\nCover Note: "${coverNote.trim()}"` : ''}`;
            
            await setDoc(
              doc(db, 'conversations', convoId),
              {
                participants: [currentApplicantUid, creatorId],
                type: 'application',
                isApplication: true,
                applicationId: appDocRefId,
                castingId: call.id,
                castingTitle: call.title || 'Casting Call',
                roleName: roleApplied,
                applicantId: currentApplicantUid,
                creatorId: creatorId,
                lastMessage: `Applied for "${roleApplied}" on ${call.title || 'Casting Call'}`,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastSenderId: currentApplicantUid,
                unread: true,
                unreadCounts: {
                  [creatorId]: 1,
                  [currentApplicantUid]: 0,
                },
                readBy: {
                  [creatorId]: false,
                  [currentApplicantUid]: true,
                },
                participantNames: {
                  [currentApplicantUid]: actorName,
                  [creatorId]: call.creatorName || call.company || 'Casting Director',
                },
                participantAvatars: {
                  [currentApplicantUid]: user?.photoURL || '',
                  [creatorId]: call.creatorAvatar || '',
                },
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );

            await addDoc(collection(db, 'conversations', convoId, 'messages'), {
              senderId: currentApplicantUid,
              text: applicationMsgText,
              fileUrl: fileUrl || selfTapeUrl.trim() || null,
              attachmentUrl: fileUrl || null,
              selfTapeUrl: selfTapeUrl.trim() || null,
              type: selfTapeUrl.trim() || (fileUrl && fileUrl.match(/\.(mp4|webm|mov|ogg)/i)) ? 'video' : (fileUrl && fileUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) ? 'image' : 'text'),
              isSystem: false,
              reactions: {},
              read: false,
              delivered: true,
              createdAt: serverTimestamp(),
            });
          } catch (msgErr) {
            console.warn('Could not auto-create application conversation:', msgErr);
          }
        }
      }

      setApplicationId(appDocRefId);
      setApplied(true);
      setApplicationStatus('pending');
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
      try {
        await apiClient.delete(`/casting/applications/${applicationId}`, { timeout: 3500 });
      } catch (backendErr) {
        console.warn('Backend delete application failed, using direct Firestore delete:', backendErr);
        await deleteDoc(doc(db, 'applications', applicationId));
      }
      setApplied(false);
      setApplicationId(null);
      setApplicationStatus(null);
      showAlert?.('Application withdrawn successfully.', 'info');
    } catch (err: any) {
      console.error('Error cancelling application:', err);
      showAlert?.(err.message || 'Failed to withdraw application. Please try again.', 'error');
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
          try {
            await apiClient.delete(`/casting/${castingId}`, { timeout: 3500 });
          } catch (backendErr) {
            console.warn('Backend delete casting call failed, using direct Firestore delete:', backendErr);
            await deleteDoc(doc(db, 'casting_calls', castingId));
          }
          showAlert?.('Casting call deleted successfully.', 'success');
          onNavigate('casting');
        } catch (err: any) {
          console.error('Error deleting casting call:', err);
          showAlert?.(err.message || 'Failed to delete casting call. Please try again.', 'error');
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleUpdateAppStatus = async (appId: string, newStatus: string) => {
    try {
      let updatedViaBackend = false;
      try {
        const resp = await apiClient.put(`/casting/applications/${appId}/status`, { status: newStatus }, { timeout: 3500 });
        if (resp.data?.success) {
          updatedViaBackend = true;
        }
      } catch (backendErr) {
        console.warn('Backend update application status failed, using direct Firestore update:', backendErr);
      }

      if (!updatedViaBackend) {
        await updateDoc(doc(db, 'applications', appId), {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      }

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
    } catch (err: any) {
      console.error('Error updating app status:', err);
      showAlert?.(err.message || 'Failed to update applicant status. Please try again.', 'error');
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
          <td><strong>${a.userName || 'Unnamed'}</strong><br/><span style="color:#64748b; font-size: 10px;">${a.contactEmail || a.userEmail || ''}${a.contactPhone || a.userPhone || a.phone ? ` • ${a.contactPhone || a.userPhone || a.phone}` : ''}</span></td>
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
            body { font-family: 'Ubuntu', sans-serif; padding: 24px; color: #0f172a; font-size: 11px; }
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
    ? call.roles
      .filter((r: any) => r && (typeof r === 'string' ? r.trim() : (r.name && r.name.trim())))
      .map((r: any) => (typeof r === 'string' ? { name: r, ageRange: call?.ageRange || '', description: '', pay: call?.compensation || 'Paid', gender: call?.gender || '' } : r))
    : (call?.type || call?.category ? [{ name: call.type || call.category, ageRange: call?.ageRange || '', description: call?.description || '', pay: call?.compensation || 'Paid', gender: call?.gender || '' }] : []);
  const allRolesLabel = allRoles.map((r: any) => r.name).join(', ') || call?.category || 'Performer';
  const primaryRole = allRolesLabel;
  const shortDeadline = formatShortDeadline(call?.deadline);
  const fullDeadline = formatDeadline(call?.deadline);

  const formatPostedDate = (createdAt: any) => {
    if (!createdAt) return '2 days ago';
    let date: Date;
    if (createdAt?.toDate) date = createdAt.toDate();
    else if (createdAt?.seconds) date = new Date(createdAt.seconds * 1000);
    else date = new Date(createdAt);

    if (isNaN(date.getTime())) return '2 days ago';
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const postedTimeAgo = formatPostedDate(call?.createdAt);
  const primaryRoleObj = allRoles.length > 0 ? allRoles[0] : null;
  const displayGender = call?.gender || primaryRoleObj?.gender || 'Male';
  const displayAge = call?.ageRange || primaryRoleObj?.ageRange || '20 – 30';
  const displayLocation = call?.location || 'Kathmandu';
  const displayExperience = call?.experienceLevel || call?.experience || 'Preferred';
  const displayCompensation = call?.compensation || call?.budget || call?.compensationType || 'NPR 15,000 – 25,000';

  let requirementsList: string[] = [];
  if (Array.isArray(call?.requirements) && call.requirements.length > 0) {
    requirementsList = call.requirements;
  } else if (typeof call?.requirements === 'string' && call.requirements.trim()) {
    requirementsList = call.requirements.split(/\r?\n/).map((s: string) => s.replace(/^[•\-*]\s*/, '').trim()).filter(Boolean);
  } else if (Array.isArray(primaryRoleObj?.requirements) && primaryRoleObj.requirements.length > 0) {
    requirementsList = primaryRoleObj.requirements;
  }
  if (requirementsList.length === 0) {
    requirementsList = [
      'Good Nepali speaking ability',
      'Comfortable in front of camera',
      'Available for filming dates',
      'Previous acting experience is a plus'
    ];
  }

  if (loading) {
    return (
      <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
        <CastingDetailSkeleton />
      </Desktop3ColumnLayout>
    );
  }

  if (!call) {
    return (
      <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
        <div className="min-h-screen bg-[#FAF8F4] flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl font-serif font-semibold text-[#202923] mb-2">Casting Call Not Found</h2>
          <p className="text-[#626860] text-xs mb-6">This casting call may have been removed or closed.</p>
          <button
            onClick={() => onNavigate ? onNavigate('back') : (window.history.length > 1 ? window.history.back() : window.location.assign('/casting'))}
            className="px-6 py-2.5 rounded-lg bg-[#194332] hover:bg-[#102F28] text-white shadow-sm font-semibold text-xs tracking-wider cursor-pointer transition-colors"
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
        <div className="min-h-screen bg-[#FAF8F4] text-[#202923] pb-24 font-sans select-none">
          <SEO
            title={`Apply - ${call.title} | NepalCasts`}
            description={`Submit your audition application for ${call.title}`}
          />

          <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
            {/* Top Header: ← Back Arrow + Heading */}
            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                onClick={handleCloseApplyView}
                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9] transition-colors cursor-pointer shrink-0"
                title="Back"
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2} />
              </button>
              <h1 className="text-base sm:text-lg font-serif font-semibold text-[#202923] tracking-tight truncate">
                Apply for Casting Call
              </h1>
            </div>

            {/* Title & Metadata Section */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#202923] tracking-tight leading-tight">
                {selectedRole ? `${selectedRole} – ${call.title}` : call.title}
              </h1>

              {/* Sub-metadata row */}
              <div className="flex items-center gap-4 text-xs sm:text-sm text-[#626860] font-medium flex-wrap pt-1">
                <span className="flex items-center gap-1.5 text-[#414840]">
                  <Clapperboard className="w-4 h-4 text-[#194332]" />
                  <span>{call.category || 'Short Film'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#414840]">
                  <MapPin className="w-4 h-4 text-[#194332]" />
                  <span>{call.location || 'Kathmandu, Nepal'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#414840]">
                  <Calendar className="w-4 h-4 text-[#194332]" />
                  <span>Audition: {shortDeadline}</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#626860] pt-2 font-normal">
                Please fill out the form below to apply for this casting call.
              </p>
            </div>

            {/* Application Form */}
            <form onSubmit={handleConfirmSubmitApplication} className="space-y-6 pt-1">
              {/* Role Selection / Role Information Section */}
              {allRoles.length > 1 ? (
                <div className="space-y-3 p-4 rounded-2xl bg-white border border-[#E7E5E0] shadow-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                        Select Role to Apply For <span className="text-[#B42318]">*</span>
                      </label>
                      <p className="text-[11px] text-[#626860]">
                        This casting call has {allRoles.length} open roles. Select the role you are auditioning for:
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EAF2ED] border border-[#194332]/20 text-[#194332] text-[11px] font-semibold shrink-0">
                      {allRoles.length} Roles
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-1">
                    {allRoles.map((r: any, idx: number) => {
                      const isSelected = selectedRole === r.name;
                      const roleAge = r.ageRange || r.age;
                      const rolePay = r.pay || r.compensation;
                      const roleGender = r.gender;
                      const roleDesc = r.description;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedRole(r.name)}
                          className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer space-y-2 select-none ${isSelected
                            ? 'bg-[#EAF2ED] border-[#194332] ring-1 ring-[#194332]/30 text-[#194332] shadow-sm'
                            : 'bg-[#FAF8F4] border-[#E7E5E0] text-[#414840] hover:border-[#D5D1C7] hover:bg-white'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'border-[#194332] bg-transparent' : 'border-[#D5D1C7] bg-transparent'
                                  }`}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-[#194332]" />}
                              </div>
                              <span className={`text-sm font-semibold truncate ${isSelected ? 'text-[#194332]' : 'text-[#202923]'}`}>
                                {r.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                              {rolePay && (
                                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-[#EAF2ED] text-[#194332] border border-[#194332]/20">
                                  {rolePay}
                                </span>
                              )}
                              {roleAge && (
                                <span className="text-[10px] text-[#626860] font-medium px-2 py-0.5 rounded bg-white border border-[#E7E5E0]">
                                  {roleAge}
                                </span>
                              )}
                              {roleGender && (
                                <span className="text-[10px] text-[#626860] font-medium px-2 py-0.5 rounded bg-white border border-[#E7E5E0]">
                                  {roleGender}
                                </span>
                              )}
                            </div>
                          </div>

                          {roleDesc && (
                            <p className="text-xs text-[#626860] leading-relaxed pl-6">
                              {roleDesc}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : allRoles.length === 1 ? (
                <div className="p-4 rounded-2xl bg-white border border-[#E7E5E0] shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#777C75] uppercase tracking-wider">Role Applied For</span>
                    {allRoles[0].pay && (
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-[#EAF2ED] text-[#194332] border border-[#194332]/20">
                        {allRoles[0].pay}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[#202923]">{allRoles[0].name}</h3>
                    {allRoles[0].ageRange && (
                      <span className="text-xs text-[#626860] bg-[#FAF8F4] border border-[#E7E5E0] px-2 py-0.5 rounded-md">
                        {allRoles[0].ageRange}
                      </span>
                    )}
                    {allRoles[0].gender && (
                      <span className="text-xs text-[#626860] bg-[#FAF8F4] border border-[#E7E5E0] px-2 py-0.5 rounded-md">
                        {allRoles[0].gender}
                      </span>
                    )}
                  </div>
                  {allRoles[0].description && (
                    <p className="text-xs text-[#626860] leading-relaxed pt-1">
                      {allRoles[0].description}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Role Applying For Input Section */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  Role Applying For <span className="text-[#B42318]">*</span>
                </label>
                <p className="text-[11px] text-[#626860]">Type or specify the role you are auditioning for.</p>
                <input
                  type="text"
                  required
                  placeholder="Lead Actor, Supporting Cast, Extra"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-white border border-[#E7E5E0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#202923] placeholder-[#777C75] outline-none focus:border-[#194332] transition-colors shadow-card"
                />
              </div>

              {/* 1. Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  1. Full Name <span className="text-[#B42318]">*</span>
                </label>
                <p className="text-[11px] text-[#626860]">Enter your full name.</p>
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-[#E7E5E0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#202923] placeholder-[#777C75] outline-none focus:border-[#194332] transition-colors shadow-card"
                />
              </div>

              {/* 2. Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  2. Email Address <span className="text-[#B42318]">*</span>
                </label>
                <p className="text-[11px] text-[#626860]">Enter your active email address.</p>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-[#777C75] flex items-center">
                    <Mail className="w-4 h-4 text-[#777C75]" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-white border border-[#E7E5E0] rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-[#202923] placeholder-[#777C75] outline-none focus:border-[#194332] transition-colors shadow-card"
                  />
                </div>
              </div>

              {/* 3. Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  3. Phone Number <span className="text-[#B42318]">*</span>
                </label>
                <p className="text-[11px] text-[#626860]">Enter your phone number.</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-[#F3F0E9] border border-[#E7E5E0] rounded-xl px-3 py-3 text-xs sm:text-sm text-[#202923] shrink-0 select-none">
                    <img
                      src="https://flagcdn.com/w40/np.png"
                      srcSet="https://flagcdn.com/w80/np.png 2x"
                      alt="Nepal Flag"
                      className="w-4 h-5 object-contain shrink-0"
                    />
                    <span className="font-semibold">+977</span>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="98XXXXXXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-white border border-[#E7E5E0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#202923] placeholder-[#777C75] outline-none focus:border-[#194332] transition-colors shadow-card"
                  />
                </div>
              </div>

              {/* 4. Age */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  4. Age <span className="text-[#B42318]">*</span>
                </label>
                <p className="text-[11px] text-[#626860]">Enter your age.</p>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  placeholder="e.g. 24"
                  value={applicantAge}
                  onChange={(e) => setApplicantAge(e.target.value)}
                  className="w-full bg-white border border-[#E7E5E0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#202923] placeholder-[#777C75] outline-none focus:border-[#194332] transition-colors shadow-card"
                />
              </div>

              {/* 5. Gender */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  5. Gender <span className="text-[#B42318]">*</span>
                </label>
                <p className="text-[11px] text-[#626860]">Select your gender.</p>
                <div className="space-y-2.5 pt-1">
                  {['Male', 'Female', 'Other'].map((g) => {
                    const isSelected = applicantGender === g;
                    return (
                      <div
                        key={g}
                        onClick={() => setApplicantGender(g)}
                        className="flex items-center gap-3 text-xs sm:text-sm text-[#414840] cursor-pointer select-none group w-fit"
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-[#194332] bg-transparent' : 'border-[#D5D1C7] bg-transparent group-hover:border-[#777C75]'}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-[#194332]" />}
                        </div>
                        <span className={isSelected ? 'text-[#194332] font-semibold' : 'text-[#626860]'}>{g}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. Experience */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  6. Experience <span className="text-[#B42318]">*</span>
                </label>
                <p className="text-[11px] text-[#626860]">Select your experience level.</p>
                <div className="relative">
                  <select
                    required
                    value={applicantExperience}
                    onChange={(e) => setApplicantExperience(e.target.value)}
                    className="w-full bg-white border border-[#E7E5E0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#202923] outline-none focus:border-[#194332] transition-colors appearance-none cursor-pointer shadow-card"
                  >
                    <option value="" disabled className="text-[#777C75]">Select experience</option>
                    <option value="Fresher / Beginner">Fresher / Beginner</option>
                    <option value="1 - 2 Years">1 - 2 Years</option>
                    <option value="3 - 5 Years">3 - 5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                    <option value="Professional / Lead Actor">Professional / Lead Actor</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#777C75]">
                    <svg className="w-4 h-4 text-[#777C75]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 7. Portfolio / Showreel (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  7. Portfolio / Showreel (Optional)
                </label>
                <p className="text-[11px] text-[#626860]">Upload your portfolio, showreel or any acting sample.</p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all ${attachedFile
                    ? 'border-[#194332] bg-[#EAF2ED]'
                    : 'border-[#D5D1C7] hover:border-[#194332] bg-white hover:bg-[#FAF8F4]'
                    }`}
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
                    accept=".pdf,.mp4,.mov,.png,.jpg,.jpeg,video/*,application/pdf"
                  />
                  {attachedFile ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <FileText className="w-8 h-8 text-[#194332]" />
                      <p className="text-xs font-semibold text-[#202923] truncate max-w-xs">
                        {attachedFile.name}
                      </p>
                      <p className="text-[11px] text-[#194332] font-medium">
                        {(attachedFile.size / (1024 * 1024)).toFixed(2)} MB • File ready to upload
                      </p>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setAttachedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="mt-1 px-3 py-1 rounded-full bg-white hover:bg-[#F3F0E9] border border-[#E7E5E0] text-[10px] text-[#202923] cursor-pointer transition-all"
                      >
                        Remove / Replace
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#194332]" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-[#202923]">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-[11px] text-[#777C75] mt-0.5">
                          PDF, MP4, MOV or Link (Max 50MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Optional URL input for showreel link */}
                <div className="pt-1">
                  <input
                    type="url"
                    placeholder="Or paste video showreel / portfolio link (e.g. YouTube, Vimeo, Drive)"
                    value={selfTapeUrl}
                    onChange={(e) => setSelfTapeUrl(e.target.value)}
                    className="w-full bg-white border border-[#E7E5E0] rounded-xl px-4 py-2.5 text-xs text-[#202923] placeholder-[#777C75] outline-none focus:border-[#194332] shadow-card"
                  />
                </div>
              </div>

              {/* 8. Additional Information (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#202923] block">
                  8. Additional Information (Optional)
                </label>
                <p className="text-[11px] text-[#626860]">Anything else you would like to share.</p>
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="Write here..."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full bg-white border border-[#E7E5E0] rounded-xl p-4 text-xs sm:text-sm text-[#202923] placeholder-[#777C75] outline-none focus:border-[#194332] resize-none leading-relaxed shadow-card"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 pb-6">
                <button
                  type="submit"
                  disabled={applying}
                  className="w-full py-4 px-6 rounded-lg bg-[#194332] hover:bg-[#102F28] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  <span>{applying ? 'Submitting Application...' : 'Submit Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Desktop3ColumnLayout>
    );
  }

  return (
    <Desktop3ColumnLayout user={user} onNavigate={onNavigate} activeNav="casting">
      <div className="min-h-screen bg-[#FAF8F4] text-[#202923] pb-24 font-sans select-none">
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

        <div className="w-full max-w-2xl mx-auto px-3.5 sm:px-6 py-2 space-y-4 text-left">
          {/* Top Header Bar: Back + Title | Share + Save */}
          <div className="flex items-center justify-between py-0.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => onNavigate ? onNavigate('back') : (window.history.length > 1 ? window.history.back() : window.location.assign('/casting'))}
                className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9] transition-colors cursor-pointer shrink-0"
                title="Back"
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2} />
              </button>
              <h1 className="text-base sm:text-lg font-serif font-semibold text-[#202923] tracking-tight truncate">
                Casting Call Details
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isCreator && (
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate('casting-edit', castingId) : (window.location.href = `/casting/${castingId}/edit`)}
                  className="w-10 h-10 rounded-full bg-white hover:bg-[#F3F0E9] border border-[#E7E5E0] flex items-center justify-center text-[#194332] transition-all active:scale-95 cursor-pointer shadow-card"
                  title="Edit Casting Call"
                  aria-label="Edit Casting Call"
                >
                  <Edit3 className="w-4 h-4 text-[#194332]" />
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white hover:bg-[#F3F0E9] border border-[#E7E5E0] flex items-center justify-center text-[#202923] transition-all active:scale-95 cursor-pointer shadow-card"
                title="Share"
                aria-label="Share"
              >
                <Share2 className="w-4 h-4 text-[#202923]" />
              </button>
              <button
                type="button"
                onClick={handleToggleSave}
                className="w-10 h-10 rounded-full bg-white hover:bg-[#F3F0E9] border border-[#E7E5E0] flex items-center justify-center text-[#202923] transition-all active:scale-95 cursor-pointer shadow-card"
                title="Save"
                aria-label="Save"
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#194332] text-[#194332]' : 'text-[#777C75]'}`} />
              </button>
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

          {/* Casting Call Thumbnail Banner */}
          <div className="relative w-full max-w-[280px] sm:max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-white border border-[#E7E5E0] shadow-card -mt-1 flex items-center justify-center">
            {bannerImage ? (
              <>
                <img
                  src={getOptimizedImageUrl(bannerImage, { width: 640, quality: 'auto', format: 'auto' })}
                  srcSet={getImageSrcSet(bannerImage, [320, 640, 960])}
                  sizes="(max-width: 640px) 280px, 320px"
                  alt={call.title}
                  loading="lazy"
                  decoding="async"
                  className="relative z-10 w-full h-auto max-h-[380px] object-contain mx-auto block"
                  onError={(e: any) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.default-clapper-banner');
                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                  }}
                />
              </>
            ) : null}

            <div
              className="default-clapper-banner w-full h-40 flex flex-col items-center justify-center bg-[#F3F0E9] p-4 text-center"
              style={{ display: bannerImage ? 'none' : 'flex' }}
            >
              <Clapperboard className="w-10 h-10 text-[#777C75] mb-1.5" />
              <span className="text-xs font-semibold text-[#626860] uppercase tracking-wider">{call.category || 'Casting Call'}</span>
            </div>
          </div>

          {/* Category Tag Pill */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E7E5E0] text-[#194332] font-semibold text-xs tracking-wider shadow-card">
              <span>🎬</span>
              <span>{call.category || 'Short Film'}</span>
            </span>
          </div>

          {/* Title and Location/Date Meta */}
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#202923] tracking-tight leading-tight">
              {call.title}
            </h1>

            <div className="flex items-center gap-4 text-xs sm:text-sm text-[#626860] font-medium flex-wrap">
              <span className="flex items-center gap-1.5 text-[#414840]">
                <MapPin className="w-4 h-4 text-[#194332]" />
                <span>{call.location || 'Kathmandu, Nepal'}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#414840]">
                <Calendar className="w-4 h-4 text-[#194332]" />
                <span>Posted {postedTimeAgo}</span>
              </span>
            </div>
          </div>

          {/* Section 1: About the Role */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-serif font-semibold text-[#202923] whitespace-nowrap">About the Role</h2>
              <div className="h-[1px] bg-[#E7E5E0] flex-1" />
            </div>
            <p className="text-[#414840] text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
              {call.description || `We are looking for talent for the role in ${call.title}.`}
            </p>
          </div>

          {/* Section: Roles Available */}
          {allRoles.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-serif font-semibold text-[#202923] whitespace-nowrap">Roles Available</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EAF2ED] border border-[#194332]/20 text-[#194332] text-xs font-semibold">
                    {allRoles.length} {allRoles.length === 1 ? 'Role' : 'Roles'}
                  </span>
                </div>
                <div className="h-[1px] bg-[#E7E5E0] flex-1" />
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1">
                {allRoles.map((role: any, idx: number) => {
                  const roleName = role.name || role.roleName || `Role ${idx + 1}`;
                  const roleAge = role.ageRange || role.age;
                  const rolePay = role.pay || role.compensation;
                  const roleGender = role.gender;
                  const roleDesc = role.description;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white border border-[#E7E5E0] shadow-card space-y-2.5 text-left"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-[#202923] tracking-tight">
                              {roleName}
                            </h3>
                            {rolePay && (
                              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-[#EAF2ED] text-[#194332] border border-[#194332]/20">
                                {rolePay}
                              </span>
                            )}
                          </div>

                          {/* Role Tags */}
                          <div className="flex items-center gap-2 flex-wrap text-xs text-[#626860]">
                            {roleAge && (
                              <span className="inline-flex items-center gap-1.5 bg-[#F3F0E9] border border-[#E7E5E0] px-2.5 py-0.5 rounded-md text-[#414840] text-xs">
                                <Calendar className="w-3.5 h-3.5 text-[#194332]" />
                                <span>{roleAge}</span>
                              </span>
                            )}
                            {roleGender && (
                              <span className="inline-flex items-center gap-1.5 bg-[#F3F0E9] border border-[#E7E5E0] px-2.5 py-0.5 rounded-md text-[#414840] text-xs">
                                <User className="w-3.5 h-3.5 text-[#194332]" />
                                <span>{roleGender}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {roleDesc && (
                        <p className="text-xs sm:text-sm text-[#626860] leading-relaxed font-normal bg-[#FAF8F4] p-3 rounded-lg border border-[#E7E5E0]">
                          {roleDesc}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Role Details */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-serif font-semibold text-[#202923] whitespace-nowrap">Role Details</h2>
              <div className="h-[1px] bg-[#E7E5E0] flex-1" />
            </div>
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="flex items-center gap-2.5 text-[#626860]">
                  <User className="w-4 h-4 text-[#194332]" />
                  <span>Gender</span>
                </span>
                <span className="font-semibold text-[#202923]">{displayGender}</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="flex items-center gap-2.5 text-[#626860]">
                  <Calendar className="w-4 h-4 text-[#194332]" />
                  <span>Age</span>
                </span>
                <span className="font-semibold text-[#202923]">{displayAge}</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="flex items-center gap-2.5 text-[#626860]">
                  <MapPin className="w-4 h-4 text-[#194332]" />
                  <span>Location</span>
                </span>
                <span className="font-semibold text-[#202923]">{displayLocation}</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="flex items-center gap-2.5 text-[#626860]">
                  <Star className="w-4 h-4 text-[#194332]" />
                  <span>Experience</span>
                </span>
                <span className="font-semibold text-[#202923]">{displayExperience}</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="flex items-center gap-2.5 text-[#626860]">
                  <Coins className="w-4 h-4 text-[#194332]" />
                  <span>Compensation</span>
                </span>
                <span className="font-semibold text-[#202923]">{displayCompensation}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Requirements */}
          {requirementsList.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-serif font-semibold text-[#202923] whitespace-nowrap">Requirements</h2>
                <div className="h-[1px] bg-[#E7E5E0] flex-1" />
              </div>
              <ul className="space-y-2 text-sm sm:text-base text-[#414840] pt-1">
                {requirementsList.map((req: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#194332] shrink-0 mt-2" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 4: Audition */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-serif font-semibold text-[#202923] whitespace-nowrap">Audition</h2>
              <div className="h-[1px] bg-[#E7E5E0] flex-1" />
            </div>
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="flex items-center gap-2.5 text-[#626860]">
                  <Calendar className="w-4 h-4 text-[#194332]" />
                  <span>Audition</span>
                </span>
                <span className="font-semibold text-[#202923]">{fullDeadline}</span>
              </div>
              <div className="flex items-center justify-between text-sm sm:text-base">
                <span className="flex items-center gap-2.5 text-[#626860]">
                  <MapPin className="w-4 h-4 text-[#194332]" />
                  <span>Location</span>
                </span>
                <span className="font-semibold text-[#202923]">{call.auditionLocation || call.location || 'Kathmandu'}</span>
              </div>
            </div>
          </div>

          {/* Section 5: Posted by */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-serif font-semibold text-[#202923] whitespace-nowrap">Posted by</h2>
              <div className="h-[1px] bg-[#E7E5E0] flex-1" />
            </div>
            {(() => {
              const creatorTargetUid =
                directorProfile?.canonicalUid ||
                directorProfile?.linkedUid ||
                directorProfile?.uid ||
                directorProfile?.id ||
                call.creatorId ||
                call.createdBy ||
                call.created_by ||
                call.posted_by ||
                call.user_id ||
                call.postedBy?.uid ||
                call.postedBy?.id ||
                call.creator?.uid ||
                call.creator?.id;

              const creatorName =
                directorProfile?.name ||
                directorProfile?.displayName ||
                directorProfile?.fullName ||
                call.creatorName ||
                call.production ||
                'Creator';

              const creatorPhoto =
                directorProfile?.photoURL ||
                directorProfile?.image ||
                directorProfile?.profileImage ||
                directorProfile?.avatar ||
                call.creatorPhoto ||
                (Array.isArray(directorProfile?.media) && directorProfile.media.length > 0 ? directorProfile.media[0] : null);

              const creatorRole =
                directorProfile?.role ||
                directorProfile?.category ||
                (call.production && call.production !== 'Independent Production' ? call.production : 'Actor');

              const creatorUsername =
                directorProfile?.username ||
                directorProfile?.handle ||
                (directorProfile?.email ? directorProfile.email.split('@')[0] : null);

              const isVerified = Boolean(
                directorProfile?.verified === true ||
                call.creatorVerified === true ||
                call.isVerified === true
              );

              const handleViewCreatorProfile = (e?: React.MouseEvent) => {
                if (e) e.stopPropagation();
                if (creatorTargetUid) {
                  onNavigate('profile', creatorTargetUid);
                }
              };

              return (
                <div
                  onClick={handleViewCreatorProfile}
                  className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-white hover:border-[#D5D1C7] border border-[#E7E5E0] shadow-card transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      userId={creatorTargetUid}
                      src={creatorPhoto}
                      name={creatorName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-[#202923] text-base truncate group-hover:text-[#194332] transition-colors">
                          {creatorName}
                        </h4>
                        {isVerified && (
                          <span className="text-[#194332] text-xs" title="Verified">✓</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#626860] truncate">
                        {creatorRole && <span>{creatorRole}</span>}
                        {creatorRole && creatorUsername && <span>•</span>}
                        {creatorUsername && <span className="text-[#777C75]">@{creatorUsername}</span>}
                      </div>
                    </div>
                  </div>

                  {creatorTargetUid && (
                    <button
                      type="button"
                      onClick={handleViewCreatorProfile}
                      className="px-4 py-1.5 rounded-lg bg-white hover:bg-[#F3F0E9] border border-[#D5D1C7] text-xs font-semibold text-[#202923] transition-all cursor-pointer whitespace-nowrap shadow-sm"
                    >
                      View Profile
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Applications Received Section for Creator */}
          {isCreator && (
            <div className="bg-white border border-[#E7E5E0] rounded-2xl p-4 sm:p-5 space-y-4 text-left shadow-card mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-serif font-semibold text-[#202923] flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-[#194332]" />
                  <span>Applications Received ({apps.length})</span>
                </h3>
                <button
                  onClick={handlePrintRoster}
                  className="text-[#194332] text-xs font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {[
                  {
                    id: 'all',
                    label: `All (${apps.filter(a => {
                      const st = (a.status || 'pending').toLowerCase();
                      return st !== 'shortlisted' && st !== 'accepted';
                    }).length})`
                  },
                  {
                    id: 'shortlisted',
                    label: `Shortlisted (${apps.filter(a => (a.status || '').toLowerCase() === 'shortlisted').length})`
                  },
                  {
                    id: 'accepted',
                    label: `Accepted (${apps.filter(a => (a.status || '').toLowerCase() === 'accepted').length})`
                  },
                  {
                    id: 'rejected',
                    label: `Rejected (${apps.filter(a => (a.status || '').toLowerCase() === 'rejected').length})`
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPipelineFilter(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${pipelineFilter === tab.id
                      ? 'bg-[#194332] text-white font-semibold shadow-sm'
                      : 'bg-[#F3F0E9] text-[#626860] border border-[#E7E5E0] hover:text-[#202923]'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Multi-Role Filter if 2 or more roles */}
              {allRoles.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-t border-[#E7E5E0] pt-2">
                  <span className="text-[11px] font-semibold text-[#777C75] whitespace-nowrap pr-1">Filter Role:</span>
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${roleFilter === 'all'
                      ? 'bg-[#194332] text-white font-semibold'
                      : 'bg-[#F3F0E9] text-[#626860] hover:text-[#202923] border border-[#E7E5E0]'
                      }`}
                  >
                    All Roles ({apps.length})
                  </button>
                  {allRoles.map((r: any, i: number) => {
                    const count = apps.filter((a) => (a.roleName || '').toLowerCase() === r.name.toLowerCase()).length;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRoleFilter(r.name)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${roleFilter.toLowerCase() === r.name.toLowerCase()
                          ? 'bg-[#194332] text-white font-semibold'
                          : 'bg-[#F3F0E9] text-[#626860] hover:text-[#202923] border border-[#E7E5E0]'
                          }`}
                      >
                        {r.name} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {loadingApps ? (
                <div className="py-8 text-center text-xs text-[#777C75]">Loading applicants...</div>
              ) : apps.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#777C75] border border-dashed border-[#E7E5E0] rounded-xl">
                  No applications received yet.
                </div>
              ) : apps
                .filter((a) => {
                  const st = (a.status || 'pending').toLowerCase();
                  if (pipelineFilter === 'all') {
                    return st !== 'shortlisted' && st !== 'accepted';
                  }
                  return st === pipelineFilter;
                })
                .filter((a) => {
                  if (roleFilter === 'all') return true;
                  return (a.roleName || '').toLowerCase() === roleFilter.toLowerCase();
                }).length === 0 ? (
                <div className="py-8 text-center text-xs text-[#777C75] border border-dashed border-[#E7E5E0] rounded-xl">
                  No applicants in this category.
                </div>
              ) : (
                <div className="divide-y divide-[#E7E5E0] space-y-3">
                  {apps
                    .filter((a) => {
                      const st = (a.status || 'pending').toLowerCase();
                      if (pipelineFilter === 'all') {
                        return st !== 'shortlisted' && st !== 'accepted';
                      }
                      return st === pipelineFilter;
                    })
                    .filter((a) => {
                      if (roleFilter === 'all') return true;
                      return (a.roleName || '').toLowerCase() === roleFilter.toLowerCase();
                    })
                    .map((app) => (
                      <div key={app.id} className="pt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Avatar userId={app.userId} src={app.userPhoto} name={app.userName} size="sm" />
                            <div>
                              <span className="font-semibold text-[#202923] block">{app.userName}</span>
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF2ED] border border-[#194332]/20 text-[#194332] font-semibold">
                                  {app.roleName || 'General Role'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => onNavigate('profile', app.userId)}
                            className="px-2.5 py-0.5 rounded-md bg-white border border-[#E7E5E0] text-[10px] text-[#202923] cursor-pointer hover:bg-[#F3F0E9]"
                          >
                            Profile
                          </button>
                        </div>

                        {/* Applicant Contact Details */}
                        {(app.userEmail || app.contactEmail || app.userPhone || app.contactPhone || app.phone) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                            {(app.contactEmail || app.userEmail) && (
                              <a
                                href={`mailto:${app.contactEmail || app.userEmail}`}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F4] border border-[#E7E5E0] text-[#414840] hover:text-[#194332] transition-colors"
                                title="Click to email applicant"
                              >
                                <Mail className="w-3 h-3 text-[#194332]" />
                                <span>{app.contactEmail || app.userEmail}</span>
                              </a>
                            )}
                            {(app.contactPhone || app.userPhone || app.phone) && (
                              <a
                                href={`tel:${app.contactPhone || app.userPhone || app.phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF8F4] border border-[#E7E5E0] text-[#414840] hover:text-[#194332] transition-colors"
                                title="Click to call applicant"
                              >
                                <Phone className="w-3 h-3 text-[#286847]" />
                                <span>{app.contactPhone || app.userPhone || app.phone}</span>
                              </a>
                            )}
                          </div>
                        )}

                        {app.coverNote && (
                          <p className="text-[#414840] italic bg-[#FAF8F4] p-2.5 rounded-xl text-[11px] leading-relaxed border border-[#E7E5E0]">
                            "{app.coverNote}"
                          </p>
                        )}

                        {/* Applicant Media & Attachments with Direct Download */}
                        {(() => {
                          const directFileUrl = app.portfolioUrl || app.fileUrl || app.resumeUrl || app.attachmentUrl || null;
                          const reelUrl = app.videoReel || app.reelUrl || app.videoUrl || app.showreel || null;
                          const isPdf = Boolean(directFileUrl && (directFileUrl.toLowerCase().includes('.pdf') || directFileUrl.includes('/pdf/') || app.fileType?.includes('pdf')));
                          const isVideo = Boolean(directFileUrl && (directFileUrl.toLowerCase().includes('.mov') || directFileUrl.toLowerCase().includes('.mp4') || directFileUrl.toLowerCase().includes('.webm') || directFileUrl.includes('/video/') || app.fileType?.includes('video')));

                          if (!directFileUrl && !reelUrl && !app.fileName) return null;

                          return (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {directFileUrl && (
                                <div className="inline-flex items-center gap-2 p-1.5 px-3 rounded-xl bg-white border border-[#E7E5E0] hover:border-[#D5D1C7] transition-all shadow-card">
                                  {isVideo ? (
                                    <Video className="w-4 h-4 text-[#194332] shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-[#194332] shrink-0" />
                                  )}
                                  <span className="text-xs font-semibold text-[#202923] truncate max-w-[130px] sm:max-w-[180px]">
                                    {app.fileName || (isVideo ? 'Video_Audition.mov' : isPdf ? 'Portfolio.pdf' : 'Attachment')}
                                  </span>

                                  {isPdf && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewPdfUrl(directFileUrl);
                                        setPreviewPdfName(app.fileName || `${app.userName || 'Applicant'}_Portfolio.pdf`);
                                      }}
                                      className="px-2 py-1 rounded-md bg-[#F3F0E9] hover:bg-[#E7E5E0] text-[11px] text-[#202923] font-semibold transition-all cursor-pointer flex items-center gap-1"
                                      title="Preview PDF"
                                    >
                                      <Eye className="w-3 h-3 text-[#194332]" />
                                      <span>View</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDownloadMedia(directFileUrl, app.fileName || `${app.userName || 'Applicant'}_media`)}
                                    className="px-2.5 py-1 rounded-md bg-[#F3F0E9] hover:bg-[#E7E5E0] active:scale-95 text-[11px] text-[#202923] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                    title="Download file"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[#194332]" />
                                    <span>Download</span>
                                  </button>
                                </div>
                              )}

                              {/* Video Reel Link */}
                              {reelUrl && (
                                <a
                                  href={reelUrl.startsWith('http') ? reelUrl : `https://${reelUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E7E5E0] text-xs text-[#202923] font-semibold hover:bg-[#F3F0E9] active:scale-95 transition-all cursor-pointer shadow-card"
                                >
                                  <Video className="w-3.5 h-3.5 text-[#194332]" />
                                  <span className="truncate max-w-[140px]">Reel / Link</span>
                                  <ExternalLink className="w-3 h-3 text-[#777C75]" />
                                </a>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-[#777C75]">{app.appliedAtFormatted}</span>
                          <div className="flex items-center gap-1.5">
                            {[
                              { id: 'shortlisted', label: 'Shortlist' },
                              { id: 'accepted', label: 'Accept' },
                              { id: 'rejected', label: 'Reject' },
                            ].map((st) => (
                              <button
                                key={st.id}
                                onClick={() => handleUpdateAppStatus(app.id, st.id)}
                                className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold uppercase transition-all cursor-pointer ${app.status === st.id
                                  ? 'bg-[#194332] text-white border border-[#194332]'
                                  : 'bg-white text-[#626860] border border-[#E7E5E0] hover:bg-[#F3F0E9]'
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

          {/* Primary Call to Action Button */}
          <div className="pt-3 pb-8">
            {isCreator ? (
              <div className="space-y-2.5">
                <div className="w-full py-3.5 px-4 rounded-xl bg-white border border-[#E7E5E0] text-center text-xs font-semibold text-[#414840] shadow-card">
                  You created this casting call ({apps.length} {apps.length === 1 ? 'applicant' : 'applicants'})
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigate ? onNavigate('casting-edit', castingId) : (window.location.href = `/casting/${castingId}/edit`)}
                    className="flex-1 py-3 px-4 rounded-lg bg-[#194332] hover:bg-[#102F28] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Edit Casting Call"
                  >
                    <Edit3 className="w-4 h-4 text-white" />
                    <span>Edit Casting Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="py-3 px-4 rounded-lg bg-white hover:bg-[#FEE4E2] border border-[#E7E5E0] hover:border-[#B42318]/30 text-[#B42318] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-card active:scale-95 disabled:opacity-50"
                    title="Delete Casting Call"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            ) : applied ? (
              <div className="flex items-center gap-2.5 sm:gap-3 w-full">
                <div
                  className={`flex-1 py-3.5 px-4 rounded-lg text-center font-semibold text-sm flex items-center justify-center gap-2 border shadow-card ${applicationStatus === 'accepted'
                    ? 'bg-[#EAF2ED] text-[#194332] border-[#194332]/30'
                    : applicationStatus === 'rejected'
                      ? 'bg-[#FEE4E2] text-[#B42318] border-[#B42318]/30'
                      : 'bg-white text-[#202923] border-[#E7E5E0]'
                    }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#194332]" />
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
                    className="py-3.5 px-5 rounded-lg border border-[#D5D1C7] bg-white hover:bg-[#F3F0E9] text-[#202923] text-sm font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-card disabled:opacity-50"
                  >
                    {cancelling ? 'Withdrawing...' : 'Withdraw Application'}
                  </button>
                )}
              </div>
            ) : isExpired ? (
              <button
                disabled
                className="w-full py-4 px-6 rounded-lg bg-[#F3F0E9] border border-[#E7E5E0] text-[#777C75] font-semibold text-base text-center cursor-not-allowed"
              >
                Audition Closed
              </button>
            ) : (
              <button
                onClick={() => openApplyModal()}
                disabled={applying}
                className="w-full py-4 px-6 rounded-lg bg-[#194332] hover:bg-[#102F28] text-white font-semibold text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>{applying ? 'Submitting...' : 'Apply for Casting'}</span>
              </button>
            )}
          </div>
        </div>

        {/* In-App PDF Portfolio Viewer Modal */}
        {previewPdfUrl && (
          <div className="fixed inset-0 z-50 bg-[#202923]/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
            <div className="bg-[#FAF8F4] border border-[#E7E5E0] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-dropdown overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E7E5E0] bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#194332] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-[#202923] truncate">
                    {previewPdfName || 'Applicant Portfolio PDF'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F3F0E9] border border-[#D5D1C7] text-xs font-semibold text-[#202923] flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-[#194332]" />
                    <span className="hidden sm:inline">Open in New Tab</span>
                  </a>
                  <button
                    onClick={() => {
                      setPreviewPdfUrl(null);
                      setPreviewPdfName(null);
                    }}
                    className="w-8 h-8 rounded-full bg-[#F3F0E9] hover:bg-[#E7E5E0] flex items-center justify-center text-[#202923] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PDF Preview Frame */}
              <div className="flex-1 bg-white relative">
                <iframe
                  src={previewPdfUrl.includes('google.com') ? previewPdfUrl : `https://docs.google.com/viewer?url=${encodeURIComponent(previewPdfUrl)}&embedded=true`}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              </div>
            </div>
          </div>
        )}

        {showShareModal && (
          <ShareSheet
            title={call?.title}
            url={typeof window !== 'undefined' ? window.location.href : ''}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </Desktop3ColumnLayout>
  );
}
