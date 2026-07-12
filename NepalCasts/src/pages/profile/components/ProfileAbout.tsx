import React from 'react';
import { Mail, Phone, Calendar, User, Eye, FileText } from 'lucide-react';
import type { UserProfile } from '../../../types';

interface ProfileAboutProps {
  profile: UserProfile;
  showContact: boolean;
}

export default function ProfileAbout({ profile, showContact }: ProfileAboutProps) {
  const bio = profile.bio || 'No bio provided yet.';
  const category = profile.category || 'Not Specified';
  const gender = profile.gender || 'Not Specified';
  const languages = Array.isArray(profile.languages) ? profile.languages.join(', ') : 'Not Specified';
  
  const physicalDetails = [
    { label: 'Height', value: profile.height || 'Not Specified' },
    { label: 'Weight', value: profile.weight || 'Not Specified' },
    { label: 'Eye Color', value: profile.eyeColor || 'Not Specified' },
    { label: 'Hair Color', value: profile.hairColor || 'Not Specified' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Columns - Bio & Physical */}
      <div className={`${showContact ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
        {/* Bio Panel */}
        <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2rem] p-6 space-y-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00BFFF]" />
            About Me
          </h2>
          <p className="text-nc-muted text-sm leading-relaxed whitespace-pre-line">{bio}</p>
        </div>

        {/* Physical Appearance & Details Panel */}
        <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2rem] p-6 space-y-6">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#00BFFF]" />
            Details & Attributes
          </h2>
          
          {/* Top row: Category, Gender, Languages */}
          <div className="grid grid-cols-3 gap-6 pb-6 border-b border-white/5">
            <div>
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Category
              </span>
              <span className="text-white text-sm font-black">{category}</span>
            </div>
            <div>
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Gender
              </span>
              <span className="text-white text-sm font-black">{gender}</span>
            </div>
            <div>
              <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                Languages
              </span>
              <span className="text-white text-sm font-black truncate max-w-[150px]">{languages}</span>
            </div>
          </div>

          {/* Bottom row: Height, Weight, Eye Color, Hair Color */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {physicalDetails.map((detail, idx) => (
              <div key={idx} className="text-left sm:text-center">
                <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block mb-1">
                  {detail.label}
                </span>
                <span className="text-white text-sm font-black">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Contact details */}
      {showContact && (
        <div className="space-y-6">
          {/* Contact Info (with PII Redaction Guard) */}
          <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2rem] p-6 space-y-4">
            <h2 className="text-xl font-black text-white">Contact Information</h2>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[#00BFFF]" />
                </div>
                <div>
                  <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Email</span>
                  <span className="text-white text-xs font-bold">{profile.email || 'Not Provided'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-[#00BFFF]" />
                </div>
                <div>
                  <span className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Phone</span>
                  <span className="text-white text-xs font-bold">{profile.phone || 'Not Provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
