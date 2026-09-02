import React, { useState } from 'react';
import { Trash2, Briefcase } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { UserProfile, Experience } from '../../../types';
interface ExperienceSettingsProps {
    profile: UserProfile;
    onUpdate: (data: Partial<UserProfile>) => Promise<any>;
    showAlert: (message: string, type?: any) => void;
}
export default function ExperienceSettings({ profile, onUpdate, showAlert }: ExperienceSettingsProps) {
    const currentExperience = Array.isArray(profile.experience) ? profile.experience : [];
    const [experienceList, setExperienceList] = useState<Experience[]>(currentExperience);
    const [title, setTitle] = useState('');
    const [role, setRole] = useState('');
    const [year, setYear] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const handleAddExperience = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title.trim() || !role.trim()) {
            showAlert('Please fill in both Project Title and Your Role.', 'error');
            return;
        }
        const newItem: Experience = {
            title: title.trim(),
            role: role.trim(),
            year: year.trim() || 'N/A',
            description: description.trim(),
        };
        setExperienceList([...experienceList, newItem]);
        setTitle('');
        setRole('');
        setYear('');
        setDescription('');
        showAlert(`Added "${newItem.title}" to work history. Click "Save Changes" to save.`, 'success');
    };
    const handleRemoveExperience = (idx: number) => {
        setExperienceList(experienceList.filter((_, i) => i !== idx));
    };
    const handleSave = async () => {
        setSubmitting(true);
        try {
            const res = await onUpdate({ experience: experienceList });
            if (res.success) {
                showAlert('Experience updated successfully!', 'success');
            }
            else {
                showAlert(res.error || 'Failed to update experience.', 'error');
            }
        }
        catch (err) {
            console.error(err);
            showAlert('Failed to save experience.', 'error');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<div className="space-y-1.5 sm:space-y-3">
      
      <div className="bg-[#0E0E0E] border-0 rounded-none sm:rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-white"/>
          Add Professional Experience
        </h2>

        <form onSubmit={handleAddExperience} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Project Title</label>
              <input type="text" placeholder="e.g. Kathmandu Dreams Film" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none"/>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Your Role</label>
              <input type="text" placeholder="e.g. Lead Actor, Supporting, Cameraman" value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none"/>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Year / Period</label>
              <input type="text" placeholder="e.g. 2024" value={year} onChange={(e) => setYear(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none"/>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Description</label>
            <textarea rows={3} placeholder="Detail your responsibilities, working crew, or specific awards received..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#522C69] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none resize-none"/>
          </div>

          <div className="flex justify-end">
            <Button type="submit" onClick={handleAddExperience} className="px-4 py-1.5 h-9 rounded-xl text-xs font-bold">
              Add Item
            </Button>
          </div>
        </form>
      </div>

      
      <div className="bg-[#0E0E0E] border-0 rounded-none sm:rounded-2xl p-4 sm:p-5 space-y-4">
        <h2 className="text-base font-bold text-white">Work History</h2>

        {experienceList.length > 0 ? (<div className="space-y-3">
            {experienceList.map((item, idx) => (<div key={idx} className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-xl items-start">
                <div className="w-10 h-10 rounded-xl bg-[#522C69]/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-white"/>
                </div>
                <div className="flex-1 space-y-1 text-left min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                    <span className="text-[10px] text-nc-muted font-bold whitespace-nowrap">{item.year}</span>
                  </div>
                  <span className="text-xs text-[#522C69] font-semibold block uppercase tracking-wider">
                    {item.role}
                  </span>
                  {item.description && (<p className="text-xs text-nc-muted leading-relaxed mt-2">{item.description}</p>)}
                </div>
                <button type="button" onClick={() => handleRemoveExperience(idx)} className="text-nc-muted hover:text-red-500 transition-colors p-2 self-start cursor-pointer">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>))}
          </div>) : (<p className="text-xs text-nc-muted py-6">No experience history added yet.</p>)}
      </div>

      
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={submitting} className="px-6 py-2 h-10 rounded-xl text-xs font-bold">
          Save Changes
        </Button>
      </div>
    </div>);
}
export type { ExperienceSettingsProps };
