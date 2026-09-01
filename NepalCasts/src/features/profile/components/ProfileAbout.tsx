import React, { useState } from 'react';
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Star,
  Ruler,
  Eye,
  Scissors,
  Globe,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import { formatRole } from '../../../utils';
import type { UserProfile } from '../../../types';

interface ProfileAboutProps {
  profile: UserProfile;
  showContact: boolean;
}

export function ProfileSpecsSidebar({ profile, showContact }: ProfileAboutProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const name =
    profile?.name ||
    (profile as any)?.displayName ||
    (profile as any)?.fullName ||
    ((profile as any)?.email ? (profile as any).email.split('@')[0] : 'Talent');

  const firstName = name.split(' ')[0] || name;

  const bio = profile.bio || '';
  const category = formatRole(profile.category || (profile as any)?.role);
  const gender = profile.gender || 'Male';

  const languagesRaw: unknown = profile.languages;
  const languagesList: string[] = Array.isArray(languagesRaw)
    ? languagesRaw.map(String)
    : typeof languagesRaw === 'string' && languagesRaw
    ? (languagesRaw as string).split(',').map((s: string) => s.trim())
    : ['English', 'Nepali', 'Hindi'];

  const rawSkills: any = profile.skills;
  const skillsList: { name: string; level?: number }[] = Array.isArray(rawSkills)
    ? rawSkills.map((s) => (typeof s === 'string' ? { name: s, level: 85 } : { name: s.name, level: s.level ?? 85 }))
    : typeof rawSkills === 'string' && rawSkills
    ? (rawSkills as string).split(',').map((s: string) => ({ name: s.trim(), level: 85 }))
    : [];

  const eyeColor = profile.eyeColor || 'Not Specified';
  const hairColor = profile.hairColor || 'Not Specified';
  const height = profile.height || "5'6 ft";
  const weight = profile.weight || "60 kg";
  const location = (profile as any)?.location || (profile as any)?.city || 'Dailekh, Nepal';

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
    <div className="flex flex-col gap-2.5 w-full text-left font-sans">
      {/* 1. About Section */}
      <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2 shadow-xl">
        <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono uppercase">
          About {firstName}
        </h2>
        <div className="bg-[#18181D] rounded-xl p-3 flex items-start gap-2.5 border border-white/5 hover:border-white/15 transition-all">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white mt-0.5">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="text-xs sm:text-sm text-gray-300 min-w-0 flex-1 pt-0.5">
            {bio ? (
              <p className="whitespace-pre-line leading-relaxed text-gray-200">{bio}</p>
            ) : (
              <p className="text-xs text-gray-400 font-medium">No bio to show</p>
            )}
          </div>
        </div>
      </section>

      {/* 2. Attributes Section */}
      <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-xl">
        <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono uppercase">
          Attributes
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Category */}
          <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/5 hover:border-white/15 transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                Category
              </span>
              <span className="text-xs sm:text-sm text-white font-semibold block capitalize truncate">
                {category}
              </span>
            </div>
          </div>

          {/* Gender */}
          <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/5 hover:border-white/15 transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
              <span className="text-sm text-white leading-none">⚥</span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                Gender
              </span>
              <span className="text-xs sm:text-sm text-white font-semibold block capitalize truncate">
                {gender}
              </span>
            </div>
          </div>

          {/* Height / Weight */}
          <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/5 hover:border-white/15 transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
              <Ruler className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                Height / Weight
              </span>
              <span className="text-xs sm:text-sm text-white font-semibold block truncate">
                {height} · {weight}
              </span>
            </div>
          </div>

          {/* Eye color */}
          <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/5 hover:border-white/15 transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
              <Eye className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                Eye color
              </span>
              <span className="text-xs sm:text-sm text-white font-semibold block capitalize truncate">
                {eyeColor}
              </span>
            </div>
          </div>

          {/* Hair color */}
          <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/5 hover:border-white/15 transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
              <Scissors className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                Hair color
              </span>
              <span className="text-xs sm:text-sm text-white font-semibold block capitalize truncate">
                {hairColor}
              </span>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 border border-white/5 hover:border-white/15 transition-all cursor-default">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                Languages
              </span>
              <span className="text-xs sm:text-sm text-white font-semibold block truncate">
                {languagesList.join(', ')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Contact and Basic Info Section */}
      {showContact && (
        <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2 shadow-xl">
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono uppercase">
            Contact and Basic Info
          </h2>

          {profile.email || profile.phone ? (
            <div className="flex flex-col gap-2">
              {profile.email && (
                <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 border border-white/5 hover:border-white/15 transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
                      <Mail className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                        Email
                      </span>
                      <a
                        href={`mailto:${profile.email}`}
                        className="text-xs sm:text-sm text-white font-semibold hover:text-[#522C69] transition-colors truncate block"
                      >
                        {profile.email}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(profile.email || '', 'email')}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer shrink-0"
                    title="Copy email"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-300" />}
                  </button>
                </div>
              )}

              {profile.phone && (
                <div className="bg-[#18181D] rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2.5 border border-white/5 hover:border-white/15 transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
                      <Phone className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
                        Phone
                      </span>
                      <a
                        href={`tel:${profile.phone}`}
                        className="text-xs sm:text-sm text-white font-semibold hover:text-[#522C69] transition-colors truncate block"
                      >
                        {profile.phone}
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(profile.phone || '', 'phone')}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer shrink-0"
                    title="Copy phone"
                  >
                    {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-300" />}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#18181D] border border-white/5">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
                <Mail className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-200 font-medium">No contact info to show</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Add your contact details so people can reach you.</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. Places Lived */}
      <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2 shadow-xl">
        <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono uppercase">
          Places Lived
        </h2>
        <div className="bg-[#18181D] rounded-xl p-3 flex items-center gap-2.5 border border-white/5 hover:border-white/15 transition-all">
          <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block mb-0.5 uppercase tracking-wider font-mono">
              Current Location
            </span>
            <span className="text-xs sm:text-sm text-white font-semibold block">{location}</span>
          </div>
        </div>
      </section>

      {/* 5. Skills & Specializations Section */}
      <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2 shadow-xl">
        <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono uppercase">
          Skills &amp; Specializations
        </h2>

        {skillsList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {skillsList.map((skill, idx) => (
              <div
                key={idx}
                className="p-2.5 sm:p-3 rounded-xl bg-[#18181D] border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-2"
              >
                <span className="text-xs sm:text-sm font-semibold text-white truncate">{skill.name}</span>
                <span className="text-[10px] font-bold text-[#522C69] bg-[#522C69]/10 px-2 py-0.5 rounded-md shrink-0 font-mono">
                  {skill.level ?? 85}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#18181D] border border-white/10 border-dashed">
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white">
              <Star className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-200 font-medium">No skills or endorsements added yet.</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Add skills to showcase your expertise.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProfileAbout({ profile, showContact }: ProfileAboutProps) {
  const experiences = profile.experience && Array.isArray(profile.experience) ? profile.experience : [];

  return (
    <div className="flex flex-col gap-2.5 w-full text-left font-sans">
      <ProfileSpecsSidebar profile={profile} showContact={showContact} />

      {/* Work and Education Section */}
      {experiences.length > 0 && (
        <section className="bg-[#121215] rounded-2xl border border-white/10 p-3.5 sm:p-4 flex flex-col gap-2 shadow-xl">
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide font-mono uppercase">
            Work and Education
          </h2>

          <div className="flex flex-col gap-2">
            {experiences.map((exp: any, idx: number) => (
              <div
                key={idx}
                className="bg-[#18181D] rounded-xl p-3 flex items-start gap-2.5 border border-white/5 hover:border-white/15 transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-white mt-0.5">
                  <Briefcase className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <strong className="text-xs sm:text-sm font-semibold text-white">{exp.title || 'Production Role'}</strong>
                    {exp.year && <span className="text-[10px] text-gray-400 font-mono">{exp.year}</span>}
                  </div>
                  {exp.role && <p className="text-xs text-[#522C69] font-medium mt-0.5">{exp.role}</p>}
                  {exp.description && <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{exp.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
