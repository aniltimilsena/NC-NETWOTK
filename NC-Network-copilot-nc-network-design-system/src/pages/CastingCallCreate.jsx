import { useState } from 'react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import { createCastingCall } from '../services/casting';
import { uploadProfileMedia } from '../services/profile';
import { CATEGORIES } from '../constants/categories';

const STEPS = [
  { id: 1, title: 'Project Details', icon: '' },
  { id: 2, title: 'Roles', icon: '' },
  { id: 3, title: 'Requirements', icon: '' },
];

export default function CastingCallCreate({ onNavigate, user, showAlert }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [form, setForm] = useState({
    title: '', type: 'Actors', location: '', description: '',
    thumbnail: '',
    budget: '',
    deadline: '',
    roles: [{ name: '', ageRange: '', description: '' }],
    requirements: { wardrobe: false, travel: false, headshot: false },
    otherRequirements: '',
  });

  const handlePublish = async () => {
    if (!user) {
      showAlert('Error', 'error', 'You must be signed in to publish a casting call.');
      onNavigate('signin');
      return;
    }

    if (!form.title || !form.type || !form.location || !form.thumbnail || !form.budget || !form.deadline) {
      showAlert('Missing Information', 'error', 'Please fill in all required details, including budget/paying range and deadline.');
      setStep(1);
      return;
    }

    setIsLoading(true);
    try {
      let thumbnailUrl = form.thumbnail;
      if (thumbnailFile) {
        thumbnailUrl = await uploadProfileMedia(user.uid, thumbnailFile);
        if (!thumbnailUrl) {
          throw new Error('Failed to upload thumbnail image. Please check your connection or try another image.');
        }
      }

      // Convert requirements object to readable array
      const requirementList = [];
      if (form.requirements.headshot) requirementList.push('Professional Headshots Required');
      if (form.requirements.wardrobe) requirementList.push('Own Wardrobe Required');
      if (form.requirements.travel) requirementList.push('Travel Involved');
      if (form.otherRequirements && form.otherRequirements.trim()) {
        const customReqs = form.otherRequirements
          .split('\n')
          .map(r => r.trim())
          .filter(Boolean);
        requirementList.push(...customReqs);
      }

      const callData = {
        ...form,
        thumbnail: thumbnailUrl,
        requirements: requirementList,
        production: user.displayName || 'Independent Production',
        budget: form.budget,
        deadline: form.deadline ? form.deadline.trim() : 'N/A',
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous Producer',
        creatorEmail: user.email,
        status: 'active',
        applicantsCount: 0,
        createdAt: new Date().toISOString(),
      };

      const result = await createCastingCall(callData);
      
      if (result.error) {
        showAlert('Publication Failed', 'error', result.error);
      } else {
        showAlert('Success!', 'success', 'Your casting call has been published to the network.');
        onNavigate('casting');
      }
    } catch (err) {
      console.error('Error publishing casting call:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong while publishing.';
      showAlert('Unexpected Error', 'error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.title || !form.type || !form.type.trim() || !form.location || !form.thumbnail || !form.budget || !form.deadline) {
        showAlert('Required Fields', 'error', 'Please fill in all required fields: Title, Type, Location, Thumbnail, Budget, and Deadline.');
        return;
      }
    }
    
    if (step === 2) {
      const hasValidRole = form.roles.some(r => r.name && r.name.trim());
      if (!hasValidRole) {
        showAlert('Role Required', 'error', 'Please enter at least one role name for this casting.');
        return;
      }
    }
    
    setStep(s => s + 1);
  };

  return (
    <div className="min-h-screen bg-nc-dark pt-2 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Create a Casting Call</h1>
          <p className="text-nc-muted mt-2">Find the perfect talent for your next production</p>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  s.id === step
                    ? 'bg-nc-accent text-nc-darker'
                    : s.id < step
                    ? 'bg-nc-accent/20 text-nc-accent border border-nc-accent/30'
                    : 'bg-nc-card border border-nc-border text-nc-muted'
                }`}
              >
                <span>{s.id < step ? '✓' : s.icon}</span>
                <span className="hidden sm:block">{s.title}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${s.id < step ? 'bg-nc-accent' : 'bg-nc-border'}`} />
              )}
            </div>
          ))}
        </div>

        <GlassCard strong className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white mb-6">Project Information</h2>
              <div className="flex flex-col sm:flex-row flex-wrap gap-5">
                <div className="w-full">
                  <label className="block text-sm font-medium text-nc-secondary mb-3">Project Thumbnail *</label>
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <div className="w-full sm:w-48 h-32 bg-nc-surface border-2 border-dashed border-nc-border rounded-2xl flex flex-col items-center justify-center overflow-hidden relative group hover:border-nc-accent transition-all cursor-pointer">
                      {thumbnailPreview || form.thumbnail ? (
                        <>
                          <img src={thumbnailPreview || form.thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setForm({...form, thumbnail: ''}); 
                              setThumbnailFile(null);
                              setThumbnailPreview('');
                            }}
                            className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <svg className="w-8 h-8 text-nc-muted mx-auto mb-2 group-hover:text-nc-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-[10px] text-nc-muted font-bold tracking-widest uppercase">Select Image</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setThumbnailFile(file);
                            setThumbnailPreview(URL.createObjectURL(file));
                            setForm({...form, thumbnail: 'has-file'});
                          }
                        }} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                       <p className="text-xs text-nc-muted leading-relaxed font-medium">
                        Upload a high-quality poster or image that represents your project. 
                        Casting calls with thumbnails receive up to 80% more applications.
                      </p>
                      <p className="text-[10px] text-nc-accent font-bold tracking-widest uppercase">Recommended: 16:9 Aspect Ratio</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Project Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. The Lost City" className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Project Type / Target Category *</label>
                  <select 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})} 
                    className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Location *</label>
                  <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="City, State" className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-5 w-full">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-nc-secondary mb-2">Paying Range / Budget *</label>
                    <input 
                      type="text" 
                      value={form.budget} 
                      onChange={e => setForm({...form, budget: e.target.value})} 
                      placeholder="e.g. Rs. 5000 - 10000" 
                      className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-nc-secondary mb-2">Application Deadline *</label>
                    <input 
                      type="text" 
                      value={form.deadline} 
                      onChange={e => setForm({...form, deadline: e.target.value})} 
                      placeholder="e.g. July 15, 2026, or In 2 weeks"
                      className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" 
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Project Description / Synopsis</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Give actors an idea of the storyline..." rows={4} className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm resize-none" />
                </div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-2">Roles Available</h2>
              <p className="text-nc-muted text-sm">Add character descriptions and requirements</p>
              {form.roles.map((role, idx) => (
                <div key={idx} className="bg-nc-surface border border-nc-border rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" value={role.name} onChange={e => { const r = [...form.roles]; r[idx].name = e.target.value; setForm({...form, roles: r}); }} placeholder="Character Name / Role *" className="flex-1 bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                    <input type="text" value={role.ageRange} onChange={e => { const r = [...form.roles]; r[idx].ageRange = e.target.value; setForm({...form, roles: r}); }} placeholder="Age Range (e.g. 20-30)" className="flex-1 bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                  </div>
                  <textarea value={role.description} onChange={e => { const r = [...form.roles]; r[idx].description = e.target.value; setForm({...form, roles: r}); }} placeholder="Character description and personality traits..." rows={3} className="w-full bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm resize-none" />
                  {idx > 0 && (
                    <button onClick={() => setForm({...form, roles: form.roles.filter((_, i) => i !== idx)})} className="text-red-400 text-xs font-semibold hover:text-red-300">Remove Role</button>
                  )}
                </div>
              ))}
              <button onClick={() => setForm({...form, roles: [...form.roles, { name: '', ageRange: '', description: '' }]})} className="flex items-center gap-2 text-nc-accent text-sm font-medium hover:text-sky-300 transition-colors">
                + Add Another Role
              </button>
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-2">Audition Requirements</h2>
              <p className="text-nc-muted text-sm">Select what talents need to submit for this casting.</p>
              
              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 p-4 border border-nc-border rounded-xl cursor-pointer hover:border-nc-accent/50 transition-colors">
                  <input type="checkbox" checked={form.requirements.headshot} onChange={e => setForm({...form, requirements: {...form.requirements, headshot: e.target.checked}})} className="w-5 h-5 rounded border-nc-border bg-nc-card text-nc-accent accent-sky-400 focus:ring-nc-accent" />
                  <div>
                    <div className="font-bold text-white">Professional Headshots</div>
                    <div className="text-xs text-nc-muted">Actors must have verified headshots uploaded.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border border-nc-border rounded-xl cursor-pointer hover:border-nc-accent/50 transition-colors">
                  <input type="checkbox" checked={form.requirements.wardrobe} onChange={e => setForm({...form, requirements: {...form.requirements, wardrobe: e.target.checked}})} className="w-5 h-5 rounded border-nc-border bg-nc-card text-nc-accent accent-sky-400 focus:ring-nc-accent" />
                  <div>
                    <div className="font-bold text-white">Bring Own Wardrobe</div>
                    <div className="text-xs text-nc-muted">Talents should be prepared to bring their own styling.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border border-nc-border rounded-xl cursor-pointer hover:border-nc-accent/50 transition-colors">
                  <input type="checkbox" checked={form.requirements.travel} onChange={e => setForm({...form, requirements: {...form.requirements, travel: e.target.checked}})} className="w-5 h-5 rounded border-nc-border bg-nc-card text-nc-accent accent-sky-400 focus:ring-nc-accent" />
                  <div>
                    <div className="font-bold text-white">Travel Required</div>
                    <div className="text-xs text-nc-muted">Out of state/country travel is expected for the shoot.</div>
                  </div>
                </label>

                <div className="pt-4 border-t border-nc-border">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Other / Custom Requirements</label>
                  <textarea 
                    value={form.otherRequirements} 
                    onChange={e => setForm({...form, otherRequirements: e.target.value})} 
                    placeholder="Enter any other specific requirements (e.g. Speak fluent Nepali, Must be based in Kathmandu - one per line)..." 
                    rows={4} 
                    className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm resize-none" 
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-nc-border">
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate('home')}
              className="text-nc-muted hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
              {step > 1 ? '← Back' : 'Cancel'}
            </button>
            {step < 3 ? (
              <Button size="lg" onClick={handleNext}>Continue →</Button>
            ) : (
              <Button 
                size="lg" 
                onClick={handlePublish} 
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Publishing...' : 'Publish Call ✦'}
              </Button>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
