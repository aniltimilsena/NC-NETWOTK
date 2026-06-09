import { useEffect, useState } from 'react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import SkillBar from '../components/ui/SkillBar';
import Avatar from '../components/ui/Avatar';
import { subscribeToProfile, uploadProfileMedia, updateProfileData } from '../services/profile';
import { usePermissionContext } from '../context/PermissionContext';

export default function Profile({ onNavigate, user, profileId }) {
  const isLoggedIn = !!user;
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const { requestPermission } = usePermissionContext();

  useEffect(() => {
    const targetUid = profileId || user?.uid;
    if (!targetUid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToProfile(targetUid, (data) => {
      setProfile(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profileId, user?.uid]);
  
  // Facebook-style Empty Placeholder Component
  const EmptyState = ({ title, description, icon, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-nc-card/30 border border-dashed border-white/10 rounded-[2rem] backdrop-blur-sm animate-fade-in group hover:border-nc-accent/30 transition-all duration-500">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-nc-accent/10 transition-all duration-500">
        <span className="text-4xl text-white/20 group-hover:text-nc-accent transition-colors">{icon}</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-nc-muted text-sm max-w-xs mx-auto mb-8 leading-relaxed">{description}</p>
      {isLoggedIn && actionLabel && (
        <Button size="sm" onClick={onAction} className="px-8 shadow-lg shadow-nc-accent/20">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  const handleMediaUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    
    requestPermission('photos', async () => {
      setIsUploadingMedia(true);
      setMediaUploadProgress(0);
      try {
        const newMediaUrls = [];
        for (const file of files) {
          const url = await uploadProfileMedia(user.uid, file, (progress) => {
            setMediaUploadProgress(Math.round(progress));
          });
          if (url) newMediaUrls.push(url);
        }
        
        if (newMediaUrls.length > 0) {
          const updatedMedia = [...(profile?.media || []), ...newMediaUrls];
          await updateProfileData(user.uid, { media: updatedMedia });
        }
      } catch (err) {
        console.error("Error uploading media", err);
      } finally {
        setIsUploadingMedia(false);
        setMediaUploadProgress(0);
        // Reset input so the same file can be selected again
        e.target.value = '';
      }
    });
  };

  const handleShare = async () => {
    const profileUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${p.name} on NC Network`,
          text: `Check out ${p.name}'s professional profile on NC Network!`,
          url: profileUrl,
        });
      } catch (err) {
        // Share failed or cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  // Determine if we're viewing our own profile or another user's
  const isOwnProfile = isLoggedIn && (!profileId || profileId === user?.uid);

  const p = {
    // Prioritize saved Firestore profile data over Firebase Auth data
    name: profile?.name 
      || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') 
      || profile?.username 
      || (isOwnProfile ? user?.displayName : null)
      || 'Discovery Talent',
    role: profile?.role || 'New User',
    location: profile?.location || 'Not Specified',
    bio: profile?.bio || 'No bio provided yet.',
    followers: profile?.followers || 0,
    following: profile?.following || 0,
    projects: profile?.projects || 0,
    rating: profile?.rating || 0,
    reviews: profile?.reviews || 0,
    image: profile?.image || (isOwnProfile ? user?.photoURL : null),
    coverImage: profile?.coverImage || '/hero-bg.png',
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    experience: Array.isArray(profile?.experience) ? profile.experience : [],
    media: Array.isArray(profile?.media) ? profile.media : [],
    languages: Array.isArray(profile?.languages) ? profile.languages : [],
    verified: profile?.verified || false,
    gender: profile?.gender || 'Not Specified',
    email: profile?.email || (isOwnProfile ? user?.email : null) || 'contact@nc-network.com',
    phone: profile?.phone || 'Not Specified',
    height: profile?.height || 'Not Specified',
    weight: profile?.weight || 'Not Specified',
    eyeColor: profile?.eyeColor || 'Not Specified',
    hairColor: profile?.hairColor || 'Not Specified',
    openToWork: profile?.openToWork || false,
  };

  const tabs = ['about', 'media', 'skills', 'experience', 'reviews'];

  return (
    <>
      <div className="min-h-screen bg-nc-dark pb-24">
      {/* Cover + Hero */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-56 sm:h-72 relative">
          <img src={p.coverImage} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-nc-dark" />
        </div>
        
        {/* Profile Hero Glass Card — Redesigned */}
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 relative -mt-20 sm:-mt-24 z-10">
          <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.5rem] p-5 sm:p-7 shadow-2xl">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {/* Avatar with edit shortcut */}
              <div className="relative flex-shrink-0">
                <Avatar 
                  src={p.image}
                  gender={p.gender}
                  name={p.name}
                  size="lg"
                />

                {isLoggedIn && (
                  <button
                    onClick={() => onNavigate('settings', 'about')}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-nc-accent rounded-full flex items-center justify-center shadow-lg border-2 border-[#0E0E0E] hover:scale-110 transition-transform"
                  >
                    <svg className="w-3.5 h-3.5 text-[#0A0A0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {p.verified && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-nc-accent rounded-full flex items-center justify-center text-[#0A0A0A] text-[9px] font-black shadow ring-2 ring-[#0E0E0E]">✓</div>
                )}
              </div>

              {/* Info block */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{p.name}</h1>
                      {p.openToWork && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                          Open
                        </span>
                      )}
                    </div>
                    <p className="text-nc-accent text-sm font-medium">{p.role}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3.5 h-3.5 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <p className="text-[#666] text-xs">{p.location}</p>
                    </div>
                  </div>

                  {/* CTA Buttons — show when viewing another user's profile */}
                  {(() => {
                    const isOwnProfile = isLoggedIn && (!profileId || profileId === user?.uid);
                    const isOtherUser = !isOwnProfile;
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOtherUser && (
                          <button
                            onClick={() => setIsFollowing(!isFollowing)}
                            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all active:scale-95 ${
                              isFollowing
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'bg-nc-accent text-[#0A0A0A]'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        )}
                        {isOtherUser && (
                          <button
                            onClick={() => onNavigate('messages', profileId)}
                            className="px-5 py-2 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs font-black uppercase tracking-wide hover:border-white/20 transition-all active:scale-95"
                          >
                            Message
                          </button>
                        )}
                        {/* Audio Call */}
                        {isOtherUser && profileId && (
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('nc-call', {
                                detail: {
                                  calleeId: profileId,
                                  calleeName: p.name,
                                  calleePhoto: p.image || '',
                                  callType: 'audio',
                                }
                              }));
                            }}
                            className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 hover:border-green-500/30 transition-all active:scale-90"
                            title="Audio Call"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </button>
                        )}
                        {/* Video Call */}
                        {isOtherUser && profileId && (
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('nc-call', {
                                detail: {
                                  calleeId: profileId,
                                  calleeName: p.name,
                                  calleePhoto: p.image || '',
                                  callType: 'video',
                                }
                              }));
                            }}
                            className="w-8 h-8 rounded-full bg-nc-accent/10 border border-nc-accent/20 flex items-center justify-center text-nc-accent hover:bg-nc-accent/20 hover:border-nc-accent/30 transition-all active:scale-90"
                            title="Video Call"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button 
                          id="profile-share-btn"
                          onClick={handleShare}
                          className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#666] hover:text-white hover:border-white/20 transition-all"
                          title="Share Profile"
                        >
                          {shareCopied ? (
                            <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    );
                  })()}

                </div>

                {/* Stats Row */}
                <div className="flex gap-5 mt-4 pt-4 border-t border-[#1A1A1A]">
                  {[
                    { value: p.followers >= 1000 ? (p.followers / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : p.followers, label: 'Followers', clickable: true },
                    { value: p.following >= 1000 ? (p.following / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : p.following, label: 'Following', clickable: true },
                    { value: p.projects, label: 'Projects' },
                    { value: p.rating || '—', label: `${p.reviews} Reviews` },
                  ].map(stat => (
                    <div
                      key={stat.label}
                      onClick={() => stat.clickable && setShowFollowModal(stat.label.toLowerCase())}
                      className={stat.clickable ? 'cursor-pointer group' : ''}
                    >
                      <div className={`font-black text-white text-sm ${stat.clickable ? 'group-hover:text-nc-accent transition-colors' : ''}`}>{stat.value}</div>
                      <div className="text-[#555] text-[10px] uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 mt-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-nc-surface border border-nc-border rounded-full p-1 mb-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-max py-2.5 px-4 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-nc-accent text-nc-darker'
                  : 'text-nc-muted hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* About */}
        {activeTab === 'about' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-[2] space-y-6">
              <div className="bg-nc-card border border-nc-border rounded-3xl p-6">
                <h2 className="font-bold text-white mb-3">About</h2>
                <p className="text-nc-secondary leading-relaxed">{p.bio}</p>
              </div>
              {p.languages.length > 0 && (
                <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-4">Languages</h2>
                  <div className="flex gap-2 flex-wrap">
                    {p.languages.map(lang => (
                      <Tag key={lang} color="accent">{lang}</Tag>
                    ))}
                  </div>
                </div>
              )}

              {p.skills.length > 0 && (
                <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-4">Special Skills</h2>
                  <div className="flex gap-2 flex-wrap">
                    {p.skills.map((skill, idx) => {
                      const skillName = typeof skill === 'string' ? skill : (skill?.name || '');
                      return skillName ? <Tag key={idx} color="default">{skillName}</Tag> : null;
                    })}
                  </div>
                </div>
              )}

              <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
                <h2 className="font-bold text-white mb-6">Experience</h2>
                <div className="space-y-6">
                  {p.experience.map((exp, idx) => (
                    <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:bottom-0 before:w-px before:bg-nc-border last:before:bottom-6">
                      <div className="absolute left-[-4px] top-1 w-2.5 h-2.5 rounded-full bg-nc-accent ring-4 ring-nc-accent/10"></div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-white font-bold text-sm tracking-tight">{exp?.role || exp?.title || ''}</h4>
                        <span className="text-[10px] text-nc-muted font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{exp?.year || ''}</span>
                      </div>
                      <div className="text-nc-accent text-xs font-medium mb-2">{exp?.production || exp?.company || ''}</div>
                      <p className="text-nc-muted text-xs leading-relaxed">{exp?.description || ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>


            <div className="flex-1 space-y-4">
              <div className="bg-nc-card border border-nc-border rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Contact Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-nc-muted text-xs">Email</div>
                      <div className="text-nc-secondary text-sm">{p.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-nc-muted text-xs">Phone</div>
                      <div className="text-nc-secondary text-sm">{p.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                       </svg>
                    </div>
                    <div>
                      <div className="text-nc-muted text-xs">Gender</div>
                      <div className="text-nc-secondary text-sm">{p.gender || 'Not Specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted"></div>
                    <div>
                      <div className="text-nc-muted text-xs">Location</div>
                      <div className="text-nc-secondary text-sm">{p.location}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Identity */}
              <div className="bg-nc-card border border-nc-border rounded-2xl p-5">
                <h3 className="font-bold text-nc-accent mb-4 text-xs uppercase tracking-[0.2em]">Physical Identity</h3>
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Height</div>
                    <div className="text-white text-sm font-medium">{p.height}</div>
                  </div>
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Weight</div>
                    <div className="text-white text-sm font-medium">{p.weight}</div>
                  </div>
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Eye Color</div>
                    <div className="text-white text-sm font-medium">{p.eyeColor}</div>
                  </div>
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Hair Color</div>
                    <div className="text-white text-sm font-medium">{p.hairColor}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        {activeTab === 'skills' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {p.skills.length > 0 ? (
              <>
                <div className="flex-1 bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-6">Core Skills</h2>
                  <div className="space-y-5">
                    {p.skills.map((skill, idx) => {
                      const skillName = typeof skill === 'string' ? skill : skill?.name;
                      const skillLevel = typeof skill === 'string' ? 80 : (skill?.level || 80);
                      return skillName ? <SkillBar key={idx} name={skillName} level={skillLevel} /> : null;
                    })}
                  </div>
                </div>
                <div className="flex-1 bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-4">Specializations</h2>
                  <div className="flex flex-wrap gap-2 text-nc-muted text-xs italic">
                    Not specified
                  </div>
                  <h2 className="font-bold text-white mb-4 mt-6">Equipment</h2>
                  <div className="flex flex-wrap gap-2 text-nc-muted text-xs italic">
                    Not specified
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full">
                <EmptyState 
                  title="No Skills Added Yet"
                  description="Highlight your professional capabilities to attract more casting directors."
                  icon="✦"
                  actionLabel="Add Skills"
                  onAction={() => onNavigate('settings', 'skills')}
                />
              </div>
            )}
          </div>
        )}

        {/* Experience */}
        {activeTab === 'experience' && (
          <div className="bg-nc-card border border-nc-border rounded-2xl p-6 min-h-[400px]">
            <h2 className="font-bold text-white mb-6">Experience Timeline</h2>
            {p.experience.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-nc-border" />
                <div className="space-y-6 pl-12">
                  {p.experience.map((exp, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-9 top-1 w-5 h-5 rounded-full bg-nc-accent flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-nc-darker" />
                      </div>
                      <div className="bg-nc-surface border border-nc-border rounded-[2rem] p-4">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-bold text-white">{exp?.role || exp?.title || ''}</h3>
                            <p className="text-nc-accent text-sm">{exp?.production || exp?.company || ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag color="accent">{exp?.year || ''}</Tag>
                          </div>
                        </div>
                        <p className="text-nc-secondary text-sm mt-2">{exp?.description || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState 
                title="Your Timeline is Empty"
                description="Showcase your professional journey and past projects to build trust."
                icon="⌚"
                actionLabel="Update Experience"
                onAction={() => onNavigate('settings', 'experience')}
              />
            )}
          </div>
        )}

        {/* Media */}
        {activeTab === 'media' && (
          <div className="animate-fade-in group/gallery min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Media Showcase</h2>
              {isOwnProfile && (
                <>
                  <button 
                    onClick={() => document.getElementById('profile-media-upload')?.click()}
                    disabled={isUploadingMedia}
                    className="text-nc-accent text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-125 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingMedia ? 'Uploading...' : 'Upload Media'}
                  </button>
                  <input 
                    id="profile-media-upload"
                    type="file" 
                    multiple 
                    accept="image/*,video/*"
                    className="hidden" 
                    onChange={handleMediaUpload}
                  />
                </>
              )}
            </div>
            
            {p.media.length > 0 || isUploadingMedia ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {p.media.map((src, idx) => (
                  <div key={idx} className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-nc-surface border border-nc-border shadow-lg hover:shadow-2xl transition-all duration-500">
                    <img 
                      src={src} 
                      alt={`Portfolio asset ${idx + 1}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-6 backdrop-blur-[2px]">
                      <div className="w-full translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <span className="text-[10px] text-nc-accent font-black uppercase tracking-widest bg-nc-accent/10 border border-nc-accent/20 px-3 py-1 rounded-full backdrop-blur-md">
                          Asset Fullscreen
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {isUploadingMedia && (
                  <div className="group relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-[#0A0A0A] border border-[#1A1A1A] shadow-lg flex items-center justify-center">
                    <div className="w-full space-y-2 px-6">
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                         <div 
                            className="absolute inset-y-0 left-0 bg-nc-accent transition-all duration-300" 
                            style={{ width: `${mediaUploadProgress}%` }}
                         />
                      </div>
                      <p className="text-[9px] text-nc-accent font-black text-center uppercase tracking-widest">
                        Uploading {mediaUploadProgress}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState 
                title="No Media Assets"
                description="Profiles with headshots and showreels get 10x more engagement."
                icon="📸"
                actionLabel={isOwnProfile ? "Upload Media" : null}
                onAction={() => document.getElementById('profile-media-upload')?.click()}
              />
            )}
          </div>
        )}




        {/* Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 min-h-[400px]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Reviews ({p.reviews})</h2>
              <Button size="sm" onClick={() => setShowReviewModal(true)}>Add Review</Button>
            </div>
            
            {p.reviews > 0 ? (
              <div className="space-y-4">
                {/* Real reviews would be mapped here */}
              </div>
            ) : (
              <EmptyState 
                title="No Reviews Yet"
                description="Once you start working on projects through NC Network, your reviews will appear here."
                icon="⭐"
                actionLabel={isLoggedIn ? null : "Sign In to Review"}
                onAction={() => onNavigate('signin')}
              />
            )}
          </div>
        )}
      </div>
    </div>

    {/* Follow Modal Overlay */}
    {showFollowModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0A0A]/80 backdrop-blur-sm">
        <GlassCard strong className="w-full max-w-sm border border-nc-border bounce-in p-0 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-nc-border">
            <h3 className="font-bold text-white capitalize">{showFollowModal}</h3>
            <button onClick={() => setShowFollowModal(null)} className="text-nc-muted hover:text-white p-2">CLOSE</button>
          </div>
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="text-center py-8 text-nc-muted text-sm italic font-medium">
              No members found
            </div>
          </div>
        </GlassCard>
      </div>
    )}

    {/* Review Modal Overlay */}
    {showReviewModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0A0A]/80 backdrop-blur-sm">
        <GlassCard strong className="w-full max-w-lg border border-nc-border bounce-in p-0 overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-nc-border">
            <h3 className="font-bold text-white text-lg">Add Review for {p.name}</h3>
            <button onClick={() => setShowReviewModal(false)} className="text-nc-muted hover:text-white p-2">CLOSE</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-2">Rating</label>
              <div className="flex gap-2 text-2xl text-nc-accent cursor-pointer">
                ★★★★★
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-2">Review Details</label>
              <textarea 
                rows={4}
                placeholder="Share your experience working with this talent..."
                className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm resize-none"
              />
            </div>
          </div>
          <div className="p-5 border-t border-nc-border flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowReviewModal(false)}>Cancel</Button>
            <Button onClick={() => setShowReviewModal(false)}>Submit Review</Button>
          </div>
        </GlassCard>
      </div>
    )}
    </>
  );
}
