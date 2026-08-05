import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadProfileMedia } from '../../services';
import { useUser } from '@clerk/clerk-react';

import ConfirmDialog from './ConfirmDialog';
import CropModal from './CropModal';
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
    const targetId = userId || user?.id || user?.uid;
    const isSelf = editable || Boolean(targetId && user?.uid && targetId === user.uid);
    const resolvedSrc = propSrc || user?.photoURL || user?.profileImage || user?.image || user?.avatar || user?.picture || user?.photo || null;

    const isDefaultImage = (url?: string | null) => {
        if (!url)
            return true;
        return url.includes('default-avatar.png') ||
            url.includes('default-male.png') ||
            url.includes('default-female.png') ||
            url.includes('achyut.png') ||
            url.startsWith('data:image/svg+xml') ||
            url.includes('img.clerk.com');
    };
    const hasPhoto = resolvedSrc && !isDefaultImage(resolvedSrc) && !imageError;
    const currentSrc = previewSrc || (hasPhoto ? resolvedSrc : null);
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
            const avatarPath = `profiles/${activeUserId}/avatar.webp`;
            const downloadUrl = await uploadProfileMedia(activeUserId, croppedFile, (percent: number) => {
                setProgress(Math.round(percent));
            }, avatarPath);
            if (downloadUrl) {
                setPreviewSrc(downloadUrl);
                setImageError(false);
                if (props.onUploadSuccess) {
                    await props.onUploadSuccess(downloadUrl);
                } else if (activeUserId) {
                    try {
                        await setDoc(doc(db, 'profiles', activeUserId), {
                            image: downloadUrl,
                            photoURL: downloadUrl,
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                    }
                    catch (e) {
                        console.warn("Avatar doc update warning:", e);
                    }
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

                triggerToast("Profile picture updated successfully!", "success");
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
        const activeUserId = userId || user?.uid || user?.id;
        try {
            if (props.onUploadSuccess) {
                await props.onUploadSuccess("");
            }
            else if (activeUserId) {
                try {
                    await setDoc(doc(db, 'profiles', activeUserId), {
                        image: null,
                        photoURL: null,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
                catch (e) {
                    console.warn("Avatar delete doc update warning:", e);
                }
            }
            // Sync removal to Clerk
            if (clerkUser) {
                try {
                    await clerkUser.setProfileImage({ file: null });
                } catch (clerkErr) {
                    console.warn('Could not remove avatar from Clerk:', clerkErr);
                }
            }
            setPreviewSrc(null);
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
      <div onClick={handleAvatarClick} style={sizeStyle} className={`relative flex-shrink-0 rounded-full border-2 border-nc-accent/20 transition-all duration-300 select-none bg-gradient-to-b from-[#1E1E26] to-[#111116] ${sizeClass} ${className} ${editable ? 'cursor-pointer hover:border-nc-accent group/avatar' : ''}`}>
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
          {currentSrc ? (<img src={currentSrc} alt={name || 'User avatar'} loading="lazy" decoding="async" onError={() => setImageError(true)} className="w-full h-full object-cover transition-opacity duration-300 ease-in-out opacity-100"/>) : (<svg viewBox="0 0 100 100" fill="#5A5A75" className="w-2/3 h-2/3">
              <circle cx="50" cy="35" r="20"/>
              <ellipse cx="50" cy="85" rx="35" ry="25"/>
            </svg>)}

          
          {uploading && (<div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center rounded-full z-10 animate-fade-in">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-white/10" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path className="text-[#00BFFF] transition-all duration-300" strokeDasharray={`${progress}, 100`} strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span className="text-[10px] text-white font-extrabold tracking-tighter">
                  {progress}%
                </span>
              </div>
            </div>)}
        </div>

        
        {editable && !uploading && (<div className="absolute bottom-0 right-0 p-2 bg-black/80 hover:bg-black text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl border border-white/25 backdrop-blur-md z-20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </div>)}

        {verified && (<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00BFFF] rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg ring-2 ring-nc-dark z-20">
            ✓
          </div>)}

        {showStatus && status && status !== 'offline' && !editable && (<div className="absolute bottom-0 right-0 z-20 flex items-center justify-center">
            <span className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full ring-2 ring-[#0A0A0F] shadow-lg ${status === 'in-call'
                ? 'bg-[#00BFFF] shadow-[0_0_10px_rgba(0,191,255,0.9)] animate-pulse'
                : status === 'busy'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-pulse'}`}/>
          </div>)}
      </div>

      
      {editable && (<input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp" className="hidden"/>)}

      
      {showOptionsModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-xs space-y-4 shadow-2xl text-center">
            <h3 className="text-white font-black text-base uppercase tracking-wider">Profile Photo</h3>
            <p className="text-gray-400 text-xs">Would you like to upload a new profile picture or remove the current one?</p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button type="button" onClick={() => {
                setShowOptionsModal(false);
                fileInputRef.current?.click();
            }} className="w-full py-3 bg-[#00BFFF] hover:opacity-95 text-[#0A0A0A] font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer">
                Upload New Photo
              </button>
              <button type="button" onClick={() => {
                setShowOptionsModal(false);
                setConfirmDeleteOpen(true);
            }} className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold border border-red-500/10 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer">
                Remove Current Photo
              </button>
              <button type="button" onClick={() => setShowOptionsModal(false)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>)}

      
      <ConfirmDialog isOpen={confirmDeleteOpen} title="Remove profile photo?" description="Are you sure you want to remove your profile picture? This action will set your avatar back to the default silhouette." confirmText="Remove" cancelText="Cancel" type="danger" onClose={() => setConfirmDeleteOpen(false)} onConfirm={handleConfirmDelete}/>

      {cropSrc && (<CropModal imageSrc={cropSrc} isCircular={true} onClose={() => setCropSrc(null)} onConfirm={handleCropConfirm}/>)}
    </>);
}
