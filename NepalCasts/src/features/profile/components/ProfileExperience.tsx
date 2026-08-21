import React, { useState } from 'react';
import { Briefcase, Calendar, Building2, Plus, Trash2, Loader2 } from 'lucide-react';
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
    <div className="w-full py-1.5 px-0 space-y-1.5 font-sans text-left">
      <section className="bg-[#FCFBF7] rounded-xl border border-[#EBE7DF] p-3 sm:p-3.5 flex flex-col gap-2 shadow-sm">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 tracking-wider uppercase font-mono flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-800" />
            <span>WORK EXPERIENCE</span>
          </h2>

          {isOwnProfile && !showAddForm && experiencesList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="text-xs font-mono font-bold py-1.5 px-4 rounded-xl bg-[#0088CC] text-white hover:bg-[#0077B3] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
              <span>Add Experience</span>
            </button>
          )}
        </div>

        {/* Add Form */}
        {isOwnProfile && showAddForm && (
          <form
            onSubmit={handleAddExperience}
            className="bg-[#F5F2EB] border border-[#DDD7CC] rounded-xl p-3.5 sm:p-4 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-gray-900 uppercase tracking-wider">
                Add Work Credit
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Role / Title (e.g. Lead Actor, Model)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="bg-[#FCFBF7] border border-[#DDD7CC] rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-500 outline-none focus:border-[#0088CC] transition-colors"
              />
              <input
                type="text"
                placeholder="Production / Company (e.g. Nepal Film)"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="bg-[#FCFBF7] border border-[#DDD7CC] rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-500 outline-none focus:border-[#0088CC] transition-colors"
              />
            </div>

            <input
              type="text"
              placeholder="Year / Period (e.g. 2024, 2022 - Present)"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="w-full bg-[#FCFBF7] border border-[#DDD7CC] rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-500 outline-none focus:border-[#0088CC] transition-colors"
            />

            <textarea
              placeholder="Brief description of your role, key scenes, or accomplishments..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#FCFBF7] border border-[#DDD7CC] rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-500 outline-none focus:border-[#0088CC] resize-none transition-colors"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded-xl bg-[#0088CC] hover:bg-[#0077B3] text-white text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 uppercase tracking-wider"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Experience</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Experience List */}
        {experiencesList.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {experiencesList.map((exp: any, index: number) => (
              <div
                key={index}
                className="bg-[#F5F2EB] rounded-lg p-2.5 sm:p-3 flex items-start justify-between gap-2.5 border border-[#E8E3D9] hover:border-[#D6CFBE] transition-colors group"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-[#EAE5DA] flex items-center justify-center shrink-0 border border-[#DDD7CC] mt-0.5">
                    <Briefcase className="w-3.5 h-3.5 text-gray-800" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                        {exp.title || exp.role || 'Production Experience'}
                      </h3>
                      {exp.year && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FCFBF7] border border-[#DDD7CC] text-gray-600 text-[10px] font-mono flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-gray-700" />
                          {exp.year}
                        </span>
                      )}
                    </div>

                    {(exp.company || exp.production) && (
                      <div className="text-xs text-[#0088CC] font-medium flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3 h-3 text-gray-700" />
                        <span>{exp.company || exp.production}</span>
                      </div>
                    )}

                    {exp.description && (
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line pt-0.5">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </div>

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => handleDeleteExperience(index)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 bg-black/5 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                    title="Delete Experience"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : !showAddForm ? (
          <div className="bg-[#F5F2EB] border border-dashed border-[#DDD7CC] rounded-xl p-8 sm:p-10 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 text-gray-800 bg-[#EAE5DA] border border-[#DDD7CC]">
              <Briefcase className="w-6 h-6 text-gray-800" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {isOwnProfile ? 'No experience credits listed yet' : 'No experience credits available'}
            </p>
            <p className="text-xs text-gray-500 max-w-sm">
              {isOwnProfile ? 'Add your production credits, film roles, and modeling experience' : 'This talent has not listed work experience credits yet.'}
            </p>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-3 bg-[#0088CC] hover:bg-[#0077B3] text-white font-mono font-bold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Plus className="w-4 h-4 text-white stroke-[3]" />
                <span>ADD EXPERIENCE</span>
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
