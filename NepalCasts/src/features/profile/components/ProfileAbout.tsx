import React from 'react';
import { Mail, Phone, User, FileText, ClipboardList, Layers, Eye, Ruler, Sparkles, MessageSquare } from 'lucide-react';
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
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
      {/* Main Details Column */}
      <div className={`${showContact ? 'lg:col-span-2 xl:col-span-3' : 'lg:col-span-3 xl:col-span-4'} space-y-6 w-full`}>
        {/* Bio Card */}
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3 shadow-xl w-full">
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#00BFFF]" />
            <span>Bio</span>
          </h2>
          <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${profile.bio ? 'text-gray-300 font-medium' : 'text-gray-500 italic'}`}>
            {bio}
          </p>
        </div>

        {/* Attributes & Details Card */}
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl w-full">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-[#00BFFF]" />
              <span>Attributes &amp; Details</span>
            </h2>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Specifications</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5 w-full">
            {/* Category */}
            <div className="bg-[#181824] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 hover:border-[#00BFFF]/40 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Category
                </span>
                <span className={`text-xs font-black capitalize truncate block ${category !== 'Not Specified' ? 'text-white' : 'text-gray-500 italic font-normal'}`}>
                  {category}
                </span>
              </div>
            </div>

            {/* Gender */}
            <div className="bg-[#181824] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 hover:border-[#00BFFF]/40 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Gender
                </span>
                <span className={`text-xs font-black capitalize truncate block ${gender !== 'Not Specified' ? 'text-white' : 'text-gray-500 italic font-normal'}`}>
                  {gender}
                </span>
              </div>
            </div>

            {/* Height & Weight */}
            <div className="bg-[#181824] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 hover:border-[#00BFFF]/40 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] shrink-0">
                <Ruler className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Height</span>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Weight</span>
                </div>
                <div className="flex items-center justify-between text-xs font-black text-white mt-0.5">
                  <span>{profile.height || "5'6 ft"}</span>
                  <span className="text-gray-600 font-normal">|</span>
                  <span>{profile.weight || "60 kg"}</span>
                </div>
              </div>
            </div>

            {/* Eye Color */}
            <div className="bg-[#181824] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 hover:border-[#00BFFF]/40 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Eye Color
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {eyeColor !== 'Not Specified' && (
                    <span className={`w-2 h-2 rounded-full border flex-shrink-0 ${getEyeColorStyle(eyeColor)}`} />
                  )}
                  <span className={`text-xs font-black capitalize truncate ${eyeColor !== 'Not Specified' ? 'text-white' : 'text-gray-500 italic font-normal'}`}>
                    {eyeColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Hair Color */}
            <div className="bg-[#181824] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 hover:border-[#00BFFF]/40 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Hair Color
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {hairColor !== 'Not Specified' && (
                    <span className={`w-2 h-2 rounded-full border flex-shrink-0 ${getHairColorStyle(hairColor)}`} />
                  )}
                  <span className={`text-xs font-black capitalize truncate ${hairColor !== 'Not Specified' ? 'text-white' : 'text-gray-500 italic font-normal'}`}>
                    {hairColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="bg-[#181824] border border-white/[0.08] rounded-xl p-3 flex items-center gap-3 hover:border-[#00BFFF]/40 transition-all">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Languages
                </span>
                {languagesList.length > 0 ? (
                  <span className="text-xs font-black text-white truncate block">
                    {languagesList.join(', ')}
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs font-normal italic block truncate">English, Hindi</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Contact Info */}
      {showContact && (
        <div className="space-y-6">
          <div className="bg-[#12121A] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl sticky top-24">
            <h2 className="text-base sm:text-lg font-extrabold text-white">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 group">
                <div className="w-11 h-11 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] group-hover:bg-[#00BFFF] group-hover:text-black transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">Email</span>
                  <span className="text-white text-xs font-semibold truncate block">{profile.email || 'Not Provided'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 group">
                <div className="w-11 h-11 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] group-hover:bg-[#00BFFF] group-hover:text-black transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">Phone</span>
                  <span className="text-white text-xs font-semibold truncate block">{profile.phone || 'Not Provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
