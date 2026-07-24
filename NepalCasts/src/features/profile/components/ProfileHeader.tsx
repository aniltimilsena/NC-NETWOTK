import React, { useRef, useState, useEffect } from 'react';
import { Camera, Trash2, ChevronLeft, ShieldCheck, MapPin, MessageSquare, Star } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import { uploadProfileMedia, updateProfileData } from '../../../services';
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

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  followerCount,
  followingCount,
  savedCount,
  onFollowToggle,
  onNavigate,
  showAlert,
  onFollowClick
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

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile.uid) return;

    if (file.size > 10 * 1024 * 1024) {
      showAlert('File Too Large', 'error', 'Cover image exceeds the 10MB size limit.');
      return;
    }

    setIsUploadingCover(true);
    setCoverUploadProgress(0);
    try {
      const url = await uploadProfileMedia(profile.uid, file, (progress: number) => {
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
    if (!profile.uid) return;
    try {
      await updateProfileData(profile.uid, { coverImage: null });
      showAlert('Cover Image Removed', 'info');
    } catch (err: any) {
      showAlert('Error', 'error', 'Failed to remove cover image.');
    }
  };

  return (
    <div className="relative">
      {/* Cover Banner */}
      <div className="block h-[140px] sm:h-[180px] relative w-full overflow-hidden bg-nc-dark-900">
        <img
          src={coverImage}
          alt="Cover"
          className="w-full h-full object-cover select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => onNavigate('back')}
          className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all border border-white/10 active:scale-95 z-20 shrink-0 cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>

        {isOwnProfile && (
          <div className="absolute top-4 right-4 z-20" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowCoverMenu(v => !v)}
              className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              title="Edit Cover Photo"
            >
              <Camera className="w-4 h-4 text-[#00BFFF]" />
            </button>

            {showCoverMenu && (
              <div className="absolute top-12 right-0 bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl min-w-[170px] z-30">
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

      {/* Hero Profile Card */}
      <div className="max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 relative -mt-10 sm:-mt-20 z-10">
        <div className="studio-card studio-card-cyan p-6 sm:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
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

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{name}</h1>
                {profile.verified && <ShieldCheck className="w-6 h-6 text-[#00BFFF]" />}
                {profile.openToWork && (
                  <span className="px-3 py-1 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] text-[10px] font-extrabold tracking-wider uppercase border border-[#00BFFF]/30 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#00BFFF] animate-pulse" />
                    OPEN TO WORK
                  </span>
                )}
              </div>

              <div className="text-gray-400 text-sm flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 font-semibold">
                <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">{role}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 hidden sm:inline" />
                <span className="flex items-center gap-1.5 text-gray-300">
                  <MapPin className="w-4 h-4 text-[#00BFFF]" />
                  {location}
                </span>
              </div>
            </div>

            {/* Actions */}
            {!isOwnProfile && (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                <Button
                  variant={isFollowing ? 'secondary' : 'primary'}
                  onClick={() => onFollowToggle()}
                  className="flex-1 sm:flex-initial min-w-[130px] font-black uppercase tracking-wider text-xs"
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate('messages', profile.uid)}
                  className="flex-shrink-0 flex items-center justify-center !p-0 w-11 h-11 border-white/15 hover:border-white/30 rounded-2xl bg-white/5"
                  aria-label="Message"
                >
                  <MessageSquare className="w-5 h-5 text-gray-200" />
                </Button>
              </div>
            )}
          </div>

          {/* Widescreen Stats Bar */}
          <div className={`grid gap-3 mt-8 pt-6 border-t border-white/10 w-full ${(isOwnProfile && savedCount > 0) ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div
              onClick={() => isOwnProfile && onFollowClick?.('followers')}
              className={`flex flex-col items-center justify-center text-center py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 transition-all ${isOwnProfile ? 'cursor-pointer hover:bg-white/5 hover:border-white/15' : ''}`}
            >
              <span className="text-white text-2xl font-black">{followerCount}</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-widest font-extrabold mt-0.5">Followers</span>
            </div>
            <div
              onClick={() => isOwnProfile && onFollowClick?.('following')}
              className={`flex flex-col items-center justify-center text-center py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 transition-all ${isOwnProfile ? 'cursor-pointer hover:bg-white/5 hover:border-white/15' : ''}`}
            >
              <span className="text-white text-2xl font-black">{followingCount}</span>
              <span className="text-gray-400 text-[10px] uppercase tracking-widest font-extrabold mt-0.5">Following</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center py-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-amber-400 text-2xl font-black flex items-center justify-center gap-1">
                {profile.rating || 0}
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              </span>
              <span className="text-gray-400 text-[10px] uppercase tracking-widest font-extrabold mt-0.5">Rating</span>
            </div>
            {isOwnProfile && savedCount > 0 && (
              <div className="flex flex-col items-center justify-center text-center py-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <span className="text-white text-2xl font-black">{savedCount}</span>
                <span className="text-gray-400 text-[10px] uppercase tracking-widest font-extrabold mt-0.5">Saved</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
