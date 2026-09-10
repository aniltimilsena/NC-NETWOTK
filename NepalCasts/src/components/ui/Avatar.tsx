import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadProfileMedia } from '../../services';
import { useUser } from '@clerk/clerk-react';
import { subscribeToProfile } from '../../features/profile/services/profile';
import { notifyProfileUpdated } from '../../features/profile/services/users';
import { CurrentUser } from '../../utils/CurrentUser';
import { cacheManager } from '../../utils/cacheManager';

import { m as motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Trash2 } from 'lucide-react';

import ConfirmDialog from './ConfirmDialog';
import CropModal from './CropModal';
import { getOptimizedImageUrl, getAvatarOptimizedUrl } from '../../utils/media';
interface AvatarProps {
    src?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number | string;
    editable?: boolean;
    name?: string;
    className?: string;
    verified?: boolean;
    user?: any;
    gender?: string;
    userId?: string;
    showStatus?: boolean;
    status?: 'online' | 'busy' | 'offline' | 'in-call';
    onUploadSuccess?: (url: string) => any;
    showAlert?: (message: string, type?: any) => void;
}
export default function Avatar(props: AvatarProps) {
    const { src: propSrc, size = 'md', editable = false, name, className = '', verified = false, user: propUser, userId, showStatus = false, status = 'online' } = props;
    const { user: clerkUser } = useUser();
    const user = propUser || null;
    const [imageError, setImageError] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const targetId = userId || user?.id || user?.uid;
    const isSelf = editable || Boolean(targetId && user?.uid && targetId === user.uid);

    const [liveSrc, setLiveSrc] = useState<string | null>(null);
    const [liveName, setLiveName] = useState<string | undefined>(undefined);
    const [liveGender, setLiveGender] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!targetId) {
            setLiveSrc(null);
            setLiveName(undefined);
            setLiveGender(undefined);
            return;
        }
        const unsub = subscribeToProfile(targetId, (profileData) => {
            if (profileData) {
                const latestSrc = (profileData.image || profileData.photoURL || profileData.profileImage || profileData.avatar || profileData.photo || null) as string | null;
                setLiveSrc(latestSrc || ""); // empty string represents explicitly loaded but null
                setLiveName(profileData.name as string | undefined);
                setLiveGender(profileData.gender as string | undefined);
            } else {
                setLiveSrc("");
                setLiveName(undefined);
                setLiveGender(undefined);
            }
        });
        return () => unsub();
    }, [targetId]);

    const isDefaultImage = (url?: string | null) => {
        if (!url || typeof url !== 'string' || url.trim() === '')
            return true;
        const lower = url.toLowerCase();
        if (
            lower.includes('default-avatar') ||
            lower.includes('default-male') ||
            lower.includes('default-female') ||
            lower.includes('achyut.png') ||
            lower.includes('img.clerk.com') ||
            lower.includes('clerk.dev') ||
            lower.includes('googleusercontent.com') ||
            lower.includes('lh3.google') ||
            lower.startsWith('data:image/svg+xml')
        ) {
            return true;
        }
        return false;
    };

    const rawFallback = propSrc || user?.image || user?.photoURL || user?.profileImage || user?.avatar || user?.picture || user?.photo || null;
    const fallbackSrc = isDefaultImage(rawFallback) ? null : rawFallback;

    // When targetId (userId) is provided, prioritize the live profile status.
    // If the user has a photo, show liveSrc.
    // If liveSrc is explicitly empty string "" (user has no photo or deleted it), do not fall back to stale static propSrc.
    let resolvedSrc: string | null;
    if (targetId) {
        resolvedSrc = (liveSrc && !isDefaultImage(liveSrc)) ? liveSrc : null;
    } else {
        resolvedSrc = fallbackSrc;
    }

    const hasPhoto = Boolean(resolvedSrc && !isDefaultImage(resolvedSrc) && !imageError);
    const currentSrc = previewSrc || (hasPhoto ? resolvedSrc : null);
    const [imageLoaded, setImageLoaded] = useState(false);
    useEffect(() => {
        setImageLoaded(false);
        if (imgRef.current && imgRef.current.complete) {
            setImageLoaded(true);
        }
    }, [currentSrc]);
    useEffect(() => {
        setImageError(false);
        setPreviewSrc(null);
    }, [resolvedSrc]);
    const sizes: Record<string, string> = {
        xs: 'w-6 h-6 text-[8px]',
        sm: 'w-8 h-8 text-[10px]',
        md: 'w-12 h-12 text-sm',
        lg: 'w-20 h-20 text-xl',
        xl: 'w-32 h-32 text-3xl',
        '2xl': 'w-48 h-48 sm:w-64 sm:h-64 text-6xl',
        none: '',
    };
    const isNumberSize = typeof size === 'number';
    const sizeClass = isNumberSize ? '' : (sizes[size] || sizes.md);
    const sizeStyle = isNumberSize ? { width: `${size}px`, height: `${size}px` } : {};
    const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        window.dispatchEvent(new CustomEvent('nc-alert', { detail: { message, type } }));
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.size > 5 * 1024 * 1024) {
            triggerToast("Photo exceeds the 5MB size limit.", "error");
            return;
        }
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            triggerToast("Only JPG, PNG, and WEBP formats are allowed.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setCropSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
        if (e.target)
            e.target.value = '';
    };
    const handleCropConfirm = async (croppedFile: File) => {
        setCropSrc(null);
        const activeUserId = userId || user?.uid || user?.id;
        if (!activeUserId)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewSrc(reader.result as string);
        };
        reader.readAsDataURL(croppedFile);
        setUploading(true);
        setProgress(0);
        try {
            const avatarPath = `profiles/${activeUserId}/avatar_${Date.now()}.webp`;
            const rawUrl = await uploadProfileMedia(activeUserId, croppedFile, (percent: number) => {
                setProgress(Math.round(percent));
            }, avatarPath);
            if (rawUrl) {
                const downloadUrl = rawUrl.includes('?') ? `${rawUrl}&v=${Date.now()}` : `${rawUrl}?v=${Date.now()}`;
                setPreviewSrc(downloadUrl);
                setImageError(false);
                if (props.onUploadSuccess) {
                    await props.onUploadSuccess(downloadUrl);
                }
                if (activeUserId) {
                    try {
                        await setDoc(doc(db, 'profiles', activeUserId), {
                            image: downloadUrl,
                            photoURL: downloadUrl,
                            profileImage: downloadUrl,
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                        await setDoc(doc(db, 'users', activeUserId), {
                            image: downloadUrl,
                            photoURL: downloadUrl,
                            profileImage: downloadUrl,
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                    }
                    catch (e) {
                        console.warn("Avatar doc update warning:", e);
                    }
                }
                if (activeUserId) {
                    notifyProfileUpdated(activeUserId, downloadUrl);
                }

                // Sync avatar to Clerk so the Navbar UserButton reflects the new photo
                if (clerkUser) {
                    try {
                        const response = await fetch(downloadUrl);
                        const blob = await response.blob();
                        const file = new File([blob], 'avatar.webp', { type: blob.type || 'image/webp' });
                        await clerkUser.setProfileImage({ file });
                    } catch (clerkErr) {
                        console.warn('Could not sync avatar to Clerk:', clerkErr);
                    }
                }
            }
            else {
                throw new Error("Secure upload failed to return URL");
            }
        }
        catch (err) {
            console.error(err);
            setPreviewSrc(null);
            triggerToast("Upload failed, please try again", "error");
        }
        finally {
            setUploading(false);
        }
    };
    const handleConfirmDelete = async () => {
        setConfirmDeleteOpen(false);
        setUploading(true);
        setPreviewSrc(null);
        setLiveSrc("");
        CurrentUser.setImageUrl(null);
        const activeUserId = userId || user?.uid || user?.id;
        try {
            if (props.onUploadSuccess) {
                await props.onUploadSuccess("");
            }
            if (activeUserId) {
                try {
                    await setDoc(doc(db, 'profiles', activeUserId), {
                        image: "",
                        photoURL: "",
                        profileImage: "",
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                    await setDoc(doc(db, 'users', activeUserId), {
                        image: "",
                        photoURL: "",
                        profileImage: "",
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
                catch (e) {
                    console.warn("Avatar delete doc update warning:", e);
                }
                notifyProfileUpdated(activeUserId, "");
                cacheManager.invalidateCache(`profile_${activeUserId}`);
                cacheManager.invalidateCache(`profile_sub_${activeUserId}`);
            }
            // Sync removal to Clerk
            if (clerkUser) {
                try {
                    await clerkUser.setProfileImage({ file: null });
                } catch (clerkErr) {
                    console.warn('Could not remove avatar from Clerk:', clerkErr);
                }
            }
            triggerToast("Profile picture removed", "info");
        }
        catch (err) {
            console.error(err);
            triggerToast("Delete failed", "error");
        }
        finally {
            setUploading(false);
        }
    };
    const handleAvatarClick = () => {
        if (!editable || uploading)
            return;
        if (hasPhoto) {
            setShowOptionsModal(true);
        }
        else {
            fileInputRef.current?.click();
        }
    };
    return (<>
      <div onClick={handleAvatarClick} style={sizeStyle} className={`relative flex-shrink-0 rounded-full ${currentSrc ? 'border-0 ring-0' : 'border-2 border-white/10'} transition-all duration-300 select-none bg-gradient-to-b from-[#1E1E26] to-[#111116] ${sizeClass} ${className} ${editable ? 'cursor-pointer group/avatar' : ''}`}>
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center relative">
          {currentSrc ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 skeleton rounded-full" />}
              <img
                ref={imgRef}
                src={getAvatarOptimizedUrl(currentSrc, size)}
                alt={name || 'User avatar'}
                loading="lazy"
                decoding="async"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ease-in-out ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          ) : (
            <svg viewBox="0 0 100 100" fill="#5A5A75" className="w-2/3 h-2/3">
              <circle cx="50" cy="35" r="20"/>
              <ellipse cx="50" cy="85" rx="35" ry="25"/>
            </svg>
          )}

          
          {uploading && (<div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center rounded-full z-10 animate-fade-in">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-white/10" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path className="text-[#522C69] transition-all duration-300" strokeDasharray={`${progress}, 100`} strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span className="text-[10px] text-white font-extrabold tracking-tighter">
                  {progress}%
                </span>
              </div>
            </div>)}
        </div>

        
          {/* Subtle Hover overlay when editable */}
          {editable && !uploading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full z-10">
              <Camera className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          )}
        </div>

      
      {editable && (<input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp" className="hidden"/>)}

      
      <AnimatePresence>
        {showOptionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
              className="relative bg-[#0D0D12]/95 border border-white/10 rounded-2xl p-5 w-full max-w-[270px] shadow-[0_0_40px_rgba(0,0,0,0.9)] text-center overflow-hidden"
            >
              {/* Subtle top accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#522C69] to-transparent opacity-60" />

              {/* Header Icon & Text */}
              <div className="flex flex-col items-center gap-2 mb-4 pt-0.5">
                <div className="w-11 h-11 rounded-xl bg-[#522C69]/20 flex items-center justify-center text-white">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white leading-tight">Profile Photo</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Choose an action below</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-[#522C69] to-[#663782] hover:from-[#663782] hover:to-[#7a429c] text-white shadow-md font-bold rounded-xl text-xs transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border-0 outline-none"
                >
                  <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Upload New Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsModal(false);
                    setConfirmDeleteOpen(true);
                  }}
                  className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold border border-red-500/20 rounded-xl text-xs transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Remove Current Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOptionsModal(false)}
                  className="w-full py-1 text-gray-400 hover:text-white font-semibold rounded-xl text-[11px] transition-colors cursor-pointer mt-0.5"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      
      <ConfirmDialog isOpen={confirmDeleteOpen} title="Remove profile photo?" description="Are you sure you want to remove your profile picture? This action will set your avatar back to the default silhouette." confirmText="Remove" cancelText="Cancel" type="danger" onClose={() => setConfirmDeleteOpen(false)} onConfirm={handleConfirmDelete}/>

      {cropSrc && (<CropModal imageSrc={cropSrc} isCircular={true} onClose={() => setCropSrc(null)} onConfirm={handleCropConfirm}/>)}
    </>);
}
