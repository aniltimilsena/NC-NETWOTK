import React, { useState, useEffect } from 'react';
import { CheckCircle, Trash2, Star, ExternalLink, Search, Image as ImageIcon, Video, MapPin, X, XCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { logAdminAction } from '../../services';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { AdminCardSkeleton } from '../../components/ui/Skeleton';
type TalentProfile = {
    id: string;
    name?: string;
    role?: string;
    email?: string;
    bio?: string;
    location?: string;
    skills?: string[];
    media?: string[];
    verified?: boolean;
    featured?: boolean;
    status?: string;
    createdAt?: any;
};
export default function AdminContent() {
    const [profiles, setProfiles] = useState<TalentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Pending' | 'Verified' | 'Featured'>('All');
    const [selectedProfile, setSelectedProfile] = useState<TalentProfile | null>(null);
    const adminEmail = CurrentUser.email || 'admin@nepalcasts.com';
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        description: '',
        confirmText: '',
        cancelText: '',
        type: 'default' as 'default' | 'danger' | 'warning' | 'success' | 'info',
        isLoading: false,
        onConfirm: () => { },
    });
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "profiles"), (snap) => {
            const data = snap.docs.map(docSnap => {
                const p = docSnap.data();
                return {
                    id: docSnap.id,
                    ...p
                } as TalentProfile;
            });
            setProfiles(data);
            setLoading(false);
        }, (error) => {
            console.error("Failed to sync profiles queue", error);
            setLoading(false);
        });
        return () => unsub();
    }, []);
    const handleApproveProfile = async (profileId: string) => {
        try {
            await updateDoc(doc(db, "profiles", profileId), { verified: true, status: 'Active' });
            try {
                await updateDoc(doc(db, "users", profileId), { verified: true, status: 'Active' });
            }
            catch (e) {
                console.warn("Could not sync verification to user doc:", e);
            }
            await logAdminAction(adminEmail, "Approve Profile", profileId, "Approved profile & marked verified");
            if (selectedProfile?.id === profileId) {
                setSelectedProfile(prev => prev ? { ...prev, verified: true, status: 'Active' } : null);
            }
            alert("Profile approved and verified successfully!");
        }
        catch (err) {
            console.error("Failed to approve profile:", err);
            alert("Error approving profile.");
        }
    };
    const handleRejectProfile = async (profileId: string) => {
        try {
            await updateDoc(doc(db, "profiles", profileId), { verified: false });
            try {
                await updateDoc(doc(db, "users", profileId), { verified: false });
            }
            catch (e) {
                console.warn("Could not sync verification to user doc:", e);
            }
            await logAdminAction(adminEmail, "Reject Profile", profileId, "Rejected profile verification status");
            if (selectedProfile?.id === profileId) {
                setSelectedProfile(prev => prev ? { ...prev, verified: false } : null);
            }
            alert("Profile verification rejected.");
        }
        catch (err) {
            console.error("Failed to reject profile:", err);
            alert("Error rejecting profile.");
        }
    };
    const handleToggleFeature = async (profileId: string, currentFeatured: boolean) => {
        try {
            const targetFeatured = !currentFeatured;
            await updateDoc(doc(db, "profiles", profileId), { featured: targetFeatured });
            await logAdminAction(adminEmail, targetFeatured ? "Feature Profile" : "Remove Featured", profileId, targetFeatured ? "Featured profile on talent discovery board" : "Removed from featured profiles");
            if (selectedProfile?.id === profileId) {
                setSelectedProfile(prev => prev ? { ...prev, featured: targetFeatured } : null);
            }
            alert(targetFeatured ? "Profile featured successfully!" : "Profile removed from featured status.");
        }
        catch (err) {
            console.error("Failed to toggle feature status:", err);
            alert("Error updating feature status.");
        }
    };
    const handleDeleteProfile = (profileId: string) => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Profile?",
            description: "Are you sure you want to permanently delete this profile? This will delete the portfolio document. The main user account will remain.",
            confirmText: "Delete",
            cancelText: "Cancel",
            type: "danger",
            isLoading: false,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                try {
                    await deleteDoc(doc(db, "profiles", profileId));
                    await logAdminAction(adminEmail, "Delete Profile", profileId, "Permanently deleted profile document");
                    if (selectedProfile?.id === profileId) {
                        setSelectedProfile(null);
                    }
                    alert("Profile deleted successfully!");
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
                catch (err) {
                    console.error("Failed to delete profile:", err);
                    alert("Error deleting profile.");
                }
                finally {
                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                }
            }
        });
    };
    const filteredProfiles = profiles.filter(p => {
        const matchesSearch = (p.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.role ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase());
        if (filterType === 'Pending')
            return matchesSearch && !p.verified;
        if (filterType === 'Verified')
            return matchesSearch && p.verified;
        if (filterType === 'Featured')
            return matchesSearch && p.featured;
        return matchesSearch;
    });
    return (<div className="p-8 space-y-8 animate-in fade-in duration-500">
      <ConfirmDialog {...confirmConfig} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}/>
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Talent Audit Board</h2>
          <p className="text-nc-muted text-sm mt-1">Audit talent portfolios, toggle highlights, and verify media authenticity.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nc-muted"/>
             <input type="text" placeholder="Search by name, role, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-admin-surface border border-admin-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-admin-primary w-full sm:w-64"/>
          </div>
          <div className="flex bg-admin-surface border border-admin-border p-1 rounded-xl">
            {(['All', 'Pending', 'Verified', 'Featured'] as const).map(type => (<button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filterType === type ? 'bg-admin-primary text-white' : 'text-nc-muted hover:text-white'}`}>
                {type}
              </button>))}
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (<AdminCardSkeleton key={i} />))
        ) : filteredProfiles.length === 0 ? (<div className="col-span-full py-20 text-center bg-admin-surface rounded-2xl border border-dashed border-admin-border w-full">
            <p className="text-nc-muted text-sm font-medium">No talent profiles detected matching your filters.</p>
          </div>) : (filteredProfiles.map((profile) => (<div key={profile.id} className="bg-admin-surface border border-admin-border rounded-2xl p-6 hover:bg-admin-surface-light/30 transition-all flex flex-col justify-between relative group">
              <div>
                
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${profile.verified
                ? 'bg-admin-success/15 text-admin-success border border-admin-success/20'
                : 'bg-admin-warning/15 text-admin-warning border border-admin-warning/20'}`}>
                    {profile.verified ? 'Verified' : 'Pending Audit'}
                  </span>
                  
                  {profile.featured && (<span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-admin-primary/15 text-admin-primary border border-admin-primary/20 text-[9px] font-black uppercase tracking-wider animate-pulse">
                      <Star className="w-3 h-3 fill-current"/> Featured
                    </span>)}
                </div>

                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-admin-surface-light border border-admin-border flex items-center justify-center font-bold text-admin-primary text-lg">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-white text-base truncate">{profile.name || 'Unknown User'}</h4>
                    <p className="text-xs text-nc-muted uppercase tracking-widest font-black truncate">{profile.role || 'Talent'}</p>
                  </div>
                </div>

                
                <div className="flex items-center gap-1.5 text-xs text-nc-muted mb-4">
                  <MapPin className="w-4 h-4 text-nc-muted shrink-0"/>
                  <span className="truncate">{profile.location || 'Location Not Specified'}</span>
                  <span className="text-white/10">•</span>
                  <span className="shrink-0">{profile.media?.length || 0} Assets</span>
                </div>

                
                <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mb-6">
                  {profile.bio || "No professional biography has been provided by the talent."}
                </p>
              </div>

              
              <div className="mt-auto space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => setSelectedProfile(profile)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-admin-surface-light hover:bg-white/5 text-white text-[10px] font-black uppercase rounded-lg border border-admin-border transition-all">
                    <ExternalLink className="w-3.5 h-3.5"/> Inspect Portfolio
                  </button>
                  
                  <button onClick={() => handleToggleFeature(profile.id, !!profile.featured)} className={`flex items-center justify-center p-2 rounded-lg border border-admin-border transition-all ${profile.featured
                ? 'bg-admin-primary text-white border-transparent'
                : 'text-admin-primary hover:bg-admin-primary/10'}`} title={profile.featured ? "Remove Featured Highlight" : "Feature on Discovery Board"}>
                    <Star className={`w-4 h-4 ${profile.featured ? 'fill-current' : ''}`}/>
                  </button>
                </div>

                <div className="flex gap-2">
                  {!profile.verified ? (<button onClick={() => handleApproveProfile(profile.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-admin-success/80 hover:bg-admin-success text-white text-[10px] font-black uppercase rounded-lg transition-all">
                      <CheckCircle className="w-3.5 h-3.5"/> Approve
                    </button>) : (<button onClick={() => handleRejectProfile(profile.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-admin-warning/15 hover:bg-admin-warning/30 text-admin-warning border border-admin-warning/20 text-[10px] font-black uppercase rounded-lg transition-all">
                      <XCircle className="w-3.5 h-3.5"/> Reject
                    </button>)}
                  <button onClick={() => handleDeleteProfile(profile.id)} className="p-2 bg-admin-surface-light text-admin-error border border-admin-border rounded-lg hover:bg-admin-error/10" title="Delete Profile Document">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>)))}
      </div>

      
      {selectedProfile && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-surface-light/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-admin-bg border border-admin-border flex items-center justify-center font-bold text-admin-primary text-sm">
                  {selectedProfile.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{selectedProfile.name}</h3>
                    {selectedProfile.verified && (<CheckCircle className="w-4 h-4 text-admin-success fill-admin-success/15"/>)}
                  </div>
                  <p className="text-xs text-nc-muted uppercase tracking-widest font-black">{selectedProfile.role || 'Talent Profile'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="p-1 text-nc-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>

            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                
                <div className="md:col-span-7 space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1 mb-2">Professional Summary</h4>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line bg-admin-bg/30 border border-admin-border/50 p-4 rounded-xl">
                      {selectedProfile.bio || 'This talent has not provided a professional biography yet.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest pb-1 mb-1">Database ID</h5>
                      <p className="text-xs font-mono text-white select-all bg-admin-bg/30 border border-admin-border/50 p-2 rounded truncate">{selectedProfile.id}</p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest pb-1 mb-1">Location</h5>
                      <p className="text-xs font-bold text-white bg-admin-bg/30 border border-admin-border/50 p-2 rounded truncate">{selectedProfile.location || 'N/A'}</p>
                    </div>
                  </div>

                  
                  <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1 mb-3">Skills & Categories</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProfile.skills && selectedProfile.skills.length > 0 ? (selectedProfile.skills.map(s => (<span key={s} className="px-2.5 py-1 bg-admin-surface-light border border-admin-border text-white rounded-lg text-xs font-semibold">
                            {s}
                          </span>))) : (<span className="text-xs text-nc-muted italic">No skill tags listed.</span>)}
                    </div>
                  </div>
                </div>

                
                <div className="md:col-span-5 space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-admin-border pb-1">Portfolio Assets</h4>
                  
                  <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                    {selectedProfile.media && selectedProfile.media.length > 0 ? (selectedProfile.media.map((url, i) => {
                const isVideo = url.endsWith('.mp4') || url.includes('/video/upload/');
                return (<a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl bg-admin-bg border border-admin-border overflow-hidden relative group block">
                            {isVideo ? (<div className="w-full h-full flex flex-col items-center justify-center text-admin-primary">
                                <Video className="w-8 h-8"/>
                                <span className="text-[8px] font-black uppercase mt-1">Video Asset</span>
                              </div>) : (<img src={url} alt={`Portfolio ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"/>)}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-white"/>
                            </div>
                          </a>);
            })) : (<div className="col-span-2 py-12 border border-dashed border-admin-border rounded-xl flex flex-col items-center justify-center text-nc-muted">
                        <ImageIcon className="w-8 h-8 opacity-20 mb-2"/>
                        <span className="text-xs italic">No media uploaded.</span>
                      </div>)}
                  </div>
                </div>

              </div>
            </div>

            
            <div className="p-4 bg-admin-surface-light/20 border-t border-admin-border flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="flex gap-2">
                <button onClick={() => handleToggleFeature(selectedProfile.id, !!selectedProfile.featured)} className={`px-4 py-2 text-xs font-black uppercase rounded-lg border transition-all flex items-center gap-1.5 ${selectedProfile.featured
                ? 'bg-admin-primary text-white border-transparent shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                : 'bg-admin-surface text-admin-primary border-admin-border hover:bg-admin-primary/10'}`}>
                  <Star className="w-3.5 h-3.5"/>
                  {selectedProfile.featured ? 'Featured active' : 'Feature profile'}
                </button>

                <button onClick={() => handleDeleteProfile(selectedProfile.id)} className="px-4 py-2 bg-admin-surface text-admin-error hover:bg-admin-error/10 text-xs font-black uppercase border border-admin-border rounded-lg transition-colors flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5"/> Delete Profile
                </button>
              </div>

              <div className="flex gap-2">
                {!selectedProfile.verified ? (<button onClick={() => handleApproveProfile(selectedProfile.id)} className="px-5 py-2 bg-admin-success hover:bg-green-600 text-white text-xs font-black uppercase rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    Approve & Verify
                  </button>) : (<button onClick={() => handleRejectProfile(selectedProfile.id)} className="px-5 py-2 bg-admin-warning hover:bg-yellow-600 text-black text-xs font-black uppercase rounded-lg transition-all">
                    Revoke Verification
                  </button>)}
                
                <button onClick={() => setSelectedProfile(null)} className="px-4 py-2 bg-admin-surface-light text-white text-xs font-bold rounded-lg border border-admin-border hover:bg-white/5 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
