import React, { useState } from 'react';
import { Briefcase, Calendar, Building2, Plus, Trash2 } from 'lucide-react';
import { updateProfileData } from '../../../services';
import type { UserProfile } from '../../../types';

interface ProfileExperienceProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  showAlert?: (message: string, type?: any, detail?: string) => void;
}

export default function ProfileExperience({ profile, isOwnProfile, showAlert }: ProfileExperienceProps) {
  const experiencesList = Array.isArray(profile.experience) ? profile.experience : [];
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);
    try {
      const newItem = {
        title: newTitle.trim(),
        company: newCompany.trim(),
        year: newYear.trim(),
        description: newDescription.trim(),
      };
      const updatedList = [...experiencesList, newItem];
      await updateProfileData(profile.uid, { experience: updatedList });
      setNewTitle('');
      setNewCompany('');
      setNewYear('');
      setNewDescription('');
      setShowAddForm(false);
      showAlert?.('Experience Added', 'success', 'Your portfolio experience has been updated.');
    } catch (err: any) {
      showAlert?.('Error', 'error', err.message || 'Failed to add experience.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExperience = async (index: number) => {
    try {
      const updatedList = experiencesList.filter((_, idx) => idx !== index);
      await updateProfileData(profile.uid, { experience: updatedList });
      showAlert?.('Experience Removed', 'info');
    } catch (err: any) {
      showAlert?.('Error', 'error', 'Failed to remove experience item.');
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 gap-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-white" />
          <span>Work Experience</span>
        </h2>

        {isOwnProfile && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs font-bold py-1.5 px-4 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Experience</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {isOwnProfile && showAddForm && (
        <form
          onSubmit={handleAddExperience}
          className="border border-white/10 rounded-2xl p-5 space-y-4 animate-fade-in bg-white/[0.02]"
        >
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Work Credit</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Role / Title (e.g. Lead Actor, Model)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#00BFFF]"
            />
            <input
              type="text"
              placeholder="Production / Company (e.g. Nepal Film)"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#00BFFF]"
            />
          </div>
          <input
            type="text"
            placeholder="Year / Period (e.g. 2024, 2022 - Present)"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#00BFFF]"
          />
          <textarea
            placeholder="Brief description of your role, key scenes, or accomplishments..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#00BFFF] resize-none"
          />

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-full bg-[#00BFFF] text-black text-xs font-bold hover:bg-[#00BFFF]/90 transition-all active:scale-95 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Experience'}
            </button>
          </div>
        </form>
      )}

      {/* Experience List */}
      {experiencesList.length > 0 ? (
        <div className="space-y-4 divide-y divide-white/5">
          {experiencesList.map((exp: any, index: number) => (
            <div
              key={index}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${index > 0 ? 'pt-4' : ''
                }`}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-sm font-bold text-white">
                    {exp.title || exp.role || 'Production Experience'}
                  </h3>
                  {exp.year && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-white" />
                      {exp.year}
                    </span>
                  )}
                </div>

                {(exp.company || exp.production) && (
                  <div className="text-xs text-[#00BFFF] font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>{exp.company || exp.production}</span>
                  </div>
                )}

                {exp.description && (
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line pt-0.5">
                    {exp.description}
                  </p>
                )}
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => handleDeleteExperience(index)}
                  className="self-end sm:self-center p-2 rounded-full hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete Experience"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-white/10 rounded-2xl py-10 px-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-gray-400">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs font-bold text-gray-300">No experience credits listed yet</p>
          {isOwnProfile && (
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs font-bold text-[#00BFFF] hover:underline cursor-pointer"
            >
              + Add work credit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
