import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Sparkles, 
  UserCheck, 
  Video, 
  MessageSquare, 
  Check, 
  Film, 
  Heart, 
  Camera, 
  Loader2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { uploadProfileMedia } from '../services/profile';
import { CATEGORIES, getCategoryConfig } from '../constants/categories';

interface OnboardingProps {
  user: any;
  profile: any;
  onNavigate: (page: string, param?: any) => void;
}

/* ─── Simple High-Performance Confetti Effect ─── */
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = ['#00BFFF', '#FACC15', '#EC4899', '#10B981', '#8B5CF6'];
    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      r: Math.random() * 4 + 3,
      d: Math.random() * height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.05 + 0.02,
      tiltAngle: 0,
    }));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2.5;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 12;

        if (p.y > height) {
          p.x = Math.random() * width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50 w-full h-full" />;
}

export default function Onboarding({ user, profile, onNavigate }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<'Talent' | 'Casting' | 'Fan' | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  useEffect(() => {
    if (profile) {
      if (profile.role) {
        const matchingCategory = CATEGORIES.find(
          (cat) => getCategoryConfig(cat).label.toLowerCase() === profile.role.toLowerCase()
        );
        if (matchingCategory) {
          setSelectedRole('Talent');
          setSelectedCategories([matchingCategory]);
        } else if (profile.role === 'Casting Director') {
          setSelectedRole('Casting');
        } else {
          setSelectedRole('Fan');
        }
      }
      if (profile.bio) setBio(profile.bio);
      if (profile.image) setPhotoUrl(profile.image);
    }
  }, [profile]);

  const handleNext = () => {
    if (step === 2 && selectedRole !== 'Talent') {
      
      setStep(4);
    } else {
      setStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    if (step === 4 && selectedRole !== 'Talent') {
      
      setStep(2);
    } else {
      setStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleSaveAndComplete = async (targetPage?: 'home' | 'settings') => {
    if (!user?.uid) return;

    try {
      let finalRole = 'Fan/Viewer';
      if (selectedRole === 'Casting') finalRole = 'Casting Director';
      else if (selectedRole === 'Talent') {
        const catId = selectedCategories[0] || 'actor';
        finalRole = getCategoryConfig(catId).label || 'Actor';
      }

      await updateDoc(doc(db, 'profiles', user.uid), {
        onboarded: true,
        role: finalRole,
        bio: bio.trim(),
        image: photoUrl || profile?.image || null,
        categories: selectedRole === 'Talent' ? selectedCategories : [],
        updatedAt: new Date()
      });

      if (targetPage === 'settings') {
        onNavigate('settings', 'about');
      } else {
        onNavigate('home');
      }
    } catch (err) {
      console.error('Error saving onboarding data:', err);
    }
  };

  const handleSkipAll = async () => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        onboarded: true,
        updatedAt: new Date()
      });
      onNavigate('home');
    } catch (err) {
      console.error('Error skipping onboarding:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Photo exceeds the 5MB limit.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const downloadUrl = await uploadProfileMedia(user.uid, file, (percent) => {
        setProgress(Math.round(percent));
      });
      if (downloadUrl) {
        setPhotoUrl(downloadUrl);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert('Photo upload failed, please try again.');
    } finally {
      setUploading(false);
    }
  };

  const toggleCategory = (catName: string) => {
    if (selectedCategories.includes(catName)) {
      setSelectedCategories(prev => prev.filter(c => c !== catName));
    } else {
      setSelectedCategories(prev => [...prev, catName]);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#07070A] z-[9999] flex flex-col justify-between p-6 sm:p-10 select-none overflow-y-auto">
      {/* Background radial glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-nc-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#FACC15]/3 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto z-10 shrink-0">
        {/* Step Indicator */}
        <div className="flex flex-col gap-1 flex-1 max-w-[200px] sm:max-w-xs">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-nc-muted">
            Step {step} of 6
          </span>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00BFFF] transition-all duration-500 rounded-full"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Skip All */}
        {step < 6 && (
          <button 
            onClick={handleSkipAll}
            className="text-nc-muted hover:text-white text-xs sm:text-sm font-bold transition-colors uppercase tracking-wider"
          >
            Skip All
          </button>
        )}
      </div>

      {/* ── Main Step Content ── */}
      <div className="flex-1 flex items-center justify-center py-8 z-10 w-full max-w-2xl mx-auto">
        <div className="w-full text-center space-y-6 sm:space-y-8">
          
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center p-3.5 bg-nc-accent/10 rounded-3xl border border-nc-accent/15 mb-2">
                  <Sparkles className="w-8 h-8 text-[#00BFFF]" />
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Welcome to NC Network,<br className="hidden sm:inline" /> {profile?.name || user?.displayName || 'Creative'}!
                </h1>
                <p className="text-nc-muted text-sm sm:text-base max-w-md mx-auto">
                  Let&apos;s set up your profile to connect with leading production teams and discover cast opportunities.
                </p>
              </div>

              {/* Value Propositions */}
              <div className="grid grid-cols-1 gap-4 max-w-lg mx-auto text-left pt-2">
                {[
                  {
                    icon: <UserCheck className="w-5 h-5 text-[#00BFFF]" />,
                    title: "Get Discovered",
                    desc: "Showcase your portfolio and highlight your skills directly to casting scouts."
                  },
                  {
                    icon: <MessageSquare className="w-5 h-5 text-[#00BFFF]" />,
                    title: "Direct Messaging",
                    desc: "Communicate directly with directors and production companies."
                  },
                  {
                    icon: <Video className="w-5 h-5 text-[#00BFFF]" />,
                    title: "Apply to Auditions",
                    desc: "Apply instantly to certified movie, commercial, and theater casting calls."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 items-start">
                    <div className="p-2 rounded-xl bg-white/5 shrink-0">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white leading-none">{item.title}</h3>
                      <p className="text-xs text-nc-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE ROLE */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Choose Your Role</h2>
                <p className="text-nc-muted text-xs sm:text-sm max-w-md mx-auto">
                  Select how you plan to use NC Network. You can change this later in settings.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 max-w-md mx-auto pt-2">
                {[
                  {
                    id: 'Talent',
                    icon: <Sparkles className="w-6 h-6 text-[#00BFFF]" />,
                    title: "I'm a Talent",
                    desc: "Actor, model, dancer, writer, director, or crew looking for castings."
                  },
                  {
                    id: 'Casting',
                    icon: <Film className="w-6 h-6 text-[#00BFFF]" />,
                    title: "I'm a Casting Director",
                    desc: "Production house, agent, or crew recruiter looking to hire talent."
                  },
                  {
                    id: 'Fan',
                    icon: <Heart className="w-6 h-6 text-[#00BFFF]" />,
                    title: "I'm a Fan / Viewer",
                    desc: "Explore upcoming castings, follow creators, and support Nepalese cinema."
                  }
                ].map((role) => {
                  const isSel = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id as any)}
                      className={`w-full p-5 flex gap-4 rounded-3xl items-start text-left transition-all border outline-none
                        ${isSel 
                          ? 'bg-nc-accent/[0.06] border-[#00BFFF] shadow-[0_0_20px_rgba(0,191,255,0.06)]' 
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                    >
                      <div className={`p-3 rounded-2xl shrink-0 ${isSel ? 'bg-[#00BFFF]/20' : 'bg-white/5'}`}>
                        {role.icon}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-black text-white leading-none">{role.title}</h3>
                        <p className="text-xs text-nc-muted leading-relaxed">{role.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: PICK CATEGORY (if Talent) */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Pick Your Categories</h2>
                <p className="text-nc-muted text-xs sm:text-sm max-w-md mx-auto">
                  Select one or more categories that best represent your skills.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
                {CATEGORIES.map((catName) => {
                  const cfg = getCategoryConfig(catName);
                  const CatIcon = cfg.icon;
                  const isSel = selectedCategories.includes(catName);
                  
                  return (
                    <button
                      key={catName}
                      onClick={() => toggleCategory(catName)}
                      className={`p-4 flex flex-col items-center gap-3 rounded-2xl transition-all border outline-none
                        ${isSel
                          ? 'bg-[#00BFFF]/10 border-[#00BFFF] text-[#00BFFF]'
                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'
                        }`}
                    >
                      <div 
                        className={`w-12 h-12 flex items-center justify-center rounded-full transition-all`}
                        style={{
                          backgroundColor: isSel ? `${cfg.color}33` : 'rgba(255, 255, 255, 0.05)',
                          color: isSel ? cfg.color : '#888'
                        }}
                      >
                        <CatIcon size={24} />
                      </div>
                      <span className="text-xs font-bold truncate w-full uppercase tracking-wider">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: UPLOAD PHOTO */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Add Profile Photo</h2>
                <p className="text-nc-muted text-xs sm:text-sm max-w-md mx-auto">
                  A professional profile photo increases your profile visibility by up to 8x.
                </p>
              </div>

              {/* Circle Uploader */}
              <div className="flex flex-col items-center justify-center pt-4">
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`w-36 h-36 rounded-full border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-nc-accent relative bg-white/[0.01] overflow-hidden group`}
                >
                  {photoUrl || profile?.image ? (
                    <img 
                      src={photoUrl || profile?.image} 
                      alt="Preview" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="flex flex-col items-center text-center px-4 space-y-1.5 text-nc-muted group-hover:text-white transition-colors">
                      <Camera className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Add Photo</span>
                    </div>
                  )}

                  {/* Upload overlay */}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 z-20">
                      <Loader2 className="w-6 h-6 animate-spin text-nc-accent" />
                      <span className="text-[10px] text-white font-bold">{progress}%</span>
                    </div>
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden" 
                />

                <p className="text-xs text-nc-muted mt-5">Only JPG, PNG, and WEBP formats up to 5MB are supported.</p>
              </div>
            </div>
          )}

          {/* STEP 5: QUICK BIO */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in w-full">
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Write a Quick Bio</h2>
                <p className="text-nc-muted text-xs sm:text-sm max-w-md mx-auto">
                  Summarize your professional experience, acting training, or production goals.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-2 pt-2 text-right">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  placeholder="e.g. Actors based in Kathmandu, with 3+ years of theater experience and a passion for indie films..."
                  rows={4}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-5 text-sm text-white placeholder-nc-muted focus:outline-none focus:border-[#00BFFF]/50 focus:bg-white/[0.04] transition-all resize-none text-left"
                />
                <span className="text-[10px] font-bold text-nc-muted tracking-wider uppercase">
                  {bio.length} / 300 characters
                </span>
              </div>
            </div>
          )}

          {/* STEP 6: DONE */}
          {step === 6 && (
            <div className="space-y-6 animate-fade-in w-full relative">
              <ConfettiCanvas />

              <div className="space-y-3 relative z-10">
                <div className="inline-flex items-center justify-center p-3.5 bg-green-500/10 rounded-3xl border border-green-500/15 mb-2">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Your Profile is Ready!</h2>
                <p className="text-nc-muted text-xs sm:text-sm max-w-sm mx-auto">
                  Congratulations! Your details have been saved. You&apos;re ready to explore castings and build your network.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer controls ── */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between z-10 shrink-0">
        {/* Back Button */}
        {step > 1 && step < 6 ? (
          <button 
            onClick={handleBack}
            className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 border border-white/5"
          >
            Back
          </button>
        ) : (
          <div className="w-10" />
        )}

        {/* Next / Complete Controls */}
        {step === 6 ? (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center justify-center sm:justify-end ml-auto">
            <button
              onClick={() => handleSaveAndComplete('home')}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#00BFFF] hover:bg-[#0099e6] text-[#0A0A0A] text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-[#00BFFF]/20"
            >
              Explore Talents <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
            <button
              onClick={() => handleSaveAndComplete('settings')}
              className="w-full sm:w-auto px-7 py-3.5 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 border border-white/5"
            >
              Complete Profile
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Step Skip options */}
            {(step === 4 || step === 5) && (
              <button 
                onClick={handleNext}
                className="text-nc-muted hover:text-white text-xs sm:text-sm font-bold transition-colors uppercase tracking-wider"
              >
                Skip
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={step === 2 && !selectedRole}
              className={`px-7 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md
                ${step === 2 && !selectedRole
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5 shadow-none'
                  : 'bg-[#00BFFF] hover:bg-[#0099e6] text-[#0A0A0A] shadow-[#00BFFF]/10'
                }`}
            >
              Next <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
