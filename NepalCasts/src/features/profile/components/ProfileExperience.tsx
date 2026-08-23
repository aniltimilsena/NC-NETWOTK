import React, { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { updateProfileData } from '../../../services';
import type { UserProfile } from '../../../types';

interface ProfileExperienceProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  showAlert?: (message: string, type?: any, detail?: string) => void;
  onNavigate?: (page: string, param?: any) => void;
}

export default function ProfileExperience({ profile, isOwnProfile, showAlert, onNavigate }: ProfileExperienceProps) {
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
    <div className="w-full space-y-2 text-left font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
          Experience
        </h2>

        {isOwnProfile && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs font-semibold text-[#0088CC] hover:text-[#38c9ff] transition-colors cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Experience</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {isOwnProfile && showAddForm && (
        <form
          onSubmit={handleAddExperience}
          className="bg-black border border-white/5 rounded-xl p-4 space-y-3 animate-fade-in shadow-md"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Add Work Experience
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Role / Title (e.g. Lead Actor, Model)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#0088CC] transition-colors"
            />
            <input
              type="text"
              placeholder="Production / Company (e.g. Maya Short Film)"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#0088CC] transition-colors"
            />
          </div>

          <input
            type="text"
            placeholder="Year / Period (e.g. 2024, 2021 - 2023)"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            className="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#0088CC] transition-colors"
          />

          <textarea
            placeholder="Brief description of your role or project..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#0088CC] resize-none transition-colors"
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-[#0088CC] hover:bg-[#0077B3] text-white text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-[#0088CC]/30"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Stacked Experience Card List */}
      {experiencesList.length > 0 ? (
        <div className="bg-[#181818] rounded-xl overflow-hidden divide-y divide-white/5 shadow-sm">
          {experiencesList.map((exp: any, index: number) => (
            <div
              key={index}
              className="p-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm hover:bg-[#1a1a1a] transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-medium text-gray-200 truncate">
                    {exp.title || exp.role || 'Production Experience'}
                  </span>
                  {(exp.company || exp.production) && (
                    <span className="text-gray-400 font-normal truncate">
                      – “{exp.company || exp.production}”
                    </span>
                  )}
                </div>
                {exp.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                    {exp.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {exp.year && (
                  <span className="text-gray-400 font-mono text-xs">
                    {exp.year}
                  </span>
                )}
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => handleDeleteExperience(index)}
                    className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !showAddForm ? (
        isOwnProfile ? (
          <div
            onClick={() => (onNavigate ? onNavigate('/settings/experience') : setShowAddForm(true))}
            className="border border-dashed border-white/10 bg-black rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/20 transition-colors group"
          >
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#0088CC] mb-1" />
            <span className="text-xs font-semibold text-gray-400 group-hover:text-white">
              Add Experience
            </span>
            <p className="text-[10px] text-gray-500 mt-0.5">Share your work experience...</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic pt-1">No experience listed yet.</p>
        )
      ) : null}
    </div>
  );
}
