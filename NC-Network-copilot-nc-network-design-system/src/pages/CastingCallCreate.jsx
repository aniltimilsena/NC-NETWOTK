import { useState } from 'react';
import { 
  MapPin, Clock, Info, Plus, X, Upload, Check, ChevronLeft 
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import { createCastingCall } from '../services/casting';
import { uploadProfileMedia } from '../services/profile';
import { CATEGORIES, getCategoryConfig } from '../constants/categories';
import { collection, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STEPS = [
  { id: 1, title: 'Project Details', icon: '' },
  { id: 2, title: 'Roles', icon: '' },
  { id: 3, title: 'Requirements', icon: '' },
  { id: 4, title: 'Preview & Submit', icon: '' }
];

const CATEGORY_OPTIONS = [
  'Nepali Feature Film',
  'Nepali Short Film',
  'Music Video',
  'Commercial / TVC',
  'Documentary',
  'Theater Play',
  'Voice Over Project',
  'VFX / Animation Project',
  'Other'
];

export default function CastingCallCreate({ onNavigate, user, showAlert }) {
  const [castingId] = useState(() => doc(collection(db, 'casting_calls')).id);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [form, setForm] = useState({
    title: '', 
    type: 'Actor', 
    category: 'Nepali Feature Film',
    location: '', 
    description: '',
    thumbnail: '',
    budget: '',
    deadline: '',
    contactInfo: '',
    roles: [{ name: '', ageRange: '', description: '', pay: 'Paid' }],
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
        thumbnailUrl = await uploadProfileMedia(
          user.uid,
          thumbnailFile,
          undefined,
          `castings/${castingId}/banner.jpg`
        );
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
        id: castingId,
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
      if (!form.title || !form.type || !form.location || !form.thumbnail || !form.budget || !form.deadline) {
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
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-24 font-sans">
      <div className="max-w-3xl mx-auto px-6 py-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Post a Casting Call</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Find the perfect talent for your next production</p>
        </div>
        
        {/* ── Wizard Steps indicator ─────────────────────────────── */}

        {/* MOBILE: compact progress header */}
        <div className="sm:hidden mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-xs font-bold text-white">
              {STEPS.find(s => s.id === step)?.title}
            </span>
          </div>
          {/* Segmented progress bar */}
          <div className="flex gap-1.5">
            {STEPS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { if (s.id < step) setStep(s.id); }}
                disabled={s.id > step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s.id < step
                    ? 'bg-[#00BFFF]'
                    : s.id === step
                    ? 'bg-white'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* DESKTOP: full pill tabs */}
        <div className="hidden sm:flex items-center justify-center gap-2 mb-10 pb-2 border-b border-white/5">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (s.id < step) setStep(s.id); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  s.id === step
                    ? 'bg-white text-black shadow-md'
                    : s.id < step
                    ? 'bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20'
                    : 'bg-[#111] border border-white/5 text-gray-500 cursor-not-allowed'
                }`}
                disabled={s.id > step}
              >
                <span>{s.id < step ? '✓' : s.id}</span>
                <span>{s.title}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-[1px] ${s.id < step ? 'bg-[#00BFFF]' : 'bg-white/5'}`} />
              )}
            </div>
          ))}
        </div>


        <GlassCard strong className="p-6 sm:p-8 border border-white/5 rounded-[2rem] bg-[#111]/90">
          
          {/* STEP 1: PROJECT INFO */}
          {step === 1 && (
            <div className="space-y-6 text-left">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Project Information</h2>
              
              <div className="space-y-5">
                
                {/* Poster upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Project Poster / Photo *</label>
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <div className="w-full sm:w-48 h-32 bg-[#1a1a1a] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative group hover:border-[#00BFFF] transition-all cursor-pointer">
                      {thumbnailPreview || form.thumbnail ? (
                        <>
                          <img src={thumbnailPreview || form.thumbnail} alt="Poster preview" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setForm({...form, thumbnail: ''}); 
                              setThumbnailFile(null);
                              setThumbnailPreview('');
                            }}
                            className="absolute top-2.5 right-2.5 bg-black/70 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <Upload className="w-7 h-7 text-gray-500 mx-auto mb-2 group-hover:text-[#00BFFF] transition-colors" />
                          <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">Upload Photo</p>
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
                       <p className="text-xs text-gray-400 leading-relaxed font-medium">
                        Upload a premium poster image. Auditions with photos get significantly higher engagement and applications.
                      </p>
                      <p className="text-[10px] text-[#00BFFF] font-bold tracking-widest uppercase">Aspect Ratio: 16:9 Preferred</p>
                    </div>
                  </div>
                </div>

                {/* Project Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Project Title *</label>
                  <input 
                    type="text" 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    placeholder="e.g. The Lost City" 
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)] text-sm font-medium" 
                  />
                </div>

                {/* Category & Type row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Target Talent Type *</label>
                    <select 
                      value={form.type} 
                      onChange={e => setForm({...form, type: e.target.value})} 
                      className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all text-sm font-bold cursor-pointer"
                    >
                      {CATEGORIES.map(catId => {
                        const cfg = getCategoryConfig(catId);
                        return (
                          <option key={catId} value={cfg.label}>{cfg.label}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Project Category *</label>
                    <select 
                      value={form.category} 
                      onChange={e => setForm({...form, category: e.target.value})} 
                      className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all text-sm font-bold cursor-pointer"
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Location *</label>
                  <input 
                    type="text" 
                    value={form.location} 
                    onChange={e => setForm({...form, location: e.target.value})} 
                    placeholder="e.g. Kathmandu, Lalitpur, or Pokhara" 
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)] text-sm font-medium" 
                  />
                </div>
                
                {/* Pay & Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pay Range / Budget *</label>
                    <input 
                      type="text" 
                      value={form.budget} 
                      onChange={e => setForm({...form, budget: e.target.value})} 
                      placeholder="e.g. Rs. 10,000 / Day or Competitive" 
                      className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)] text-sm font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Application Deadline *</label>
                    <input 
                      type="date" 
                      value={form.deadline} 
                      onChange={e => setForm({...form, deadline: e.target.value})} 
                      className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)] text-sm font-medium cursor-pointer" 
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Contact Info / Email (Public) *</label>
                  <input 
                    type="text" 
                    value={form.contactInfo} 
                    onChange={e => setForm({...form, contactInfo: e.target.value})} 
                    placeholder="e.g. auditions@productioncompany.com or +977 98..." 
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)] text-sm font-medium" 
                  />
                </div>

                {/* Project Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Synopsis / Description</label>
                  <textarea 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    placeholder="Describe the storyline, timeline of shoot, and other key details..." 
                    rows={4} 
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,191,255,0.15)] text-sm font-medium resize-none" 
                  />
                </div>

              </div>
            </div>
          )}
          
          {/* STEP 2: ROLES */}
          {step === 2 && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Roles Available</h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">Add character names, age requirements, and descriptions</p>
              </div>

              {form.roles.map((role, idx) => (
                <div key={idx} className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 space-y-4 relative">
                  {idx > 0 && (
                    <button 
                      type="button"
                      onClick={() => setForm({...form, roles: form.roles.filter((_, i) => i !== idx)})} 
                      className="absolute top-4 right-4 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Character / Role Name *</label>
                      <input 
                        type="text" 
                        value={role.name} 
                        onChange={e => { 
                          const r = [...form.roles]; 
                          r[idx].name = e.target.value; 
                          setForm({...form, roles: r}); 
                        }} 
                        placeholder="e.g. Lead Actor" 
                        className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-[#00BFFF] text-xs font-semibold" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Age Range</label>
                      <input 
                        type="text" 
                        value={role.ageRange} 
                        onChange={e => { 
                          const r = [...form.roles]; 
                          r[idx].ageRange = e.target.value; 
                          setForm({...form, roles: r}); 
                        }} 
                        placeholder="e.g. 20-30 years" 
                        className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-[#00BFFF] text-xs font-semibold" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Character Profile & traits</label>
                    <textarea 
                      value={role.description} 
                      onChange={e => { 
                        const r = [...form.roles]; 
                        r[idx].description = e.target.value; 
                        setForm({...form, roles: r}); 
                      }} 
                      placeholder="Describe the personality traits, look, or skills needed..." 
                      rows={3} 
                      className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-[#00BFFF] text-xs font-semibold resize-none" 
                    />
                  </div>
                </div>
              ))}

              <button 
                type="button"
                onClick={() => setForm({...form, roles: [...form.roles, { name: '', ageRange: '', description: '', pay: 'Paid' }]})} 
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00BFFF] hover:opacity-85 transition-opacity"
              >
                <Plus size={14} />
                Add Another Role
              </button>
            </div>
          )}
          
          {/* STEP 3: REQUIREMENTS */}
          {step === 3 && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Audition Requirements</h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">Select checklist requirements for applicant submissions</p>
              </div>
              
              <div className="space-y-3.5">
                <label className="flex items-center gap-3.5 p-4 border border-white/5 bg-[#1a1a1a] rounded-2xl cursor-pointer hover:border-[#00BFFF]/50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={form.requirements.headshot} 
                    onChange={e => setForm({...form, requirements: {...form.requirements, headshot: e.target.checked}})} 
                    className="w-4 h-4 rounded border-white/10 bg-[#111] text-[#00BFFF] focus:ring-[#00BFFF] accent-[#00BFFF]" 
                  />
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">Professional Headshots Required</div>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">Applicant must have a high-quality verified photo portfolio.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3.5 p-4 border border-white/5 bg-[#1a1a1a] rounded-2xl cursor-pointer hover:border-[#00BFFF]/50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={form.requirements.wardrobe} 
                    onChange={e => setForm({...form, requirements: {...form.requirements, wardrobe: e.target.checked}})} 
                    className="w-4 h-4 rounded border-white/10 bg-[#111] text-[#00BFFF] focus:ring-[#00BFFF] accent-[#00BFFF]" 
                  />
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">Own Wardrobe Needed</div>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">Shoot requires talent to carry or organize styling options.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3.5 p-4 border border-white/5 bg-[#1a1a1a] rounded-2xl cursor-pointer hover:border-[#00BFFF]/50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={form.requirements.travel} 
                    onChange={e => setForm({...form, requirements: {...form.requirements, travel: e.target.checked}})} 
                    className="w-4 h-4 rounded border-white/10 bg-[#111] text-[#00BFFF] focus:ring-[#00BFFF] accent-[#00BFFF]" 
                  />
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">Travel Involved</div>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">Production covers travel logistics outside city limits.</div>
                  </div>
                </label>

                <div className="pt-4 border-t border-white/5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Other / Custom Requirements (One per line)</label>
                  <textarea 
                    value={form.otherRequirements} 
                    onChange={e => setForm({...form, otherRequirements: e.target.value})} 
                    placeholder="e.g. Must speak fluent Nepali&#10;Prior theater experience is a plus" 
                    rows={4} 
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none transition-all text-xs font-semibold resize-none" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & SUBMIT */}
          {step === 4 && (
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Preview Your Casting Call</h2>
                <span className="px-3 py-1 rounded-full text-[9px] font-black bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/20 uppercase tracking-widest">
                  Review Mode
                </span>
              </div>

              {/* Cover card layout preview */}
              <div className="border border-white/5 bg-[#1a1a1a] rounded-[2rem] overflow-hidden">
                <div className="h-40 w-full overflow-hidden relative">
                  <img 
                    src={thumbnailPreview || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=640&auto=format&fit=crop'} 
                    alt="Preview Poster" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent" />
                  <div className="absolute bottom-4 left-6 z-20">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-[#00BFFF]/20 text-[#00BFFF] border border-[#00BFFF]/30 uppercase tracking-widest">
                      {form.category}
                    </span>
                    <h3 className="text-lg font-black text-white mt-1 leading-tight">{form.title || 'Untitled Project'}</h3>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="text-xs text-gray-300 font-medium">
                    <span className="text-gray-500 uppercase font-bold text-[9px] block mb-1">Roles Overview</span>
                    Looking for: {form.roles.map(r => `${r.name || 'Role'} (${r.ageRange || 'Any age'})`).join(' | ')}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-semibold border-t border-white/5 pt-4">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-500" />
                      {form.location || 'Nepal'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-gray-500" />
                      Deadline: {form.deadline || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="text-gray-500 text-xs font-black">Rs.</span>
                      Pay: {form.budget || 'Competitive'}
                    </span>
                  </div>

                  {form.description && (
                    <div className="border-t border-white/5 pt-4 text-xs leading-relaxed text-gray-400 font-medium whitespace-pre-line">
                      <span className="text-gray-500 uppercase font-bold text-[9px] block mb-1">Synopsis</span>
                      {form.description}
                    </div>
                  )}

                  {form.contactInfo && (
                    <div className="border-t border-white/5 pt-4 text-xs text-gray-400 font-medium">
                      <span className="text-gray-500 uppercase font-bold text-[9px] block mb-1">Contact Info</span>
                      {form.contactInfo}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 flex gap-3 items-start">
                <Info className="w-4 h-4 text-[#00BFFF] shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Please review the details above. Once published, your casting call will be live on the NC Network casting board.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate('casting')}
              className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={14} />
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
            {step < 4 ? (
              <Button size="lg" type="button" onClick={handleNext} className="rounded-xl px-6">Continue →</Button>
            ) : (
              <Button 
                size="lg" 
                type="button"
                onClick={handlePublish} 
                loading={isLoading}
                disabled={isLoading}
                className="bg-[#00BFFF] text-black hover:opacity-90 rounded-xl px-8"
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
