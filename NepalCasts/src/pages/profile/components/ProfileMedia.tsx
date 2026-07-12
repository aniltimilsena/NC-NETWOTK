import React, { useState } from 'react';
import { Film, Play, Image as ImageIcon, Video, Trash2, Plus, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { UserProfile } from '../../../types';

interface ProfileMediaProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onUploadMedia?: (files: FileList) => void;
  onDeleteMedia?: (src: string) => void;
  onUploadIntroVideo?: (file: File) => void;
  onDeleteIntroVideo?: () => void;
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
  const introVideo = profile.introVideo || null;
  const media = Array.isArray(profile.media) ? profile.media : [];

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onUploadMedia) {
      onUploadMedia(e.target.files);
    }
  };

  const handleIntroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadIntroVideo) {
      onUploadIntroVideo(file);
    }
  };

  return (
    <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 md:p-8 space-y-6">
      {/* Unified Media Header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-5">
        <div className="w-10 h-10 rounded-2xl bg-[#00BFFF]/10 flex items-center justify-center">
          <Film className="w-5 h-5 text-[#00BFFF]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Media Showcase</h2>
          <p className="text-[10px] text-nc-muted">Showcase your introduction videos and portfolio lookbook</p>
        </div>
      </div>

      {/* Video Showreel Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Film className="w-4 h-4 text-[#00BFFF]" />
            Video
          </h3>
          {isOwnProfile && onUploadIntroVideo && !introVideo && (
            <div>
              <input 
                type="file" 
                id="intro-video-upload" 
                accept="video/mp4,video/quicktime,video/webm" 
                className="hidden" 
                onChange={handleIntroChange}
              />
              <button 
                onClick={() => document.getElementById('intro-video-upload')?.click()}
                className="text-[10px] font-black uppercase py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
              >
                Upload Video
              </button>
            </div>
          )}
        </div>

        {introVideo ? (
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black max-w-2xl">
            <video 
              src={introVideo} 
              controls 
              className="w-full h-full object-cover" 
            />
            {isOwnProfile && onDeleteIntroVideo && (
              <button
                onClick={onDeleteIntroVideo}
                className="absolute top-4 right-4 bg-black/60 hover:bg-red-950/80 p-2.5 rounded-full border border-white/10 transition-colors text-red-500 hover:scale-105"
                title="Remove Video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <Video className="w-6 h-6 text-nc-muted mx-auto opacity-40" />
            <p className="text-[11px] text-nc-muted">No intro video yet</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 my-6" />

      {/* Photo Portfolio Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#00BFFF]" />
            Photo
          </h3>
          {isOwnProfile && onUploadMedia && (
            <div>
              <input 
                type="file" 
                id="portfolio-upload" 
                multiple 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
                onChange={handleMediaChange}
              />
              <button 
                onClick={() => document.getElementById('portfolio-upload')?.click()}
                className="text-[10px] font-black uppercase py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Photos
              </button>
            </div>
          )}
        </div>

        {media.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {media.map((url, index) => (
              <div 
                key={index} 
                className="relative aspect-square rounded-2xl overflow-hidden border border-white/5 group bg-white/5 cursor-pointer"
                onClick={() => onSelectImage?.(url)}
              >
                <img 
                  src={url} 
                  alt={`Portfolio ${index + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {isOwnProfile && onDeleteMedia && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMedia(url);
                    }}
                    className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-red-950/80 p-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:scale-105"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <ImageIcon className="w-6 h-6 text-nc-muted mx-auto opacity-40" />
            <p className="text-[11px] text-nc-muted">No photos yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
