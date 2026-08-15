import React from 'react';
import { Mail, Phone, User, FileText, ClipboardList, Layers, Eye, Ruler, Scissors, MessageSquare, Award } from 'lucide-react';
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

  const rawSkills: any = profile.skills;
  const skillsList: { name: string; level?: number }[] = Array.isArray(rawSkills)
    ? rawSkills.map((s) => (typeof s === 'string' ? { name: s, level: 80 } : { name: s.name, level: s.level ?? 80 }))
    : typeof rawSkills === 'string' && rawSkills
    ? (rawSkills as string).split(',').map((s: string) => ({ name: s.trim(), level: 80 }))
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
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full text-left">
      {/* Main Details Column */}
      <div className={`${showContact ? 'lg:col-span-2 xl:col-span-3' : 'lg:col-span-3 xl:col-span-4'} space-y-8 w-full`}>
        {/* Bio Section */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-4 h-4 text-white" />
            <span>Bio</span>
          </h2>
          <p className={`text-sm leading-relaxed whitespace-pre-line ${profile.bio ? 'text-gray-200 font-medium' : 'text-gray-500 font-normal'}`}>
            {bio}
          </p>
        </div>

        {/* Attributes & Details Section */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-white" />
            <span>Attributes &amp; Details</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-10 md:gap-x-14 max-w-2xl pt-2 pl-6 sm:pl-12 md:pl-16">
            {/* Category */}
            <div className="flex items-center gap-3 min-w-0">
              <Layers className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Category
                </span>
                <span className={`text-xs font-bold capitalize truncate block ${category !== 'Not Specified' ? 'text-white' : 'text-gray-500 font-normal'}`}>
                  {category}
                </span>
              </div>
            </div>

            {/* Gender */}
            <div className="flex items-center gap-3 min-w-0">
              <User className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Gender
                </span>
                <span className={`text-xs font-bold capitalize truncate block ${gender !== 'Not Specified' ? 'text-white' : 'text-gray-500 font-normal'}`}>
                  {gender}
                </span>
              </div>
            </div>

            {/* Height & Weight */}
            <div className="flex items-center gap-3 min-w-0">
              <Ruler className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Height / Weight
                </span>
                <span className="text-xs font-bold text-white block">
                  {profile.height || "5'6 ft"} • {profile.weight || "60 kg"}
                </span>
              </div>
            </div>

            {/* Eye Color */}
            <div className="flex items-center gap-3 min-w-0">
              <Eye className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Eye Color
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {eyeColor !== 'Not Specified' && (
                    <span className={`w-2 h-2 rounded-full border shrink-0 ${getEyeColorStyle(eyeColor)}`} />
                  )}
                  <span className={`text-xs font-bold capitalize truncate ${eyeColor !== 'Not Specified' ? 'text-white' : 'text-gray-500 font-normal'}`}>
                    {eyeColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Hair Color */}
            <div className="flex items-center gap-3 min-w-0">
              <Scissors className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Hair Color
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {hairColor !== 'Not Specified' && (
                    <span className={`w-2 h-2 rounded-full border shrink-0 ${getHairColorStyle(hairColor)}`} />
                  )}
                  <span className={`text-xs font-bold capitalize truncate ${hairColor !== 'Not Specified' ? 'text-white' : 'text-gray-500 font-normal'}`}>
                    {hairColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="flex items-center gap-3 min-w-0">
              <MessageSquare className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">
                  Languages
                </span>
                {languagesList.length > 0 ? (
                  <span className="text-xs font-bold text-white truncate block">
                    {languagesList.join(', ')}
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs font-normal block truncate">English, Hindi</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Award className="w-4 h-4 text-white" />
            <span>Skills &amp; Specializations</span>
          </h2>

          {skillsList.length > 0 ? (
            <div className="flex flex-wrap gap-2.5 pt-1">
              {skillsList.map((skill, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  <span>{skill.name}</span>
                  <span className="text-[10px] font-semibold text-gray-400 bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                    {skill.level ?? 80}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 font-normal">No skills added yet.</p>
          )}
        </div>
      </div>

      {/* Sidebar Contact Info */}
      {showContact && (
        <div className="space-y-3 lg:border-l lg:border-white/5 lg:pl-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Mail className="w-4 h-4 text-white" />
            <span>Contact Information</span>
          </h2>
          <div className="space-y-4 pt-1 pl-6 sm:pl-12 md:pl-16">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">Email</span>
                <span className="text-white text-xs font-semibold truncate block">{profile.email || 'Not Provided'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-white shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-0.5">Phone</span>
                <span className="text-white text-xs font-semibold truncate block">{profile.phone || 'Not Provided'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
