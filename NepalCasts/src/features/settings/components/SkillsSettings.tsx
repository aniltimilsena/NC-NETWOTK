import React, { useState } from 'react';
import { Trash2, Award } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { UserProfile, Skill } from '../../../types';
interface SkillsSettingsProps {
    profile: UserProfile;
    onUpdate: (data: Partial<UserProfile>) => Promise<any>;
    showAlert: (message: string, type?: any) => void;
}
export default function SkillsSettings({ profile, onUpdate, showAlert }: SkillsSettingsProps) {
    const currentSkills = Array.isArray(profile.skills) ? profile.skills : [];
    const [skills, setSkills] = useState<Skill[]>(currentSkills.map(s => typeof s === 'string' ? { name: s, level: 80 } : { name: s.name, level: s.level ?? 80 }));
    const [newSkillName, setNewSkillName] = useState('');
    const [newSkillLevel, setNewSkillLevel] = useState<number | ''>('');
    const [submitting, setSubmitting] = useState(false);
    const handleAddSkill = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedName = newSkillName.trim();
        if (!trimmedName) {
            showAlert('Please enter a skill name first.', 'error');
            return;
        }
        if (skills.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
            showAlert('Skill already added!', 'error');
            return;
        }
        const levelVal = typeof newSkillLevel === 'number' && !isNaN(newSkillLevel) ? newSkillLevel : 80;
        setSkills([...skills, { name: trimmedName, level: levelVal }]);
        setNewSkillName('');
        setNewSkillLevel('');
        showAlert(`Added "${trimmedName}" to skills. Click "Save Changes" to save.`, 'success');
    };
    const handleRemoveSkill = (name: string) => {
        setSkills(skills.filter(s => s.name !== name));
    };
    const handleSave = async () => {
        setSubmitting(true);
        try {
            const res = await onUpdate({ skills });
            if (res.success) {
                showAlert('Skills updated successfully!', 'success');
            }
            else {
                showAlert(res.error || 'Failed to update skills.', 'error');
            }
        }
        catch (err) {
            console.error(err);
            showAlert('Failed to save skills.', 'error');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<div className="space-y-6">
      
      <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-white"/>
          Add Professional Skills
        </h2>

        <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Skill Name</label>
            <input type="text" placeholder="e.g. Acting, Dancing, Method Acting, Dialects" value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} className="w-full bg-[#16161a] border border-white/10 focus:border-[#00BFFF] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all"/>
          </div>

          <div className="w-full sm:w-32 space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-bold block">Skill Level (%)</label>
            <input type="number" min={10} max={100} placeholder="e.g. 80" value={newSkillLevel} onChange={(e) => {
            const val = e.target.value;
            setNewSkillLevel(val === '' ? '' : parseInt(val, 10));
        }} className="w-full bg-[#16161a] border border-white/10 focus:border-[#00BFFF] rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/20 outline-none transition-all"/>
          </div>

          <Button type="submit" onClick={handleAddSkill} className="w-auto h-9 px-4 py-1.5 rounded-xl text-xs font-bold shrink-0 self-end">
            Add
          </Button>
        </form>
      </div>

      
      <div className="bg-[#0E0E0E] border border-white/10 rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="text-base font-bold text-white">Your Skills</h2>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {skills.map((skill, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs font-bold text-white hover:bg-white/10 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                <span>{skill.name}</span>
                <span className="text-[10px] font-semibold text-gray-400 bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                  {skill.level ?? 80}%
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.name)}
                  className="text-gray-400 hover:text-red-400 transition-colors ml-1 p-0.5 cursor-pointer shrink-0"
                  title="Remove skill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2 text-left">No skills added yet. Add some to display on your profile.</p>
        )}
      </div>

      
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={submitting} className="px-6 py-2 h-10 rounded-xl text-xs font-bold">
          Save Changes
        </Button>
      </div>
    </div>);
}
export type { SkillsSettingsProps };
