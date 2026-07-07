import React, { useState, useEffect, useRef, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { uploadProfileMedia } from '../../services/profile';
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
  onUploadSuccess?: (url: string) => any;
  showAlert?: (message: string, type?: any) => void;
}

export default function Avatar(props: AvatarProps) {
  const { 
    src: propSrc, 
    size = 'md', 
    editable = false,
    name,
    className = '',
    verified = false,
    user: propUser
  } = props;

  
  const context = useContext(UserContext);

  
  const isExplicit = 'user' in props || 'src' in props || 'name' in props;
  const user = propUser || ((isExplicit && !editable) ? null : context?.user);
  const updateAvatar = context?.updateAvatar;
  const deleteAvatar = context?.deleteAvatar;

  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  
  const resolvedSrc = propSrc !== undefined ? propSrc : (user?.photoURL || user?.profileImage || user?.image || null);

  const isDefaultImage = (url?: string | null) => {
    if (!url) return true;
    return url.includes('default-avatar.png') || 
           url.includes('default-male.png') || 
           url.includes('default-female.png') || 
           url.includes('achyut.png') ||
           url.startsWith('data:image/svg+xml');
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
    if (!file) return;

    
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
    if (e.target) e.target.value = '';
  };

  const handleCropConfirm = async (croppedFile: File) => {
    setCropSrc(null);
    if (!user?.uid || !updateAvatar) return;

    
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewSrc(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);

    setUploading(true);
    setProgress(0);

    try {
      const avatarPath = `profiles/${user.uid}/avatar.jpg`;
      const downloadUrl = await uploadProfileMedia(user.uid, croppedFile, (percent) => {
        setProgress(Math.round(percent));
      }, avatarPath);

      if (downloadUrl) {
        if (props.onUploadSuccess) {
          await props.onUploadSuccess(downloadUrl);
        } else if (updateAvatar) {
          await updateAvatar(downloadUrl);
        }
        triggerToast("Profile picture updated successfully!", "success");
      } else {
        throw new Error("Secure upload failed to return URL");
      }
    } catch (err) {
      console.error(err);
      setPreviewSrc(null);
      triggerToast("Upload failed, please try again", "error");
    } finally {
      setUploading(false);
    }
  };

  
  const handleConfirmDelete = async () => {
    setConfirmDeleteOpen(false);
    setUploading(true);
    try {
      if (!deleteAvatar) {
        throw new Error("deleteAvatar function not available");
      }
      await deleteAvatar();
      triggerToast("Profile picture removed.", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Error removing profile picture.", "error");
    } finally {
      setUploading(false);
    }
  };

  
  const handleAvatarClick = () => {
    if (!editable || uploading) return;
    if (hasPhoto) {
      setShowOptionsModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <div 
        onClick={handleAvatarClick}
        style={sizeStyle}
        className={`relative flex-shrink-0 rounded-full border-2 border-nc-accent/20 transition-all duration-300 select-none bg-gradient-to-b from-[#1E1E26] to-[#111116] ${sizeClass} ${className} ${editable ? 'cursor-pointer hover:border-nc-accent group/avatar' : ''}`}
      >
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
          {currentSrc ? (
            <img 
              src={currentSrc} 
              alt={name || 'User avatar'} 
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-opacity duration-300 ease-in-out opacity-100" 
            />
          ) : (
            <svg viewBox="0 0 100 100" fill="#5A5A75" className="w-2/3 h-2/3">
              <circle cx="50" cy="35" r="20"/>
              <ellipse cx="50" cy="85" rx="35" ry="25"/>
            </svg>
          )}

          {/* Upload Spinner Ring */}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-full z-10 animate-fade-in">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="transparent" />
                <circle 
                  cx="20" 
                  cy="20" 
                  r="16" 
                  stroke="#00BFFF" 
                  strokeWidth="3" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 16}
                  strokeDashoffset={2 * Math.PI * 16 * (1 - progress / 100)}
                  className="transition-all duration-150"
                />
              </svg>
              <span className="text-[10px] text-white font-black mt-1">{progress}%</span>
            </div>
          )}
        </div>

        {/* Edit Pencil Overlay Icon */}
        {editable && !uploading && (
          <div className="absolute bottom-0 right-0 p-1.5 bg-[#00BFFF] text-[#0A0A0A] rounded-full hover:scale-110 active:scale-95 transition-all shadow-md border border-[#0A0A0A] z-20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        )}

        {verified && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00BFFF] rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg ring-2 ring-nc-dark z-20">
            ✓
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      {editable && (
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
      )}

      {/* Options Dropdown Modal overlay */}
      {showOptionsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-xs space-y-4 shadow-2xl text-center">
            <h3 className="text-white font-black text-base uppercase tracking-wider">Profile Photo</h3>
            <p className="text-gray-400 text-xs">Would you like to upload a new profile picture or remove the current one?</p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOptionsModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-3 bg-[#00BFFF] hover:opacity-95 text-[#0A0A0A] font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                Upload New Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOptionsModal(false);
                  setConfirmDeleteOpen(true);
                }}
                className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold border border-red-500/10 rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                Remove Current Photo
              </button>
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-xl text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Remove profile photo?"
        description="Are you sure you want to remove your profile picture? This action will set your avatar back to the default silhouette."
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          isCircular={true}
          onClose={() => setCropSrc(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  );
}
