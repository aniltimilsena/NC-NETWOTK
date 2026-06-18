import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getProfile, updateProfileData, subscribeToProfile, uploadProfileMedia } from '../services/profile';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword, GoogleAuthProvider, FacebookAuthProvider, linkWithPopup, unlink } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, getDocs, where, updateDoc, limit } from 'firebase/firestore';
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
import { Plus, Check, ChevronLeft, User, Briefcase, Lock, Bell, Shield, Database, Trash2, HelpCircle, X, Mail, Loader2, Monitor, Smartphone, Tablet, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { evaluatePasswordStrength } from '../utils/security';
import Avatar from '../components/ui/Avatar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { CATEGORIES } from '../constants/categories';
import OtpInput from '../components/ui/OtpInput';
import apiClient from '../api/client';

// Unified premium toggle style
const GoldenToggle = ({ enabled, onChange }) => (
  <NeonToggle enabled={enabled} onChange={onChange} />
);

// Consistent styled input field
const EditInput = ({ label, type = 'text', placeholder, value, onChange, icon, readOnly = false }) => (
  <div className="mb-4 text-left">
    {label && <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px] mb-2">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] flex items-center justify-center">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] focus:shadow-[0_0_0_3px_rgba(0,191,255,0.2)] text-white transition-all py-3 ${icon ? 'pl-11' : 'pl-4'} pr-4 rounded-lg outline-none text-sm placeholder-[#555]`}
      />
    </div>
  </div>
);

// Consistent styled textarea with character counter
const EditTextarea = ({ label, placeholder, value, onChange, rows = 4, charCount = null }) => (
  <div className="mb-4 text-left">
    <div className="flex justify-between items-center mb-2">
      {label && <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px]">{label}</label>}
      {charCount !== null && <span className="text-[10px] text-[#555] font-bold">{charCount} / 500</span>}
    </div>
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] focus:shadow-[0_0_0_3px_rgba(0,191,255,0.2)] text-white transition-all py-3 px-4 rounded-lg outline-none text-sm placeholder-[#555] resize-none leading-relaxed"
    />
  </div>
);

// Consistent styled select dropdown
const EditSelect = ({ label, options, value, onChange, placeholder }) => (
  <div className="mb-4 text-left">
    {label && <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px] mb-2">{label}</label>}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] focus:shadow-[0_0_0_3px_rgba(0,191,255,0.2)] text-white transition-all py-3 pl-4 pr-10 rounded-lg outline-none text-sm appearance-none cursor-pointer placeholder-[#555]"
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

// Autocomplete Location Input Component
const AutocompleteLocationInput = ({ label, value, onChange, icon }) => {
  const [queryVal, setQueryVal] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setQueryVal(value || '');
  }, [value]);

  const suggestions = [
    'Kathmandu, Nepal',
    'Lalitpur, Nepal',
    'Bhaktapur, Nepal',
    'Pokhara, Nepal',
    'Biratnagar, Nepal',
    'Dharan, Nepal',
    'Butwal, Nepal',
    'Birgunj, Nepal',
    'Hetauda, Nepal',
    'Chitwan, Nepal',
    'London, UK',
    'New York, USA',
    'Mumbai, India'
  ].filter(city => city.toLowerCase().includes(queryVal.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mb-4 text-left relative" ref={containerRef}>
      {label && <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px] mb-2">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] flex items-center justify-center">{icon}</span>}
        <input
          type="text"
          placeholder="City, Country"
          value={queryVal}
          onChange={(e) => {
            const v = e.target.value;
            setQueryVal(v);
            onChange(v);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className={`w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] focus:shadow-[0_0_0_3px_rgba(0,191,255,0.2)] text-white transition-all py-3 ${icon ? 'pl-11' : 'pl-4'} pr-4 rounded-lg outline-none text-sm placeholder-[#555]`}
        />
      </div>

      {showSuggestions && queryVal && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl z-50 py-1.5 max-h-48 overflow-y-auto no-scrollbar">
          {suggestions.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setQueryVal(city);
                onChange(city);
                setShowSuggestions(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-[#00BFFF]/10 hover:text-[#00BFFF] transition-colors"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Premium Save Button Component
const SaveButton = ({ hasChanges, isSaving, onSave, saveSuccess }) => (
  <button
    type="button"
    onClick={onSave}
    disabled={(!hasChanges && !saveSuccess) || isSaving}
    className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg text-sm font-bold transition-all ${
      saveSuccess
        ? 'bg-green-500 text-white'
        : hasChanges
          ? 'bg-gradient-to-r from-[#00BFFF] to-[#0080FF] hover:opacity-95 text-black shadow-lg shadow-[#00BFFF]/20 active:scale-[0.98] cursor-pointer'
          : 'bg-[#222] text-[#555] cursor-not-allowed'
    }`}
  >
    {isSaving ? (
      <>
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Saving...
      </>
    ) : saveSuccess ? (
      <>
        <Check className="w-4.5 h-4.5" />
        Saved Successfully
      </>
    ) : (
      'Save Changes'
    )}
  </button>
);

// Legacy compat wrappers
const SettingInput = ({ label, type = 'text', placeholder, value, onChange }) => (
  <EditInput label={label} type={type} placeholder={placeholder} value={value} onChange={onChange} />
);

// Chip Tag for skills/expertise
const ChipTag = ({ label, onRemove }) => (
  <motion.div
    initial={{ scale: 0.85, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.85, opacity: 0 }}
    className="flex items-center gap-1.5 bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] px-3.5 py-1.5 rounded-full text-xs font-semibold"
  >
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="hover:text-white transition-colors ml-1"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </motion.div>
);

// Experience Card for Edit mode
const ExperienceEditCard = ({ exp, idx, onChange, onRemove }) => (
  <motion.div
    initial={{ y: 12, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="bg-[#0E0E0E] border border-white/5 rounded-2xl p-5 space-y-3 group relative hover:border-white/10 transition-all text-left"
  >
    <div className="flex items-center gap-3 mb-1">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        <Briefcase className="w-4 h-4 text-[#00BFFF]" />
      </div>
      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Production Entry</span>
      
      {/* edit/delete icons on hover */}
      <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete Entry"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
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
        ? 'border-[#00BFFF] shadow-[0_0_10px_rgba(0,191,255,0.4),inset_0_0_4px_rgba(0,191,255,0.2)]'
        : 'border-[#333] hover:border-[#444]'
      }
    `}
  >
    <span
      className={`
        pointer-events-none inline-block h-[18px] w-[18px] rounded-full
        shadow-lg transition-all duration-300 ease-in-out transform
        ${enabled
          ? 'translate-x-[18px] bg-[#00BFFF]'
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
      <div className="col-span-8 pr-4 text-left">
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
  const { t, i18n } = useTranslation();
  const isUserAdmin = isAdmin || user?.email === 'aniltimilsena53@gmail.com';

  const createSystemNotification = async (title, body) => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        recipientId: user.uid,
        receiverId: user.uid,
        senderId: 'system',
        senderName: 'System',
        senderAvatar: '',
        title,
        body,
        type: 'system',
        notificationType: 'system',
        isRead: false,
        read: false,
        createdAt: serverTimestamp(),
        targetUrl: '/settings'
      });
    } catch (err) {
      console.warn("Failed to create system notification:", err);
    }
  };

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: () => {},
    type: "default",
    isLoading: false
  });

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
    } else {
      setActiveTab('account');
      setIsMobileDetail(false);
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

  // Appearance Settings
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('nc_font_size') || 'small');
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('nc_font_size', size);
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${size}`);
  };

  const handleLanguageChange = async (lang) => {
    i18n.changeLanguage(lang);
    if (user?.uid) {
      try {
        const { success, error } = await updateProfileData(user.uid, { language: lang });
        if (success) {
          showToast(t('toast_profile_updated') || "Language updated successfully!", "success");
        } else if (error) {
          console.warn("Failed to sync language preference to Firestore:", error);
        }
      } catch (err) {
        console.warn("Error syncing language preference:", err);
      }
    }
  };

  // Data Control States/Functions
  const [isExporting, setIsExporting] = useState(false);

  const handleRequestDataArchive = async () => {
    if (!user?.uid) return;
    setIsExporting(true);
    showToast("Preparing your data archive...", "info");
    
    try {
      // 1. Fetch Profile Data
      let profileData = {};
      const profileSnap = await getDocs(query(collection(db, "profiles"), where("__name__", "==", user.uid)));
      if (!profileSnap.empty) {
        profileData = { id: user.uid, ...profileSnap.docs[0].data() };
      }

      // 2. Fetch Conversations and Messages
      const conversationsData = [];
      const convoSnap = await getDocs(
        query(collection(db, "conversations"), where("participants", "array-contains", user.uid))
      );
      
      for (const convoDoc of convoSnap.docs) {
        const convoData = convoDoc.data();
        const messagesSnap = await getDocs(
          query(collection(db, "conversations", convoDoc.id, "messages"), orderBy("createdAt", "asc"))
        );
        const messages = messagesSnap.docs.map(mDoc => {
          const mData = mDoc.data();
          return {
            id: mDoc.id,
            senderId: mData.senderId,
            text: mData.text,
            isSystem: mData.isSystem || false,
            type: mData.type || "text",
            createdAt: mData.createdAt?.toDate?.()?.toISOString() || mData.createdAt || null
          };
        });
        conversationsData.push({
          id: convoDoc.id,
          participants: convoData.participants,
          lastMessage: convoData.lastMessage,
          messages
        });
      }

      // 3. Bundle Archive
      const archive = {
        exportedAt: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        profile: profileData,
        conversations: conversationsData
      };

      // 4. Download JSON file
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nc-data-archive-${user.displayName?.toLowerCase().replace(/\s+/g, '-') || 'user'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast("Data archive downloaded successfully!", "success");
      await createSystemNotification("Data Archive Exported", "You successfully requested and downloaded your full data archive.");
    } catch (err) {
      console.error("Archive export failed:", err);
      showToast("Failed to export archive. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeactivateAccount = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Deactivate Profile?",
      description: "Are you sure you want to temporarily deactivate your profile? It will be hidden from listings and search results. You can reactivate it anytime simply by logging back in.",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      type: "warning",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        try {
          // Update profile deactivated flag
          await updateDoc(doc(db, "profiles", user.uid), {
            deactivated: true,
            updatedAt: serverTimestamp()
          });

          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          showToast("Profile deactivated. Signing out...", "success");

          // Sign out
          setTimeout(async () => {
            await auth.signOut();
            onNavigate('home');
          }, 1500);
        } catch (err) {
          console.error("Deactivation failed:", err);
          showToast("Failed to deactivate profile.", "error");
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleDeleteAccount = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Account Permanently?",
      description: "WARNING: This will permanently erase your profile details, casting history, and media attachments. This action is irreversible and cannot be undone.",
      confirmText: "Delete Permanently",
      cancelText: "Cancel",
      type: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        try {
          const uid = user.uid;

          // 1. Delete Firestore user and profile documents
          await deleteDoc(doc(db, "profiles", uid));
          await deleteDoc(doc(db, "users", uid));

          // 2. Clear confirm state
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          showToast("Account deleted. Signing out...", "success");

          // 3. Attempt to delete auth user, otherwise sign out
          try {
            if (auth.currentUser) {
              await auth.currentUser.delete();
            }
          } catch (authErr) {
            console.warn("Could not delete auth user immediately (requires recent login):", authErr);
          }

          // 4. Final sign out and redirect
          setTimeout(async () => {
            await auth.signOut();
            onNavigate('home');
          }, 1500);
        } catch (err) {
          console.error("Deletion failed:", err);
          showToast("Failed to delete account completely.", "error");
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };


  // Identity States
  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [displayNameState, setDisplayNameState] = useState("");
  const [uName, setUName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  
  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarLastFile, setAvatarLastFile] = useState(null);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState("idle"); // 'idle' | 'uploading' | 'success' | 'error'
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Show/hide password toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signOutOthersAfterPasswordChange, setSignOutOthersAfterPasswordChange] = useState(false);

  // Connected accounts and login history
  const [providers, setProviders] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

  // Account deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [whoCanMessage, setWhoCanMessage] = useState("connections");
  const [profileVisibility, setProfileVisibility] = useState("public");

  // Notifications states
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifTyping, setNotifTyping] = useState(false);
  const [notifCasting, setNotifCasting] = useState(true);
  const [notifAppStatus, setNotifAppStatus] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);
  const [notifUpdates, setNotifUpdates] = useState(false);
  const [notifNewsletters, setNotifNewsletters] = useState(false);
  const [notifPromo, setNotifPromo] = useState(false);

  const calculateProfileCompletion = () => {
    let score = 0;
    if (avatarUrl || user?.photoURL || user?.image) score += 15;
    if (bio && bio.trim().length > 0) score += 15;
    if (role) score += 10;
    if (location) score += 10;
    if (phone) score += 10;
    if (gender) score += 10;
    if (selectedLanguages && selectedLanguages.length > 0) score += 15;
    if (selectedSkills && selectedSkills.length > 0) score += 15;
    return score;
  };

  const getMissingProfileFields = () => {
    const missing = [];
    if (!avatarUrl && !user?.photoURL && !user?.image) missing.push("Avatar");
    if (!bio) missing.push("Bio Description");
    if (!role) missing.push("Category");
    if (!location) missing.push("Location");
    if (!phone) missing.push("Phone");
    if (!gender) missing.push("Gender");
    if (!selectedLanguages || selectedLanguages.length === 0) missing.push("Languages");
    if (!selectedSkills || selectedSkills.length === 0) missing.push("Skills");
    return missing;
  };

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
    setAvatarUploadStatus("uploading");
    setAvatarLastFile(file);
    
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
          setAvatarUploadStatus("success");
          showToast("Profile picture updated successfully!", "success");
          createSystemNotification("Profile Picture Updated", "Your profile picture has been updated.");
          setTimeout(() => {
            setAvatarUploadStatus("idle");
            setIsUploadingAvatar(false);
          }, 1500);
        } else {
          console.error("Firestore update failed:", error);
          setAvatarUploadStatus("error");
          showToast("Photo uploaded but failed to update profile record.", "error");
        }
      } else {
        setAvatarUploadStatus("error");
        showToast("Failed to upload image to Cloudinary.", "error");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setAvatarUploadStatus("error");
      showToast("Error updating profile picture.", "error");
    } finally {
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleRetryAvatarUpload = async () => {
    if (!avatarLastFile || !user?.uid) return;
    
    setIsUploadingAvatar(true);
    setAvatarProgress(0);
    setAvatarUploadStatus("uploading");
    
    try {
      const url = await uploadProfileMedia(user.uid, avatarLastFile, (progress) => {
        setAvatarProgress(Math.round(progress));
      });
      
      if (url) {
        setAvatarUrl(url);
        const { success, error } = await updateProfileData(user.uid, { 
          image: url,
          photoURL: url 
        });

        if (success) {
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: url });
          }
          setAvatarUploadStatus("success");
          showToast("Profile picture updated successfully!", "success");
          createSystemNotification("Profile Picture Updated", "Your profile picture has been updated.");
          setTimeout(() => {
            setAvatarUploadStatus("idle");
            setIsUploadingAvatar(false);
          }, 1500);
        } else {
          setAvatarUploadStatus("error");
          showToast("Photo uploaded but failed to update profile record.", "error");
        }
      } else {
        setAvatarUploadStatus("error");
        showToast("Failed to upload image to Cloudinary.", "error");
      }
    } catch (err) {
      console.error("Avatar upload retry error:", err);
      setAvatarUploadStatus("error");
      showToast("Error updating profile picture.", "error");
    }
  };

  const handleDeleteAvatar = () => {
    if (!user?.uid) return;
    
    setConfirmConfig({
      isOpen: true,
      title: "Remove Profile Picture?",
      description: "Are you sure you want to remove your profile picture? This action cannot be undone.",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        try {
          await updateProfileData(user.uid, { image: null, photoURL: null });
          setAvatarUrl("");
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: "" });
          }
          showToast("Profile picture removed.", "success");
          createSystemNotification("Profile Picture Removed", "Your profile picture has been removed.");
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Avatar delete error:", err);
          showToast("Error removing profile picture.", "error");
        } finally {
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToProfile(user.uid, (data) => {
        if (data) {
          setIsPremium(data.premium || isUserAdmin || false);
          if (data.language && data.language !== i18n.language) {
            i18n.changeLanguage(data.language);
          }
          // Only update form fields if not currently saving to avoid race conditions
          if (!isSavingRef.current) {
            setFName(data.firstName || defaultFirstName);
            setLName(data.lastName || defaultLastName);
            setDisplayNameState(data.name || user?.displayName || `${data.firstName || defaultFirstName} ${data.lastName || defaultLastName}`.trim() || defaultUsername);
            setUName(data.username || defaultUsername);
            setPhone(data.phone || "");
            setGender(data.gender || "");
            setBio(data.bio || "");
            setLocation(data.location || "");
            setSelectedLanguages(data.languages || []);
            setSelectedSkills(data.skills || []);
            setExperiences(data.experience || []);
            setOpenToWork(data.openToAudition ?? data.openToWork ?? false);
            setHeight(data.height || "");
            setWeight(data.weight || "");
            setEyeColor(data.eyeColor || "");
            setHairColor(data.hairColor || "");
            setRole(data.category ?? data.role ?? "");
            setShowContactInfo(data.showContactInfo || false);
            setAvatarUrl(data.image || data.photoURL || "");
            setTwoFactor(data.twoFactorEnabled || false);
            setTwoFactorMethod(data.twoFactorMethod || "");
            setTwoFactorPhone(data.twoFactorPhone || "");
            setTwoFactorEmail(data.twoFactorEmail || "");
            setWhoCanMessage(data.whoCanMessage || "connections");
            setProfileVisibility(data.profileVisibility || "public");
            
            const notifs = data.notifications || {};
            setNotifMessages(notifs.messages ?? true);
            setNotifTyping(notifs.typing ?? false);
            setNotifCasting(notifs.casting ?? true);
            setNotifAppStatus(notifs.appStatus ?? true);
            setNotifSecurity(notifs.security ?? true);
            setNotifUpdates(notifs.updates ?? false);
            setNotifNewsletters(notifs.newsletters ?? false);
            setNotifPromo(notifs.promo ?? false);
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
    
    const newName = displayNameState.trim() || `${fName} ${lName}`.trim() || uName;

    const profileData = {
      name: newName,
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
      openToAudition: openToWork,
      height,
      weight,
      eyeColor,
      hairColor,
      role,
      category: role,
      showContactInfo,
      email: showContactInfo ? (user?.email || "") : "",
      image: avatarUrl || null,
      photoURL: avatarUrl || null,
      twoFactorEnabled: twoFactor,
      whoCanMessage,
      profileVisibility,
      notifications: {
        messages: notifMessages,
        typing: notifTyping,
        casting: notifCasting,
        appStatus: notifAppStatus,
        security: notifSecurity,
        updates: notifUpdates,
        newsletters: notifNewsletters,
        promo: notifPromo
      }
    };

    try {
      const { error } = await updateProfileData(user.uid, profileData);

      if (!error) {
        if (auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, {
              displayName: newName,
              photoURL: avatarUrl || null
            });
          } catch (authErr) {
            console.warn("[Settings] Auth profile update failed:", authErr);
          }
        }

        setHasChanges(false);
        setSaveSuccess(true);
        showToast('Profile updated!', 'success');
        createSystemNotification("Profile Updated", "Your profile settings have been successfully updated.");
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      } else {
        console.error('[Settings] save failed:', error);
        showToast('Failed to save. Try again', 'error');
      }
    } catch (err) {
      console.error('[Settings] unexpected error during save:', err);
      showToast('Failed to save. Try again', 'error');
    } finally {
      // Small delay before allowing snapshot updates to avoid overwriting with stale data
      setTimeout(() => {
        isSavingRef.current = false;
        setIsSaving(false);
      }, 500);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    const { strength } = evaluatePasswordStrength(newPassword);
    if (strength === 'Weak') {
      showToast("Please choose a stronger password meeting the security criteria.", "error");
      return;
    }
    setIsChangingPassword(true);
    try {
      const u = auth.currentUser;
      if (u && u.email) {
        const credential = EmailAuthProvider.credential(u.email, currentPassword);
        await reauthenticateWithCredential(u, credential);
        
        await updatePassword(u, newPassword);
        showToast("Password changed successfully!", "success");
        await createSystemNotification("Password Changed", "Your account password was recently updated.");
        
        if (signOutOthersAfterPasswordChange) {
          await handleSignOutAllOthers();
        }
        
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSignOutOthersAfterPasswordChange(false);
      } else {
        showToast("User session not found.", "error");
      }
    } catch (err) {
      console.error("Password update error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showToast("Current password incorrect", "error");
      } else {
        showToast(err.message || "Failed to update password. Please check your credentials.", "error");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Example Settings State
  const [searchVisibility, setSearchVisibility] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessions, setSessions] = useState([]);

  // 2FA states
  const [twoFactorMethod, setTwoFactorMethod] = useState("");
  const [twoFactorPhone, setTwoFactorPhone] = useState("");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState("status"); // 'status' | 'method' | 'setup_sms' | 'setup_email' | 'backup_codes' | 'disable_confirm' | 'disable_verify'
  const [selected2faMethod, setSelected2faMethod] = useState("sms");
  const [setupPhone, setSetupPhone] = useState("+977");
  const [setupEmail, setSetupEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendActive, setResendActive] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [passwordToDisable, setPasswordToDisable] = useState("");
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    if (otpSent && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpSent && countdown === 0) {
      setResendActive(true);
    }
  }, [countdown, otpSent]);

  const handleSendSetupOtp = async () => {
    setIsSendingCode(true);
    setOtpError('');
    try {
      const res = await apiClient.post('/2fa/send-setup-otp', {
        method: selected2faMethod,
        phone: selected2faMethod === 'sms' ? setupPhone : null,
        email: selected2faMethod === 'email' ? setupEmail : null,
      });
      if (res.data.success) {
        setOtpSent(true);
        setCountdown(60);
        setResendActive(false);
        setOtpValue('');
        if (res.data.code && Notification.permission === 'granted') {
          new Notification("NC-Network Verification", {
            body: `Your setup verification code is: ${res.data.code}`,
            icon: '/logo.png',
            requireInteraction: true
          });
        }
        showToast('Verification code sent!', 'success');
      } else {
        setOtpError(res.data.error || 'Failed to send verification code.');
      }
    } catch (err) {
      console.error("2FA send setup error:", err);
      setOtpError(err.response?.data?.error || 'Error sending verification code.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifySetupOtp = async () => {
    setIsVerifyingCode(true);
    setOtpError('');
    try {
      const res = await apiClient.post('/2fa/verify-setup-otp', {
        code: otpValue,
        method: selected2faMethod,
        phone: selected2faMethod === 'sms' ? setupPhone : null,
        email: selected2faMethod === 'email' ? setupEmail : null,
      });
      if (res.data.success) {
        setBackupCodes(res.data.backupCodes);
        setTwoFactorStep('backup_codes');
        showToast('Verification successful!', 'success');
      } else {
        setOtpError(res.data.error || 'Invalid code.');
      }
    } catch (err) {
      console.error("2FA verify setup error:", err);
      setOtpError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const element = document.createElement("a");
    const file = new Blob([
      `NC NETWORK TWO-FACTOR AUTHENTICATION BACKUP CODES\n`,
      `Keep these codes in a safe place. Each code can be used once.\n\n`,
      backupCodes.map((code, idx) => `Code ${idx + 1}: ${code}`).join('\n')
    ], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "nc_backup_codes.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSendDisableOtp = async () => {
    setIsSendingCode(true);
    setOtpError('');
    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        showToast('Auth error. Log in again.', 'error');
        return;
      }
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordToDisable);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      const res = await apiClient.post('/2fa/send-setup-otp', {
        method: twoFactorMethod,
        phone: twoFactorMethod === 'sms' ? twoFactorPhone : null,
        email: twoFactorMethod === 'email' ? twoFactorEmail : null,
      });
      
      if (res.data.success) {
        setOtpSent(true);
        setCountdown(60);
        setResendActive(false);
        setOtpValue('');
        setTwoFactorStep('disable_verify');
        
        if (res.data.code && Notification.permission === 'granted') {
          new Notification("NC-Network Verification", {
            body: `Your disable confirmation code is: ${res.data.code}`,
            icon: '/logo.png',
            requireInteraction: true
          });
        }
        showToast('Verification code sent!', 'success');
      } else {
        setOtpError(res.data.error || 'Failed to send verification code.');
      }
    } catch (err) {
      console.error("2FA send disable error:", err);
      showToast('Invalid password. Please try again.', 'error');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyDisableOtp = async () => {
    setIsVerifyingCode(true);
    setOtpError('');
    try {
      const res = await apiClient.post('/2fa/disable', {
        code: otpValue,
      });
      if (res.data.success) {
        setTwoFactor(false);
        setTwoFactorMethod('');
        setTwoFactorPhone('');
        setTwoFactorEmail('');
        setTwoFactorStep('status');
        showToast('2FA disabled', 'warning');
      } else {
        setOtpError(res.data.error || 'Invalid code.');
      }
    } catch (err) {
      console.error("2FA disable verification error:", err);
      setOtpError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

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

  const handleSignOutAllOthers = async () => {
    if (!user?.uid) return;
    try {
      const currentSessionId = localStorage.getItem('nc_session_id');
      const sessionsColRef = collection(db, 'profiles', user.uid, 'sessions');
      const snap = await getDocs(sessionsColRef);
      const batchPromises = snap.docs
        .filter(d => d.id !== currentSessionId)
        .map(d => deleteDoc(d.ref));
      await Promise.all(batchPromises);
      showToast("Signed out of all other devices successfully.", "success");
    } catch (err) {
      console.error("Failed to revoke other sessions:", err);
      showToast("Failed to revoke other sessions.", "error");
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      setProviders(auth.currentUser.providerData || []);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    
    const historyColRef = collection(db, 'profiles', user.uid, 'login_history');
    const q = query(historyColRef, orderBy('timestamp', 'desc'), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLoginHistory(list);
    }, (error) => {
      console.error("Error subscribing to login history:", error);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const handleConnectProvider = async (providerName) => {
    try {
      if (!auth.currentUser) return;
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'facebook') {
        provider = new FacebookAuthProvider();
      } else {
        return;
      }
      
      await linkWithPopup(auth.currentUser, provider);
      await auth.currentUser.reload();
      setProviders([...auth.currentUser.providerData]);
      showToast(`${providerName === 'google' ? 'Google' : 'Facebook'} account linked successfully!`, 'success');
    } catch (err) {
      console.error(`Error linking ${providerName}:`, err);
      showToast(err.message || `Failed to link ${providerName} account.`, 'error');
    }
  };

  const handleDisconnectProvider = async (providerId) => {
    try {
      if (!auth.currentUser) return;
      if (auth.currentUser.providerData.length <= 1) {
        showToast("Cannot disconnect the last remaining login method.", "error");
        return;
      }
      
      await unlink(auth.currentUser, providerId);
      await auth.currentUser.reload();
      setProviders([...auth.currentUser.providerData]);
      showToast(`Account disconnected successfully.`, 'success');
    } catch (err) {
      console.error(`Error unlinking ${providerId}:`, err);
      showToast(err.message || `Failed to disconnect account.`, 'error');
    }
  };

  const handleRequestAccountDeletion = async () => {
    if (deleteConfirmText !== "DELETE") {
      showToast("Please type 'DELETE' to confirm.", "error");
      return;
    }
    if (!deleteConfirmPassword) {
      showToast("Please enter your password to confirm.", "error");
      return;
    }
    setIsDeletingAccount(true);
    try {
      const u = auth.currentUser;
      if (u && u.email) {
        const credential = EmailAuthProvider.credential(u.email, deleteConfirmPassword);
        await reauthenticateWithCredential(u, credential);
        
        const gracePeriodEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await updateDoc(doc(db, 'profiles', u.uid), {
          deletionScheduled: true,
          deletionScheduledAt: serverTimestamp(),
          deletionGracePeriodEndsAt: gracePeriodEndsAt
        });
        await updateDoc(doc(db, 'users', u.uid), {
          deletionScheduled: true,
          deletionScheduledAt: serverTimestamp(),
          deletionGracePeriodEndsAt: gracePeriodEndsAt
        });
        
        showToast("Account scheduled for deletion. Signing out...", "success");
        setIsDeleteModalOpen(false);
        
        setTimeout(async () => {
          await auth.signOut();
          onNavigate('signin');
        }, 1500);
      }
    } catch (err) {
      console.error("Account deletion request error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        showToast("Password incorrect.", "error");
      } else {
        showToast(err.message || "Failed to schedule account deletion.", "error");
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };


  const tabs = [
    { id: 'account', icon: <User size={18} />, label: 'Account' },
    { id: 'profile', icon: <Briefcase size={18} />, label: 'Profile Details' },
    { id: 'privacy', icon: <Shield size={18} />, label: 'Privacy & Visibility' },
    { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
    ...(!isUserAdmin ? [{ id: 'premium', icon: <Plus size={18} />, label: 'Subscription (PRO)' }] : []),
    { id: 'security', icon: <Lock size={18} />, label: 'Security' },
    { id: 'data', icon: <Database size={18} />, label: 'Data & Control' },
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
          <div className="animate-fade-in text-left pb-10 space-y-6">
            {/* Profile Avatar Header */}
            <div className="flex flex-col items-center pt-4 pb-8 border-b border-white/5 mb-6">
              <Avatar 
                size={112}
                editable={true}
                name={displayNameState || displayName}
                className="mb-4"
              />
              <h2 className="text-white font-black text-lg tracking-tight">{displayNameState || displayName || 'Your Name'}</h2>
              <p className="text-[#555] text-xs mt-0.5">Member since {new Date().getFullYear()}</p>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4">
              <EditInput
                label="Display Name"
                value={displayNameState}
                placeholder="Alex Sterling"
                onChange={(e) => { setDisplayNameState(e.target.value); markDirty(); }}
                icon={<User className="w-4.5 h-4.5" />}
              />

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
                placeholder="username"
                onChange={(e) => { setUName(e.target.value); markDirty(); }}
                icon={
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />

              <EditInput
                label="Email Address"
                type="email"
                value={email}
                placeholder="your@email.com"
                readOnly={true}
                icon={<Mail className="w-4.5 h-4.5" />}
              />

              <EditInput
                label="Phone Number"
                type="tel"
                value={phone}
                placeholder="+977 98XXXXXXXX"
                onChange={(e) => { setPhone(e.target.value); markDirty(); }}
                icon={
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />
            </div>

            {/* Display Preferences */}
            <div className="pt-6 border-t border-white/5">
              <h3 className="text-white font-bold mb-4">{t('sec_display_pref') || 'Display Preferences'}</h3>
              
              {/* Language Selector */}
              <div className="mb-6">
                <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px] mb-3">
                  {t('lbl_language') || 'Language'}
                </label>
                <div className="relative">
                  <select
                    value={i18n.language || 'en'}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] text-white rounded-xl py-3 px-4 outline-none text-sm appearance-none cursor-pointer focus:border-[#00BFFF] transition-all"
                  >
                    <option value="en">English (English)</option>
                    <option value="np">नेपाली (Nepali)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#888]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-[#555] text-xs mt-2">Choose your preferred display language.</p>
              </div>

              {/* Font Size Selector */}
              <div className="mb-4">
                <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px] mb-3">
                  {t('lbl_font_size') || 'Font Size'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['small', 'medium', 'large'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleFontSizeChange(size)}
                      className={`py-3 px-3 rounded-xl border text-sm font-bold transition-all capitalize ${
                        fontSize === size
                          ? 'bg-[#00BFFF]/10 border-[#00BFFF]/50 text-[#00BFFF]'
                          : 'bg-[#111] border-[#1e1e1e] text-[#888] hover:border-[#2a2a2a] hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="text-[#555] text-xs mt-3">Adjust the global text size for better readability.</p>
              </div>
            </div>

            {/* Save Button for Account fields */}
            <div className="pt-4">
              <SaveButton hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} saveSuccess={saveSuccess} />
            </div>

          </div>
        );

      case 'profile':
        return (
          <div className="animate-fade-in text-left pb-10">
            {/* Sub-navigation */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-5 hidden md:block">Profile Details</h2>
              <div className="flex gap-1.5 p-1.5 bg-[#0D0D0D] border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
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
                <div className={`flex items-center justify-between bg-[#111] border rounded-2xl px-5 py-4 mb-6 transition-all ${
                  openToWork 
                    ? 'border-[#00BFFF]/30 shadow-[0_0_15px_rgba(0,191,255,0.15)] bg-[#00BFFF]/5' 
                    : 'border-white/5 bg-[#111]'
                }`}>
                  <div>
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      {openToWork && <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse"></span>}
                      Open to Audition
                      <div className="group/tooltip relative inline-block">
                        <HelpCircle className="w-4 h-4 text-gray-500 hover:text-white cursor-help transition-colors" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black/90 border border-white/10 text-[10px] text-gray-300 py-1.5 px-2.5 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50 text-center leading-normal normal-case font-normal shadow-xl">
                          Casting directors can find you for roles
                        </span>
                      </div>
                    </h4>
                    <p className="text-gray-500 text-xs mt-0.5">Signal to casting directors that you're seeking roles.</p>
                  </div>
                  <GoldenToggle enabled={openToWork} onChange={(v) => { setOpenToWork(v); markDirty(); }} />
                </div>

                <EditSelect
                  label="Professional Category"
                  options={CATEGORIES}
                  value={role}
                  onChange={(e) => { setRole(e.target.value); markDirty(); }}
                />

                <AutocompleteLocationInput
                  label="Location"
                  value={location}
                  onChange={(v) => { setLocation(v); markDirty(); }}
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
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setBio(e.target.value);
                      markDirty();
                    }
                  }}
                  rows={5}
                  charCount={bio ? bio.length : 0}
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
                  <p className="text-[#888] text-[10px] font-black uppercase tracking-[1px] mb-3">Physical Attributes</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <EditInput
                      label="Height"
                      placeholder="e.g. 5ft 9in"
                      value={height}
                      onChange={(e) => { setHeight(e.target.value); markDirty(); }}
                    />
                    <EditInput
                      label="Weight"
                      placeholder="e.g. 70kg"
                      value={weight}
                      onChange={(e) => { setWeight(e.target.value); markDirty(); }}
                    />
                    <EditSelect
                      label="Eye Color"
                      options={['Black', 'Brown', 'Blue', 'Green', 'Hazel', 'Other']}
                      value={eyeColor}
                      onChange={(e) => { setEyeColor(e.target.value); markDirty(); }}
                      placeholder="Select..."
                    />
                    <EditSelect
                      label="Hair Color"
                      options={['Black', 'Brown', 'Blonde', 'Red', 'Grey', 'Bald']}
                      value={hairColor}
                      onChange={(e) => { setHairColor(e.target.value); markDirty(); }}
                      placeholder="Select..."
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <SaveButton hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} saveSuccess={saveSuccess} />
                </div>
              </div>
            )}

            {/* -- SKILLS -- */}
            {profileSubTab === 'skills' && (
              <div className="space-y-8 animate-fade-in">
                {/* Languages */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#888] text-[10px] font-bold uppercase tracking-[1px]">Languages</p>
                    <span className="text-[#00BFFF] text-[10px] font-bold">{selectedLanguages.length} added</span>
                  </div>
                  <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
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
                      {selectedLanguages.length === 0 && <span className="text-[#555] text-xs italic">No languages added yet</span>}
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Type a language and press Enter..."
                        value={tempLanguage}
                        onChange={e => setTempLanguage(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = tempLanguage.trim();
                            if (val && !selectedLanguages.includes(val)) {
                              setSelectedLanguages([...selectedLanguages, val]);
                              setTempLanguage("");
                              markDirty();
                            }
                          }
                        }}
                        className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] focus:shadow-[0_0_0_3px_rgba(0,191,255,0.2)] text-white transition-all py-3 px-4 rounded-lg outline-none text-sm placeholder-[#555]"
                      />
                    </div>

                    <div>
                      <p className="text-[#555] text-[10px] font-bold uppercase tracking-[1px] mb-2.5">Suggested Languages</p>
                      <div className="flex flex-wrap gap-2">
                        {['Nepali', 'English', 'Hindi', 'Spanish', 'French', 'Chinese', 'Japanese', 'German']
                          .filter(l => !selectedLanguages.includes(l))
                          .map(l => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => {
                                setSelectedLanguages([...selectedLanguages, l]);
                                markDirty();
                              }}
                              className="bg-[#1a1a1a] border border-white/5 hover:border-[#00BFFF]/30 hover:bg-[#00BFFF]/5 hover:text-[#00BFFF] text-xs text-gray-400 px-3 py-1.5 rounded-full transition-all"
                            >
                              + {l}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills/Expertise */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#888] text-[10px] font-bold uppercase tracking-[1px]">Expertise & Skills</p>
                    <span className="text-[#00BFFF] text-[10px] font-bold">{selectedSkills.length} added</span>
                  </div>
                  <div className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-4">
                    {/* Active Skills Tag List */}
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
                      {selectedSkills.length === 0 && <span className="text-[#555] text-xs italic">No skills added yet</span>}
                    </div>

                    {/* Skill Input */}
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Type a skill and press Enter..."
                        value={tempSkill}
                        onChange={e => setTempSkill(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = tempSkill.trim();
                            if (val && !selectedSkills.includes(val)) {
                              setSelectedSkills([...selectedSkills, val]);
                              setTempSkill("");
                              markDirty();
                            }
                          }
                        }}
                        className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#00BFFF] focus:shadow-[0_0_0_3px_rgba(0,191,255,0.2)] text-white transition-all py-3 px-4 rounded-lg outline-none text-sm placeholder-[#555]"
                      />
                    </div>

                    {/* Quick-add suggestions */}
                    <div>
                      <p className="text-[#555] text-[10px] font-bold uppercase tracking-[1px] mb-2.5">Suggested Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {['Method Acting', 'Stage Combat', 'Horse Riding', 'Public Speaking', 'Improvisation', 'Voice Over', 'Martial Arts', 'Dancing', 'Singing', 'Stunts']
                          .filter(s => !selectedSkills.includes(s))
                          .map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setSelectedSkills([...selectedSkills, s]);
                                markDirty();
                              }}
                              className="bg-[#1a1a1a] border border-white/5 hover:border-[#00BFFF]/30 hover:bg-[#00BFFF]/5 hover:text-[#00BFFF] text-xs text-gray-400 px-3 py-1.5 rounded-full transition-all"
                            >
                              + {s}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <SaveButton hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} saveSuccess={saveSuccess} />
                </div>
              </div>
            )}

            {/* -- EXPERIENCE (HISTORY) -- */}
            {profileSubTab === 'experience' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-[#888] text-[10px] font-bold uppercase tracking-[1px]">Production History</p>
                  <button
                    onClick={() => {
                      setExperiences([{ role: '', production: '', year: '', description: '' }, ...experiences]);
                      markDirty();
                    }}
                    className="flex items-center gap-1.5 bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] hover:bg-[#00BFFF]/20 text-[11px] font-black uppercase tracking-[1px] px-4 py-2.5 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Experience
                  </button>
                </div>

                {experiences.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-white/5 space-y-6 ml-3 text-left">
                    <AnimatePresence>
                      {experiences.map((exp, idx) => (
                        <div key={idx} className="relative">
                          {/* Timeline node */}
                          <div className="absolute -left-[31px] top-5 w-4 h-4 rounded-full bg-[#111] border-2 border-[#00BFFF] flex items-center justify-center shadow-[0_0_8px_rgba(0,191,255,0.4)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00BFFF]" />
                          </div>
                          <ExperienceEditCard
                            exp={exp}
                            idx={idx}
                            onChange={(i, field, val) => {
                              const newExps = experiences.map((item, index) => {
                                if (index === i) {
                                  return { ...item, [field]: val };
                                }
                                return item;
                              });
                              setExperiences(newExps);
                              markDirty();
                            }}
                            onRemove={() => {
                              setExperiences(experiences.filter((_, i) => i !== idx));
                              markDirty();
                            }}
                          />
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl bg-[#111]">
                    <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">No experience records</p>
                    <p className="text-gray-600 text-[11px] mt-1">Tap "Add Experience" to begin your timeline</p>
                  </div>
                )}

                <div className="pt-6">
                  <SaveButton hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} saveSuccess={saveSuccess} />
                </div>
              </div>
            )}

          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6 hidden md:block">
              <h2 className="text-2xl font-bold text-white mb-2">Privacy & Visibility</h2>
              <p className="text-[#888] text-sm">Control exactly who can view your profile and contact you.</p>
            </div>

            {/* Profile Visibility Radio Group */}
            <div className="space-y-3">
              <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px]">Profile Visibility</label>
              <div className="bg-[#111] border border-white/5 rounded-xl p-2 space-y-1">
                {[
                  { id: 'public', label: 'Public (Visible to everyone & search engines)' },
                  { id: 'members', label: 'Members Only (Visible only to signed-in users)' },
                  { id: 'private', label: 'Private (Visible only to you)' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 p-3.5 hover:bg-[#1a1a1a] rounded-lg cursor-pointer transition-colors group">
                    <input 
                      type="radio" 
                      name="profileVisibility" 
                      checked={profileVisibility === opt.id} 
                      onChange={() => { setProfileVisibility(opt.id); markDirty(); }} 
                      className="w-4 h-4 accent-[#00BFFF] cursor-pointer" 
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Messaging Permissions Radio Group */}
            <div className="space-y-3">
              <label className="block text-[#888] text-[10px] font-bold uppercase tracking-[1px]">Messaging Permissions</label>
              <div className="bg-[#111] border border-white/5 rounded-xl p-2 space-y-1">
                {[
                  { id: 'everyone', label: 'Everyone (Including Public visitors)' },
                  { id: 'connections', label: 'Connections Only (People you are connected with)' },
                  { id: 'casting', label: 'Casting Directors Only' },
                  { id: 'none', label: 'No One' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 p-3.5 hover:bg-[#1a1a1a] rounded-lg cursor-pointer transition-colors group">
                    <input 
                      type="radio" 
                      name="messaging" 
                      checked={whoCanMessage === opt.id} 
                      onChange={() => { setWhoCanMessage(opt.id); markDirty(); }} 
                      className="w-4 h-4 accent-[#00BFFF] cursor-pointer" 
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Show Contact Info toggle */}
            <div className="flex items-center justify-between py-4 border-b border-[#222] group hover:bg-white/5 px-2 rounded-lg transition-colors">
              <div>
                <h4 className="text-sm font-medium text-white">Show Contact Info to Network</h4>
                <p className="text-xs text-[#888] mt-1">Make your email/phone visible to other verified members.</p>
              </div>
              <GoldenToggle enabled={showContactInfo} onChange={(v) => { setShowContactInfo(v); markDirty(); }} />
            </div>

            {/* Public Search Engine Indexing toggle */}
            <div className="flex items-center justify-between py-4 border-b border-[#222] group hover:bg-white/5 px-2 rounded-lg transition-colors">
              <div>
                <h4 className="text-sm font-medium text-white">Public Search Engine Indexing</h4>
                <p className="text-xs text-[#888] mt-1">Allow your profile to be found on Google and Bing.</p>
              </div>
              <GoldenToggle enabled={searchVisibility} onChange={(v) => { setSearchVisibility(v); markDirty(); }} />
            </div>

            <div className="pt-4">
              <SaveButton hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} saveSuccess={saveSuccess} />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6 hidden md:block">
              <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
              <p className="text-[#888] text-sm">Tune your alert routing to never miss an opportunity.</p>
            </div>

            {/* MESSAGES GROUP */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#00BFFF] uppercase tracking-[1px] border-b border-white/5 pb-2">Messages</h3>
              <div className="bg-[#111] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Direct Messages</h4>
                    <p className="text-xs text-[#888] mt-0.5">Receive alerts when someone sends you a direct message.</p>
                  </div>
                  <GoldenToggle enabled={notifMessages} onChange={(v) => { setNotifMessages(v); markDirty(); }} />
                </div>
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Typing Indicators</h4>
                    <p className="text-xs text-[#888] mt-0.5">Show real-time typing indicators in chat windows.</p>
                  </div>
                  <GoldenToggle enabled={notifTyping} onChange={(v) => { setNotifTyping(v); markDirty(); }} />
                </div>
              </div>
            </div>

            {/* CASTING GROUP */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#00BFFF] uppercase tracking-[1px] border-b border-white/5 pb-2">Casting & Auditions</h3>
              <div className="bg-[#111] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Casting Alerts</h4>
                    <p className="text-xs text-[#888] mt-0.5">Get notified immediately when a casting matches your physical attributes or skills.</p>
                  </div>
                  <GoldenToggle enabled={notifCasting} onChange={(v) => { setNotifCasting(v); markDirty(); }} />
                </div>
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Application Status</h4>
                    <p className="text-xs text-[#888] mt-0.5">Get updates when a casting director views or updates your audition application.</p>
                  </div>
                  <GoldenToggle enabled={notifAppStatus} onChange={(v) => { setNotifAppStatus(v); markDirty(); }} />
                </div>
              </div>
            </div>

            {/* SYSTEM GROUP */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#00BFFF] uppercase tracking-[1px] border-b border-white/5 pb-2">System & Updates</h3>
              <div className="bg-[#111] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Security Alerts</h4>
                    <p className="text-xs text-[#888] mt-0.5">Receive immediate notifications for new logins, password changes, or active session modifications.</p>
                  </div>
                  <GoldenToggle enabled={notifSecurity} onChange={(v) => { setNotifSecurity(v); markDirty(); }} />
                </div>
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Platform Updates</h4>
                    <p className="text-xs text-[#888] mt-0.5">Get notified about new features, service announcements, and maintenance schedules.</p>
                  </div>
                  <GoldenToggle enabled={notifUpdates} onChange={(v) => { setNotifUpdates(v); markDirty(); }} />
                </div>
              </div>
            </div>

            {/* MARKETING GROUP */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#00BFFF] uppercase tracking-[1px] border-b border-white/5 pb-2">Marketing</h3>
              <div className="bg-[#111] border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Newsletters</h4>
                    <p className="text-xs text-[#888] mt-0.5">Weekly digest of industry tips, member spotlights, and platform guides.</p>
                  </div>
                  <GoldenToggle enabled={notifNewsletters} onChange={(v) => { setNotifNewsletters(v); markDirty(); }} />
                </div>
                <div className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div>
                    <h4 className="text-sm font-medium text-white">Promotional Offers</h4>
                    <p className="text-xs text-[#888] mt-0.5">Receive discounts, partner deals, and pro upgrade campaign notifications.</p>
                  </div>
                  <GoldenToggle enabled={notifPromo} onChange={(v) => { setNotifPromo(v); markDirty(); }} />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <SaveButton hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} saveSuccess={saveSuccess} />
            </div>
          </div>
        );

      case 'premium':
        return (
          <div className="space-y-8 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6 hidden md:block">
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
            <div className="border-b border-white/5 pb-6 hidden md:block">
              <h2 className="text-2xl font-bold text-white mb-2">Security</h2>
              <p className="text-[#888] text-sm">Protect your identity, monitor session activity, and control connected services.</p>
            </div>

            {/* 1. Two-Factor Authentication (2FA) */}
            <section className="bg-[#111] border border-white/5 shadow-[0_0_15px_rgba(0,191,255,0.05)] rounded-2xl p-6 mb-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h4 className="text-white font-bold text-sm">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[#888] text-xs mt-1 leading-relaxed">Secure your account by requiring an OTP code or backup recovery code during login.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    twoFactor ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {twoFactor ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Step Renderers */}
              {twoFactorStep === 'status' && (
                <div className="space-y-4">
                  {twoFactor ? (
                    <div className="text-left space-y-2">
                      <p className="text-xs text-gray-300">
                        2FA is active via <strong className="text-white uppercase">{twoFactorMethod}</strong>.
                      </p>
                      {twoFactorMethod === 'sms' && (
                        <p className="text-[11px] text-gray-500 font-bold">Phone: {twoFactorPhone}</p>
                      )}
                      {twoFactorMethod === 'email' && (
                        <p className="text-[11px] text-gray-500 font-bold font-mono">Email: {twoFactorEmail}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorStep('disable_confirm');
                          setPasswordToDisable('');
                          setOtpValue('');
                          setOtpError('');
                          setOtpSent(false);
                        }}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all mt-2"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorStep('method');
                          setSelected2faMethod('sms');
                          setSetupPhone('+977');
                          setSetupEmail(user?.email || '');
                          setOtpValue('');
                          setOtpError('');
                          setOtpSent(false);
                        }}
                        className="px-5 py-2.5 bg-[#00BFFF] hover:bg-[#009cdb] text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Enable 2FA
                      </button>
                    </div>
                  )}
                </div>
              )}

              {twoFactorStep === 'method' && (
                <div className="space-y-4 text-left">
                  <p className="text-xs text-gray-400">Choose your primary authentication method:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      selected2faMethod === 'sms'
                        ? 'border-[#00BFFF] bg-[#00BFFF]/5'
                        : 'border-white/5 hover:bg-[#161617]'
                    }`}>
                      <input
                        type="radio"
                        name="2fa_method"
                        checked={selected2faMethod === 'sms'}
                        onChange={() => setSelected2faMethod('sms')}
                        className="mt-0.5 accent-[#00BFFF]"
                      />
                      <div>
                        <span className="block text-white text-xs font-bold">SMS / Phone OTP</span>
                        <span className="block text-gray-500 text-[10px] mt-0.5">Send a code to your Nepal phone number.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                      selected2faMethod === 'email'
                        ? 'border-[#00BFFF] bg-[#00BFFF]/5'
                        : 'border-white/5 hover:bg-[#161617]'
                    }`}>
                      <input
                        type="radio"
                        name="2fa_method"
                        checked={selected2faMethod === 'email'}
                        onChange={() => setSelected2faMethod('email')}
                        className="mt-0.5 accent-[#00BFFF]"
                      />
                      <div>
                        <span className="block text-white text-xs font-bold">Email OTP</span>
                        <span className="block text-gray-500 text-[10px] mt-0.5">Send a code to your account email.</span>
                      </div>
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setTwoFactorStep('status')}
                      className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorStep(selected2faMethod === 'sms' ? 'setup_sms' : 'setup_email');
                      }}
                      className="px-4 py-2 bg-[#00BFFF] hover:bg-[#009cdb] text-black rounded-xl text-xs font-bold transition-all"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {twoFactorStep === 'setup_sms' && (
                <div className="space-y-4 text-left">
                  <p className="text-xs text-gray-400">Enter your phone number with country code (+977 for Nepal):</p>
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="tel"
                      value={setupPhone}
                      onChange={(e) => setSetupPhone(e.target.value)}
                      placeholder="+977XXXXXXXXXX"
                      className="w-full bg-[#161617] border border-white/5 focus:border-[#00BFFF] text-white py-2.5 px-4 rounded-xl outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSendSetupOtp}
                      disabled={isSendingCode}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 gap-1.5"
                    >
                      {isSendingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Send Code
                    </button>
                  </div>

                  {otpSent && (
                    <div className="space-y-4 pt-2">
                      <p className="text-xs text-gray-400">Enter the 6-digit code sent to your phone:</p>
                      <OtpInput value={otpValue} onChange={setOtpValue} error={!!otpError} />
                      {otpError && <p className="text-red-500 text-[10px] font-bold">{otpError}</p>}

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handleVerifySetupOtp}
                          disabled={otpValue.length !== 6 || isVerifyingCode}
                          className="px-5 py-2.5 bg-[#00BFFF] disabled:bg-gray-600/30 disabled:text-gray-500 text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          {isVerifyingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={handleSendSetupOtp}
                          disabled={!resendActive || isSendingCode}
                          className="text-xs text-[#00BFFF] disabled:text-gray-600 font-bold transition-colors"
                        >
                          {resendActive ? 'Resend Code' : `Resend in ${countdown}s`}
                        </button>
                      </div>
                    </div>
                  )}

                  {!otpSent && (
                    <button
                      type="button"
                      onClick={() => setTwoFactorStep('method')}
                      className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all mt-2"
                    >
                      Back
                    </button>
                  )}
                </div>
              )}

              {twoFactorStep === 'setup_email' && (
                <div className="space-y-4 text-left">
                  <p className="text-xs text-gray-400">Confirm email address to receive OTP codes:</p>
                  <div className="flex gap-2 max-w-sm">
                    <input
                      type="email"
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-[#161617] border border-white/5 focus:border-[#00BFFF] text-white py-2.5 px-4 rounded-xl outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSendSetupOtp}
                      disabled={isSendingCode}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center flex-shrink-0 gap-1.5"
                    >
                      {isSendingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Send Code
                    </button>
                  </div>

                  {otpSent && (
                    <div className="space-y-4 pt-2">
                      <p className="text-xs text-gray-400">Enter the 6-digit code sent to your email:</p>
                      <OtpInput value={otpValue} onChange={setOtpValue} error={!!otpError} />
                      {otpError && <p className="text-red-500 text-[10px] font-bold">{otpError}</p>}

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={handleVerifySetupOtp}
                          disabled={otpValue.length !== 6 || isVerifyingCode}
                          className="px-5 py-2.5 bg-[#00BFFF] disabled:bg-gray-600/30 disabled:text-gray-500 text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          {isVerifyingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={handleSendSetupOtp}
                          disabled={!resendActive || isSendingCode}
                          className="text-xs text-[#00BFFF] disabled:text-gray-600 font-bold transition-colors"
                        >
                          {resendActive ? 'Resend Code' : `Resend in ${countdown}s`}
                        </button>
                      </div>
                    </div>
                  )}

                  {!otpSent && (
                    <button
                      type="button"
                      onClick={() => setTwoFactorStep('method')}
                      className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all mt-2"
                    >
                      Back
                    </button>
                  )}
                </div>
              )}

              {twoFactorStep === 'backup_codes' && (
                <div className="space-y-4 text-left">
                  <div className="flex items-center gap-2 text-green-400 font-bold text-xs uppercase tracking-wider">
                    <Check className="w-4 h-4" />
                    2FA is now enabled!
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Save these backup recovery codes. Each code can be used exactly once to log in if you lose access to your primary device.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#161617] border border-white/5 rounded-xl p-4 font-mono text-sm text-center text-white">
                    {backupCodes.map((code) => (
                      <span key={code} className="tracking-widest">{code}</span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadBackupCodes}
                      className="px-4 py-2 border border-[#00BFFF]/20 text-[#00BFFF] hover:bg-[#00BFFF]/5 rounded-xl text-xs font-bold transition-all"
                    >
                      Download Backup Codes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorStep('status');
                        setTwoFactor(true);
                      }}
                      className="px-4 py-2 bg-[#00BFFF] hover:bg-[#009cdb] text-black rounded-xl text-xs font-bold transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {twoFactorStep === 'disable_confirm' && (
                <div className="space-y-4 text-left">
                  <p className="text-xs text-red-400 font-bold">Disable Two-Factor Authentication</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Disabling 2FA reduces your account security. Please verify your current password to continue:
                  </p>
                  
                  <div className="max-w-sm">
                    <input
                      type="password"
                      value={passwordToDisable}
                      onChange={(e) => setPasswordToDisable(e.target.value)}
                      placeholder="Current Password"
                      className="w-full bg-[#161617] border border-white/5 focus:border-[#00BFFF] text-white py-2.5 px-4 rounded-xl outline-none text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFactorStep('status')}
                      className="px-4 py-2 border border-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendDisableOtp}
                      disabled={!passwordToDisable || isSendingCode}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {isSendingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Verify & Send Code
                    </button>
                  </div>
                </div>
              )}

              {twoFactorStep === 'disable_verify' && (
                <div className="space-y-4 text-left">
                  <p className="text-xs text-gray-400">
                    Enter the 6-digit OTP code sent to your configured device to finalize disabling 2FA:
                  </p>
                  <OtpInput value={otpValue} onChange={setOtpValue} error={!!otpError} />
                  {otpError && <p className="text-red-500 text-[10px] font-bold">{otpError}</p>}

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleVerifyDisableOtp}
                      disabled={otpValue.length !== 6 || isVerifyingCode}
                      className="px-5 py-2.5 bg-red-500 disabled:bg-gray-600/30 disabled:text-gray-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      {isVerifyingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Disable 2FA
                    </button>
                    <button
                      type="button"
                      onClick={handleSendDisableOtp}
                      disabled={!resendActive || isSendingCode}
                      className="text-xs text-[#00BFFF] disabled:text-gray-600 font-bold transition-colors"
                    >
                      {resendActive ? 'Resend Code' : `Resend in ${countdown}s`}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 2. Change Password */}
            <section className="bg-[#111] border border-white/5 rounded-2xl p-6 mb-5">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#00BFFF]" />
                Change Password
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-[1.5px] mb-2">
                    Current Password
                  </label>
                  <div className="relative max-w-lg">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#161617] border border-white/5 focus:border-[#00BFFF] text-white py-3 px-4 pr-12 rounded-xl outline-none text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-[1.5px] mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-[#161617] border border-white/5 focus:border-[#00BFFF] text-white py-3 px-4 pr-12 rounded-xl outline-none text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-[1.5px] mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#161617] border border-white/5 focus:border-[#00BFFF] text-white py-3 px-4 pr-12 rounded-xl outline-none text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {newPassword && (
                  <div className="max-w-lg space-y-3 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                        <span className="text-gray-500">Password Strength:</span>
                        <span className={
                          strengthInfo.label === 'Strong' ? 'text-green-400' :
                          strengthInfo.label === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                        }>
                          {strengthInfo.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${strengthInfo.color} transition-all duration-300`} 
                          style={{ width: `${strengthInfo.percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                      <RuleCheck label="At least 8 characters" checked={pwRules.length} />
                      <RuleCheck label="One uppercase letter" checked={pwRules.uppercase} />
                      <RuleCheck label="One number" checked={pwRules.number} />
                      <RuleCheck label="One special character" checked={pwRules.special} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="signOutOthers"
                    checked={signOutOthersAfterPasswordChange}
                    onChange={(e) => setSignOutOthersAfterPasswordChange(e.target.checked)}
                    className="rounded border-white/10 bg-[#161617] text-[#00BFFF] focus:ring-[#00BFFF] accent-[#00BFFF]"
                  />
                  <label htmlFor="signOutOthers" className="text-xs text-gray-400 cursor-pointer select-none">
                    Sign out of all other active sessions after changing password
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
                    className="px-6 py-3 bg-[#00BFFF] hover:bg-[#009cdb] text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChangingPassword ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </div>
            </section>

            {/* 3. Connected Accounts */}
            <section className="bg-[#111] border border-white/5 rounded-2xl p-6 mb-5">
              <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Connected Accounts
              </h3>
              <p className="text-[#888] text-xs mb-5">Link your social media accounts to sign in securely with one tap.</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-white/5 rounded-xl bg-[#161617]/50">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <div>
                      <span className="block text-white text-xs font-bold">Google Account</span>
                      <span className={`text-[10px] font-medium mt-0.5 inline-block ${
                        providers.some(p => p.providerId === 'google.com') ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {providers.some(p => p.providerId === 'google.com') ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  
                  {providers.some(p => p.providerId === 'google.com') ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnectProvider('google.com')}
                      disabled={providers.length <= 1}
                      className="px-3.5 py-1.5 border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all"
                      title={providers.length <= 1 ? "Cannot disconnect your last remaining login method." : ""}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnectProvider('google')}
                      className="px-4 py-1.5 bg-white text-black hover:bg-gray-200 rounded-lg text-xs font-bold transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 border border-white/5 rounded-xl bg-[#161617]/50">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <div>
                      <span className="block text-white text-xs font-bold">Facebook Account</span>
                      <span className={`text-[10px] font-medium mt-0.5 inline-block ${
                        providers.some(p => p.providerId === 'facebook.com') ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {providers.some(p => p.providerId === 'facebook.com') ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                  
                  {providers.some(p => p.providerId === 'facebook.com') ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnectProvider('facebook.com')}
                      disabled={providers.length <= 1}
                      className="px-3.5 py-1.5 border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all"
                      title={providers.length <= 1 ? "Cannot disconnect your last remaining login method." : ""}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnectProvider('facebook')}
                      className="px-4 py-1.5 bg-white text-black hover:bg-gray-200 rounded-lg text-xs font-bold transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Active Sessions */}
            <section className="bg-[#111] border border-white/5 rounded-2xl p-6 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-green-400" />
                  Active Sessions
                </h3>
                {sessions.length > 1 && (
                  <button 
                    onClick={handleSignOutAllOthers}
                    className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-lg border border-red-500/10 hover:border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors"
                  >
                    Sign Out All Other Devices
                  </button>
                )}
              </div>
              
              <div className="border border-white/5 bg-[#161617]/20 rounded-xl overflow-hidden divide-y divide-white/5">
                {sessions.map((sess) => {
                  const currentSessionId = localStorage.getItem('nc_session_id');
                  const isCurrent = sess.id === currentSessionId;
                  const isMobile = isMobileDevice(sess.os);
                  
                  return (
                    <div 
                      key={sess.id} 
                      className={`flex items-center justify-between p-4 ${
                        isCurrent ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${
                          isCurrent ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'
                        }`}>
                          {getDeviceIcon(sess.os)}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                            {sess.os} • {sess.browser}
                          </p>
                          {isCurrent ? (
                            <p className="text-[10px] text-green-500 font-bold border border-green-500/20 bg-green-500/10 px-2 py-0.5 rounded inline-block mt-1">This Device</p>
                          ) : (
                            <p className="text-[10px] text-gray-500 mt-1">
                              {formatLastActive(sess.lastActive)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xs text-gray-400 font-medium">{sess.location || "Unknown Location"}</p>
                        {!isCurrent && (
                          <button 
                            onClick={() => handleRevokeSession(sess.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all"
                          >
                            Sign Out
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

            {/* 5. Login History */}
            <section className="bg-[#111] border border-white/5 rounded-2xl p-6 mb-5">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-yellow-400" />
                Login History
              </h3>
              
              {loginHistory.slice(0, 10).some(item => item.suspicious === true) && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400 text-xs text-left">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-white">Suspicious Login Detected</span>
                    We noticed a successful login attempt from an unrecognized location in your recent history. If this was not you, please change your password and revoke other active sessions immediately.
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 text-gray-400 font-bold border-b border-white/5">
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Device & Browser</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-[#161617]/20">
                    {loginHistory.slice(0, 10).map((log) => {
                      const dt = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                      const isSuccess = log.status === 'success';
                      return (
                        <tr key={log.id} className={log.suspicious ? "bg-red-500/[0.02]" : ""}>
                          <td className="p-3 text-gray-300 font-mono">
                            {dt.toLocaleString()}
                          </td>
                          <td className="p-3 text-gray-300">
                            {log.os} • {log.browser}
                          </td>
                          <td className="p-3 text-gray-400">
                            {log.location || 'Unknown Location'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                              isSuccess 
                                ? log.suspicious ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/10 text-green-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {isSuccess ? log.suspicious ? 'Suspicious' : 'Success' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {loginHistory.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                          No login history available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 6. Danger Zone */}
            <section className="border border-red-500/20 bg-red-500/[0.02] rounded-2xl p-6">
              <h3 className="text-red-500 font-bold text-sm mb-2 uppercase tracking-wide">Danger Zone</h3>
              <p className="text-gray-500 text-xs mb-5">Actions here are permanent and can affect your access.</p>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-red-500/10">
                  <div>
                    <h4 className="text-white font-bold text-xs">Deactivate Account</h4>
                    <p className="text-gray-500 text-[11px] mt-0.5">Temporarily hide your profile. Reactivate anytime by logging back in.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleDeactivateAccount}
                    className="px-4 py-2 border border-red-500/20 hover:border-red-500/40 text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-all"
                  >
                    Deactivate
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
                  <div>
                    <h4 className="text-red-500 font-bold text-xs">Delete Account Permanently</h4>
                    <p className="text-red-500/60 text-[11px] mt-0.5">Permanently schedule your account for deletion. Includes a 30-day grace period.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setDeleteConfirmText("");
                      setDeleteConfirmPassword("");
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-red-500/10"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </section>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-8 animate-fade-in text-left pb-10">
            <div className="border-b border-white/5 pb-6 hidden md:block">
              <h2 className="text-2xl font-bold text-white mb-2">Data & Control</h2>
              <p className="text-[#888] text-sm">Destructive actions and data extraction.</p>
            </div>

            <div className="border border-white/5 bg-[#111] rounded-2xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-white font-bold text-sm mb-1">Download Archive</h4>
                  <p className="text-[#888] text-xs max-w-[280px] leading-relaxed">
                    Export a JSON file of your entire profile, messages, and uploaded media attachments.
                  </p>
                </div>
                <button 
                  onClick={handleRequestDataArchive}
                  disabled={isExporting}
                  className="text-white bg-[#151515] border border-[#333] px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#222] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? "Exporting..." : "Request Data Archive"}
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
    <>
      <ConfirmDialog
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Account Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-[#111] border border-red-500/20 max-w-md w-full rounded-2xl p-6 space-y-6 animate-scale-up text-left">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">Permanently Delete Account</h3>
            </div>
            
            <p className="text-gray-300 text-xs leading-relaxed">
              This will permanently delete your profile, media, messages, and all data. This action is irreversible. You will have a 30-day grace period to cancel the deletion before it becomes permanent.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-[1px] mb-2">
                  Type "DELETE" to confirm
                </label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-[#161617] border border-white/5 focus:border-red-500/50 text-white py-2.5 px-4 rounded-xl outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-[1px] mb-2">
                  Enter password to confirm
                </label>
                <input
                  type="password"
                  placeholder="Current Password"
                  value={deleteConfirmPassword}
                  onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                  className="w-full bg-[#161617] border border-white/5 focus:border-red-500/50 text-white py-2.5 px-4 rounded-xl outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText("");
                  setDeleteConfirmPassword("");
                }}
                className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestAccountDeletion}
                disabled={deleteConfirmText !== "DELETE" || !deleteConfirmPassword || isDeletingAccount}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-600/30 disabled:text-gray-500 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-[#0A0A0A] text-white pt-6 sm:pt-8 pb-32 md:pb-20 relative font-sans">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-8 md:px-8 flex flex-col md:flex-row items-start gap-8 md:gap-16">
          
          {/* LEFT SIDEBAR (Desktop: 280px width) */}
          <div className="w-[280px] flex-shrink-0 hidden md:block">
            <h1 className="text-3xl font-black tracking-tight mb-8">Settings</h1>
            
            <div className="flex flex-col gap-1.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                
                // Icon styling matching section
                let iconColor = "text-gray-400";
                if (isActive) {
                  iconColor = "text-[#00BFFF]";
                } else {
                  if (tab.id === 'account') iconColor = "text-gray-400";
                  else if (tab.id === 'profile') iconColor = "text-blue-400";
                  else if (tab.id === 'privacy') iconColor = "text-purple-400";
                  else if (tab.id === 'notifications') iconColor = "text-yellow-400";
                  else if (tab.id === 'security') iconColor = "text-green-400";
                  else if (tab.id === 'data') iconColor = "text-red-400";
                  else if (tab.id === 'premium') iconColor = "text-[#FACC15]";
                }

                return (
                  <button 
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all relative overflow-hidden group text-left ${
                      isActive 
                        ? 'bg-[#00BFFF]/[0.08] border-l-[3px] border-[#00BFFF] rounded-l-none' 
                        : 'bg-transparent border border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left relative z-10 transition-transform group-hover:translate-x-1 duration-300">
                      <span className={`text-lg sm:text-xl transition-all ${iconColor}`}>{tab.icon}</span>
                      <span className={`font-bold text-[14px] transition-all ${isActive ? 'text-[#00BFFF]' : 'text-[#888] group-hover:text-white'}`}>
                        {tab.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MOBILE MENU SCREEN (Visible on mobile when not in detail view) */}
          {!isMobileDetail && (
            <div className="w-full md:hidden flex flex-col gap-3 pt-2">
              <h1 className="text-3xl font-black tracking-tight mb-6 text-left">Settings</h1>
              <div className="flex flex-col gap-2">
                {tabs.map((tab) => {
                  let iconColor = "text-gray-400";
                  if (tab.id === 'account') iconColor = "text-gray-400";
                  else if (tab.id === 'profile') iconColor = "text-blue-400";
                  else if (tab.id === 'privacy') iconColor = "text-purple-400";
                  else if (tab.id === 'notifications') iconColor = "text-yellow-400";
                  else if (tab.id === 'security') iconColor = "text-green-400";
                  else if (tab.id === 'data') iconColor = "text-red-400";
                  else if (tab.id === 'premium') iconColor = "text-[#FACC15]";

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMobileDetail(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex items-center justify-between px-5 py-4 rounded-2xl bg-[#111] border border-white/5 active:bg-[#1a1a1a] transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className={`text-xl ${iconColor}`}>{tab.icon}</span>
                        <span className="font-bold text-[15px] text-white">
                          {tab.label}
                        </span>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT CONTENT PANEL (On desktop always, on mobile when isMobileDetail is true) */}
          <div className={`flex-1 w-full max-w-3xl ${!isMobileDetail ? 'hidden md:block' : ''}`}>
            {/* Mobile Navigation Header */}
            <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <button
                onClick={() => setIsMobileDetail(false)}
                className="flex items-center gap-1.5 text-sm font-bold text-[#00BFFF]"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
                Settings
              </button>
              <span className="font-black text-white text-[15px] tracking-tight uppercase">
                {tabs.find(t => t.id === activeTab)?.label || 'Settings'}
              </span>
              <div className="w-16" /> {/* Spacer to balance */}
            </div>

            {renderContent()}
          </div>

        </div>
      </div>

      {/* FLOATING ACTION BAR FOR DIRTY STATE */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#111]/90 backdrop-blur-xl border-t border-[#333] p-4 flex justify-center z-50 animate-slide-up shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-[1100px] w-full flex items-center justify-between px-4 sm:px-6 md:px-8">
            <div className="hidden sm:block text-left">
              <span className="text-sm font-bold text-white">Unsaved Changes</span>
              <p className="text-xs text-[#888] mt-0.5">Please save your profile modifications.</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto justify-end">
              <button 
                onClick={() => {
                  setHasChanges(false);
                  if (user?.uid) {
                    showToast('Discarded unsaved changes', 'info');
                  }
                }} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#888] hover:text-white hover:bg-white/5 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-[#00BFFF] text-black shadow-lg shadow-[#00BFFF]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper component to render password rule checklist item
const RuleCheck = ({ label, checked }) => {
  return (
    <div className="flex items-center gap-2 text-xs py-0.5">
      {checked ? (
        <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-white/20 ml-1.5 mr-1.5 flex-shrink-0" />
      )}
      <span className={checked ? "text-green-400" : "text-gray-500 font-medium"}>
        {label}
      </span>
    </div>
  );
};

// Helper function to return device icon based on OS
const getDeviceIcon = (os) => {
  if (!os) return <Monitor className="w-4 h-4" />;
  const lower = os.toLowerCase();
  if (lower.includes('android') || lower.includes('ios') || lower.includes('iphone') || lower.includes('mobile') || lower.includes('phone')) {
    return <Smartphone className="w-4 h-4" />;
  }
  if (lower.includes('ipad') || lower.includes('tablet') || lower.includes('kindle') || lower.includes('playbook')) {
    return <Tablet className="w-4 h-4" />;
  }
  return <Monitor className="w-4 h-4" />;
};

