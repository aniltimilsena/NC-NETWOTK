import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProfile, updateProfileData, subscribeToProfile, uploadProfileMedia } from '../services/profile';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { FileUploadCard } from "@/components/ui/file-upload-card"
import { InlineAlert } from '../components/ui/AlertBanner';
import { 
  ToggleIcon, 
  LockUnlockIcon, 
  NotificationIcon, 
  EyeToggleIcon,
  DownloadDoneIcon,
  SuccessIcon
} from "@/components/ui/animated-state-icons"
import { Plus, Check } from "lucide-react"
import Avatar from '../components/ui/Avatar';


// Cinematic Toggle (now unified with the premium neon toggle style)
const GoldenToggle = ({ enabled, onChange }) => (
  <NeonToggle enabled={enabled} onChange={onChange} />
);

// Clean Edit Profile Input
const EditInput = ({ label, type = 'text', placeholder, value, onChange, icon }) => (
  <div className="mb-4">
    {label && <label className="block text-[#666] text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555]">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-[#111] border border-[#1E1E1E] hover:border-[#2A2A2A] focus:border-nc-accent/50 text-white transition-all py-3.5 ${icon ? 'pl-10' : 'pl-4'} pr-4 rounded-2xl outline-none text-sm placeholder-[#444] focus:bg-[#0D0D0D]`}
      />
    </div>
  </div>
);

// Clean Edit Profile Textarea
const EditTextarea = ({ label, placeholder, value, onChange, rows = 4 }) => (
  <div className="mb-4">
    {label && <label className="block text-[#666] text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">{label}</label>}
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full bg-[#111] border border-[#1E1E1E] hover:border-[#2A2A2A] focus:border-nc-accent/50 text-white transition-all py-3.5 px-4 rounded-2xl outline-none text-sm placeholder-[#444] focus:bg-[#0D0D0D] resize-none leading-relaxed"
    />
  </div>
);

// Clean Select
const EditSelect = ({ label, options, value, onChange, placeholder }) => (
  <div className="mb-4">
    {label && <label className="block text-[#666] text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">{label}</label>}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-[#111] border border-[#1E1E1E] hover:border-[#2A2A2A] focus:border-nc-accent/50 text-white transition-all py-3.5 pl-4 pr-10 rounded-2xl outline-none text-sm appearance-none cursor-pointer focus:bg-[#0D0D0D]"
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-3 h-3 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

// Legacy compat wrappers
const SettingInput = ({ label, type = 'text', placeholder, value, onChange }) => (
  <EditInput label={label} type={type} placeholder={placeholder} value={value} onChange={onChange} />
);
const SettingSelect = ({ label, options, value, onChange, placeholder }) => (
  <EditSelect label={label} options={options} value={value} onChange={onChange} placeholder={placeholder} />
);

// Chip Tag for skills/expertise
const ChipTag = ({ label, onRemove }) => (
  <motion.div
    initial={{ scale: 0.85, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.85, opacity: 0 }}
    className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white/80 px-3.5 py-1.5 rounded-xl text-xs font-semibold group hover:border-white/20 transition-all"
  >
    {label}
    <button
      onClick={onRemove}
      className="text-[#555] hover:text-white transition-colors ml-1"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </motion.div>
);

// Experience Card for Edit mode
const ExperienceEditCard = ({ exp, idx, onChange, onRemove }) => (
  <motion.div
    initial={{ y: 12, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-2xl p-5 space-y-3 group relative"
  >
    <div className="flex items-center gap-3 mb-1">
      <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#252525] flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-nc-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <span className="text-[10px] text-[#555] font-black uppercase tracking-widest">Production Module</span>
      <button
        onClick={onRemove}
        className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-[#333] hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <EditInput
        placeholder="Role / Character"
        value={exp.role}
        onChange={(e) => onChange(idx, 'role', e.target.value)}
      />
      <EditInput
        placeholder="Year (e.g. 2024)"
        value={exp.year}
        onChange={(e) => onChange(idx, 'year', e.target.value)}
      />
    </div>
    <EditInput
      placeholder="Production / Company"
      value={exp.production}
      onChange={(e) => onChange(idx, 'production', e.target.value)}
    />
    <EditTextarea
      placeholder="Describe your role and contribution..."
      value={exp.description}
      onChange={(e) => onChange(idx, 'description', e.target.value)}
      rows={2}
    />
  </motion.div>
);

// Checkbox
const Checkbox = ({ label, defaultChecked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer group mb-3">
    <div className="relative flex items-center justify-center w-5 h-5 rounded border border-[#333] group-hover:border-[#555] bg-[#111] transition-colors">
      <input type="checkbox" className="peer sr-only" defaultChecked={defaultChecked} onChange={onChange} />
      <div className="absolute inset-0 bg-[#FACC15] scale-0 peer-checked:scale-100 transition-transform rounded flex items-center justify-center">
        <SuccessIcon active={true} size={16} color="black" />
      </div>
    </div>
    <span className="text-sm text-[#CCC] group-hover:text-white transition-colors">{label}</span>
  </label>
);

// Premium Neon Toggle Switch (sky-blue accent)
const NeonToggle = ({ enabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={() => onChange(!enabled)}
    className={`
      relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
      border-2 transition-all duration-300 ease-in-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111]
      bg-[#0B0B0C]
      ${enabled
        ? 'border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5),inset_0_0_4px_rgba(56,189,248,0.3)]'
        : 'border-[#333] hover:border-[#444]'
      }
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-[18px] w-[18px] rounded-full
        shadow-lg transition-all duration-300 ease-in-out transform
        ${enabled
          ? 'translate-x-[18px] bg-sky-400'
          : 'translate-x-[0px] bg-[#555]'
        }
      `}
    />
  </button>
);

// Notification Row with independent push/email toggle state
const NotificationRow = ({ row, markDirty }) => {
  const [push, setPush] = useState(row.pushDefault ?? false);
  const [email, setEmail] = useState(row.emailDefault ?? false);

  return (
    <div className="grid grid-cols-12 p-4 border-b border-[#222] hover:bg-[#151515] transition-colors items-center">
      <div className="col-span-8 pr-4">
        <div className="text-sm font-bold text-white mb-1">{row.title}</div>
        <div className="text-xs text-[#777] leading-snug">{row.desc}</div>
      </div>
      <div className="col-span-2 flex justify-center">
        <NeonToggle
          enabled={push}
          onChange={(v) => { setPush(v); markDirty(); }}
        />
      </div>
      <div className="col-span-2 flex justify-center">
        <NeonToggle
          enabled={email}
          onChange={(v) => { setEmail(v); markDirty(); }}
        />
      </div>
    </div>
  );
};

export default function Settings({ onNavigate, user, initialTab, showToast, isAdmin }) {
  const isUserAdmin = isAdmin || user?.email === 'aniltimilsena53@gmail.com';

  const [activeTab, setActiveTab] = useState(() => {
    if (['about', 'skills', 'experience', 'media', 'reviews'].includes(initialTab)) {
      return 'profile';
    }
    if (initialTab === 'premium' && isUserAdmin) {
      return 'account';
    }
    return initialTab || 'account';
  });

  const [profileSubTab, setProfileSubTab] = useState(() => {
    if (['about', 'skills', 'experience'].includes(initialTab)) {
      return initialTab;
    }
    if (['media', 'reviews'].includes(initialTab)) {
      return 'about';
    }
    return 'about';
  });

  // Sync state if initialTab prop changes (e.g. via navigation)
  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'premium' && isUserAdmin) {
        setActiveTab('account');
        setIsMobileDetail(true);
        return;
      }
      if (['about', 'skills', 'experience', 'media', 'reviews'].includes(initialTab)) {
        setActiveTab('profile');
        if (['about', 'skills', 'experience'].includes(initialTab)) {
          setProfileSubTab(initialTab);
        } else if (['media', 'reviews'].includes(initialTab)) {
          setProfileSubTab('about');
        }
      } else {
        setActiveTab(initialTab);
      }
      setIsMobileDetail(true);
    }
  }, [initialTab, isUserAdmin]);
  
  // Parse name into first and last if possible
  const displayName = user?.displayName || "";
  const nameParts = displayName ? displayName.split(" ") : [];
  const defaultFirstName = nameParts[0] || "";
  const defaultLastName = nameParts.slice(1).join(" ") || "";
  const email = user?.email || "";
  const defaultUsername = user?.displayName 
    ? user.displayName.toString().toLowerCase().replace(/\s+/g, '') 
    : (user?.email ? user.email.split('@')[0] : "");

  const [isMobileDetail, setIsMobileDetail] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);


  // Identity States
  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [uName, setUName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  
  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);

  // Profile States
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [openToWork, setOpenToWork] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [role, setRole] = useState("");
  const [showContactInfo, setShowContactInfo] = useState(false);
  


  const markDirty = () => setHasChanges(true);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    
    // Enforce limits: 5MB for Free, 10MB for Pro
    const sizeLimit = (isPremium || isUserAdmin) ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > sizeLimit) {
      showToast(`Profile picture exceeds the limit of ${(isPremium || isUserAdmin) ? '10MB' : '5MB'} for your current tier.`, 'error');
      return;
    }
    
    setIsUploadingAvatar(true);
    setAvatarProgress(0);
    
    try {
      const url = await uploadProfileMedia(user.uid, file, (progress) => {
        setAvatarProgress(Math.round(progress));
      });
      
      if (url) {
        setAvatarUrl(url); // Update local state immediately
        // Update Firestore doc with both image (standard for this app) and photoURL (Firebase standard)
        const { success, error } = await updateProfileData(user.uid, { 
          image: url,
          photoURL: url 
        });

        if (success) {
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: url });
          }
          showToast("Profile picture updated successfully!", "success");
        } else {
          console.error("Firestore update failed:", error);
          showToast("Photo uploaded but failed to update profile record.", "error");
        }
      } else {
        showToast("Failed to upload image to Cloudinary.", "error");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      showToast("Error updating profile picture.", "error");
    } finally {
      setIsUploadingAvatar(false);
      setAvatarProgress(0);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user?.uid) return;
    
    try {
      await updateProfileData(user.uid, { image: null });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: "" });
      }
      showToast("Profile picture removed.", "success");
    } catch (err) {
      console.error("Avatar delete error:", err);
      showToast("Error removing profile picture.", "error");
    }
  };

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToProfile(user.uid, (data) => {
        if (data) {
          setIsPremium(data.premium || isUserAdmin || false);
          // Only update form fields if not currently saving to avoid race conditions
          if (!isSavingRef.current) {
            setFName(data.firstName || defaultFirstName);
            setLName(data.lastName || defaultLastName);
            setUName(data.username || defaultUsername);
            setPhone(data.phone || "");
            setGender(data.gender || "");
            setBio(data.bio || "");
            setLocation(data.location || "");
            setSelectedLanguages(data.languages || []);
            setSelectedSkills(data.skills || []);
            setExperiences(data.experience || []);
            setOpenToWork(data.openToWork || false);
            setHeight(data.height || "");
            setWeight(data.weight || "");
            setEyeColor(data.eyeColor || "");
            setHairColor(data.hairColor || "");
            setRole(data.role || "");
            setShowContactInfo(data.showContactInfo || false);
            setAvatarUrl(data.image || data.photoURL || "");
            setTwoFactor(data.twoFactorEnabled || false);
          }
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) {
      showToast('Error: User session expired. Please sign in again.', 'error');
      return;
    }
    
    setIsSaving(true);
    isSavingRef.current = true;
    
    const profileData = {
      name: `${fName} ${lName}`.trim() || uName,
      firstName: fName,
      lastName: lName,
      username: uName,
      phone,
      gender,
      bio,
      location,
      languages: selectedLanguages,
      skills: selectedSkills,
      experience: experiences,
      openToWork,
      height,
      weight,
      eyeColor,
      hairColor,
      role,
      showContactInfo,
      email: showContactInfo ? (user?.email || "") : "",
      image: avatarUrl || null,
      photoURL: avatarUrl || null,
      twoFactorEnabled: twoFactor
    };

    try {
      const { error } = await updateProfileData(user.uid, profileData);

      if (!error) {
        setHasChanges(false);
        showToast('Profile settings saved successfully!', 'success');
      } else {
        console.error('[Settings] save failed:', error);
        showToast(`Failed to save: ${error}`, 'error');
      }
    } catch (err) {
      console.error('[Settings] unexpected error during save:', err);
      showToast('An unexpected error occurred while saving.', 'error');
    } finally {
      // Small delay before allowing snapshot updates to avoid overwriting with stale data
      setTimeout(() => {
        isSavingRef.current = false;
        setIsSaving(false);
      }, 500);
    }
  };

  // Example Settings State
  const [searchVisibility, setSearchVisibility] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    
    const sessionsColRef = collection(db, 'profiles', user.uid, 'sessions');
    const q = query(sessionsColRef, orderBy('lastActive', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSessions(list);
    }, (error) => {
      console.error("Error subscribing to active sessions:", error);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const handleRevokeSession = async (sessionId) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'profiles', user.uid, 'sessions', sessionId));
      showToast('Session revoked successfully.', 'success');
    } catch (error) {
      console.error("Error revoking session:", error);
      showToast('Failed to revoke session.', 'error');
    }
  };

  const isMobileDevice = (os) => {
    const osLower = (os || '').toLowerCase();
    return osLower.includes('iphone') || osLower.includes('ipad') || osLower.includes('android');
  };

  const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Active just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Active just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Active ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Active ${days} days ago`;
  };

  const tabs = [
    { id: 'account', icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, label: 'Account' },
    { id: 'profile', icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>, label: 'Profile Details' },
    { id: 'privacy', icon: <EyeToggleIcon size={18} color="currentColor" />, label: 'Privacy & Visibility' },
    { id: 'notifications', icon: <NotificationIcon size={18} color="currentColor" />, label: 'Notifications' },
    ...(!isUserAdmin ? [{ id: 'premium', icon: <Plus size={18} color="currentColor" />, label: 'Subscription (PRO)' }] : []),
    { id: 'security', icon: <LockUnlockIcon size={18} color="currentColor" />, label: 'Security' },
    { id: 'data', icon: <SuccessIcon size={18} color="currentColor" />, label: 'Data & Control' },
  ];

  const handleTabClick = (id) => {
    setActiveTab(id);
    setIsMobileDetail(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [isTypingLanguage, setIsTypingLanguage] = useState(false);
  const [isTypingSkill, setIsTypingSkill] = useState(false);
  const [tempLanguage, setTempLanguage] = useState("");
  const [tempSkill, setTempSkill] = useState("");

  const handleAddLanguage = (val) => {
    if (val && !selectedLanguages.includes(val)) {
      setSelectedLanguages([...selectedLanguages, val]);
      markDirty();
    }
    setIsTypingLanguage(false);
    setTempLanguage("");
  };

  const handleAddSkill = (val) => {
    if (val && !selectedSkills.includes(val)) {
      setSelectedSkills([...selectedSkills, val]);
      markDirty();
    }
    setIsTypingSkill(false);
    setTempSkill("");
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="animate-fade-in text-left pb-10">
            {/* Profile Avatar Header */}
            <div className="flex flex-col items-center pt-4 pb-8 border-b border-[#111] mb-8">
              <div className="relative mb-4">
                <div className="relative">
                  <Avatar 
                    user={user} 
                    gender={gender} 
                    size="xl" 
                    name={displayName} 
                  />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center backdrop-blur-sm">
                      <div className="text-nc-accent text-xs font-bold">{avatarProgress}%</div>
                    </div>
                  )}
                </div>

                <button 
                  disabled={isUploadingAvatar}
                  onClick={() => document.getElementById('avatar-upload-input')?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-nc-accent rounded-full flex items-center justify-center shadow-lg border-2 border-[#0A0A0A] hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5 text-[#0A0A0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <input 
                  id="avatar-upload-input" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload} 
                />
                
                {(user?.photoURL || user?.image) && !isUploadingAvatar && (
                  <button 
                    onClick={handleDeleteAvatar}
                    className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0A0A0A] hover:scale-110 transition-transform"
                    title="Remove Profile Picture"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <h2 className="text-white font-black text-lg tracking-tight">{displayName || 'Your Name'}</h2>
              <p className="text-[#555] text-xs mt-0.5">Member since {new Date().getFullYear()}</p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EditInput
                  label="First Name"
                  value={fName}
                  placeholder="Alex"
                  onChange={(e) => { setFName(e.target.value); markDirty(); }}
                />
                <EditInput
                  label="Last Name"
                  value={lName}
                  placeholder="Sterling"
                  onChange={(e) => { setLName(e.target.value); markDirty(); }}
                />
              </div>

              <EditInput
                label="Username"
                value={uName}
                placeholder="@username"
                onChange={(e) => { setUName(e.target.value); markDirty(); }}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />

              <EditInput
                label="Email Address"
                type="email"
                value={email}
                placeholder="your@email.com"
                onChange={() => {}}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />

              <EditInput
                label="Phone Number"
                type="tel"
                value={phone}
                placeholder="+977 98XXXXXXXX"
                onChange={(e) => { setPhone(e.target.value); markDirty(); }}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="animate-fade-in text-left pb-10">
            {/* Sub-navigation */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-5">Profile Details</h2>
              <div className="flex gap-1.5 p-1.5 bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'about', label: 'About' },
                  { id: 'skills', label: 'Skills' },
                  { id: 'experience', label: 'History' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setProfileSubTab(sub.id)}
                    className={`flex-1 min-w-fit px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] transition-all rounded-xl relative ${
                      profileSubTab === sub.id
                        ? 'bg-white/8 text-white'
                        : 'text-[#444] hover:text-[#777]'
                    }`}
                  >
                    {sub.label}
                    {profileSubTab === sub.id && (
                      <motion.div
                        layoutId="profileSubTab"
                        className="absolute inset-0 bg-white/5 rounded-xl border border-white/8"
                        style={{ zIndex: -1 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* -- ABOUT -- */}
            {profileSubTab === 'about' && (
              <div className="space-y-4 animate-fade-in">
                {/* Open to Work banner */}
                <div className="flex items-center justify-between bg-nc-accent/5 border border-nc-accent/15 rounded-2xl px-5 py-4 mb-6">
                  <div>
                    <h4 className="text-nc-accent font-bold text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-nc-accent animate-pulse"></span>
                      Open to Audition
                    </h4>
                    <p className="text-[#666] text-xs mt-0.5">Signal to casting directors that you're seeking roles.</p>
                  </div>
                  <GoldenToggle enabled={openToWork} onChange={(v) => { setOpenToWork(v); markDirty(); }} />
                </div>

                <EditInput
                  label="Professional Title"
                  placeholder="e.g. Lead Actor | Combat Trained"
                  value={role}
                  onChange={(e) => { setRole(e.target.value); markDirty(); }}
                />

                <EditInput
                  label="Location"
                  placeholder="City, Country"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); markDirty(); }}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />

                <EditTextarea
                  label="About Me"
                  placeholder="Share your professional journey, training, and artistic vision..."
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); markDirty(); }}
                  rows={5}
                />

                <EditSelect
                  label="Gender"
                  options={['Male', 'Female', 'Non-Binary', 'Other']}
                  value={gender}
                  onChange={(e) => { setGender(e.target.value); markDirty(); }}
                  placeholder="Select gender..."
                />

                {/* Physical Stats */}
                <div className="pt-2">
                  <p className="text-[#555] text-[10px] font-black uppercase tracking-[0.2em] mb-3">Physical Attributes</p>
                  <div className="grid grid-cols-2 gap-3">
                    <EditInput
                      placeholder="Height (e.g. 5&apos;9&quot;)"
                      value={height}
                      onChange={(e) => { setHeight(e.target.value); markDirty(); }}
                    />
                    <EditInput
                      placeholder="Weight (e.g. 70kg)"
                      value={weight}
                      onChange={(e) => { setWeight(e.target.value); markDirty(); }}
                    />
                    <EditSelect
                      options={['Black', 'Brown', 'Blue', 'Green', 'Hazel', 'Other']}
                      value={eyeColor}
                      onChange={(e) => { setEyeColor(e.target.value); markDirty(); }}
                      placeholder="Eye Color"
                    />
                    <EditSelect
                      options={['Black', 'Brown', 'Blonde', 'Red', 'Grey', 'Bald']}
                      value={hairColor}
                      onChange={(e) => { setHairColor(e.target.value); markDirty(); }}
                      placeholder="Hair Color"
                    />
                  </div>
                </div>


              </div>
            )}

            {/* -- SKILLS -- */}
            {profileSubTab === 'skills' && (
              <div className="space-y-8 animate-fade-in">
                {/* Languages */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#666] text-[10px] font-black uppercase tracking-[0.2em]">Languages</p>
                  </div>
                  <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap gap-2 min-h-[36px]">
                      <AnimatePresence>
                        {selectedLanguages.map(lang => (
                          <ChipTag
                            key={lang}
                            label={lang}
                            onRemove={() => { setSelectedLanguages(selectedLanguages.filter(l => l !== lang)); markDirty(); }}
                          />
                        ))}
                      </AnimatePresence>
                      {selectedLanguages.length === 0 && <span className="text-[#333] text-xs italic">No languages added yet</span>}
                    </div>
                    <div className="border-t border-[#1A1A1A] pt-4">
                      {isTypingLanguage ? (
                        <div className="relative animate-in zoom-in-95 duration-200">
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="Type language and press Enter..."
                            value={tempLanguage}
                            onChange={e => setTempLanguage(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddLanguage(tempLanguage);
                              if (e.key === 'Escape') setIsTypingLanguage(false);
                            }}
                            className="w-full bg-[#111] border border-nc-accent rounded-xl px-4 py-3 text-white placeholder-[#444] outline-none text-sm pr-10"
                          />
                          <button onClick={() => setIsTypingLanguage(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <EditSelect
                          options={['Nepali', 'English', 'Hindi', 'Spanish', 'French', 'Chinese', 'Arabic', 'Japanese', 'Portuguese', 'Other'].filter(l => !selectedLanguages.includes(l))}
                          placeholder="Add a language..."
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'Other') {
                              setIsTypingLanguage(true);
                            } else if (val) {
                              handleAddLanguage(val);
                            }
                            e.target.value = '';
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills/Expertise */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#666] text-[10px] font-black uppercase tracking-[0.2em]">Expertise & Skills</p>
                    <span className="text-nc-accent text-[10px] font-bold">{selectedSkills.length} added</span>
                  </div>
                  <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap gap-2 min-h-[36px]">
                      <AnimatePresence>
                        {selectedSkills.map(skill => (
                          <ChipTag
                            key={skill}
                            label={skill}
                            onRemove={() => { setSelectedSkills(selectedSkills.filter(s => s !== skill)); markDirty(); }}
                          />
                        ))}
                      </AnimatePresence>
                      {selectedSkills.length === 0 && <span className="text-[#333] text-xs italic">No skills added yet</span>}
                    </div>
                    <div className="border-t border-[#1A1A1A] pt-4">
                      {isTypingSkill ? (
                        <div className="relative animate-in zoom-in-95 duration-200">
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="Type skill and press Enter..."
                            value={tempSkill}
                            onChange={e => setTempSkill(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddSkill(tempSkill);
                              if (e.key === 'Escape') setIsTypingSkill(false);
                            }}
                            className="w-full bg-[#111] border border-nc-accent rounded-xl px-4 py-3 text-white placeholder-[#444] outline-none text-sm pr-10"
                          />
                          <button onClick={() => setIsTypingSkill(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <EditSelect
                          options={['Method Acting', 'Stage Combat', 'Horse Riding', 'Public Speaking', 'Improvisation', 'Voice Over', 'Martial Arts', 'Dancing', 'Singing', 'Stunts', 'Other'].filter(s => !selectedSkills.includes(s))}
                          placeholder="Add a skill or talent..."
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'Other') {
                              setIsTypingSkill(true);
                            } else if (val) {
                              handleAddSkill(val);
                            }
                            e.target.value = '';
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -- EXPERIENCE -- */}
            {profileSubTab === 'experience' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-[#666] text-[10px] font-black uppercase tracking-[0.2em]">Experience</p>
                  <button
                    onClick={() => {
                      setExperiences([{ role: '', production: '', year: '', description: '' }, ...experiences]);
                      markDirty();
                    }}
                    className="flex items-center gap-1.5 text-nc-accent text-[11px] font-black uppercase tracking-[0.1em] hover:opacity-80 transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Experience
                  </button>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {experiences.map((exp, idx) => (
                      <ExperienceEditCard
                        key={idx}
                        exp={exp}
                        idx={idx}
                        onChange={(i, field, val) => {
                          const newExps = [...experiences];
                          newExps[i][field] = val;
                          setExperiences(newExps);
                          markDirty();
                        }}
                        onRemove={() => {
                          setExperiences(experiences.filter((_, i) => i !== idx));
                          markDirty();
                        }}
                      />
                    ))}
                  </AnimatePresence>
                  {experiences.length === 0 && (
                    <div className="text-center py-16 border border-dashed border-[#1A1A1A] rounded-3xl">
                      <div className="w-14 h-14 bg-[#111] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-[#222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-[#333] text-xs font-black uppercase tracking-widest">No experience records</p>
                      <p className="text-[#222] text-[11px] mt-1">Tap "Add Experience" to begin</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-8 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Privacy & Visibility</h2>
              <p className="text-[#888] text-sm">Control exactly who can view your profile and contact you.</p>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between py-4 border-b border-[#222] group hover:bg-white/5 px-2 rounded-lg transition-colors">
                <div>
                  <h4 className="text-sm font-medium text-white">Public Search Engine Indexing</h4>
                  <p className="text-xs text-[#888] mt-1">Allow your profile to be found on Google and Bing.</p>
                </div>
                <GoldenToggle enabled={searchVisibility} onChange={(v) => { setSearchVisibility(v); markDirty(); }} />
              </div>
              <div className="flex items-center justify-between py-4 border-b border-[#222] group hover:bg-white/5 px-2 rounded-lg transition-colors">
                <div>
                  <h4 className="text-sm font-medium text-white">Show Contact Info to Network</h4>
                  <p className="text-xs text-[#888] mt-1">Make your email/phone visible to other verified members.</p>
                </div>
                <GoldenToggle enabled={showContactInfo} onChange={(v) => { setShowContactInfo(v); markDirty(); }} />
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-white mb-4">Messaging Permissions</h3>
              <p className="text-xs text-[#888] mb-4">Who is allowed to initiate a direct message with you?</p>
              <div className="bg-[#111] rounded-xl border border-[#222] p-2 space-y-1">
                {[
                  { id: 'm1', label: 'Everyone (Including Public)' },
                  { id: 'm2', label: 'Verified Network Members Only', defaultChecked: true },
                  { id: 'm3', label: 'Only Casting Directors & Agencies' },
                  { id: 'm4', label: 'No One' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 p-3 hover:bg-[#1A1A1A] rounded-lg cursor-pointer transition-colors group">
                     <input type="radio" name="messaging" defaultChecked={opt.defaultChecked} onChange={markDirty} className="w-4 h-4 accent-[#FACC15] cursor-pointer" />
                     <span className="text-sm text-[#CCC] group-hover:text-white transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-8 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
              <p className="text-[#888] text-sm">Tune your alert routing to never miss an opportunity.</p>
            </div>

            <section className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 bg-[#0A0A0A] p-4 border-b border-[#222]">
                <div className="col-span-8 text-xs font-bold text-[#666] uppercase tracking-widest">Alert Type</div>
                <div className="col-span-2 text-center text-xs font-bold text-[#666] uppercase tracking-widest">Push</div>
                <div className="col-span-2 text-center text-xs font-bold text-[#666] uppercase tracking-widest">Email</div>
              </div>
              
              {[
                { title: 'New Casting Match', desc: 'When an audition matches your profile UI skills.', pushDefault: true, emailDefault: true },
                { title: 'Direct Messages', desc: 'When you receive a new chat message.', pushDefault: true, emailDefault: true },
                { title: 'Profile Views', desc: 'Weekly digest of who viewed your profile.', pushDefault: false, emailDefault: false },
                { title: 'Network Updates', desc: 'Major platform announcements.', pushDefault: false, emailDefault: true }
              ].map((row, idx) => (
                <NotificationRow key={idx} row={row} markDirty={markDirty} />
              ))}
            </section>
          </div>
        );

      case 'premium':
        return (
          <div className="space-y-8 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Subscription & Billing</h2>
              <p className="text-[#888] text-sm">Manage your Pro status and payment history.</p>
            </div>

            <section className="bg-gradient-to-br from-[#1C1C1C] to-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FACC15] blur-[100px] opacity-10"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-[#FACC15] font-bold tracking-widest text-[11px] uppercase mb-2">Current Plan</h3>
                  <div className="text-3xl font-black text-white mb-2">Basic Tier</div>
                  <p className="text-[#888] text-sm max-w-[280px]">You are currently on the free tier. Upgrade to unlock AI algorithmic talent matching and top visibility.</p>
                </div>
                <button 
                  onClick={() => onNavigate('premium')} 
                  className="bg-nc-pro text-black font-bold py-3 px-8 rounded-xl shadow-lg shadow-nc-pro/20 hover:scale-[1.02] transition-transform whitespace-nowrap"
                  style={{ backgroundColor: '#FACC15' }}
                >
                  Go PRO ✦
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-white mb-4">Payment Methods</h3>
              <div className="border border-dashed border-[#333] hover:border-nc-accent bg-[#111] rounded-xl p-4 flex items-center justify-center cursor-pointer transition-colors group">
                 <span className="text-sm font-medium text-[#888] group-hover:text-nc-accent">+ Add Payment Method</span>
              </div>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-white mb-4">Billing History</h3>
              <div className="text-center py-8 bg-[#111] rounded-xl border border-[#222]">
                <p className="text-sm text-[#666]">No previous transactions found.</p>
              </div>
            </section>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Security</h2>
              <p className="text-[#888] text-sm">Protect your identity and monitor session activity.</p>
            </div>

            <section className="space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">Password</h3>
              <SettingInput label="Current Password" type="password" placeholder="••••••••" onChange={markDirty} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <SettingInput label="New Password" type="password" placeholder="Minimum 8 characters" onChange={markDirty} />
                <SettingInput label="Confirm New Password" type="password" placeholder="" onChange={markDirty} />
              </div>
            </section>

            <section className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-5 mb-5 flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold mb-1">Two-Factor Authentication (2FA)</h4>
                <p className="text-[#888] text-xs max-w-[250px] leading-relaxed">Require a cryptographic code from an authenticator app when logging in.</p>
              </div>
              <GoldenToggle 
                enabled={twoFactor} 
                onChange={async (v) => {
                  if (v) {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                      showToast('Please enable browser system notifications to receive 2FA codes.', 'info');
                    }
                  }
                  setTwoFactor(v);
                  markDirty();
                }} 
              />
            </section>

            <section>
              <h3 className="text-lg font-bold text-white mb-4">Active Sessions</h3>
              <div className="border border-[#222] bg-[#111] rounded-xl overflow-hidden divide-y divide-[#222]">
                {sessions.map((sess) => {
                  const currentSessionId = localStorage.getItem('nc_session_id');
                  const isCurrent = sess.id === currentSessionId;
                  const isMobile = isMobileDevice(sess.os);
                  
                  return (
                    <div 
                      key={sess.id} 
                      className={`flex items-center justify-between p-4 ${
                        isCurrent ? 'bg-[#151515]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isMobile ? (
                          <svg className={`w-5 h-5 ${isCurrent ? 'text-green-500' : 'text-[#666]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className={`w-5 h-5 ${isCurrent ? 'text-green-500' : 'text-[#666]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                        <div>
                          <p className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-[#CCC]'}`}>
                            {sess.os} • {sess.browser}
                          </p>
                          {isCurrent ? (
                            <p className="text-xs text-green-500 font-medium tracking-wide border border-green-500/20 bg-green-500/10 px-2 py-0.5 rounded inline-block mt-1">Current Session</p>
                          ) : (
                            <p className="text-xs text-[#666] mt-1">
                              {formatLastActive(sess.lastActive)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xs text-[#666]">{sess.location || "Unknown Location"}</p>
                        {!isCurrent && (
                          <button 
                            onClick={() => handleRevokeSession(sess.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {sessions.length === 0 && (
                  <div className="p-4 text-center text-xs text-[#555] italic">
                    No active sessions found.
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-8 animate-fade-in text-left pb-10">
            <div className="border-b border-red-500/30 pb-6">
              <h2 className="text-2xl font-bold text-red-500 mb-2">Data & Control</h2>
              <p className="text-[#888] text-sm">Destructive actions and data extraction.</p>
            </div>

            <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-white font-bold text-sm mb-1">Download Archive</h4>
                  <p className="text-[#888] text-xs max-w-[280px] leading-relaxed">
                    Export a JSON file of your entire profile, messages, and uploaded media attachments.
                  </p>
                </div>
                <button className="text-white bg-[#151515] border border-[#333] px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#222] transition-colors whitespace-nowrap">
                  Request Data Archive
                </button>
              </div>
              
              <hr className="border-red-500/10" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-[#FFB8B8] font-bold text-sm mb-1">Deactivate Account</h4>
                  <p className="text-[#888] text-xs max-w-[280px] leading-relaxed">
                    Temporarily hide your profile. You can reactivate by signing back in at any time.
                  </p>
                </div>
                <button className="text-[#FFB8B8] bg-red-500/10 px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors whitespace-nowrap">
                  Deactivate Profile
                </button>
              </div>

              <hr className="border-red-500/10" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-red-500 font-bold text-sm mb-1">Delete Account Completely</h4>
                  <p className="text-red-500/60 text-xs max-w-[280px] leading-relaxed">
                    Permanently erase your identity. This cannot be undone and all media will be destroyed.
                  </p>
                </div>
                <button className="text-red-500 bg-red-500/10 border border-red-500/20 px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-colors whitespace-nowrap">
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-24 pb-32 md:pb-20 relative font-sans">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-8 flex flex-col md:flex-row items-start gap-8 md:gap-16">
        
        {/* LEFT SIDEBAR (Hidden on mobile if a detail view is active) */}
        <div className={`w-full md:w-[260px] flex-shrink-0 ${isMobileDetail ? 'hidden md:block' : 'block'}`}>
          <h1 className="text-3xl font-black tracking-tight mb-8 hidden md:block">Settings</h1>
          
          <div className="flex flex-col gap-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all relative overflow-hidden group ${
                    isActive 
                      ? 'bg-[#151515] border border-[#2A2A2A]' 
                      : 'bg-transparent border border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4 text-left relative z-10 transition-transform group-hover:translate-x-1 duration-300">
                    <span className="text-lg sm:text-xl grayscale group-hover:grayscale-0 transition-all">{tab.icon}</span>
                    <span className={`font-bold text-[14px] ${isActive ? 'text-nc-accent' : 'text-[#888] group-hover:text-white'}`}>
                      {tab.label}
                    </span>
                  </div>
                  
                  {/* Internal Active Indicator Line */}
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-nc-accent shadow-[0_0_10px_rgba(56,189,248,0.5)]"></div>}

                  {/* Mobile Chevron */}
                  <span className="md:hidden text-[#444] font-bold group-hover:text-white transition-colors">&gt;</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT CONTENT PANEL */}
        <div className={`flex-1 w-full max-w-3xl ${!isMobileDetail ? 'hidden md:block' : 'block'}`}>
          
          {/* Mobile Back Header — matches "Edit Profile" screenshot style */}
          {isMobileDetail && (
            <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-[#111]">
              <button
                onClick={() => setIsMobileDetail(false)}
                className="flex items-center gap-2 text-[#888] hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <span className="font-black text-white text-[15px] tracking-tight">
                {activeTab === 'account' ? 'Edit Profile' : activeTab === 'profile' ? 'Profile Details' : tabs.find(t => t.id === activeTab)?.label || 'Settings'}
              </span>
              <div className="w-10" />
            </div>
          )}

          {renderContent()}

        </div>
      </div>

      {/* Alert system handles the save popup globally */}

      {/* FLOATING ACTION BAR FOR DIRTY STATE */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#111]/90 backdrop-blur-xl border-t border-[#333] p-4 flex justify-center z-50 animate-slide-up shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-[1100px] w-full flex items-center justify-between px-4 sm:px-6 md:px-8">
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-white">Unsaved Changes</span>
              <p className="text-xs text-[#888] mt-0.5">Please save your profile modifications.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto justify-end">
              <button 
                onClick={() => setHasChanges(false)} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#888] hover:text-white hover:bg-white/5 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-nc-accent text-nc-dark shadow-lg shadow-nc-accent/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
