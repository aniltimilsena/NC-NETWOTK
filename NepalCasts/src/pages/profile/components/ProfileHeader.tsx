import React, { useRef, useState, useEffect } from 'react';
import { Camera, Trash2, ChevronLeft, ShieldCheck, Mail, Phone, MapPin, Eye, Search, MessageSquare, Award } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import { uploadProfileMedia, updateProfileData } from '../../../services/profile';
import type { UserProfile } from '../../../types';
import { db } from '../../../lib/firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  savedCount: number;
  onFollowToggle: () => void;
  onNavigate: (page: string, param?: any) => void;
  showAlert: (message: string, type?: any, detail?: string, action?: any) => void;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  followerCount,
  followingCount,
  savedCount,
  onFollowToggle,
  onNavigate,
  showAlert
}: ProfileHeaderProps) {
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [showCoverMenu, setShowCoverMenu] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showCoverMenu) return;
    const close = () => setShowCoverMenu(false);
    document.addEventListener('click', close, { once: true });
    return () => document.removeEventListener('click', close);
  }, [showCoverMenu]);

  const coverImage = profile.coverImage || '/hero-bg.png';
  const name = profile.name || 'Discovery Talent';
  const role = profile.role || 'New User';
  const location = profile.location || 'Not Specified';
  const premium = profile.verified || false; // Or tier status

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showAlert('File Too Large', 'error', 'Cover image exceeds the 10MB size limit.');
      return;
    }

    setIsUploadingCover(true);
    setCoverUploadProgress(0);
    try {
      const url = await uploadProfileMedia(profile.uid, file, (progress) => {
        setCoverUploadProgress(Math.round(progress));
      });
      if (url) {
        await updateProfileData(profile.uid, { coverImage: url });
        showAlert('Cover Image Updated', 'success');
      } else {
        throw new Error("Failed to upload cover banner.");
      }
    } catch (err: any) {
      console.error(err);
      showAlert('Upload Failed', 'error', err.message || 'Failed to upload cover banner.');
    } finally {
      setIsUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteCover = async () => {
    try {
      await updateProfileData(profile.uid, { coverImage: null });
      showAlert('Cover Image Removed', 'info');
    } catch (err: any) {
      showAlert('Error', 'error', 'Failed to remove cover image.');
    }
  };

  const trackProfileClick = async () => {
    if (isOwnProfile) return;
    try {
      const clickRef = doc(db, "profiles", profile.uid, "analytics", "views");
      await setDoc(clickRef, {
        profileClicks: increment(1)
      }, { merge: true });
    } catch (err) {
      console.warn("Failed to increment click analytics:", err);
    }
  };

  return (
    <div className="relative">
      <div className="block h-[130px] sm:h-[160px] relative w-full overflow-hidden bg-nc-dark-900">
        <img 
          src={coverImage} 
          alt="Cover" 
          className="w-full h-full object-cover select-none" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        
        {/* Back Arrow */}
        <button
          onClick={() => onNavigate('back')}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white transition-colors border border-white/10"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
 
         {isOwnProfile && (
           <div className="absolute top-3 right-3 z-20" onClick={e => e.stopPropagation()}>
             {/* Camera icon trigger */}
             <button
               onClick={() => setShowCoverMenu(v => !v)}
               className="w-9 h-9 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
               title="Edit Cover Photo"
             >
               <Camera className="w-4 h-4 text-[#00BFFF]" />
             </button>

             {/* Dropdown menu */}
             {showCoverMenu && (
               <div className="absolute top-11 right-0 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[160px]">
                 <label
                   htmlFor="cover-file-input"
                   className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                   onClick={() => setShowCoverMenu(false)}
                 >
                   <Camera className="w-4 h-4 text-[#00BFFF]" />
                   <span className="text-[13px] font-semibold text-white">Change Cover</span>
                 </label>
                 {profile.coverImage && profile.coverImage !== '/hero-bg.png' && (
                   <>
                     <div className="h-px bg-white/5 mx-3" />
                     <button
                       onClick={() => { handleDeleteCover(); setShowCoverMenu(false); }}
                       className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-950/30 active:bg-red-950/50 transition-colors"
                     >
                       <Trash2 className="w-4 h-4 text-red-400" />
                       <span className="text-[13px] font-semibold text-red-400">Delete Cover</span>
                     </button>
                   </>
                 )}
               </div>
             )}
           </div>
         )}
 
         {isUploadingCover && (
           <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-30">
             <div className="max-w-xs w-full px-6 space-y-2">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-[#00BFFF] font-black animate-pulse uppercase tracking-wider">Uploading Cover...</span>
                 <span className="text-white font-black">{coverUploadProgress}%</span>
               </div>
               <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                 <div
                   className="absolute inset-y-0 left-0 bg-[#00BFFF] transition-all duration-150 rounded-full"
                   style={{ width: `${coverUploadProgress}%` }}
                 />
               </div>
             </div>
           </div>
         )}
 
         {isOwnProfile && (
           <input
             type="file"
             id="cover-file-input"
             ref={coverFileInputRef}
             onChange={handleCoverFileChange}
             accept="image/jpeg,image/png,image/webp"
             className="hidden"
           />
         )}
       </div>
 
       {/* Hero Header Card */}
       <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 relative -mt-10 sm:-mt-24 z-10">
         <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.5rem] p-5 sm:p-7 shadow-2xl">
           <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
             {/* Avatar */}
             <div className="relative flex-shrink-0">
               <Avatar 
                 src={profile.image}
                 gender={profile.gender || ''}
                 name={name}
                 size="lg"
                 editable={isOwnProfile}
                 userId={profile.uid}
                 onUploadSuccess={(url: string) => updateProfileData(profile.uid, { image: url })}
                 showAlert={showAlert}
               />
             </div>
 
             {/* Info */}
             <div className="flex-1 space-y-1">
               <div className="flex items-center gap-2 flex-wrap">
                 <h1 className="text-2xl sm:text-3xl font-black text-white">{name}</h1>
                 {profile.verified && <ShieldCheck className="w-6 h-6 text-[#00BFFF]" />}
                 {profile.openToWork && (
                   <span className="text-[9px] font-black tracking-widest bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 uppercase px-2 py-0.5 rounded-full">
                     Open To Work
                   </span>
                 )}
               </div>
 
               <div className="text-nc-muted text-sm flex flex-wrap items-center gap-x-4 gap-y-1.5 font-medium">
                 <span className="text-white font-bold">{role}</span>
                 <span className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:inline" />
                 <span className="flex items-center gap-1.5">
                   <MapPin className="w-4 h-4 text-[#00BFFF]" />
                   {location}
                 </span>
               </div>
             </div>
 
             {/* Actions */}
             {!isOwnProfile && (
               <div className="flex items-center gap-3 w-full sm:w-auto">
                 <Button
                   variant={isFollowing ? 'secondary' : 'primary'}
                   onClick={() => { trackProfileClick(); onFollowToggle(); }}
                   className="flex-1 sm:flex-initial"
                 >
                   {isFollowing ? 'Following' : 'Follow'}
                 </Button>
                 <Button
                   variant="outline"
                   onClick={() => { trackProfileClick(); onNavigate('messages', profile.uid); }}
                   className="flex-1 sm:flex-initial"
                 >
                   Message
                 </Button>
               </div>
             )}
           </div>

          {/* Stats Bar */}
          <div className={`grid gap-2 mt-6 pt-4 border-t border-white/5 w-full ${(isOwnProfile && savedCount > 0) ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="flex flex-col items-center justify-center text-center py-1">
              <span className="text-white text-lg font-black">{followerCount}</span>
              <span className="text-nc-muted text-[10px] uppercase tracking-wider font-bold">Followers</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center py-1 border-l border-white/5">
              <span className="text-white text-lg font-black">{followingCount}</span>
              <span className="text-nc-muted text-[10px] uppercase tracking-wider font-bold">Following</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center py-1 border-l border-white/5">
              <span className="text-white text-lg font-black">{profile.rating || 0} ★</span>
              <span className="text-nc-muted text-[10px] uppercase tracking-wider font-bold">Rating</span>
            </div>
            {isOwnProfile && savedCount > 0 && (
              <div className="flex flex-col items-center justify-center text-center py-1 border-l border-white/5">
                <span className="text-white text-lg font-black">{savedCount}</span>
                <span className="text-nc-muted text-[10px] uppercase tracking-wider font-bold">Saved</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
