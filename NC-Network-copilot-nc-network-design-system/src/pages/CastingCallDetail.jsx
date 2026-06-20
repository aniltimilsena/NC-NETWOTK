import { useState, useEffect } from 'react';
import { 
  ChevronLeft, Clock, MapPin, User, Calendar, 
  AlertCircle, CheckCircle, MessageSquare, Award, Info, Trash2, X, Bookmark, Share2 
} from 'lucide-react';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import SEO from '../components/SEO';
import { InlineAlert } from '../components/ui/AlertBanner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { getAvatar } from '../utils/avatars';
import Avatar from '../components/ui/Avatar';

export default function CastingCallDetail({ onNavigate, castingId, user, showAlert }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);

  // Application states
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyAlert, setApplyAlert] = useState({ type: null, message: null, detail: null });

  // Save states
  const [saved, setSaved] = useState(false);
  const [saveAlert, setSaveAlert] = useState({ type: null, message: null });

  const [apps, setApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  
  const [directorProfile, setDirectorProfile] = useState(null);
  const [relatedCalls, setRelatedCalls] = useState([]);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    type: 'default',
    onConfirm: () => {},
  });

  const isCreator = user && call && (call.creatorId === user.uid || call.createdBy === user.uid);

  // Countdown timer calculation
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!call?.deadline) return;
    const deadlineDate = new Date(call.deadline);
    if (isNaN(deadlineDate.getTime())) {
      setTimeLeft(call.deadline); // Non-date fallback
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

  // Fetch casting call details
  useEffect(() => {
    if (!castingId) return;
    const unsub = onSnapshot(doc(db, 'casting_calls', castingId), (snap) => {
      if (snap.exists()) {
        setCall({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }, (err) => {
      console.warn("Casting call snapshot listener failed or permission denied:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [castingId]);

  // Fetch director profile
  useEffect(() => {
    if (!call?.creatorId) return;
    const unsub = onSnapshot(doc(db, 'profiles', call.creatorId), (snap) => {
      if (snap.exists()) {
        setDirectorProfile({ id: snap.id, ...snap.data() });
      }
    }, (err) => {
      console.warn("Failed to subscribe to director profile:", err);
    });
    return () => unsub();
  }, [call?.creatorId]);

  // Fetch related casting calls
  useEffect(() => {
    if (!call?.type) return;
    const q = query(
      collection(db, 'casting_calls'),
      where('type', '==', call.type)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => c.id !== call.id)
        .slice(0, 3);
      setRelatedCalls(data);
    }, (err) => {
      console.warn("Failed to subscribe to related calls:", err);
    });
    return () => unsub();
  }, [call?.id, call?.type]);

  // Check if current user has already applied
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

  // Subscribe to received applications (for creators)
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
      const docs = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      docs.sort((a, b) => {
        const t1 = a.appliedAt?.toDate ? a.appliedAt.toDate().getTime() : 0;
        const t2 = b.appliedAt?.toDate ? b.appliedAt.toDate().getTime() : 0;
        return t2 - t1;
      });

      const formattedDocs = docs.map(d => ({
        ...d,
        appliedAtFormatted: d.appliedAt?.toDate
          ? d.appliedAt.toDate().toLocaleDateString()
          : 'Just now'
      }));

      setApps(formattedDocs);
      setLoadingApps(false);
    }, (err) => {
      console.error("Error subscribing to received applications:", err);
      showAlert?.(`Failed to load applications: ${err.message}`, 'error');
      setLoadingApps(false);
    });

    return () => unsub();
  }, [castingId, isCreator, user?.uid]);

  // Apply Now
  const handleApply = async () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (applied || applying) return;

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
        appliedAt: serverTimestamp(),
        status: 'pending',
        creatorId: creatorId,
      });

      // Send casting notification
      try {
        if (creatorId) {
          await addDoc(collection(db, 'notifications'), {
            userId: creatorId,
            recipientId: creatorId,
            receiverId: creatorId,
            senderId: user.uid,
            senderName: user.displayName || 'Anonymous Talent',
            senderAvatar: user.photoURL || '',
            title: "New Casting Application",
            body: `${user.displayName || 'Someone'} applied to your casting call: "${call.title}"`,
            type: "casting",
            notificationType: "casting",
            isRead: false,
            read: false,
            createdAt: serverTimestamp(),
            targetUrl: `/casting/${call.id}`,
            profileUrl: `/casting/${call.id}`
          });
        }
      } catch (notifErr) {
        console.warn("Could not send notification:", notifErr);
      }

      setApplied(true);
      setApplyAlert({
        type: 'success',
        message: `Application submitted for "${call.title}"`,
        detail: 'The production team will review your profile and contact you.',
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
          showAlert?.('Failed to delete casting call. Please try again.', 'error');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const handleUpdateAppStatus = async (appId, newStatus) => {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showAlert?.(`Application marked as ${newStatus}.`, 'success');

      const app = apps.find(a => a.id === appId);
      if (app && app.userId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: app.userId,
            recipientId: app.userId,
            receiverId: app.userId,
            senderId: user.uid,
            senderName: user.displayName || 'Production',
            senderAvatar: user.photoURL || '',
            title: newStatus === 'accepted' ? "Application Accepted!" : "Application Update",
            body: newStatus === 'accepted' 
              ? `Your application for "${call.title}" has been ACCEPTED.` 
              : `Your application for "${call.title}" has been rejected.`,
            type: "casting",
            notificationType: "casting",
            isRead: false,
            read: false,
            createdAt: serverTimestamp(),
            targetUrl: `/casting/${call.id}`,
            profileUrl: `/casting/${call.id}`
          });
        } catch (notifErr) {
          console.warn("Could not send notification:", notifErr);
        }
      }
    } catch (err) {
      console.error('Error updating application status:', err);
      showAlert?.('Failed to update application status.', 'error');
    }
  };

  const handleCancelApplication = () => {
    if (!applicationId) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Withdraw Application',
      description: 'Are you sure you want to withdraw your application for this casting call?',
      confirmText: 'Withdraw',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setCancelling(true);
        try {
          await deleteDoc(doc(db, 'applications', applicationId));
          showAlert?.('Your application has been withdrawn.', 'success');
        } catch (err) {
          console.error('Error withdrawing application:', err);
          showAlert?.('Failed to withdraw application. Please try again.', 'error');
        } finally {
          setCancelling(false);
        }
      }
    });
  };

  const handleSave = async () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (saved) return;

    setSaveAlert({ type: null, message: null });

    try {
      await addDoc(collection(db, 'saved_calls'), {
        castingId: call.id,
        castingTitle: call.title,
        userId: user.uid,
        savedAt: serverTimestamp(),
      });
      setSaved(true);
      setSaveAlert({ type: 'success', message: 'Saved to your library' });
    } catch (err) {
      console.error('[CastingCallDetail] save error:', err);
      setSaveAlert({ type: 'error', message: 'Could not save — try again' });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] pt-6 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#00BFFF]/30 border-t-[#00BFFF] animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Loading project details...</p>
      </div>
    </div>
  );

  if (!call) return (
    <div className="min-h-screen bg-[#0A0A0A] pt-12 text-center">
      <p className="text-gray-400 font-bold">Project not found.</p>
    </div>
  );

  const bannerPhoto = call.thumbnail || '/movie-banner.png';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-32 font-sans relative">
      <ConfirmDialog
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      <SEO
        title={`${call.title} | Audition Details`}
        description={call.description || 'Casting opportunity details.'}
      />

      {/* Top Banner Image with overlay */}
      <div className="h-64 sm:h-80 w-full relative overflow-hidden">
        <img 
          src={bannerPhoto} 
          alt={call.title} 
          className="w-full h-full object-cover" 
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=640&auto=format&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        
        {/* Back navigation overlay */}
        <div className="absolute top-6 left-6 sm:left-10 z-20">
          <button
            onClick={() => onNavigate('casting')}
            className="flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 transition-all shadow-md"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        </div>

        {/* Project category pill and title overlay */}
        <div className="absolute bottom-6 left-6 sm:left-10 right-6 z-20 max-w-4xl space-y-2 text-left">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20">
            {call.category || call.type || 'Audition Project'}
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{call.title}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8 mt-8">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Details (Left Column) */}
          <div className="flex-[2] space-y-6 text-left">
            
            {/* Description Section */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">Project Description</h2>
              <p className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-line">
                {call.description || 'No description provided for this project.'}
              </p>
            </div>

            {/* Requirements Details */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">Requirements</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.isArray(call.requirements) && call.requirements.length > 0 ? (
                  call.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="w-5 h-5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5">✓</span>
                      <div>
                        <div className="text-xs font-bold text-white uppercase tracking-wider">Item {idx + 1}</div>
                        <div className="text-xs text-gray-400 mt-1 font-medium">{req}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs italic">General auditions open. No specific checklist.</p>
                )}
              </div>
            </div>

            {/* Available Roles */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/5 pb-3">Available Roles</h2>
              <div className="space-y-4">
                {Array.isArray(call.roles) && call.roles.length > 0 ? (
                  call.roles.map((role, idx) => (
                    <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-white text-base">{role.name || 'Untitled Role'}</div>
                        {role.ageRange && (
                          <div className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                            <Clock size={12} className="text-gray-500" />
                            Age Range: {role.ageRange}
                          </div>
                        )}
                        {role.description && (
                          <p className="text-xs text-gray-400 mt-2 font-medium leading-relaxed max-w-xl">{role.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1 rounded bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] text-xs font-bold uppercase tracking-wider">
                          {role.pay || 'Paid'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs italic">General roles available.</p>
                )}
              </div>
            </div>

            {/* Creator Portal / Applications Received */}
            {isCreator && (
              <div className="bg-[#111] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Applications Received ({apps.length})</h2>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 uppercase tracking-widest">
                    Creator Portal
                  </span>
                </div>

                {loadingApps ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-[#00BFFF]/30 border-t-[#00BFFF] animate-spin" />
                    <p className="text-gray-500 text-xs font-medium">Loading applicants...</p>
                  </div>
                ) : apps.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No applications received yet</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {apps.map((app) => (
                      <div key={app.id} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#00BFFF]/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#111] border border-white/5 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {app.userPhoto ? (
                              <img src={app.userPhoto} alt={app.userName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-[#00BFFF]">{app.userName?.charAt(0) || '?'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2 text-sm">
                              {app.userName}
                              {app.status !== 'pending' && (
                                <span className={`text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded ${
                                  app.status === 'accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {app.status}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-medium">{app.userEmail}</div>
                            <div className="text-[10px] text-gray-500 mt-1 font-semibold">Applied: {app.appliedAtFormatted}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => onNavigate('profile', app.userId)}
                            className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white hover:border-white transition-all bg-white/5"
                          >
                            View Profile
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateAppStatus(app.id, 'accepted')}
                                className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold uppercase tracking-wider hover:bg-green-500 hover:text-black transition-all"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleUpdateAppStatus(app.id, 'rejected')}
                                className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Sidebar (Right Column) */}
          <div className="flex-1 space-y-6 text-left">
            
            {/* Countdown / Apply Box */}
            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-5 sticky top-24">
              
              {/* Countdown timer */}
              <div className="text-center bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                <div className={`text-xl sm:text-2xl font-black ${isExpired ? 'text-red-500' : 'text-[#FACC15]'} font-mono`}>
                  {timeLeft || 'Open'}
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Application Deadline</div>
              </div>

              {/* Metadata rows */}
              <div className="space-y-3.5 border-t border-b border-white/5 py-4 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase tracking-wider">Pay / Budget</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    {call.budget && !call.budget.toLowerCase().includes('competitive') && !call.budget.toLowerCase().includes('rs') && (
                      <span className="text-gray-500 text-xs font-black">Rs.</span>
                    )}
                    {call.budget || 'Competitive'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase tracking-wider">Location</span>
                  <span className="text-white flex items-center gap-1 font-bold">
                    <MapPin size={12} className="text-gray-500" />
                    {call.location}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase tracking-wider">Target Type</span>
                  <span className="text-white font-bold">{call.type}</span>
                </div>
              </div>

              {applyAlert.type && (
                <InlineAlert
                  type={applyAlert.type}
                  message={applyAlert.message}
                  detail={applyAlert.detail}
                  onDismiss={() => setApplyAlert({ type: null, message: null, detail: null })}
                />
              )}

              {isCreator ? (
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white border-none rounded-xl"
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
                    className={`w-full rounded-xl ${
                      applicationStatus === 'accepted'
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default hover:bg-green-600/20'
                        : applicationStatus === 'rejected'
                        ? 'bg-red-600/20 text-red-400 border border-red-500/30 cursor-default hover:bg-red-600/20'
                        : 'bg-[#00BFFF] text-black hover:opacity-90'
                    }`}
                    size="lg"
                    onClick={handleApply}
                    disabled={applied || applying || isExpired}
                  >
                    {applying ? (
                      'Submitting...'
                    ) : applicationStatus === 'accepted' ? (
                      '✓ Application Accepted'
                    ) : applicationStatus === 'rejected' ? (
                      '✕ Application Rejected'
                    ) : applied ? (
                      '✓ Applied (Pending)'
                    ) : isExpired ? (
                      'Audition Closed'
                    ) : (
                      'Apply Now'
                    )}
                  </Button>

                  {applied && applicationId && applicationStatus === 'pending' && (
                    <button
                      onClick={handleCancelApplication}
                      disabled={cancelling}
                      className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      Withdraw Application
                    </button>
                  )}

                  {saveAlert.type && (
                    <InlineAlert
                      type={saveAlert.type}
                      message={saveAlert.message}
                      onDismiss={() => setSaveAlert({ type: null, message: null })}
                    />
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`w-full text-xs font-bold uppercase tracking-widest py-2 rounded-xl border border-white/5 bg-white/5 transition-colors ${
                      saved ? 'text-[#00BFFF] cursor-default' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {saved ? '🔖 Saved' : '🔖 Save for Later'}
                  </button>
                </>
              )}
            </div>

            {/* Casting Director Card */}
            {directorProfile && (
              <div className="bg-[#111] border border-white/5 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Posted By</h3>
                <div className="flex items-center gap-3">
                  <Avatar 
                    src={directorProfile.image || directorProfile.photoURL} 
                    size={48} 
                    name={directorProfile.name}
                    className="border-2 border-[#00BFFF]"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm">{directorProfile.name}</h4>
                    <p className="text-[11px] text-gray-400 capitalize font-medium">{directorProfile.role || 'Casting Director'}</p>
                    {directorProfile.openToWork && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-green-400 bg-green-500/5 px-2 py-0.5 rounded-full border border-green-500/10 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Open to cast
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button 
                    onClick={() => onNavigate('profile', directorProfile.id)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors text-center"
                  >
                    Profile
                  </button>
                  <button 
                    onClick={() => onNavigate('messages', directorProfile.id)}
                    className="w-full py-2 bg-[#00BFFF]/10 hover:bg-[#00BFFF]/20 border border-[#00BFFF]/20 rounded-xl text-xs font-bold uppercase tracking-wider text-[#00BFFF] transition-colors text-center"
                  >
                    Contact
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Related Casting Calls */}
        {relatedCalls.length > 0 && (
          <div className="mt-16 border-t border-white/5 pt-12 text-left">
            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-8">Related Auditions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedCalls.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    onNavigate('casting-detail', item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group bg-[#111]/85 border border-white/5 hover:border-[#00BFFF]/30 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col"
                >
                  <div className="h-28 w-full relative overflow-hidden">
                    <img 
                      src={item.thumbnail || '/movie-banner.png'} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=640&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                  </div>
                  <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-[#00BFFF] transition-colors leading-tight line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">{item.category || item.type}</p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-2 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {item.location}
                      </span>
                      <span className="text-[#00BFFF]">View &gt;</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Sticky Bottom Bar on Mobile for Applying */}
      {!isCreator && !isExpired && !applied && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#0A0A0A]/95 border-t border-white/5 backdrop-blur-md z-50 flex gap-3">
          <Button
            className="w-full bg-[#00BFFF] text-black hover:opacity-90 rounded-xl"
            size="lg"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? 'Submitting...' : 'Apply Now'}
          </Button>
        </div>
      )}
    </div>
  );
}
