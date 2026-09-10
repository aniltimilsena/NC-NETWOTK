import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Upload,
  ChevronLeft,
  RotateCcw,
  Film,
  MapPin,
  Calendar,
  Mail,
  Check,
  Sparkles,
  Camera,
  Shirt,
  Plane,
  Users,
  Trash2,
  DollarSign,
  Clapperboard,
  CheckCircle2,
  ArrowRight,
  Info,
  Layers,
  FileText
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import BackButton from '../../components/ui/BackButton';
import { CastingFormSkeleton } from '../../components/ui/Skeleton';
import { createCastingCall, updateCastingCall, getCastingCallById, uploadProfileMedia } from '../../services';
import { collection, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AuthService } from '../../services/AuthService';
import { CurrentUser } from '../../utils/CurrentUser';

const STEPS = [
  { id: 1, title: 'Project Details', subtitle: 'Basic Info & Poster', icon: Film },
  { id: 2, title: 'Roles', subtitle: 'Characters & Talent', icon: Users },
  { id: 3, title: 'Requirements', subtitle: 'Audition Criteria', icon: Layers },
  { id: 4, title: 'Preview & Submit', subtitle: 'Final Review', icon: CheckCircle2 },
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

const PAY_OPTIONS = [
  'Paid',
  'Competitive',
  'Expenses Covered',
  'Deferred Pay',
  'Unpaid / Collaboration',
];

const DRAFT_STORAGE_KEY = 'nepalcasts_casting_call_draft';

interface CastingCallCreateProps {
  onNavigate?: (page: string, param?: any) => void;
  user?: any;
  showAlert?: (title: string, type: 'error' | 'success' | 'info', message: string) => void;
  editId?: string;
}

export default function CastingCallCreate({ onNavigate, user, showAlert, editId }: CastingCallCreateProps) {
  const params = useParams();
  const effectiveEditId = editId || params.id || params.castingId;
  const isEditMode = Boolean(effectiveEditId);

  useEffect(() => {
    if (!user) {
      showAlert?.('Sign In Required', 'info', 'Please sign in to manage a casting call.');
      if (onNavigate) {
        onNavigate('signin');
      }
    }
  }, [user, onNavigate, showAlert]);

  const loadSavedDraft = () => {
    if (isEditMode) return null;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load casting draft:', e);
    }
    return null;
  };

  const initialDraft = loadSavedDraft();

  const [castingId] = useState(() => effectiveEditId || initialDraft?.castingId || doc(collection(db, 'casting_calls')).id);
  const [step, setStep] = useState(() => initialDraft?.step || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditMode);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(() => initialDraft?.thumbnailPreview || initialDraft?.form?.thumbnail || '');
  const [horizontalThumbnailFile, setHorizontalThumbnailFile] = useState<File | null>(null);
  const [horizontalThumbnailPreview, setHorizontalThumbnailPreview] = useState(() => initialDraft?.horizontalThumbnailPreview || initialDraft?.form?.horizontalThumbnail || '');
  const [isOtherType, setIsOtherType] = useState(() => Boolean(initialDraft?.isOtherType));
  const [customType, setCustomType] = useState(() => initialDraft?.customType || '');
  const [isOtherCategory, setIsOtherCategory] = useState(() => Boolean(initialDraft?.isOtherCategory));
  const [customCategory, setCustomCategory] = useState(() => initialDraft?.customCategory || '');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(() => initialDraft?.form || {
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

  // Automated Garbage Collection for preview object URLs
  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
      if (horizontalThumbnailPreview && horizontalThumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(horizontalThumbnailPreview);
      }
    };
  }, [thumbnailPreview, horizontalThumbnailPreview]);

  // Load existing casting call if in edit mode
  useEffect(() => {
    if (!effectiveEditId) return;

    let isMounted = true;
    setLoadingInitial(true);

    (async () => {
      try {
        const callData: any = await getCastingCallById(effectiveEditId);
        if (!isMounted) return;

        if (!callData) {
          showAlert?.('Not Found', 'error', 'Casting call not found.');
          if (onNavigate) onNavigate('back');
          return;
        }

        // Ownership check
        const currentUid = user?.uid || user?.id || AuthService.getUserId() || CurrentUser.id;
        const callOwner = callData.creatorId || callData.createdBy || callData.created_by || callData.user_id;
        const currentEmail = (user?.email || CurrentUser.email || '').toLowerCase().trim();
        const callEmail = (callData.creatorEmail || callData.contactInfo || '').toLowerCase().trim();
        const isOwner = (currentUid && callOwner && callOwner === currentUid) || (currentEmail && callEmail && currentEmail === callEmail);
        const userIsAdmin = Boolean(user?.isAdmin || CurrentUser.role === 'admin' || (user?.email && user.email.toLowerCase() === 'aniltimilsena53@gmail.com'));

        if (!isOwner && !userIsAdmin) {
          showAlert?.('Permission Denied', 'error', 'You can only edit casting calls that you created.');
          if (onNavigate) onNavigate('back');
          return;
        }

        let reqWardrobe = false;
        let reqTravel = false;
        let reqHeadshot = false;
        let otherReqs = '';

        if (Array.isArray(callData.requirements)) {
          reqHeadshot = callData.requirements.some((r: string) => /headshot/i.test(r));
          reqWardrobe = callData.requirements.some((r: string) => /wardrobe/i.test(r));
          reqTravel = callData.requirements.some((r: string) => /travel/i.test(r));
          otherReqs = callData.requirements
            .filter((r: string) => !/headshot|wardrobe|travel/i.test(r))
            .join('\n');
        } else if (callData.requirements && typeof callData.requirements === 'object') {
          reqHeadshot = Boolean(callData.requirements.headshot);
          reqWardrobe = Boolean(callData.requirements.wardrobe);
          reqTravel = Boolean(callData.requirements.travel);
          otherReqs = callData.otherRequirements || '';
        } else if (typeof callData.requirements === 'string') {
          otherReqs = callData.requirements;
        }

        let parsedRoles = [{ name: '', ageRange: '', description: '', pay: 'Paid' }];
        if (Array.isArray(callData.roles) && callData.roles.length > 0) {
          parsedRoles = callData.roles.map((r: any) => ({
            name: typeof r === 'string' ? r : (r.name || ''),
            ageRange: r.ageRange || '',
            description: r.description || '',
            pay: r.pay || r.compensation || 'Paid',
            gender: r.gender || '',
          }));
        }

        const isStandardCat = CATEGORY_OPTIONS.includes(callData.category);
        if (!isStandardCat && callData.category) {
          setIsOtherCategory(true);
          setCustomCategory(callData.category);
        }

        setForm({
          title: callData.title || '',
          type: callData.type || 'Actor',
          category: callData.category || 'Nepali Feature Film',
          location: callData.location || '',
          description: callData.description || '',
          thumbnail: callData.thumbnail || '',
          horizontalThumbnail: callData.horizontalThumbnail || callData.bannerUrl || '',
          budget: callData.budget || callData.compensation || '',
          deadline: callData.deadline || '',
          contactInfo: callData.contactInfo || callData.creatorEmail || '',
          roles: parsedRoles,
          requirements: { wardrobe: reqWardrobe, travel: reqTravel, headshot: reqHeadshot },
          otherRequirements: otherReqs,
        });

        if (callData.thumbnail) {
          setThumbnailPreview(callData.thumbnail);
        }
        if (callData.horizontalThumbnail || callData.bannerUrl) {
          setHorizontalThumbnailPreview(callData.horizontalThumbnail || callData.bannerUrl);
        }
      } catch (err) {
        console.error('Error fetching casting call for edit:', err);
        showAlert?.('Error', 'error', 'Failed to load casting call for editing.');
      } finally {
        if (isMounted) {
          setLoadingInitial(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [effectiveEditId, user]);

  // Auto-save form draft whenever values change (only when creating new call)
  useEffect(() => {
    if (isEditMode) return;
    const hasMeaningfulData =
      form.title ||
      form.location ||
      form.description ||
      form.budget ||
      form.deadline ||
      (form.roles && form.roles.some((r: any) => r?.name && r.name.trim()));

    if (hasMeaningfulData) {
      try {
        const draftData = {
          castingId,
          form,
          step,
          isOtherType,
          customType,
          isOtherCategory,
          customCategory,
          thumbnailPreview: thumbnailPreview && thumbnailPreview.startsWith('http') ? thumbnailPreview : '',
          horizontalThumbnailPreview: horizontalThumbnailPreview && horizontalThumbnailPreview.startsWith('http') ? horizontalThumbnailPreview : '',
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      } catch (e) {
        // ignore quota errors
      }
    }
  }, [castingId, form, step, isOtherType, customType, isOtherCategory, customCategory, thumbnailPreview, horizontalThumbnailPreview, isEditMode]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setForm({
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
      setStep(1);
      setThumbnailFile(null);
      setThumbnailPreview('');
      setHorizontalThumbnailFile(null);
      setHorizontalThumbnailPreview('');
      setIsOtherType(false);
      setCustomType('');
      setIsOtherCategory(false);
      setCustomCategory('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showAlert?.('Draft Cleared', 'info', 'Form has been reset to start fresh.');
    } catch (e) {
      // ignore
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showAlert?.('Invalid File', 'error', 'Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
    setForm((prev: any) => ({ ...prev, thumbnail: 'has-file', horizontalThumbnail: 'has-file' }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handlePublish = async () => {
    if (isLoading) return;
    if (!user) {
      showAlert?.('Error', 'error', 'You must be signed in to manage a casting call.');
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
          .map((r: string) => r.trim())
          .filter(Boolean);
        requirementList.push(...customReqs);
      }
      const validRoles = form.roles.filter((r: any) => r.name && r.name.trim());
      const rolesSummary = validRoles.map((r: any) => r.name.trim()).join(' • ');

      const callData = {
        ...form,
        id: castingId,
        roles: validRoles.length > 0 ? validRoles : form.roles,
        type: rolesSummary || form.category || 'Performer',
        thumbnail: thumbnailUrl,
        horizontalThumbnail: horizontalUrl,
        bannerUrl: horizontalUrl,
        production: user.displayName || CurrentUser.fullName || 'Independent Production',
        budget: form.budget,
        deadline: form.deadline ? form.deadline.trim() : 'N/A',
        creatorId: user.uid || user.id || AuthService.getUserId() || CurrentUser.id,
        createdBy: user.uid || user.id || AuthService.getUserId() || CurrentUser.id,
        creatorName: user.displayName || user.name || CurrentUser.fullName || 'Anonymous Producer',
        creatorEmail: user.email || CurrentUser.email || '',
        creatorPhoto: user.photoURL || user.image || CurrentUser.imageUrl || '',
        status: 'active',
        requirements: requirementList,
      };

      if (isEditMode && effectiveEditId) {
        const result = await updateCastingCall(effectiveEditId, callData);
        if (result.error) {
          showAlert?.('Update Failed', 'error', result.error);
        } else {
          showAlert?.('Success!', 'success', 'Your casting call has been updated.');
          if (onNavigate) {
            onNavigate('casting-detail', effectiveEditId);
          } else {
            window.location.assign(`/casting/${effectiveEditId}`);
          }
        }
      } else {
        const result = await createCastingCall({
          ...callData,
          applicantsCount: 0,
          createdAt: new Date().toISOString(),
        });
        if (result.error) {
          showAlert?.('Publication Failed', 'error', result.error);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          showAlert?.('Success!', 'success', 'Your casting call has been published to the network.');
          if (onNavigate) onNavigate('casting');
        }
      }
    } catch (err) {
      console.error('Error saving casting call:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong while saving.';
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
      const hasValidRole = form.roles.some((r: any) => r.name && r.name.trim());
      if (!hasValidRole) {
        showAlert?.('Role Required', 'error', 'Please enter at least one role name for this casting.');
        return;
      }
    }
    setStep((s: number) => s + 1);
  };

  if (loadingInitial) {
    return <CastingFormSkeleton />;
  }

  return (
    <div className="min-h-screen bg-nc-dark text-white pt-4 sm:pt-8 pb-16 font-sans">
      <div className="max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 w-full">
        
        {/* Top Header Bar */}
        <div className="relative mb-5 sm:mb-8 flex items-center justify-between gap-3 sm:gap-4 border-b border-white/5 pb-4 sm:pb-6">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <BackButton
              onClick={() => (onNavigate ? onNavigate('back') : undefined)}
              fallbackTo="/casting"
              ariaLabel="Go Back"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#522C69]/30 text-[#C48AE8] border border-[#522C69]/50">
                  <Clapperboard className="w-3 h-3" />
                  {isEditMode ? 'Production Editor' : 'Producer Studio'}
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-1 truncate">
                {isEditMode ? 'Edit Casting Call' : 'Post a Casting Call'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5 font-medium line-clamp-1 sm:line-clamp-none">
                {isEditMode
                  ? 'Update roles, requirements, and media for your audition notice'
                  : 'Find the perfect talent for your next feature film, commercial, or production'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isEditMode && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 border-0 transition-all shadow-sm active:scale-95 cursor-pointer text-xs font-semibold"
                title="Reset Form Draft"
                aria-label="Reset Form Draft"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset Draft</span>
              </button>
            )}
          </div>
        </div>

        {/* Stepper Navigation */}
        {/* Mobile Step Bar */}
        <div className="sm:hidden mb-5 bg-black border-0 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-extrabold text-[#C48AE8] uppercase tracking-wider">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-xs font-bold text-white">
              {STEPS.find((s) => s.id === step)?.title}
            </span>
          </div>

          <div className="flex gap-2">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                disabled={s.id > step}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  s.id < step ? 'bg-[#8644A2]' : s.id === step ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'bg-white/10'
                }`}
                title={`Step ${s.id}: ${s.title}`}
                aria-label={`Step ${s.id}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Step Navigation */}
        <div className="hidden sm:grid grid-cols-4 gap-3 mb-8">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCurrent = s.id === step;
            const isCompleted = s.id < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (isCompleted) setStep(s.id);
                }}
                disabled={s.id > step}
                className={`group relative text-left p-3.5 rounded-xl transition-all duration-200 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-[#1C1224] to-black border border-[#8644A2] shadow-lg shadow-[#522C69]/15'
                    : isCompleted
                    ? 'bg-black border-0 hover:bg-zinc-950 cursor-pointer'
                    : 'bg-black/60 border-0 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors shrink-0 ${
                      isCurrent
                        ? 'bg-[#8644A2] text-white shadow-md'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-gray-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" strokeWidth={3} /> : s.id}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        isCurrent ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate font-medium mt-0.5">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Form Container */}
        <GlassCard strong className="p-4 sm:p-8 lg:p-10 border-0 !border-none rounded-xl sm:rounded-2xl bg-black shadow-2xl overflow-hidden w-full">
          
          {/* STEP 1: PROJECT DETAILS */}
          {step === 1 && (
            <div className="space-y-6 sm:space-y-8 text-left">
              {/* Desktop 2-Column Studio Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                {/* Left Column: 9:16 Vertical Poster / Media Asset */}
                <div className="lg:col-span-4 xl:col-span-4 space-y-3.5 sm:space-y-4 lg:sticky lg:top-8">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-extrabold text-gray-300 uppercase tracking-wider">
                        Poster Artwork
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border-0">
                        9:16 Portrait
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed mb-2 sm:mb-3">
                      Main vertical artwork showcased on the casting feed and audition detail page.
                    </p>
                  </div>

                  {/* 9:16 Drag and Drop Box */}
                  <div
                    onClick={() => {
                      if (!thumbnailPreview && !form.thumbnail) {
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`w-full max-w-[210px] sm:max-w-[260px] mx-auto lg:max-w-none aspect-[9/16] rounded-xl transition-all duration-200 relative overflow-hidden flex flex-col items-center justify-center group ${
                      isDragging
                        ? 'border-2 border-dashed border-[#8644A2] bg-[#8644A2]/10 scale-[1.01]'
                        : thumbnailPreview || form.thumbnail
                        ? 'border-0 bg-black'
                        : 'border-2 border-dashed border-white/10 hover:border-[#8644A2] bg-[#0c0c0e] hover:bg-[#141418] cursor-pointer'
                    }`}
                  >
                    {thumbnailPreview || form.thumbnail ? (
                      <>
                        <img
                          src={thumbnailPreview || form.thumbnail}
                          alt="Casting Poster Preview"
                          className="w-full h-full object-cover"
                        />

                        {/* Delete Button (Always accessible & top z-index) */}
                        <div className="absolute top-3 right-3 z-30">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setThumbnailFile(null);
                              setThumbnailPreview('');
                              setForm((prev: any) => ({ ...prev, thumbnail: '', horizontalThumbnail: '' }));
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="bg-black/85 hover:bg-red-600 text-white p-2.5 rounded-lg transition-all shadow-xl active:scale-90 cursor-pointer flex items-center justify-center border-0"
                            title="Remove poster"
                            aria-label="Remove poster"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Bottom Bar: Change Poster */}
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col items-center justify-end z-20 pointer-events-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black/80 hover:bg-[#8644A2] text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-md border-0"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Change Poster
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 space-y-3 pointer-events-none">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border-0 flex items-center justify-center mx-auto text-gray-400 group-hover:text-[#C48AE8] group-hover:bg-[#8644A2]/20 transition-all">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Upload Poster Image</p>
                          <p className="text-[11px] text-gray-400 mt-1">Drag & drop or browse</p>
                        </div>
                        <div className="pt-2 border-t border-white/5 text-[10px] text-gray-500 font-medium">
                          JPG, PNG, WEBP • Max 10MB
                          <br />
                          Recommended 1080 × 1920
                        </div>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                      title="Upload poster"
                    />
                  </div>

                  {/* Production Pro Tip */}
                  <div className="bg-[#522C69]/10 border-0 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#C48AE8] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      <strong className="text-white font-semibold">Pro Tip:</strong> Casting notices with clean, high-contrast poster artwork receive up to <span className="text-[#C48AE8] font-bold">3x more auditions</span> from seasoned performers.
                    </p>
                  </div>
                </div>

                {/* Right Column: Form Inputs */}
                <div className="lg:col-span-8 xl:col-span-8 space-y-6">
                  
                  {/* Section Title */}
                  <div className="border-b border-white/5 pb-4">
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                      Project Information
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Provide accurate project details so actors and casting directors know what to expect.
                    </p>
                  </div>

                  {/* Project Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Project Title <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <Film className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g., The Lost City, Everest Chronicles, or Summer Nights"
                        className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-gray-500 outline-none text-sm font-medium transition-all"
                      />
                    </div>
                  </div>

                  {/* Category & Location Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Project Category <span className="text-red-400">*</span>
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
                        className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg px-4 py-2.5 sm:py-3 text-white text-sm font-medium cursor-pointer outline-none transition-all"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#141414] text-white py-2">
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
                          className="w-full mt-2 bg-[#141414] border border-white/15 focus:border-[#8644A2] rounded-lg px-3.5 py-2.5 text-white text-sm font-medium outline-none placeholder-gray-500"
                          autoFocus
                        />
                      )}
                    </div>

                    {/* Location */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Location / Shoot City <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          placeholder="e.g., Kathmandu Valley, Lalitpur, or Pokhara"
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-gray-500 outline-none text-sm font-medium transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Budget & Deadline Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Budget */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Budget / Compensation <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={form.budget}
                          onChange={(e) => setForm({ ...form, budget: e.target.value })}
                          placeholder="e.g., Rs. 25,000 / Day or Competitive"
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-gray-500 outline-none text-sm font-medium transition-all"
                        />
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Audition Deadline <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <input
                          type="date"
                          value={form.deadline}
                          onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                          onClick={(e) => {
                            try {
                              (e.target as any).showPicker?.();
                            } catch (_) {
                              // Ignore if showPicker is not supported
                            }
                          }}
                          style={{ colorScheme: 'dark' }}
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-gray-500 outline-none text-sm font-medium transition-all cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Public Contact Info */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Audition Contact / Submissions Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={form.contactInfo}
                        onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                        placeholder="e.g., casting@yourproduction.com or +977 98..."
                        className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-gray-500 outline-none text-sm font-medium transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Publicly visible to verified talent applying for these roles.
                    </p>
                  </div>

                  {/* Description / Storyline */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Synopsis & Project Overview
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the storyline, theme, shoot schedule, director's vision, or any key production highlights..."
                      rows={5}
                      className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg p-3.5 sm:p-4 text-white placeholder-gray-500 outline-none text-sm font-medium resize-none transition-all leading-relaxed"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 2: ROLES */}
          {step === 2 && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Roles Available</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Specify the characters and talents needed for your production.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      roles: [...form.roles, { name: '', ageRange: '', description: '', pay: 'Paid' }],
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#522C69]/30 hover:bg-[#522C69]/50 text-[#C48AE8] hover:text-white border border-[#522C69]/40 text-xs font-bold transition-all w-full sm:w-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Role</span>
                </button>
              </div>

              <div className="space-y-4">
                {form.roles.map((role: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-[#0c0c0e] border-0 rounded-xl p-4 sm:p-6 space-y-4 transition-all"
                  >
                    {/* Role Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#8644A2]/20 text-[#C48AE8] border border-[#8644A2]/30 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-white">
                          {role.name ? role.name : `Character #${idx + 1}`}
                        </h3>
                      </div>

                      {form.roles.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              roles: form.roles.filter((_: any, i: number) => i !== idx),
                            })
                          }
                          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-red-500/10 px-2.5 py-1 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          Character / Role Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={role.name}
                          onChange={(e) => {
                            const r = [...form.roles];
                            r[idx].name = e.target.value;
                            setForm({ ...form, roles: r });
                          }}
                          placeholder="e.g., Aarav (Lead)"
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-1 focus:ring-[#8644A2]/30 rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 outline-none text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
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
                          placeholder="e.g., 22 - 30 years"
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-1 focus:ring-[#8644A2]/30 rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 outline-none text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          Role Compensation
                        </label>
                        <select
                          value={role.pay || 'Paid'}
                          onChange={(e) => {
                            const r = [...form.roles];
                            r[idx].pay = e.target.value;
                            setForm({ ...form, roles: r });
                          }}
                          className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-1 focus:ring-[#8644A2]/30 rounded-lg px-3.5 py-2.5 text-white outline-none text-xs font-semibold cursor-pointer"
                        >
                          {PAY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#141414] text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Role Description */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Character Description & Bio
                      </label>
                      <textarea
                        value={role.description}
                        onChange={(e) => {
                          const r = [...form.roles];
                          r[idx].description = e.target.value;
                          setForm({ ...form, roles: r });
                        }}
                        placeholder="Describe character personality, visual appearance, dialogue requirements, or performance emotional tone..."
                        rows={2}
                        className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-1 focus:ring-[#8644A2]/30 rounded-lg px-3.5 py-2.5 text-white placeholder-gray-500 outline-none text-xs font-semibold resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Role Big Button */}
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    roles: [...form.roles, { name: '', ageRange: '', description: '', pay: 'Paid' }],
                  })
                }
                className="w-full py-3.5 sm:py-4 rounded-xl border-2 border-dashed border-white/10 hover:border-[#8644A2] bg-white/[0.02] hover:bg-[#8644A2]/5 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#C48AE8]" />
                <span>Add Another Character / Role</span>
              </button>
            </div>
          )}

          {/* STEP 3: REQUIREMENTS */}
          {step === 3 && (
            <div className="space-y-6 sm:space-y-8 text-left">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Audition Requirements</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select mandatory prerequisites and add any custom casting instructions.
                </p>
              </div>

              {/* Requirements Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                {[
                  {
                    id: 'headshot',
                    icon: Camera,
                    title: 'Headshot Required',
                    desc: 'Candidates must submit high-resolution recent headshot & full portrait.',
                  },
                  {
                    id: 'wardrobe',
                    icon: Shirt,
                    title: 'Specific Wardrobe',
                    desc: 'Talent will need to prepare specific costume or character styling.',
                  },
                  {
                    id: 'travel',
                    icon: Plane,
                    title: 'Travel Involved',
                    desc: 'Shooting involves out-of-valley locations or external travel schedule.',
                  },
                ].map((req) => {
                  const isChecked = (form.requirements as any)[req.id];
                  const Icon = req.icon;
                  return (
                    <label
                      key={req.id}
                      className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-xl cursor-pointer transition-all duration-200 ${
                        isChecked
                          ? 'bg-[#522C69]/20 border border-[#8644A2] shadow-md shadow-[#522C69]/10'
                          : 'bg-[#0c0c0e] border-0 hover:bg-[#141414]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              isChecked
                                ? 'bg-[#8644A2] text-white'
                                : 'bg-white/5 text-gray-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                requirements: { ...form.requirements, [req.id]: e.target.checked },
                              })
                            }
                            className="w-5 h-5 rounded-md accent-[#8644A2] cursor-pointer"
                          />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{req.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{req.desc}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-semibold">
                        <span className={isChecked ? 'text-[#C48AE8]' : 'text-gray-500'}>
                          {isChecked ? 'Requirement Enabled' : 'Click to require'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Special Instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Additional Special Instructions (One per line)
                  </label>
                  <span className="text-[10px] text-gray-500">Optional</span>
                </div>
                <textarea
                  value={form.otherRequirements}
                  onChange={(e) => setForm({ ...form, otherRequirements: e.target.value })}
                  placeholder="e.g.&#10;Must speak fluent Newari or Tamang&#10;Must hold a valid 2-wheeler driving license&#10;Prior theater or stunt choreography experience preferred"
                  rows={5}
                  className="w-full bg-[#141414] border border-white/10 focus:border-[#8644A2] focus:ring-2 focus:ring-[#8644A2]/20 rounded-lg p-3.5 sm:p-4 text-white placeholder-gray-500 outline-none text-sm font-medium resize-none transition-all leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & SUBMIT */}
          {step === 4 && (
            <div className="space-y-6 text-left">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  {isEditMode ? 'Review & Save Changes' : 'Casting Notice Preview'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Confirm the details below. This is how talent and agents will see your casting notice on NepalCasts.
                </p>
              </div>

              {/* 2-Column Desktop Preview Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                {/* Left: 9:16 Live Poster Preview */}
                <div className="lg:col-span-4 xl:col-span-4 mx-auto w-full max-w-[210px] sm:max-w-[260px] lg:max-w-none">
                  <div className="aspect-[9/16] rounded-xl overflow-hidden border-0 bg-black relative shadow-xl">
                    {thumbnailPreview || form.thumbnail ? (
                      <img
                        src={thumbnailPreview || form.thumbnail}
                        alt="Casting Poster"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#1c1424] to-[#0d0d12]">
                        <Clapperboard className="w-12 h-12 text-[#8644A2] mb-3 opacity-60" />
                        <p className="text-sm font-bold text-white">{form.title || 'Untitled Project'}</p>
                        <p className="text-xs text-gray-400 mt-1">{form.category}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4 pointer-events-none">
                      <span className="inline-block self-start px-2.5 py-1 rounded-md bg-[#522C69] text-white text-[10px] font-black uppercase tracking-wider mb-2">
                        {form.category}
                      </span>
                      <h4 className="text-base font-black text-white leading-tight drop-shadow-md">
                        {form.title || 'Untitled Project'}
                      </h4>
                      <p className="text-xs text-gray-300 mt-1 flex items-center gap-1.5 drop-shadow">
                        <MapPin className="w-3 h-3 text-[#C48AE8]" />
                        {form.location || 'Nepal'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Detailed Casting Sheet */}
                <div className="lg:col-span-8 xl:col-span-8 space-y-4 sm:space-y-5">
                  {/* Title & Category Bar */}
                  <div className="bg-[#0c0c0e] border-0 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C48AE8]">
                          {form.category}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                          {form.title}
                        </h3>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active Audition
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                      <div className="bg-[#141414] p-3 rounded-lg border-0">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Location</p>
                        <p className="text-white font-bold mt-0.5 truncate">{form.location}</p>
                      </div>
                      <div className="bg-[#141414] p-3 rounded-lg border-0">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Compensation</p>
                        <p className="text-white font-bold mt-0.5 truncate">{form.budget}</p>
                      </div>
                      <div className="bg-[#141414] p-3 rounded-lg border-0">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Deadline</p>
                        <p className="text-white font-bold mt-0.5 truncate">{form.deadline}</p>
                      </div>
                      <div className="bg-[#141414] p-3 rounded-lg border-0">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Roles</p>
                        <p className="text-white font-bold mt-0.5 truncate">{form.roles.length} Available</p>
                      </div>
                    </div>

                    {/* Synopsis */}
                    {form.description && (
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[11px] uppercase font-bold text-gray-400 mb-1">Synopsis</p>
                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                          {form.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Roles Breakdown */}
                  <div className="bg-[#0c0c0e] border-0 rounded-xl p-4 sm:p-6 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Roles & Characters ({form.roles.length})
                    </p>
                    <div className="space-y-2.5">
                      {form.roles.map((r: any, idx: number) => (
                        <div key={idx} className="bg-[#141414] border-0 rounded-lg p-3 sm:p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">
                              {r.name || `Role #${idx + 1}`}
                            </span>
                            <div className="flex items-center gap-2">
                              {r.ageRange && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-gray-400">
                                  {r.ageRange}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#522C69]/30 text-[#C48AE8] border border-[#522C69]/40">
                                {r.pay || 'Paid'}
                              </span>
                            </div>
                          </div>
                          {r.description && (
                            <p className="text-[11px] text-gray-400 leading-relaxed">{r.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submission Info */}
                  <div className="bg-[#0c0c0e] border-0 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-500">Submissions Sent To</p>
                        <p className="text-white font-semibold">{form.contactInfo}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Bottom Navigation Buttons Footer */}
          <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-white/10 flex items-center justify-between gap-3 sm:gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s: number) => s - 1)}
                className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg border-0 bg-white/5 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer text-center"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3 flex-1 sm:flex-initial justify-end">
              <span className="hidden sm:inline text-xs font-semibold text-gray-500">
                Step {step} of 4
              </span>

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 sm:flex-initial bg-gradient-to-r from-[#522C69] via-[#6e378d] to-[#8644A2] hover:from-[#663782] hover:to-[#9B4FB9] text-white rounded-lg text-xs font-extrabold uppercase tracking-wider px-6 sm:px-7 py-2.5 sm:py-3 cursor-pointer shadow-lg shadow-[#522C69]/25 active:scale-95 border-0 transition-all flex items-center justify-center gap-2"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handlePublish}
                  loading={isLoading}
                  disabled={isLoading}
                  className="flex-1 sm:flex-initial bg-gradient-to-r from-[#522C69] via-[#6e378d] to-[#8644A2] hover:from-[#663782] hover:to-[#9B4FB9] text-white font-black text-xs uppercase tracking-wider px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg shadow-xl shadow-[#522C69]/30 border-0 active:scale-95 cursor-pointer transition-all justify-center"
                >
                  {isEditMode
                    ? isLoading
                      ? 'Saving Changes...'
                      : 'Save Changes'
                    : isLoading
                    ? 'Publishing Casting Call...'
                    : 'Publish Casting Call'}
                </Button>
              )}
            </div>
          </div>

        </GlassCard>
      </div>
    </div>
  );
}
