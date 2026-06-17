import { useState } from 'react';
import { uploadProfileMedia } from '../services/profile';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import { updateProfileData } from '../services/profile';
import { serverTimestamp } from 'firebase/firestore';
import { CATEGORIES } from '../constants/categories';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: '' },
  { id: 2, title: 'Skills', icon: '' },
  { id: 3, title: 'Experience', icon: '' },
];

export default function ProfileCreate({ onNavigate, user, showAlert }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.displayName || '', 
    role: 'Actors', 
    location: '', 
    bio: '', 
    languages: [], 
    gender: 'Male',
    skills: [{ name: '', level: 80 }],
    experience: [{ title: '', company: '', year: '', description: '' }],
    photoURL: user?.photoURL || null
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);

  const languages = ['Hindi', 'English', 'Nepali', 'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Arabic'];
  const toggleLanguage = (lang) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    // Enforce 5MB limit for Basic Profile photo upload
    const sizeLimit = 5 * 1024 * 1024;
    if (file.size > sizeLimit) {
      showAlert('File Too Large', 'error', 'Profile photo exceeds the limit of 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoProgress(0);

    try {
      const url = await uploadProfileMedia(user.uid, file, (progress) => {
        setPhotoProgress(Math.round(progress));
      });

      if (url) {
        setForm(prev => ({ ...prev, photoURL: url }));
        showAlert("Profile photo uploaded successfully!", "success");
      } else {
        showAlert("Failed to upload photo.", "error");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      showAlert("Error uploading photo.", "error");
    } finally {
      setIsUploadingPhoto(false);
      setPhotoProgress(0);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-nc-dark pt-6 sm:pt-8 pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white">Create Your Profile</h1>
          <p className="text-nc-muted mt-2">Get discovered by top productions</p>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  s.id === step
                    ? 'bg-nc-accent text-nc-darker'
                    : s.id < step
                    ? 'bg-nc-accent/20 text-nc-accent border border-nc-accent/30'
                    : 'bg-nc-card border border-nc-border text-nc-muted'
                }`}
              >
                <span>{s.id < step ? 'V' : s.icon}</span>
                <span className="hidden sm:block">{s.title}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${s.id < step ? 'bg-nc-accent' : 'bg-nc-border'}`} />
              )}
            </div>
          ))}
        </div>

        <GlassCard strong className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
              <div className="flex flex-col sm:flex-row flex-wrap gap-5">
                <div className="w-full">
                  <div className="flex items-center gap-6 p-5 bg-nc-surface border border-nc-border border-dashed rounded-xl relative overflow-hidden">
                    <div className="w-20 h-20 rounded-xl bg-nc-card flex items-center justify-center text-nc-muted relative overflow-hidden">
                      {form.photoURL ? (
                        <img src={form.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-nc-accent text-xs font-bold">{photoProgress}%</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">Upload Profile Photo</p>
                      <p className="text-nc-muted text-sm mt-1">JPG, PNG. Max 5MB. Min 400x400px</p>
                      <button 
                        onClick={() => document.getElementById('profile-create-photo')?.click()}
                        disabled={isUploadingPhoto}
                        className="mt-2 text-nc-accent text-sm font-medium hover:text-sky-300 disabled:opacity-50"
                      >
                        {isUploadingPhoto ? 'Uploading...' : 'Browse files'}
                      </button>
                      <input 
                        id="profile-create-photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Full Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your full name" className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Category / Profession *</label>
                  <select 
                    value={form.role} 
                    onChange={e => setForm({...form, role: e.target.value})} 
                    className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Location *</label>
                  <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="City, State" className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-nc-secondary mb-2">Bio</label>
                  <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Tell productions about yourself..." rows={4} className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm resize-none" />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-nc-secondary mb-3">Gender *</label>
                  <div className="flex gap-4">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button 
                        key={g} 
                        onClick={() => setForm({...form, gender: g})}
                        className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                          form.gender === g 
                            ? 'bg-nc-accent/20 border-nc-accent text-nc-accent' 
                            : 'bg-nc-surface border-nc-border text-nc-muted hover:border-nc-accent/30'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-nc-secondary mb-3">Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {languages.map(lang => (
                      <button key={lang} onClick={() => toggleLanguage(lang)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.languages.includes(lang) ? 'bg-nc-accent/20 border-nc-accent text-nc-accent' : 'bg-nc-surface border-nc-border text-nc-muted hover:border-nc-accent/30'}`}>{lang}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-2">Your Skills</h2>
              <p className="text-nc-muted text-sm">Add your core skills with proficiency levels</p>
              {form.skills.map((skill, idx) => (
                <div key={idx} className="bg-nc-surface border border-nc-border rounded-xl p-4 space-y-3">
                  <div className="flex gap-3 items-center">
                    <input type="text" value={skill.name} onChange={e => { const s = [...form.skills]; s[idx].name = e.target.value; setForm({...form, skills: s}); }} placeholder="Skill name (e.g. Acting)" className="flex-1 bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                    <button onClick={() => setForm({...form, skills: form.skills.filter((_, i) => i !== idx)})} className="text-nc-muted hover:text-red-400 transition-colors p-2">✕</button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-nc-muted">
                      <span>Proficiency</span>
                      <span className="text-nc-accent font-medium">{skill.level}%</span>
                    </div>
                    <input type="range" min="10" max="100" value={skill.level} onChange={e => { const s = [...form.skills]; s[idx].level = Number(e.target.value); setForm({...form, skills: s}); }} className="w-full accent-sky-400" />
                  </div>
                </div>
              ))}
              <button onClick={() => setForm({...form, skills: [...form.skills, { name: '', level: 80 }]})} className="flex items-center gap-2 text-nc-accent text-sm font-medium hover:text-sky-300 transition-colors">
                + Add Another Skill
              </button>
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-2">Experience</h2>
              <p className="text-nc-muted text-sm">Add your work history and projects</p>
              {form.experience.map((exp, idx) => (
                <div key={idx} className="bg-nc-surface border border-nc-border rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" value={exp.title} onChange={e => { const ex = [...form.experience]; ex[idx].title = e.target.value; setForm({...form, experience: ex}); }} placeholder="Role / Project Title" className="flex-1 bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                    <input type="text" value={exp.company} onChange={e => { const ex = [...form.experience]; ex[idx].company = e.target.value; setForm({...form, experience: ex}); }} placeholder="Production / Company" className="flex-1 bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                  </div>
                  <input type="text" value={exp.year} onChange={e => { const ex = [...form.experience]; ex[idx].year = e.target.value; setForm({...form, experience: ex}); }} placeholder="Year (e.g. 2023)" className="w-full bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm" />
                  <textarea value={exp.description} onChange={e => { const ex = [...form.experience]; ex[idx].description = e.target.value; setForm({...form, experience: ex}); }} placeholder="Brief description..." rows={3} className="w-full bg-nc-card border border-nc-border rounded-lg px-4 py-2.5 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm resize-none" />
                </div>
              ))}
              <button onClick={() => setForm({...form, experience: [...form.experience, { title: '', company: '', year: '', description: '' }]})} className="flex items-center gap-2 text-nc-accent text-sm font-medium hover:text-sky-300">
                + Add Experience
              </button>
            </div>
          )}
          

          
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-nc-border">
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate('home')}
              className="text-nc-muted hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
              {step > 1 ? '<- Back' : '<- Cancel'}
            </button>
            {step < 3 ? (
              <Button size="lg" onClick={() => setStep(s => s + 1)}>Continue -{'>'}</Button>
            ) : (
              <Button 
                size="lg" 
                loading={isLoading}
                disabled={isLoading}
                onClick={async () => {
                if (!user?.uid) {
                  showAlert('Auth Error', 'error', 'Please sign in to save your profile.');
                  onNavigate('signin');
                  return;
                }
                
                if (!form.name || !form.role || !form.location) {
                  showAlert('Incomplete Profile', 'error', 'Please fill in your name, role, and location.');
                  setStep(1);
                  return;
                }

                setIsLoading(true);
                try {
                  const profileData = {
                    ...form,
                    image: form.photoURL,
                    name: form.name.trim(),
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    verified: false,
                    premium: false,
                    followers: 0,
                    following: 0,
                    rating: 0,
                    reviews: 0
                  };
                  const { success, error } = await updateProfileData(user.uid, profileData);
                  if (success) {
                    showAlert('Profile Created!', 'success', 'Your professional profile is now live.');
                    onNavigate('profile');
                  } else {
                    showAlert('Save Failed', 'error', error || 'Something went wrong while saving.');
                  }
                } catch (err) {
                  console.error("Critical Profile Save error:", err);
                  showAlert('Error', 'error', 'An unexpected error occurred.');
                } finally {
                  setIsLoading(false);
                }
              }}>Publish Profile</Button>
            )}
          </div>
        </GlassCard>
        
        <div className="mt-6">
          <div className="flex justify-between text-xs text-nc-muted mb-2">
            <span>Step {step} of {STEPS.length}</span>
            <span>{Math.round((step / STEPS.length) * 100)}% complete</span>
          </div>
          <div className="h-1 bg-nc-card rounded-full overflow-hidden">
            <div className="h-full bg-nc-accent rounded-full transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
