import { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import SEO from '../components/SEO';
import { InlineAlert } from '../components/ui/AlertBanner';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

  useEffect(() => {
    if (!castingId) return;
    const unsub = onSnapshot(doc(db, 'casting_calls', castingId), (snap) => {
      if (snap.exists()) {
        setCall({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [castingId]);

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
      await addDoc(collection(db, 'applications'), {
        castingId: call.id,
        castingTitle: call.title,
        userId: user.uid,
        userEmail: user.email,
        appliedAt: serverTimestamp(),
        status: 'pending',
      });

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
    <div className="min-h-screen bg-nc-dark pt-32 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-nc-accent/30 border-t-nc-accent animate-spin" />
        <p className="text-white/40 text-sm">Loading project details...</p>
      </div>
    </div>
  );

  if (!call) return (
    <div className="min-h-screen bg-nc-dark pt-32 text-center">
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

              <Button
                className="w-full"
                size="lg"
                onClick={handleApply}
                disabled={applied || applying}
              >
                {applying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : applied ? '✓ Applied' : 'Apply Now'}
              </Button>

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
            </div>

            <div className="bg-nc-card border border-nc-border rounded-2xl p-5">
              <h3 className="font-bold text-white mb-3 text-sm">About Production House</h3>
              <p className="text-nc-muted text-sm leading-relaxed">{call.about}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
