import React, { useState, useEffect } from 'react';
import { Plus, X, Upload, ChevronLeft } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { createCastingCall, uploadProfileMedia } from '../../services';
import { collection, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const STEPS = [
  { id: 1, title: 'Project Details', icon: '' },
  { id: 2, title: 'Roles', icon: '' },
  { id: 3, title: 'Requirements', icon: '' },
  { id: 4, title: 'Preview & Submit', icon: '' },
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
  'Other',
];

interface CastingCallCreateProps {
  onNavigate?: (page: string, param?: any) => void;
  user?: any;
  showAlert?: (title: string, type: 'error' | 'success' | 'info', message: string) => void;
}

export default function CastingCallCreate({ onNavigate, user, showAlert }: CastingCallCreateProps) {
  useEffect(() => {
    if (!user) {
      showAlert?.('Sign In Required', 'info', 'Please sign in to publish a casting call.');
      if (onNavigate) {
        onNavigate('signin');
      }
    }
  }, [user, onNavigate, showAlert]);
  const [castingId] = useState(() => doc(collection(db, 'casting_calls')).id);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [horizontalThumbnailFile, setHorizontalThumbnailFile] = useState<File | null>(null);
  const [horizontalThumbnailPreview, setHorizontalThumbnailPreview] = useState('');
  const [isOtherType, setIsOtherType] = useState(false);
  const [customType, setCustomType] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [form, setForm] = useState({
    title: '',
    type: 'Actor',
    category: 'Nepali Feature Film',
    location: '',
    description: '',
    thumbnail: '',
    horizontalThumbnail: '',
    budget: '',
    deadline: '',
    contactInfo: '',
    roles: [{ name: '', ageRange: '', description: '', pay: 'Paid' }],
    requirements: { wardrobe: false, travel: false, headshot: false },
    otherRequirements: '',
  });

  const handlePublish = async () => {
    if (!user) {
      showAlert?.('Error', 'error', 'You must be signed in to publish a casting call.');
      if (onNavigate) onNavigate('signin');
      return;
    }
    if (!form.title || !form.category || !form.location || !form.budget || !form.deadline) {
      showAlert?.(
        'Missing Information',
        'error',
        'Please fill in all required details: Title, Category, Location, Budget, and Deadline.'
      );
      setStep(1);
      return;
    }
    setIsLoading(true);
    try {
      let thumbnailUrl = form.thumbnail;
      let horizontalUrl = form.horizontalThumbnail;

      if (thumbnailFile) {
        const uploadedUrl = await uploadProfileMedia(
          user.uid,
          thumbnailFile,
          undefined,
          `castings/${castingId}/poster.jpg`
        );
        if (uploadedUrl) thumbnailUrl = uploadedUrl;
      }

      if (horizontalThumbnailFile) {
        const uploadedBannerUrl = await uploadProfileMedia(
          user.uid,
          horizontalThumbnailFile,
          undefined,
          `castings/${castingId}/horizontal_banner.jpg`
        );
        if (uploadedBannerUrl) horizontalUrl = uploadedBannerUrl;
      }

      // Auto-fallback if only one is uploaded
      if (!thumbnailUrl && horizontalUrl) thumbnailUrl = horizontalUrl;
      if (!horizontalUrl && thumbnailUrl) horizontalUrl = thumbnailUrl;

      const requirementList: string[] = [];
      if (form.requirements.headshot) requirementList.push('Professional Headshots Required');
      if (form.requirements.wardrobe) requirementList.push('Own Wardrobe Required');
      if (form.requirements.travel) requirementList.push('Travel Involved');
      if (form.otherRequirements && form.otherRequirements.trim()) {
        const customReqs = form.otherRequirements
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean);
        requirementList.push(...customReqs);
      }
      const validRoles = form.roles.filter(r => r.name && r.name.trim());
      const rolesSummary = validRoles.map(r => r.name.trim()).join(' • ');

      const callData = {
        ...form,
        id: castingId,
        roles: validRoles.length > 0 ? validRoles : form.roles,
        type: rolesSummary || form.category || 'Performer',
        thumbnail: thumbnailUrl,
        horizontalThumbnail: horizontalUrl,
        bannerUrl: horizontalUrl,
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
        showAlert?.('Publication Failed', 'error', result.error);
      } else {
        showAlert?.('Success!', 'success', 'Your casting call has been published to the network.');
        if (onNavigate) onNavigate('casting');
      }
    } catch (err) {
      console.error('Error publishing casting call:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong while publishing.';
      showAlert?.('Unexpected Error', 'error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.title || !form.category || !form.location || !form.budget || !form.deadline) {
        showAlert?.(
          'Required Fields',
          'error',
          'Please fill in all required fields: Title, Category, Location, Budget, and Deadline.'
        );
        return;
      }
    }
    if (step === 2) {
      const hasValidRole = form.roles.some((r) => r.name && r.name.trim());
      if (!hasValidRole) {
        showAlert?.('Role Required', 'error', 'Please enter at least one role name for this casting.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-2 sm:pt-4 pb-12 font-sans">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-8 w-full overflow-hidden">
        {/* Header */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-between sm:block">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('back')}
            className="sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            title="Go Back"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          <div className="flex-1 text-center pr-6 sm:pr-0">
            <h1 className="text-xl sm:text-4xl font-black text-white tracking-tight">Post a Casting Call</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Find the perfect talent for your next production</p>
          </div>
        </div>

        {/* Mobile Step Indicator */}
        <div className="sm:hidden mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-xs font-bold text-white">
              {STEPS.find((s) => s.id === step)?.title}
            </span>
          </div>

          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                disabled={s.id > step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s.id < step ? 'bg-[#522C69]' : s.id === step ? 'bg-white' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Step Indicator */}
        <div className="hidden sm:flex items-center justify-center gap-2 mb-10 pb-2 border-b border-white/5">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  s.id === step
                    ? 'bg-white text-black shadow-md'
                    : s.id < step
                    ? 'bg-[#522C69]/10 text-[#522C69] border border-[#522C69]/20'
                    : 'bg-[#111] border border-white/5 text-gray-500 cursor-not-allowed'
                }`}
                disabled={s.id > step}
              >
                <span>{s.id < step ? '✓' : s.id}</span>
                <span>{s.title}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-[1px] ${s.id < step ? 'bg-[#522C69]' : 'bg-white/5'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Container */}
        <GlassCard strong className="p-3.5 sm:p-8 border border-white/5 rounded-2xl sm:rounded-[2rem] bg-[#111]/90 overflow-hidden w-full max-w-full">
          {step === 1 && (
            <div className="space-y-6 text-left">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Project Information</h2>

              <div className="space-y-5">
                {/* 9:16 Vertical Poster Thumbnail Upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Poster / Thumbnail (9:16 Portrait)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Shown across the platform (Home, Casting Feed, and Detail view).
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-36 sm:w-40 aspect-[9/16] bg-[#1a1a1a] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative group hover:border-[#522C69] transition-all cursor-pointer">
                      {thumbnailPreview || form.thumbnail ? (
                        <>
                          <img
                            src={thumbnailPreview || form.thumbnail}
                            alt="Poster preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm({ ...form, thumbnail: '', horizontalThumbnail: '' });
                              setThumbnailFile(null);
                              setThumbnailPreview('');
                            }}
                            className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-3">
                          <Upload className="w-6 h-6 text-gray-500 mx-auto mb-1.5 group-hover:text-white transition-colors" />
                          <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Upload Poster</p>
                          <p className="text-[8px] text-gray-600 mt-0.5">9:16 Vertical</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setThumbnailFile(file);
                            setThumbnailPreview(URL.createObjectURL(file));
                            setForm({ ...form, thumbnail: 'has-file', horizontalThumbnail: 'has-file' });
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="The Lost City"
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none text-sm font-medium"
                  />
                </div>

                {/* Project Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Project Category *
                  </label>
                  <select
                    value={isOtherCategory ? 'Other' : form.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setIsOtherCategory(true);
                        setForm({ ...form, category: customCategory.trim() || 'Other' });
                      } else {
                        setIsOtherCategory(false);
                        setForm({ ...form, category: val });
                      }
                    }}
                    className="w-full max-w-full box-border bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-3.5 py-3 text-white text-sm font-bold cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#111]">
                        {opt}
                      </option>
                    ))}
                  </select>

                  {isOtherCategory && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => {
                        const text = e.target.value;
                        setCustomCategory(text);
                        setForm({ ...form, category: text });
                      }}
                      placeholder="Type custom project category..."
                      className="w-full mt-2 bg-[#1a1a1a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2.5 text-white text-sm font-medium outline-none placeholder-gray-500"
                      autoFocus
                    />
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Kathmandu, Lalitpur, or Pokhara"
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none text-sm font-medium"
                  />
                </div>

                {/* Budget & Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
                  <div className="min-w-0 w-full overflow-hidden">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Pay Range / Budget *
                    </label>
                    <input
                      type="text"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      placeholder="Rs. 10,000 / Day or Competitive"
                      className="block w-full min-w-0 max-w-full box-border bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-3 py-2.5 text-white placeholder-gray-500 outline-none text-xs sm:text-sm font-medium"
                    />
                  </div>
                  <div className="min-w-0 w-full overflow-hidden">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Application Deadline *
                    </label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                      onClick={(e) => {
                        try {
                          (e.target as any).showPicker?.();
                        } catch (_) {
                          // Ignore if showPicker is not supported by the browser
                        }
                      }}
                      style={{ colorScheme: 'dark', boxSizing: 'border-box' }}
                      className="block w-full min-w-0 max-w-full box-border bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-2 sm:px-3 py-2.5 text-white placeholder-gray-500 outline-none text-xs sm:text-sm font-medium cursor-pointer overflow-hidden"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Contact Info / Email (Public) *
                  </label>
                  <input
                    type="text"
                    value={form.contactInfo}
                    onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                    placeholder="auditions@productioncompany.com or +977 98..."
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none text-sm font-medium"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Synopsis / Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the storyline, timeline of shoot, and other key details..."
                    rows={4}
                    className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none text-sm font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          )}

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
                      onClick={() => setForm({ ...form, roles: form.roles.filter((_, i) => i !== idx) })}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Remove
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        Character / Role Name *
                      </label>
                      <input
                        type="text"
                        value={role.name}
                        onChange={(e) => {
                          const r = [...form.roles];
                          r[idx].name = e.target.value;
                          setForm({ ...form, roles: r });
                        }}
                        placeholder="Lead Actor"
                        className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-[#522C69] text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        Age Range
                      </label>
                      <input
                        type="text"
                        value={role.ageRange}
                        onChange={(e) => {
                          const r = [...form.roles];
                          r[idx].ageRange = e.target.value;
                          setForm({ ...form, roles: r });
                        }}
                        placeholder="20-30 years"
                        className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-[#522C69] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                      Role Description / Key Characteristics
                    </label>
                    <textarea
                      value={role.description}
                      onChange={(e) => {
                        const r = [...form.roles];
                        r[idx].description = e.target.value;
                        setForm({ ...form, roles: r });
                      }}
                      placeholder="Energetic character with athletic build..."
                      rows={2}
                      className="w-full bg-[#111] border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-[#522C69] text-xs font-semibold resize-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    roles: [...form.roles, { name: '', ageRange: '', description: '', pay: 'Paid' }],
                  })
                }
                className="w-full py-3 rounded-2xl border border-dashed border-white/10 hover:border-[#522C69] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Another Role</span>
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Audition Requirements</h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">Select prerequisites for candidates</p>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'headshot', label: 'Professional Headshot Required' },
                  { id: 'wardrobe', label: 'Specific Wardrobe Required' },
                  { id: 'travel', label: 'Travel Involved (Outside Valley)' },
                ].map((req) => (
                  <label
                    key={req.id}
                    className="flex items-center gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-white/5 cursor-pointer hover:border-white/10 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={(form.requirements as any)[req.id]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          requirements: { ...form.requirements, [req.id]: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded accent-[#522C69]"
                    />
                    <span className="text-xs font-semibold text-white">{req.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Additional Special Instructions (One per line)
                </label>
                <textarea
                  value={form.otherRequirements}
                  onChange={(e) => setForm({ ...form, otherRequirements: e.target.value })}
                  placeholder="Must speak fluent Newari&#10;Must have motorcycle license"
                  rows={4}
                  className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#522C69] rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none text-sm font-medium resize-none"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Preview & Publish</h2>
                <p className="text-xs text-gray-500 mt-1 font-medium">Review your casting notice before launching</p>
              </div>

              <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-bold text-white text-lg">{form.title}</h3>
                  <span className="text-[#522C69] text-xs font-black uppercase tracking-wider">
                    {form.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-400">
                  <div>Location: <span className="text-white font-bold">{form.location}</span></div>
                  <div>Salary: <span className="text-white font-bold">{form.budget}</span></div>
                  <div>Deadline: <span className="text-white font-bold">{form.deadline}</span></div>
                  <div>Roles: <span className="text-white font-bold">{form.roles.length} Roles</span></div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line border-t border-white/5 pt-3">
                  {form.description}
                </p>
              </div>
            </div>
          )}

          {/* Buttons Footer */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-[#522C69] text-white hover:bg-[#663782] rounded-xl text-xs font-bold uppercase tracking-wider px-6 py-2.5 cursor-pointer"
              >
                Next Step
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePublish}
                loading={isLoading}
                disabled={isLoading}
                className="bg-gradient-to-r from-[#522C69] to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider px-8 py-3 rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Publish Casting Call
              </Button>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
