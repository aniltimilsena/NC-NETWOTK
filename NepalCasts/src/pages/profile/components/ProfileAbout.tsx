import React from 'react';
import { Mail, Phone, User, FileText } from 'lucide-react';
import type { UserProfile } from '../../../types';

interface ProfileAboutProps {
  profile: UserProfile;
  showContact: boolean;
}

export default function ProfileAbout({ profile, showContact }: ProfileAboutProps) {
  const bio = profile.bio || 'No bio provided yet.';
  const category = profile.category || 'Not Specified';
  const gender = profile.gender || 'Not Specified';
  
  const languagesRaw: unknown = profile.languages;
  const languagesList: string[] = Array.isArray(languagesRaw) 
    ? languagesRaw.map(String) 
    : typeof languagesRaw === 'string' && languagesRaw 
      ? (languagesRaw as string).split(',').map((s: string) => s.trim()) 
      : [];

  const eyeColor = profile.eyeColor || 'Not Specified';
  const hairColor = profile.hairColor || 'Not Specified';
  
  const getEyeColorStyle = (color: string) => {
    const c = color.toLowerCase();
    if (c.includes('black') || c.includes('dark')) return 'bg-black border-white/20';
    if (c.includes('brown')) return 'bg-[#654321] border-white/20';
    if (c.includes('blue')) return 'bg-[#2b6cb0] border-white/20';
    if (c.includes('green')) return 'bg-[#2f855a] border-white/20';
    if (c.includes('hazel')) return 'bg-[#975a16] border-white/20';
    return 'bg-white/20 border-white/10';
  };

  const getHairColorStyle = (color: string) => {
    const c = color.toLowerCase();
    if (c.includes('black') || c.includes('dark')) return 'bg-black border-white/20';
    if (c.includes('brown')) return 'bg-[#4a2e18] border-white/20';
    if (c.includes('blonde')) return 'bg-[#d69e2e] border-white/20';
    if (c.includes('red') || c.includes('auburn')) return 'bg-[#9b2c2c] border-white/20';
    if (c.includes('grey') || c.includes('gray')) return 'bg-gray-400 border-white/20';
    return 'bg-white/20 border-white/10';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Columns - Bio & Physical */}
      <div className={`${showContact ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
        {/* Bio Panel */}
        <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[1.5rem] p-5 sm:p-6 space-y-3 shadow-xl">
          <h2 className="text-base sm:text-lg font-bold text-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00BFFF]" />
            About Me
          </h2>
          <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${profile.bio ? 'text-nc-muted font-medium' : 'text-nc-muted/60 italic'}`}>
            {bio}
          </p>
        </div>

        {/* Details & Attributes Panel */}
        <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[1.5rem] p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-100 flex items-center gap-2">
              <User className="w-4 h-4 text-[#00BFFF]" />
              Details &amp; Attributes
            </h2>
            <span className="text-[10px] text-nc-muted uppercase tracking-widest font-semibold">Specifications</span>
          </div>
          
          {/* Tile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Category Tile */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Category
              </span>
              <span className={`text-xs sm:text-sm font-semibold capitalize truncate ${category !== 'Not Specified' ? 'text-gray-200' : 'text-nc-muted/50 italic font-normal'}`}>
                {category}
              </span>
            </div>

            {/* Gender Tile */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Gender
              </span>
              <span className={`text-xs sm:text-sm font-semibold capitalize truncate ${gender !== 'Not Specified' ? 'text-gray-200' : 'text-nc-muted/50 italic font-normal'}`}>
                {gender}
              </span>
            </div>

            {/* Height Tile */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Height
              </span>
              <span className={`text-xs sm:text-sm font-semibold truncate ${profile.height ? 'text-gray-200' : 'text-nc-muted/50 italic font-normal'}`}>
                {profile.height || 'Not Specified'}
              </span>
            </div>

            {/* Weight Tile */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Weight
              </span>
              <span className={`text-xs sm:text-sm font-semibold truncate ${profile.weight ? 'text-gray-200' : 'text-nc-muted/50 italic font-normal'}`}>
                {profile.weight || 'Not Specified'}
              </span>
            </div>

            {/* Eye Color Tile */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Eye Color
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                {eyeColor !== 'Not Specified' && (
                  <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${getEyeColorStyle(eyeColor)}`} />
                )}
                <span className={`text-xs sm:text-sm font-semibold capitalize truncate ${eyeColor !== 'Not Specified' ? 'text-gray-200' : 'text-nc-muted/50 italic font-normal'}`}>
                  {eyeColor}
                </span>
              </div>
            </div>

            {/* Hair Color Tile */}
            <div className="bg-[#131313] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Hair Color
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                {hairColor !== 'Not Specified' && (
                  <span className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${getHairColorStyle(hairColor)}`} />
                )}
                <span className={`text-xs sm:text-sm font-semibold capitalize truncate ${hairColor !== 'Not Specified' ? 'text-gray-200' : 'text-nc-muted/50 italic font-normal'}`}>
                  {hairColor}
                </span>
              </div>
            </div>

            {/* Languages Tile - Spans 2 cols for better display if space allows */}
            <div className="col-span-2 bg-[#131313] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-colors">
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Languages
              </span>
              {languagesList.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {languagesList.map((lang: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="bg-white/5 text-gray-300 text-[10px] font-medium px-2 py-0.5 rounded border border-white/10"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-nc-muted/50 text-xs font-normal italic block truncate">Not Specified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Contact Details */}
      {showContact && (
        <div className="space-y-6">
          <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[1.5rem] p-5 sm:p-6 space-y-4 shadow-xl sticky top-24">
            <h2 className="text-base sm:text-lg font-bold text-gray-100">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 group">
                <div className="w-11 h-11 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] group-hover:bg-[#00BFFF] group-hover:text-black transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-0.5">Email</span>
                  <span className="text-gray-200 text-xs font-semibold truncate block">{profile.email || 'Not Provided'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 group">
                <div className="w-11 h-11 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] group-hover:bg-[#00BFFF] group-hover:text-black transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-0.5">Phone</span>
                  <span className="text-gray-200 text-xs font-semibold truncate block">{profile.phone || 'Not Provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
