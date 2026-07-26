import React, { useState } from 'react';
import { Film, Image as ImageIcon, Video, Trash2, Plus, Upload, Play, Loader2 } from 'lucide-react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import type { UserProfile } from '../../../types';

interface ProfileMediaProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onUploadMedia?: (files: FileList) => Promise<void> | void;
  onDeleteMedia?: (src: string) => Promise<void> | void;
  onUploadIntroVideo?: (file: File) => Promise<void> | void;
  onDeleteIntroVideo?: () => Promise<void> | void;
  onSelectImage?: (url: string) => void;
}

export default function ProfileMedia({
  profile,
  isOwnProfile,
  onUploadMedia,
  onDeleteMedia,
  onUploadIntroVideo,
  onDeleteIntroVideo,
  onSelectImage
}: ProfileMediaProps) {
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<string | null>(null);
  const [deleteVideoConfirmOpen, setDeleteVideoConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const introVideo = profile.introVideo || profile.introVideoUrl || profile.showreel || profile.showreelUrl || null;
  const media = Array.isArray(profile.media) ? profile.media : [];

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadMedia) {
      setIsUploadingPhotos(true);
      try {
        await onUploadMedia(e.target.files);
      } finally {
        setIsUploadingPhotos(false);
      }
    }
    e.target.value = '';
  };

  const handleIntroChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadIntroVideo) {
      setIsUploadingVideo(true);
      try {
        await onUploadIntroVideo(file);
      } finally {
        setIsUploadingVideo(false);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 md:p-8 space-y-8 shadow-2xl">
      {/* Hidden File Inputs */}
      {isOwnProfile && (
        <>
          <input 
            type="file" 
            id="intro-video-upload" 
            accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.3gp" 
            className="hidden" 
            onChange={handleIntroChange}
          />
          <input 
            type="file" 
            id="portfolio-upload" 
            multiple 
            accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.bmp" 
            className="hidden" 
            onChange={handleMediaChange}
          />
        </>
      )}

      {/* Unified Media Header */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2.5">
          <Film className="w-5 h-5 text-[#00BFFF]" />
          <span>Media Showcase</span>
        </h2>
      </div>

      {/* Video Showreel Section */}
      {(isOwnProfile || introVideo) && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-200 uppercase tracking-widest flex items-center gap-2">
              <Video className="w-4 h-4 text-[#00BFFF]" />
              <span>VIDEO</span>
            </h3>
            {isOwnProfile && onUploadIntroVideo && !introVideo && (
              <button 
                onClick={() => document.getElementById('intro-video-upload')?.click()}
                disabled={isUploadingVideo}
                className="text-xs font-bold py-2 px-4 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/20 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(0,191,255,0.15)] active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isUploadingVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Video</span>
                  </>
                )}
              </button>
            )}
          </div>

          {introVideo ? (
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black w-full max-w-4xl shadow-[0_0_30px_rgba(0,191,255,0.15)] group">
              <video 
                key={introVideo}
                src={introVideo} 
                controls 
                playsInline
                preload="auto"
                className="w-full h-full object-contain bg-black" 
              />
              {isOwnProfile && onDeleteIntroVideo && (
                <button
                  onClick={() => setDeleteVideoConfirmOpen(true)}
                  className="absolute top-4 right-4 bg-black/70 hover:bg-red-600 p-2.5 rounded-full border border-white/15 transition-all text-white hover:scale-110 shadow-lg cursor-pointer z-10"
                  title="Remove Video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div 
              onClick={() => isOwnProfile && !isUploadingVideo && document.getElementById('intro-video-upload')?.click()}
              className={`bg-[#181824]/60 border-2 border-dashed border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center transition-all ${
                isOwnProfile && !isUploadingVideo ? 'cursor-pointer hover:border-[#00BFFF]/50 hover:bg-[#00BFFF]/5 group' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-[#00BFFF] group-hover:border-[#00BFFF]/30 transition-all mb-3">
                {isUploadingVideo ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#00BFFF]" />
                ) : (
                  <Play className="w-6 h-6 ml-0.5" />
                )}
              </div>
              <p className="text-xs font-bold text-gray-300">
                {isUploadingVideo ? 'Uploading intro video...' : 'No intro video uploaded yet'}
              </p>
              {isOwnProfile && !isUploadingVideo && (
                <p className="text-[11px] text-gray-500 mt-1">Click to upload your intro video (MP4, MOV, WEBM)</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      {((isOwnProfile && (introVideo || media.length > 0)) || (introVideo && media.length > 0)) && (
        <div className="h-px bg-white/10 my-6" />
      )}

      {/* Photo Portfolio Section */}
      {(isOwnProfile || media.length > 0) && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-200 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#00BFFF]" />
              <span>PHOTO</span>
            </h3>
            {isOwnProfile && onUploadMedia && (
              <button 
                onClick={() => document.getElementById('portfolio-upload')?.click()}
                disabled={isUploadingPhotos}
                className="text-xs font-bold py-2 px-4 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/20 transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(0,191,255,0.15)] active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhotos ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Photos</span>
                  </>
                )}
              </button>
            )}
          </div>

          {media.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {media.map((url, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-black cursor-pointer shadow-md"
                  onClick={() => onSelectImage?.(url)}
                >
                  <img 
                    src={url} 
                    alt={`Portfolio ${index + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {isOwnProfile && onDeleteMedia && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePhotoTarget(url);
                      }}
                      className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-red-600 p-2 rounded-full border border-white/15 opacity-0 group-hover:opacity-100 transition-all text-white hover:scale-110 shadow-lg cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div 
              onClick={() => isOwnProfile && !isUploadingPhotos && document.getElementById('portfolio-upload')?.click()}
              className={`bg-[#181824]/60 border-2 border-dashed border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center transition-all ${
                isOwnProfile && !isUploadingPhotos ? 'cursor-pointer hover:border-[#00BFFF]/50 hover:bg-[#00BFFF]/5 group' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-[#00BFFF] group-hover:border-[#00BFFF]/30 transition-all mb-3">
                {isUploadingPhotos ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#00BFFF]" />
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-bold text-gray-300">
                {isUploadingPhotos ? 'Uploading photos...' : 'No portfolio photos yet'}
              </p>
              {isOwnProfile && !isUploadingPhotos && (
                <p className="text-[11px] text-gray-500 mt-1">Click to add photos to your lookbook gallery (JPG, PNG, WEBP)</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirm Photo Deletion Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletePhotoTarget)}
        title="Delete Portfolio Photo?"
        description="Are you sure you want to remove this photo from your portfolio gallery? This action cannot be undone."
        confirmText="Remove Photo"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
        onClose={() => setDeletePhotoTarget(null)}
        onConfirm={async () => {
          if (deletePhotoTarget && onDeleteMedia) {
            setIsDeleting(true);
            try {
              await onDeleteMedia(deletePhotoTarget);
            } finally {
              setIsDeleting(false);
              setDeletePhotoTarget(null);
            }
          }
        }}
      />

      {/* Confirm Video Deletion Dialog */}
      <ConfirmDialog
        isOpen={deleteVideoConfirmOpen}
        title="Delete Showreel Video?"
        description="Are you sure you want to remove your intro video showreel from your profile?"
        confirmText="Remove Video"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
        onClose={() => setDeleteVideoConfirmOpen(false)}
        onConfirm={async () => {
          if (onDeleteIntroVideo) {
            setIsDeleting(true);
            try {
              await onDeleteIntroVideo();
            } finally {
              setIsDeleting(false);
              setDeleteVideoConfirmOpen(false);
            }
          }
        }}
      />
    </div>
  );
}

