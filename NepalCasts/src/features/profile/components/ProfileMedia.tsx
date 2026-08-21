import React, { useState, useEffect, useRef } from 'react';
import { Film, Image as ImageIcon, Video, Trash2, Plus, Upload, Play, Loader2, X, ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { saveImageDirectly } from '../../../utils/media';
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
  onSelectImage,
}: ProfileMediaProps) {
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<string | null>(null);
  const [activeActionPhoto, setActiveActionPhoto] = useState<string | null>(null);
  const [deleteVideoConfirmOpen, setDeleteVideoConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const openLightbox = (index: number, url: string) => {
    setLightboxIndex(index);
    onSelectImage?.(url);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const prevPhoto = () => {
    if (lightboxIndex === null || media.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + media.length) % media.length);
  };

  const nextPhoto = () => {
    if (lightboxIndex === null || media.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % media.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, media.length]);

  return (
    <div className="w-full py-0 px-0 space-y-2.5 font-sans text-left">
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

      {/* 1. Intro Video Section */}
      <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase font-mono">
            INTRO VIDEO
          </h2>
          {isOwnProfile && introVideo && (
            <button
              onClick={() => document.getElementById('intro-video-upload')?.click()}
              disabled={isUploadingVideo}
              className="text-xs font-mono font-bold py-1.5 px-4 rounded-xl bg-[#0088CC] text-white hover:bg-[#0077B3] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 uppercase tracking-wider shadow-md"
            >
              {isUploadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Replace</span>
            </button>
          )}
        </div>

        {introVideo ? (
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black w-full shadow-2xl group">
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
                className="absolute top-4 right-4 bg-black/80 hover:bg-red-600 p-2.5 rounded-full border border-white/20 transition-all text-white hover:scale-110 shadow-lg cursor-pointer z-10"
                title="Remove Video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="bg-[#18181D] border border-dashed border-white/10 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center mb-1 text-white bg-white/5">
              {isUploadingVideo ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#0088CC]" />
              ) : (
                <Play className="w-6 h-6 ml-0.5 text-white" />
              )}
            </div>
            <p className="text-sm font-semibold text-white">
              {isUploadingVideo ? 'Uploading intro video...' : isOwnProfile ? 'No intro video uploaded yet' : 'No intro video available'}
            </p>
            <p className="text-xs text-gray-400 max-w-sm">
              {isOwnProfile ? 'Click to upload your intro video (MP4, MOV, WEBM)' : 'This talent has not uploaded an intro video yet.'}
            </p>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => !isUploadingVideo && document.getElementById('intro-video-upload')?.click()}
                disabled={isUploadingVideo}
                className="mt-3 bg-[#0088CC] hover:bg-[#0077B3] text-white font-mono font-bold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg shadow-[#0088CC]/30"
              >
                <Upload className="w-4 h-4" />
                <span>UPLOAD VIDEO</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 2. Portfolio Photos Section */}
      <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase font-mono">
            PORTFOLIO PHOTOS
          </h2>
          {isOwnProfile && media.length > 0 && (
            <button
              onClick={() => document.getElementById('portfolio-upload')?.click()}
              disabled={isUploadingPhotos}
              className="text-xs font-mono font-bold py-1.5 px-4 rounded-xl bg-[#0088CC] text-white hover:bg-[#0077B3] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 uppercase tracking-wider shadow-md"
            >
              {isUploadingPhotos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Photos</span>
            </button>
          )}
        </div>

        {media.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {media.map((url, index) => (
              <GalleryImage
                key={url}
                url={url}
                index={index}
                onSelectImage={() => openLightbox(index, url)}
                isOwnProfile={isOwnProfile}
                onDeletePhotoClick={(target) => setDeletePhotoTarget(target)}
                onLongPressPhoto={(target) => setActiveActionPhoto(target)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#18181D] border border-dashed border-white/10 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 text-white bg-white/5 border border-white/10">
              {isUploadingPhotos ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#0088CC]" />
              ) : (
                <ImageIcon className="w-8 h-8 text-white" />
              )}
            </div>
            <p className="text-sm font-semibold text-white">
              {isUploadingPhotos ? 'Uploading photos...' : isOwnProfile ? 'No portfolio photos yet' : 'No portfolio photos available'}
            </p>
            <p className="text-xs text-gray-400 max-w-sm">
              {isOwnProfile ? 'Click to add photos to your lookbook gallery (JPG, PNG, WEBP)' : 'This talent has not added portfolio photos yet.'}
            </p>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => !isUploadingPhotos && document.getElementById('portfolio-upload')?.click()}
                disabled={isUploadingPhotos}
                className="mt-3 bg-[#0088CC] hover:bg-[#0077B3] text-white font-mono font-bold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg shadow-[#0088CC]/30"
              >
                <Plus className="w-4 h-4" />
                <span>ADD PHOTOS</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Full Screen Lightbox Modal */}
      {lightboxIndex !== null && media[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Previous Arrow */}
          {media.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
              className="absolute left-4 sm:left-8 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
              title="Previous Photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Full Screen Image */}
          <div
            className="relative max-w-5xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={media[lightboxIndex]}
              alt={`Full Screen Portfolio ${lightboxIndex + 1}`}
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>

          {/* Next Arrow */}
          {media.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
              className="absolute right-4 sm:right-8 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
              title="Next Photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Photo Counter */}
          {media.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
              {lightboxIndex + 1} / {media.length}
            </div>
          )}
        </div>
      )}

      {/* Photo Actions Modal (1-second long press) */}
      <AnimatePresence>
        {activeActionPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveActionPhoto(null)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#121216] border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl p-4 sm:p-5 space-y-3 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-left pb-2 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">Photo Options</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Choose an action for this photo</p>
                </div>
                <button
                  onClick={() => setActiveActionPhoto(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {/* Save Image */}
                <button
                  onClick={() => {
                    const target = activeActionPhoto;
                    setActiveActionPhoto(null);
                    saveImageDirectly(target, 'nepalcasts-portfolio-photo.jpg');
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-gray-200 hover:text-white font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-gray-300" />
                  <span>Save Image</span>
                </button>

                {/* Share Photo */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'NepalCasts Portfolio Photo',
                        url: activeActionPhoto,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(activeActionPhoto);
                    }
                    setActiveActionPhoto(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-gray-200 hover:text-white font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-gray-300" />
                  <span>Share Photo</span>
                </button>

                {/* Delete Photo */}
                {isOwnProfile && (
                  <button
                    onClick={() => {
                      const target = activeActionPhoto;
                      setActiveActionPhoto(null);
                      setDeletePhotoTarget(target);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Delete Photo</span>
                  </button>
                )}
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setActiveActionPhoto(null)}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Photo Confirmation */}
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

      {/* Delete Video Confirmation */}
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

interface GalleryImageProps {
  url: string;
  index: number;
  onSelectImage?: (url: string) => void;
  isOwnProfile: boolean;
  onDeletePhotoClick: (url: string) => void;
  onLongPressPhoto: (url: string) => void;
}

function GalleryImage({ url, index, onSelectImage, isOwnProfile, onDeletePhotoClick, onLongPressPhoto }: GalleryImageProps) {
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = () => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(60);
      }
      onLongPressPhoto(url);
    }, 1000);
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer shadow-md select-none"
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={endPress}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        startPress();
      }}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onClick={() => {
        if (isLongPressRef.current) return;
        onSelectImage?.(url);
      }}
    >
      {!loaded && <div className="absolute inset-0 skeleton" />}
      <img
        src={url}
        alt={`Portfolio ${index + 1}`}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
      />
    </div>
  );
}
