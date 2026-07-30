import React, { useRef, useState, useEffect } from 'react';
import { Camera, Trash2, ChevronLeft, MapPin, MessageSquare, Star, Share2, MoreHorizontal, UserPlus, CheckCircle2 } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { uploadProfileMedia, updateProfileData } from '../../../services';
import { auth } from '../../../lib/firebase';
import type { UserProfile } from '../../../types';
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
    onFollowClick?: (type: 'followers' | 'following') => void;
}
export default function ProfileHeader({ profile, isOwnProfile, isFollowing, followerCount, followingCount, savedCount, onFollowToggle, onNavigate, showAlert, onFollowClick }: ProfileHeaderProps) {
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [coverUploadProgress, setCoverUploadProgress] = useState(0);
    const [showCoverMenu, setShowCoverMenu] = useState(false);
    const [confirmDeleteCoverOpen, setConfirmDeleteCoverOpen] = useState(false);
    const [isDeletingCover, setIsDeletingCover] = useState(false);
    const [localCover, setLocalCover] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.coverImage) {
            setLocalCover(profile.coverImage);
        }
    }, [profile?.coverImage]);

    useEffect(() => {
        if (!showCoverMenu)
            return;
        const close = () => setShowCoverMenu(false);
        document.addEventListener('click', close, { once: true });
        return () => document.removeEventListener('click', close);
    }, [showCoverMenu]);
    const avatarUrl = (profile as any)?.profileImage || profile?.photoURL || profile?.image || (profile as any)?.avatar || (profile as any)?.photo || (isOwnProfile ? auth.currentUser?.photoURL : null);
    const activeCover = localCover || profile.coverImage || (profile as any)?.coverPhoto;
    const validCover = activeCover && activeCover !== '/hero-bg.png' ? activeCover : null;
    const coverImage = validCover || '/hero-bg.png';
    const canEditCover = isOwnProfile || Boolean(auth.currentUser?.uid && profile?.uid && (auth.currentUser.uid === profile.uid || auth.currentUser.uid === (profile as any).id));
    const isPremiumUser = Boolean(
        profile?.isPremium || 
        profile?.premium || 
        (profile as any)?.isPro || 
        (isOwnProfile && (auth.currentUser as any)?.premium) || 
        (isOwnProfile && (auth.currentUser as any)?.isPremium)
    );
    const name = profile.name || 'Discovery Talent';
    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: name,
                    text: `Check out ${name}'s profile on NepalCasts!`,
                    url: window.location.href,
                });
            }
            catch {
            }
        }
        else {
            await navigator.clipboard.writeText(window.location.href);
            showAlert('Link Copied', 'info', 'Profile link copied to clipboard.');
        }
    };
    const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const targetUid = profile?.uid || (profile as any)?.id || auth.currentUser?.uid;
        if (!file || !targetUid)
            return;
        if (file.size > 10 * 1024 * 1024) {
            showAlert('File Too Large', 'error', 'Cover image exceeds the 10MB size limit.');
            return;
        }
        setIsUploadingCover(true);
        setCoverUploadProgress(0);
        try {
            const url = await uploadProfileMedia(targetUid, file, (progress: number) => {
                setCoverUploadProgress(Math.round(progress));
            });
            if (url) {
                setLocalCover(url);
                await updateProfileData(targetUid, { coverImage: url });
                showAlert('Cover Image Updated', 'success');
            }
            else {
                throw new Error("Failed to upload cover banner.");
            }
        }
        catch (err: any) {
            console.error(err);
            showAlert('Upload Failed', 'error', err.message || 'Failed to upload cover banner.');
        }
        finally {
            setIsUploadingCover(false);
            if (e.target)
                e.target.value = '';
        }
    };
    const handleDeleteCover = async () => {
        const targetUid = profile?.uid || (profile as any)?.id || auth.currentUser?.uid;
        if (!targetUid)
            return;
        setIsDeletingCover(true);
        try {
            setLocalCover(null);
            await updateProfileData(targetUid, { coverImage: '' });
            showAlert('Cover Removed', 'info', 'Profile cover image has been removed.');
        }
        catch (err: any) {
            showAlert('Error', 'error', 'Failed to remove cover image.');
        }
        finally {
            setIsDeletingCover(false);
            setConfirmDeleteCoverOpen(false);
        }
    };
    return (<div className="relative font-sans select-none">
      
      <div className="block h-[180px] sm:h-[240px] relative w-full overflow-hidden bg-nc-dark-900">
        <img src={coverImage} alt="Cover" className="w-full h-full object-cover object-center select-none"/>
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent"/>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none"/>

        
        <button onClick={() => onNavigate('back')} className="absolute top-4 left-4 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/15 active:scale-95 z-20 shrink-0 cursor-pointer shadow-lg" aria-label="Back">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5}/>
        </button>



        
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5">
          <button onClick={handleShare} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 hover:bg-black/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all" title="Share Profile">
            <Share2 className="w-4 h-4 text-white"/>
          </button>

          {canEditCover && (<div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowCoverMenu(v => !v)} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 hover:bg-black/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer" title="Edit Cover Photo">
                <MoreHorizontal className="w-5 h-5 text-white"/>
              </button>

              {showCoverMenu && (<div className="absolute top-12 right-0 bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[170px] z-30">
                  <button type="button" className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors text-left" onClick={() => { setShowCoverMenu(false); coverFileInputRef.current?.click(); }}>
                    <Camera className="w-4 h-4 text-[#00BFFF]"/>
                    <span className="text-[13px] font-semibold text-white">Change Cover</span>
                  </button>
                  <div className="h-px bg-white/5 mx-3"/>
                  <button type="button" onClick={() => { setShowCoverMenu(false); setConfirmDeleteCoverOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-950/30 active:bg-red-950/50 transition-colors cursor-pointer text-left">
                    <Trash2 className="w-4 h-4 text-red-400"/>
                    <span className="text-[13px] font-semibold text-red-400">Delete Cover</span>
                  </button>
                </div>)}
            </div>)}
        </div>

        {isUploadingCover && (<div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-30">
            <div className="max-w-xs w-full px-6 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#00BFFF] font-black animate-pulse uppercase tracking-wider">Uploading Cover...</span>
                <span className="text-white font-black">{coverUploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-[#00BFFF] transition-all duration-150 rounded-full" style={{ width: `${coverUploadProgress}%` }}/>
              </div>
            </div>
          </div>)}

        {canEditCover && (<input type="file" id="cover-file-input" ref={coverFileInputRef} onChange={handleCoverFileChange} accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp" className="hidden"/>)}
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-24 sm:-mt-28 relative z-20 flex flex-col items-center text-center">
        <div className="relative z-10 mb-3">
          <Avatar 
            user={profile}
            src={(profile as any)?.profileImage || profile?.photoURL || profile?.image || (profile as any)?.avatar || (profile as any)?.photo || (isOwnProfile ? auth.currentUser?.photoURL : null)} 
            gender={profile.gender || ''} 
            name={name} 
            size="none" 
            editable={isOwnProfile} 
            userId={profile.uid} 
            showStatus={profile.isOnline === true} 
            status={profile.isOnline === true ? 'online' : 'offline'} 
            onUploadSuccess={(url: string) => updateProfileData(auth.currentUser?.uid || profile.uid, { image: url, photoURL: url, profileImage: url })} 
            showAlert={showAlert} 
            className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-[#0A0A0F] shadow-2xl ring-2 ring-white/15"
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2 flex items-center justify-center gap-2.5 flex-wrap">
          <span>{name}</span>
          {isPremiumUser && (
            <span className="px-3 py-0.5 rounded-md badge-premium-shimmer font-black text-[10px] sm:text-xs tracking-widest uppercase no-scale">
              PREMIUM
            </span>
          )}
        </h1>

        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {profile.verified !== false && (
            <span className="px-2.5 py-0.5 rounded-full badge-verified-seal text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 no-scale">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00BFFF] fill-[#00BFFF]"/>
              <span>VERIFIED</span>
            </span>
          )}
          {profile.openToWork && (<span className="px-2.5 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] text-[9px] font-extrabold tracking-wider uppercase border border-[#00BFFF]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse"/>
              OPEN TO WORK
            </span>)}
        </div>

        
        {!isOwnProfile && (<div className="w-full max-w-sm flex items-center gap-3 mb-6">
            <button onClick={onFollowToggle} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all active:scale-95 ${isFollowing
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                : 'bg-white/[0.06] border-white/10 hover:bg-white/10 text-white'}`}>
              <UserPlus className="w-4 h-4 text-white/80"/>
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>

            <button onClick={() => onNavigate('messages', profile.uid)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/40 hover:bg-[#00BFFF]/20 text-[#00BFFF] text-sm font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(0,191,255,0.15)]">
              <MessageSquare className="w-4 h-4 text-[#00BFFF]"/>
              <span>Message</span>
            </button>
          </div>)}

        
        <div className={`grid grid-cols-3 divide-x divide-white/10 w-full max-w-md mx-auto py-2 my-2 ${isOwnProfile ? 'mt-4' : ''}`}>
          <div onClick={() => isOwnProfile && onFollowClick?.('followers')} className={`group/followers flex flex-col items-center justify-center text-center py-1 transition-all ${isOwnProfile ? 'cursor-pointer' : ''}`}>
            <span className="text-white group-hover/followers:text-[#00BFFF] text-xl sm:text-2xl font-black transition-colors">
              {followerCount !== undefined ? followerCount : 0}
            </span>
            <span className="text-gray-400 group-hover/followers:text-white text-[10px] uppercase tracking-widest font-semibold mt-1 transition-colors">
              Followers
            </span>
          </div>

          <div onClick={() => isOwnProfile && onFollowClick?.('following')} className={`group/following flex flex-col items-center justify-center text-center py-1 transition-all ${isOwnProfile ? 'cursor-pointer' : ''}`}>
            <span className="text-white group-hover/following:text-[#00BFFF] text-xl sm:text-2xl font-black transition-colors">
              {followingCount !== undefined ? followingCount : 0}
            </span>
            <span className="text-gray-400 group-hover/following:text-white text-[10px] uppercase tracking-widest font-semibold mt-1 transition-colors">
              Following
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center py-1">
            <span className="text-amber-400 text-xl sm:text-2xl font-black flex items-center justify-center gap-1.5">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400"/>
              {profile.rating ? (typeof profile.rating === 'number' ? profile.rating.toFixed(1) : profile.rating) : '0.0'}
            </span>
            <span className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold mt-1">
              Rating
            </span>
          </div>
        </div>
      </div>

      
      <ConfirmDialog isOpen={confirmDeleteCoverOpen} title="Remove Cover Image?" description="Are you sure you want to remove your profile banner background?" confirmText="Remove Cover" cancelText="Cancel" type="danger" isLoading={isDeletingCover} onClose={() => setConfirmDeleteCoverOpen(false)} onConfirm={handleDeleteCover}/>
    </div>);
}
