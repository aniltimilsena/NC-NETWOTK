import React, { useState } from 'react';
import { Mail, Phone, User, FileText, ClipboardList, Layers, Eye, Ruler, Scissors, Globe, Award, Copy, Check } from 'lucide-react';
import type { UserProfile } from '../../../types';

interface ProfileAboutProps {
  profile: UserProfile;
  showContact: boolean;
}

export default function ProfileAbout({ profile, showContact }: ProfileAboutProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const bio = profile.bio || '';
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
  const height = profile.height || "5'6 ft";
  const weight = profile.weight || "60 kg";

  const getEyeColorStyle = (color: string) => {
    const c = color.toLowerCase();
    if (c.includes('black') || c.includes('dark')) return 'bg-black border-white/30';
    if (c.includes('brown')) return 'bg-[#654321] border-white/30';
    if (c.includes('blue')) return 'bg-[#3182ce] border-white/30';
    if (c.includes('green')) return 'bg-[#38a169] border-white/30';
    if (c.includes('hazel')) return 'bg-[#d69e2e] border-white/30';
    return 'bg-white/30 border-white/20';
  };

  const getHairColorStyle = (color: string) => {
    const c = color.toLowerCase();
    if (c.includes('black') || c.includes('dark')) return 'bg-black border-white/30';
    if (c.includes('brown')) return 'bg-[#4a2e18] border-white/30';
    if (c.includes('blonde')) return 'bg-[#d69e2e] border-white/30';
    if (c.includes('red') || c.includes('auburn')) return 'bg-[#e53e3e] border-white/30';
    if (c.includes('grey') || c.includes('gray')) return 'bg-gray-400 border-white/30';
    return 'bg-white/30 border-white/20';
  };

  const handleCopy = (text: string, type: 'email' | 'phone') => {
    if (!text || text === 'Not Provided') return;
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full text-left font-sans">
      {/* Main Details Section */}
      <div className={`${showContact ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6 w-full`}>
        
        {/* Bio Card */}
        <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-5 sm:p-6 space-y-3 shadow-lg">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
            <FileText className="w-4 h-4 text-[#00BFFF]" />
            <span>Bio</span>
          </h2>
          <div className="bg-[#16161a] border border-white/10 rounded-xl p-4">
            <p className={`text-xs leading-relaxed whitespace-pre-line ${bio ? 'text-gray-200 font-medium' : 'text-gray-500 font-normal'}`}>
              {bio || 'No bio provided yet.'}
            </p>
          </div>
        </div>

        {/* Attributes & Details Card */}
        <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
            <ClipboardList className="w-4 h-4 text-[#00BFFF]" />
            <span>Attributes &amp; Details</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            {/* Category */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                <span>Category</span>
              </label>
              <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white capitalize truncate">
                {category}
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Gender</span>
              </label>
              <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white capitalize truncate">
                {gender}
              </div>
            </div>

            {/* Height & Weight */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-gray-400" />
                <span>Height / Weight</span>
              </label>
              <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white truncate">
                {height} • {weight}
              </div>
            </div>

            {/* Eye Color */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span>Eye Color</span>
              </label>
              <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white flex items-center gap-2 truncate">
                {eyeColor !== 'Not Specified' && (
                  <span className={`w-2.5 h-2.5 rounded-full border shrink-0 ${getEyeColorStyle(eyeColor)}`} />
                )}
                <span className="capitalize truncate">{eyeColor}</span>
              </div>
            </div>

            {/* Hair Color */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-gray-400" />
                <span>Hair Color</span>
              </label>
              <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white flex items-center gap-2 truncate">
                {hairColor !== 'Not Specified' && (
                  <span className={`w-2.5 h-2.5 rounded-full border shrink-0 ${getHairColorStyle(hairColor)}`} />
                )}
                <span className="capitalize truncate">{hairColor}</span>
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span>Languages</span>
              </label>
              <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white truncate">
                {languagesList.length > 0 ? languagesList.join(', ') : 'English, Hindi'}
              </div>
            </div>

          </div>
        </div>

        {/* Skills Section Card */}
        <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
            <Award className="w-4 h-4 text-[#00BFFF]" />
            <span>Skills &amp; Specializations</span>
          </h2>

          {skillsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skillsList.map((skill, idx) => (
                <div
                  key={idx}
                  className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white flex items-center justify-between"
                >
                  <span className="truncate">{skill.name}</span>
                  <span className="text-[10px] font-extrabold text-[#00BFFF] bg-[#00BFFF]/10 border border-[#00BFFF]/20 px-2 py-0.5 rounded-md shrink-0 ml-2">
                    {skill.level ?? 80}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#16161a] border border-white/10 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-normal">No skills added yet.</p>
            </div>
          )}
        </div>

      </div>

      {/* Sidebar Contact Info Card */}
      {showContact && (
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg sticky top-24">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <Mail className="w-4 h-4 text-[#00BFFF]" />
              <span>Contact Information</span>
            </h2>

            <div className="space-y-4">
              
              {/* Email Field Box */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>Email</span>
                  </span>
                  {profile.email && profile.email !== 'Not Provided' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(profile.email || '', 'email')}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy email"
                    >
                      {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </label>
                <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white break-all">
                  {profile.email || 'Not Provided'}
                </div>
              </div>

              {/* Phone Field Box */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>Phone</span>
                  </span>
                  {profile.phone && profile.phone !== 'Not Provided' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(profile.phone || '', 'phone')}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </label>
                <div className="bg-[#16161a] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white">
                  {profile.phone || 'Not Provided'}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
