import { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import SEO from '../components/SEO';
import { InlineAlert } from '../components/ui/AlertBanner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, deleteDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';

export default function CastingCallDetail({ onNavigate, castingId, user, showAlert }) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);

  // Application state — real async, no premature feedback
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyAlert, setApplyAlert] = useState({ type: null, message: null, detail: null });

  // Save state
  const [saved, setSaved] = useState(false);
  const [saveAlert, setSaveAlert] = useState({ type: null, message: null });

  const [apps, setApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
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

      // Sort locally by appliedAt desc to bypass Firestore index requirements
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

  // ── Apply Now — real Firestore write ────────────────────────────────────────
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
        userPhoto: user.profileImage || user.photoURL || '',
        appliedAt: serverTimestamp(),
        status: 'pending',
        creatorId: creatorId,
      });

      // Send casting notification to casting call creator
      try {
        if (creatorId) {
          await addDoc(collection(db, 'notifications'), {
            userId: creatorId,
            recipientId: creatorId,
            receiverId: creatorId,
            senderId: user.uid,
            senderName: user.displayName || 'Anonymous Talent',
            senderAvatar: user.profileImage || user.photoURL || '',
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
        console.warn("Could not send casting application notification:", notifErr);
      }

      setApplied(true);
      setApplyAlert({
        type: 'success',
        message: `Application submitted for "${call.title}"`,
        detail: 'The production team will review your profile and contact you.',
      });
      // Also fire a global banner so it's visible if user scrolls away
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

      // Send status notification to the applicant
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
          console.warn("Could not send application status notification:", notifErr);
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

  // ── Save for Later — real Firestore write ────────────────────────────────────
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
    <div className="min-h-screen bg-nc-dark pt-24 sm:pt-28 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-nc-accent/30 border-t-nc-accent animate-spin" />
        <p className="text-white/40 text-sm">Loading project details...</p>
      </div>
    </div>
  );

  if (!call) return (
    <div className="min-h-screen bg-nc-dark pt-24 sm:pt-28 text-center">
      <p className="text-white/60">Project not found.</p>
    </div>
  );

  const jobSchema = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: call.title,
    description: call.description,
    datePosted: new Date().toISOString().split('T')[0],
    validThrough: call.deadline,
    employmentType: 'CONTRACT',
    hiringOrganization: { '@type': 'Organization', name: call.production },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: call.location, addressCountry: 'NP' },
    },
  };

  return (
    <div className="min-h-screen bg-nc-dark pt-16 pb-24">
      <ConfirmDialog
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      <SEO
        title={`${call.title} | Auditions in ${call.location}`}
        description={call.description ? (call.description.slice(0, 150) + '...') : 'Check out this new casting call on NC Network.'}
        schema={jobSchema}
      />
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <button
          onClick={() => onNavigate('casting')}
          className="flex items-center gap-2 text-nc-muted hover:text-white transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Casting Calls
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-[2] space-y-6">
            <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
              <div className="flex gap-2 mb-4 flex-wrap">
                {call.urgent && <Tag color="red">Urgent</Tag>}
                <Tag color="blue">{call.type}</Tag>
                <Tag>{call.location}</Tag>
              </div>
              <h1 className="text-2xl font-black text-white">{call.title}</h1>
              <p className="text-nc-accent mt-1">{call.production}</p>
              <p className="text-nc-secondary mt-4 leading-relaxed">{call.description}</p>
            </div>

            <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
              <h2 className="font-bold text-white mb-4">Requirements</h2>
              <ul className="space-y-2">
                {Array.isArray(call.requirements) && call.requirements.length > 0
                  ? call.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-nc-secondary text-sm">
                      <span className="w-5 h-5 rounded-full bg-nc-accent/20 text-nc-accent flex items-center justify-center flex-shrink-0 text-xs mt-0.5">✓</span>
                      {req}
                    </li>
                  ))
                  : <li className="text-nc-muted text-sm italic">No specific requirements listed.</li>
                }
              </ul>
            </div>
 
            <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
              <h2 className="font-bold text-white mb-4">Available Roles</h2>
              <div className="space-y-3">
                {Array.isArray(call.roles) && call.roles.length > 0
                  ? call.roles.map((role, idx) => (
                    <div key={idx} className="bg-nc-surface border border-nc-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{role.name || 'Untitled Role'}</div>
                        {role.ageRange && <div className="text-xs text-nc-muted mt-0.5">Age: {role.ageRange}</div>}
                        {role.type && <Tag className="mt-2">{role.type}</Tag>}
                      </div>
                      <div className="text-nc-accent font-bold">{role.pay || 'Paid'}</div>
                    </div>
                  ))
                  : <p className="text-nc-muted text-sm italic">General applications accepted.</p>
                }
              </div>
            </div>

            {isCreator && (
              <div className="bg-nc-card border border-nc-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-nc-border">
                  <h2 className="font-bold text-white text-lg">Applications Received ({apps.length})</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-nc-accent/10 text-nc-accent border border-nc-accent/20">
                    Creator Portal
                  </span>
                </div>

                {loadingApps ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-nc-accent/30 border-t-nc-accent animate-spin" />
                    <p className="text-nc-muted text-xs">Loading applicants...</p>
                  </div>
                ) : apps.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-nc-border rounded-xl">
                    <p className="text-nc-muted text-sm">No applications received yet.</p>
                    <p className="text-[10px] text-nc-muted mt-1 uppercase tracking-wider font-bold">Applications will appear here in real-time</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {apps.map((app) => (
                      <div key={app.id} className="bg-nc-surface border border-nc-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-nc-accent/20 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-nc-card border border-nc-border overflow-hidden flex items-center justify-center flex-shrink-0">
                            {app.userPhoto ? (
                              <img src={app.userPhoto} alt={app.userName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-nc-accent">{app.userName?.charAt(0) || '?'}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {app.userName}
                              {app.status !== 'pending' && (
                                <span className={`text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded ${
                                  app.status === 'accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {app.status}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-nc-muted">{app.userEmail}</div>
                            <div className="text-[10px] text-nc-muted mt-1">Applied: {app.appliedAtFormatted}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => onNavigate('profile', app.userId)}
                            className="px-3 py-1.5 rounded-lg border border-nc-border text-xs font-bold text-nc-secondary hover:text-white hover:border-white transition-all"
                          >
                            View Profile
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateAppStatus(app.id, 'accepted')}
                                className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold hover:bg-green-500 hover:text-black transition-all"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleUpdateAppStatus(app.id, 'rejected')}
                                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
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

          {/* Sidebar */}
          <div className="flex-1 space-y-5">
            <div className="bg-nc-card border border-nc-border rounded-2xl p-5 sticky top-24 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-black text-nc-accent">{call.budget}</div>
                <div className="text-nc-muted text-sm mt-1">Budget Range</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-nc-muted">Deadline</span>
                  <span className="text-nc-secondary">{call.deadline}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-nc-muted">Location</span>
                  <span className="text-nc-secondary">{call.location}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-nc-muted">Type</span>
                  <span className="text-nc-secondary">{call.type}</span>
                </div>
              </div>

              {/* Inline alert — shows ONLY after real API result */}
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
                  className="w-full bg-red-600 hover:bg-red-700 text-white border-none"
                  size="lg"
                  onClick={handleDelete}
                  loading={deleting}
                  disabled={deleting}
                >
                  Delete Casting Call 🗑️
                </Button>
              ) : (
                <>
                  <Button
                    className={`w-full ${
                      applicationStatus === 'accepted'
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default hover:bg-green-600/20'
                        : applicationStatus === 'rejected'
                        ? 'bg-red-600/20 text-red-400 border border-red-500/30 cursor-default hover:bg-red-600/20'
                        : ''
                    }`}
                    size="lg"
                    onClick={handleApply}
                    disabled={applied || applying}
                  >
                    {applying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </span>
                    ) : applicationStatus === 'accepted' ? (
                      '✓ Application Accepted'
                    ) : applicationStatus === 'rejected' ? (
                      '✕ Application Rejected'
                    ) : applied ? (
                      '✓ Applied (Pending)'
                    ) : (
                      'Apply Now'
                    )}
                  </Button>

                  {applied && applicationId && applicationStatus === 'pending' && (
                    <button
                      onClick={handleCancelApplication}
                      disabled={cancelling}
                      className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {cancelling ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                          Withdrawing...
                        </>
                      ) : (
                        'Withdraw Application ✕'
                      )}
                    </button>
                  )}

                  {applicationStatus === 'rejected' && (
                    <p className="text-[11px] text-red-400 text-center leading-relaxed font-medium mt-1">
                      Your application was rejected by the production. You cannot re-apply to this casting call.
                    </p>
                  )}

                  {/* Save for Later */}
                  <div className="space-y-2">
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
                      className={`w-full text-sm transition-colors ${
                        saved ? 'text-nc-accent cursor-default' : 'text-nc-muted hover:text-white'
                      }`}
                    >
                      {saved ? '🔖 Saved to library' : '🔖 Save for Later'}
                    </button>
                  </div>
                </>
              )}
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
