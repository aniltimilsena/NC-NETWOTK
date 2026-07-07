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
    <div className="space-y-6">
      {/* Intro Video Card */}
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6">
        <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-[#00BFFF]" />
          Video Showreel
        </h2>
        {introVideo ? (
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black">
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
          <div className="border border-dashed border-white/10 rounded-3xl py-12 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
              <Video className="w-6 h-6 text-nc-muted" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Intro Video Yet</h3>
              <p className="text-xs text-nc-muted max-w-xs mx-auto mt-1 leading-relaxed">
                Add an introduction video to showcase your performance and acting range to casting directors.
              </p>
            </div>
            {isOwnProfile && onUploadIntroVideo && (
              <div>
                <input 
                  type="file" 
                  id="intro-video-upload" 
                  accept="video/mp4,video/quicktime,video/webm" 
                  className="hidden" 
                  onChange={handleIntroChange}
                />
                <Button size="sm" onClick={() => document.getElementById('intro-video-upload')?.click()}>
                  Upload Intro Video
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Portfolio Gallery */}
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#00BFFF]" />
            Photo Portfolio
          </h2>
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
              <Button 
                size="sm" 
                onClick={() => document.getElementById('portfolio-upload')?.click()}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Photos
              </Button>
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
          <div className="border border-dashed border-white/10 rounded-3xl py-16 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6 text-nc-muted" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Portfolio Photos</h3>
              <p className="text-xs text-nc-muted max-w-xs mx-auto mt-1 leading-relaxed">
                Upload photos to display your headshots, modeling shots, and performance stills.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
