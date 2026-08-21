import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Trash2, Plus, Upload, Play, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import type { UserProfile } from '../../../types';

interface ProfileMediaProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onUploadMedia?: (files: FileList) => Promise<void> | void;
  onDeleteMedia?: (src: string) => Promise<void> | void;
  onUploadIntroVideo?: (file: File) => Promise<void> | void;
  onDeleteIntroVideo?: () => Promise<void> | void;
  onNavigate?: (page: string, param?: any) => void;
}

export default function ProfileMedia({
  profile,
  isOwnProfile,
  onUploadMedia,
  onDeleteMedia,
  onUploadIntroVideo,
  onDeleteIntroVideo,
  onNavigate,
}: ProfileMediaProps) {
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{ index: number; url: string } | null>(null);
  const [deleteVideoConfirmOpen, setDeleteVideoConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const rawMedia: unknown = profile?.media;
  const media: string[] = Array.isArray(rawMedia)
    ? rawMedia.map(String).filter((s) => s && s.trim() !== '')
    : [];

  const introVideo = profile?.introVideo || null;

  const handleIntroChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadIntroVideo) return;
    setIsUploadingVideo(true);
    try {
      await onUploadIntroVideo(file);
    } finally {
      setIsUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onUploadMedia) return;
    setIsUploadingPhotos(true);
    try {
      await onUploadMedia(files);
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && media.length > 0) {
      setLightboxIndex((lightboxIndex + 1) % media.length);
    }
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex !== null && media.length > 0) {
      setLightboxIndex((lightboxIndex - 1 + media.length) % media.length);
    }
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
    <div className="w-full space-y-2 text-left font-sans">
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

      {/* Media Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
          Media
        </h2>

        {isOwnProfile && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => document.getElementById('intro-video-upload')?.click()}
              disabled={isUploadingVideo}
              className="text-xs font-semibold text-[#0088CC] hover:text-[#38c9ff] transition-colors cursor-pointer flex items-center gap-1"
            >
              {isUploadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{introVideo ? 'Replace Video' : '+ Video'}</span>
            </button>

            <span className="text-gray-600">•</span>

            <button
              onClick={() => document.getElementById('portfolio-upload')?.click()}
              disabled={isUploadingPhotos}
              className="text-xs font-semibold text-[#0088CC] hover:text-[#38c9ff] transition-colors cursor-pointer flex items-center gap-1"
            >
              {isUploadingPhotos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>+ Photos</span>
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Scrollable Reel */}
      {(introVideo || media.length > 0) ? (
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
          {/* 1. Intro Video Card (First in Reel with Play Overlay) */}
          {introVideo && (
            <div
              onClick={() => setShowVideoModal(true)}
              className="relative shrink-0 w-28 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden border border-[#1E2638] bg-black group cursor-pointer shadow-md"
            >
              <video
                key={introVideo}
                src={introVideo}
                className="w-full h-full object-cover"
                preload="metadata"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 ml-0.5 fill-white" />
                </div>
              </div>

              {isOwnProfile && onDeleteIntroVideo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteVideoConfirmOpen(true);
                  }}
                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 p-1.5 rounded-full border border-white/20 transition-all text-white hover:scale-110 shadow-lg cursor-pointer z-10 opacity-0 group-hover:opacity-100"
                  title="Remove Video"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* 2. Portfolio Photos */}
          {media.map((url, index) => (
            <div
              key={url}
              onClick={() => openLightbox(index)}
              className="relative shrink-0 w-28 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden border border-[#1E2638] bg-[#111622] group cursor-pointer shadow-md"
            >
              <img
                src={url}
                alt={`Portfolio ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {isOwnProfile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletePhotoTarget({ index, url });
                  }}
                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 p-1.5 rounded-full border border-white/20 transition-all text-white hover:scale-110 shadow-lg cursor-pointer z-10 opacity-0 group-hover:opacity-100"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          onClick={() => {
            if (!isOwnProfile) return;
            const input = document.getElementById('portfolio-upload');
            if (input) {
              input.click();
            } else if (onNavigate) {
              onNavigate('/settings/profile');
            }
          }}
          className="border border-dashed border-[#172033] bg-[#0D121D] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#0088CC]/50 transition-colors group"
        >
          <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#0088CC] mb-1" />
          <span className="text-xs font-semibold text-gray-400 group-hover:text-white">
            Add Media
          </span>
          <p className="text-[10px] text-gray-500 mt-0.5">Add your photos and videos...</p>
        </div>
      )}

      {/* Intro Video Fullscreen Player Modal */}
      {showVideoModal && introVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowVideoModal(false)}
        >
          <div className="relative max-w-3xl w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
            <video
              src={introVideo}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black p-2 rounded-full text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Lightbox Modal */}
      {lightboxIndex !== null && media[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-20 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {media.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="relative max-w-4xl max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={media[lightboxIndex]}
              alt={`Gallery Full ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation */}
      <ConfirmDialog
        isOpen={!!deletePhotoTarget}
        title="Delete Photo?"
        description="Are you sure you want to remove this photo from your lookbook?"
        confirmText="Remove Photo"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
        onClose={() => setDeletePhotoTarget(null)}
        onConfirm={async () => {
          if (deletePhotoTarget && onDeleteMedia) {
            setIsDeleting(true);
            try {
              await onDeleteMedia(deletePhotoTarget.url);
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
