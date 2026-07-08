import React, { useState } from 'react';
import { Plus, Trash2, Check, Award } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { UserProfile, Skill } from '../../../types';

interface SkillsSettingsProps {
  profile: UserProfile;
  onUpdate: (data: Partial<UserProfile>) => Promise<any>;
  showAlert: (message: string, type?: any) => void;
}

export default function SkillsSettings({ profile, onUpdate, showAlert }: SkillsSettingsProps) {
  const currentSkills = Array.isArray(profile.skills) ? profile.skills : [];
  const [skills, setSkills] = useState<Skill[]>(
    currentSkills.map(s => typeof s === 'string' ? { name: s, level: 80 } : { name: s.name, level: s.level ?? 80 })
  );
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(80);
  const [submitting, setSubmitting] = useState(false);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    if (skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) {
      showAlert('Skill already added!', 'error');
      return;
    }

    setSkills([...skills, { name: newSkillName.trim(), level: newSkillLevel }]);
    setNewSkillName('');
    setNewSkillLevel(80);
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
      } else {
        showAlert(res.error || 'Failed to update skills.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to save skills.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Skill Panel */}
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-[#00BFFF]" />
          Add Professional Skills
        </h2>

        <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-black block">Skill Name</label>
            <input
              type="text"
              placeholder="e.g. Acting, Dancing, Method Acting, Dialects"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/5 focus:border-[#00BFFF] rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all"
            />
          </div>

          <div className="w-full sm:w-32 space-y-1.5 text-left">
            <label className="text-[10px] text-nc-muted uppercase tracking-wider font-black block">Skill Level (%)</label>
            <input
              type="number"
              min={10}
              max={100}
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(parseInt(e.target.value, 10))}
              className="w-full bg-[#1A1A1A] border border-white/5 focus:border-[#00BFFF] rounded-2xl px-4 py-3 text-sm text-white outline-none transition-all"
            />
          </div>

          <Button type="submit" className="w-full sm:w-auto h-11 px-6 rounded-2xl">
            Add
          </Button>
        </form>
      </div>

      {/* Skills Showcase Grid */}
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
        <h2 className="text-lg font-black text-white">Your Skills</h2>

        {skills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {skills.map((skill, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl"
              >
                <div className="flex-1 space-y-1 text-left">
                  <span className="text-sm font-bold text-white block">{skill.name}</span>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#00BFFF] rounded-full"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.name)}
                  className="text-nc-muted hover:text-red-500 transition-colors p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-nc-muted py-6">No skills added yet. Add some to display on your profile.</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={submitting}
          className="px-8"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
export type { SkillsSettingsProps };
