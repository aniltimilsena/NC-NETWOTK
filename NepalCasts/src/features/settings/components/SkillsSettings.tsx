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
    return (<div className="space-y-2.5">
      
      {/* Unified Skills Card */}
      <div className="bg-[#0E0E0E] border-0 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-white" />
            Professional Skills
          </h2>
          {skills.length > 0 && (
            <span className="text-[10px] text-zinc-500 font-mono">
              {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
            </span>
          )}
        </div>

        <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row gap-2 items-end">
          <div className="flex-1 space-y-1 w-full text-left">
            <label className="text-[9px] text-nc-muted uppercase tracking-wider font-semibold block">Skill Name</label>
            <input type="text" placeholder="e.g. Acting, Dancing, Dialects" value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} className="w-full h-8 bg-[#16161a] border border-white/10 focus:border-white/30 rounded-lg px-2.5 text-xs text-white placeholder-white/20 outline-none transition-all"/>
          </div>

          <div className="w-full sm:w-28 space-y-1 text-left">
            <label className="text-[9px] text-nc-muted uppercase tracking-wider font-semibold block">Level (%)</label>
            <input type="number" min={10} max={100} placeholder="80" value={newSkillLevel} onChange={(e) => {
            const val = e.target.value;
            setNewSkillLevel(val === '' ? '' : parseInt(val, 10));
        }} className="w-full h-8 bg-[#16161a] border border-white/10 focus:border-white/30 rounded-lg px-2.5 text-xs text-white placeholder-white/20 outline-none transition-all"/>
          </div>

          <Button type="submit" onClick={handleAddSkill} className="w-auto h-8 px-3 rounded-lg text-xs font-semibold shrink-0 self-end">
            Add
          </Button>
        </form>

        {/* Skills List */}
        <div className="pt-2 border-t border-white/[0.06]">
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] text-zinc-300 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
                >
                  <span className="leading-none">{skill.name}</span>
                  <span className="text-[9px] font-mono text-zinc-500 leading-none">
                    {skill.level ?? 80}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="p-0.5 -mr-0.5 rounded text-zinc-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    title={`Remove ${skill.name}`}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 py-0.5 text-left">No skills added yet.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end px-2 sm:px-0">
        <Button onClick={handleSave} loading={submitting} className="px-4 h-8 rounded-lg text-xs font-semibold">
          Save Changes
        </Button>
      </div>
    </div>);
}
export type { SkillsSettingsProps };
