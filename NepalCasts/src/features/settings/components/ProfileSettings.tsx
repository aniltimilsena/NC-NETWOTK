import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import { CurrentUser } from '../../../utils/CurrentUser';
import { CATEGORIES, getCategoryConfig } from '../../../constants/categories';
import type { UserProfile } from '../../../types';
interface ProfileSettingsProps {
    profile: UserProfile;
    onUpdate: (data: Partial<UserProfile>) => Promise<any>;
    showAlert: (message: string, type?: any) => void;
}
export default function ProfileSettings({ profile, onUpdate, showAlert }: ProfileSettingsProps) {
    const [name, setName] = useState(profile?.name || '');
    const [role, setRole] = useState(profile?.role || (profile as any)?.category || '');
    const [category, setCategory] = useState((profile as any)?.category || profile?.role || '');
    const [gender, setGender] = useState(profile?.gender || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [location, setLocation] = useState(profile?.location || '');
    const [height, setHeight] = useState(profile?.height || '');
    const [weight, setWeight] = useState(profile?.weight || '');
    const [eyeColor, setEyeColor] = useState(profile?.eyeColor || '');
    const [hairColor, setHairColor] = useState(profile?.hairColor || '');
    const [showContactInfo, setShowContactInfo] = useState(profile?.showContactInfo || false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (profile) {
            setName(profile.name || '');
            const r = profile.role || (profile as any)?.category || '';
            setRole(r);
            setCategory((profile as any)?.category || r);
            setGender(profile.gender || '');
            setBio(profile.bio || '');
            setLocation(profile.location || '');
            setHeight(profile.height || '');
            setWeight(profile.weight || '');
            setEyeColor(profile.eyeColor || '');
            setHairColor(profile.hairColor || '');
            setShowContactInfo(profile.showContactInfo || false);
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const selectedRole = role || category || 'Actor';
            const res = await onUpdate({
                name,
                role: selectedRole,
                category: selectedRole,
                gender,
                bio,
                location,
                height,
                weight,
                eyeColor,
                hairColor,
                showContactInfo
            });
            if (res.success) {
                showAlert('Profile updated successfully!', 'success');
            }
            else {
                showAlert(res.error || 'Failed to update profile.', 'error');
            }
        }
        catch (err) {
            console.error(err);
            showAlert('Failed to update profile.', 'error');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!val.trim()) {
            setHeight('');
            return;
        }
        const clean = val.replace(/\s*ft\.?$/i, '').trim();
        if (/[\d'".]_?$/.test(clean)) {
            setHeight(`${clean} ft`);
        }
        else {
            setHeight(val);
        }
    };
    const handleHeightBlur = () => {
        if (!height)
            return;
        const clean = height.replace(/\s*ft\.?$/i, '').trim();
        if (/[\d'".]_?$/.test(clean)) {
            setHeight(`${clean} ft`);
        }
    };
    const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (!val.trim()) {
            setWeight('');
            return;
        }
        const clean = val.replace(/\s*kgs?$/i, '').trim();
        if (/[\d.]_?$/.test(clean)) {
            setWeight(`${clean} kg`);
        }
        else {
            setWeight(val);
        }
    };
    const handleWeightBlur = () => {
        if (!weight)
            return;
        const clean = weight.replace(/\s*kgs?$/i, '').trim();
        if (/[\d.]_?$/.test(clean)) {
            setWeight(`${clean} kg`);
        }
    };
    return (<form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Photo Section */}
      <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-5 items-center">
        <Avatar src={profile.image || profile.photoURL || CurrentUser.imageUrl || null} gender={profile.gender || ''} name={name} size="lg" editable={true} userId={profile.uid} onUploadSuccess={(url: string) => onUpdate({ image: url, photoURL: url })} showAlert={showAlert}/>
        <div className="text-center sm:text-left space-y-1">
          <h3 className="text-base font-bold text-white">Profile Photo</h3>
        </div>
      </div>

      {/* Info Form Section */}
      <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-white"/>
          Basic Profile Information
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all"/>
          </div>

          
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Location</label>
            <input type="text" value={location} placeholder="e.g. Kathmandu, Nepal" onChange={(e) => setLocation(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all"/>
          </div>

          
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Role / Specialty</label>
            <select
              value={role || category}
              onChange={(e) => {
                setCategory(e.target.value);
                setRole(e.target.value);
              }}
              className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled>Select Specialty</option>
              {CATEGORIES.map(opt => {
                const cfg = getCategoryConfig(opt);
                return <option key={opt} value={cfg.label}>{cfg.label}</option>;
              })}
              {role && !CATEGORIES.some(opt => getCategoryConfig(opt).label === role) && (
                <option value={role}>{role}</option>
              )}
            </select>
          </div>

          
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all appearance-none cursor-pointer">
              <option value="" disabled>Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Bio</label>
          <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write a short summary about your professional background, acting range, and interests..." className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all resize-none"/>
        </div>
      </div>

      {/* Physical Appearance Section */}
      <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-white"/>
          Physical Appearance
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Height</label>
            <input type="text" value={height} placeholder={"e.g. 5'10 ft"} onChange={(e) => setHeight(e.target.value)} onBlur={handleHeightBlur} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all"/>
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Weight</label>
            <input type="text" value={weight} placeholder="e.g. 70 kg" onChange={(e) => setWeight(e.target.value)} onBlur={handleWeightBlur} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all"/>
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Eye Color</label>
            <input type="text" value={eyeColor} placeholder="e.g. Brown" onChange={(e) => setEyeColor(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all"/>
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Hair Color</label>
            <input type="text" value={hairColor} placeholder="e.g. Black" onChange={(e) => setHairColor(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white outline-none transition-all"/>
          </div>
        </div>
      </div>

      {/* Visibility Section */}
      <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 flex justify-between items-center">
        <div className="text-left space-y-1">
          <h3 className="text-sm font-bold text-white">Show Contact Info</h3>
          <p className="text-xs text-nc-muted leading-relaxed">
            Allow casting directors and verified actors to view your contact information (email/phone).
          </p>
        </div>
        <button type="button" onClick={() => setShowContactInfo(!showContactInfo)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${showContactInfo ? 'bg-[#522C69]' : 'bg-white/10'}`}>
          <div className={`w-4 h-4 rounded-full bg-black transition-transform duration-300 ${showContactInfo ? 'translate-x-6' : 'translate-x-0'}`}/>
        </button>
      </div>

      
      <div className="flex justify-end">
        <Button type="submit" loading={submitting} className="px-8">
          Save Changes
        </Button>
      </div>
    </form>);
}
export type { ProfileSettingsProps };
