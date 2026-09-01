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
      <div className="flex items-center justify-between pb-1">
        <h2 className="font-apple text-lg sm:text-xl font-bold text-white tracking-tight">
          Experience
        </h2>

        {isOwnProfile && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="font-apple text-xs sm:text-sm font-semibold text-[#522C69] hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5"
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
          className="bg-black border border-white/5 rounded-xl p-4 sm:p-5 space-y-3 animate-fade-in shadow-md"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Add Work Experience
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Role / Title (e.g. Lead Actor, Model)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="bg-[#181818] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#522C69] transition-colors"
            />
            <input
              type="text"
              placeholder="Production / Company (e.g. Maya Short Film)"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="bg-[#181818] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#522C69] transition-colors"
            />
          </div>

          <input
            type="text"
            placeholder="Year / Period (e.g. 2024, 2021 - 2023)"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            className="w-full bg-[#181818] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#522C69] transition-colors"
          />

          <textarea
            placeholder="Brief description of your role or notable achievements (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={2}
            className="w-full bg-[#181818] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-[#522C69] transition-colors resize-none"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
              className="p-4 flex items-center justify-between gap-3 text-sm sm:text-base hover:bg-[#1a1a1a] transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-gray-100 truncate text-sm sm:text-base">
                    {exp.title || exp.role || 'Production Experience'}
                  </span>
                  {(exp.company || exp.production) && (
                    <span className="text-gray-400 font-normal truncate text-xs sm:text-sm">
                      – “{exp.company || exp.production}”
                    </span>
                  )}
                </div>
                {exp.description && (
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-2">
                    {exp.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {exp.year && (
                  <span className="text-gray-400 font-mono text-xs sm:text-sm">
                    {exp.year}
                  </span>
                )}
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => handleDeleteExperience(index)}
                    className="p-1.5 rounded text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
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
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-white mb-1" />
            <span className="text-xs font-semibold text-gray-400 group-hover:text-white">
              Add Experience
            </span>
            <p className="text-[10px] text-gray-500 mt-0.5">Share your work experience...</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-black/40 py-8 px-4 flex flex-col items-center justify-center text-center space-y-1">
            <p className="text-xs sm:text-sm text-neutral-400 font-medium">No experience listed yet</p>
            <p className="text-[11px] sm:text-xs text-neutral-500">Past productions, roles, and project credits will appear here.</p>
          </div>
        )
      ) : null}
    </div>
  );
}
