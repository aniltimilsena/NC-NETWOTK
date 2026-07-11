"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Home, Users, Briefcase, MessageSquare, Bell, Settings } from "lucide-react";
import { db } from "@/lib/firebase";
import Avatar from "./Avatar";
import { collection, getDocs, query as firestoreQuery } from "firebase/firestore";

interface PageLink {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
}

const PAGE_LINKS: PageLink[] = [
    { id: 'home', label: 'Home', description: 'Dashboard & Feed', icon: <Home className="w-4 h-4" /> },
    { id: 'listing', label: 'Directory', description: 'Browse Professionals', icon: <Users className="w-4 h-4" /> },
    { id: 'casting', label: 'Casting', description: 'Auditions & Roles', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'messages', label: 'Messages', description: 'Conversations & Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'notifications', label: 'Alerts', description: 'Notification Panel', icon: <Bell className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', description: 'Account Management', icon: <Settings className="w-4 h-4" /> },
];

interface ProfileSuggestion {
    uid: string;
    name: string;
    role: string;
    location?: string;
    image?: string;
    gender?: string;
    verified?: boolean;
}

export function ActionSearchBar({
    onActionSelect,
    onPageNavigate,
}: {
    onActionSelect?: (profileId: string) => void;
    onPageNavigate?: (page: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [profiles, setProfiles] = useState<ProfileSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [allProfiles, setAllProfiles] = useState<ProfileSuggestion[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Eagerly load profiles on mount so suggestions display instantly
    useEffect(() => {
        if (hasLoaded) return;
        const loadAllProfiles = async () => {
            setLoading(true);
            try {
                const q = firestoreQuery(collection(db, "profiles"));
                const snap = await getDocs(q);
                const loaded = snap.docs.map((doc) => ({
                    uid: doc.id,
                    name: (doc.data().name as string) || "Unknown User",
                    role: (doc.data().role as string) || "Talent",
                    location: doc.data().location as string | undefined,
                    image: (doc.data().image || doc.data().photoURL) as string | undefined,
                    gender: doc.data().gender as string | undefined,
                    verified: !!doc.data().verified,
                }));
                setAllProfiles(loaded);
                setHasLoaded(true);
            } catch (err) {
                console.error("Error loading profiles for search:", err);
            } finally {
                setLoading(false);
            }
        };

        loadAllProfiles();
    }, [hasLoaded]);

    useEffect(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            setProfiles(allProfiles.slice(0, 6));
            return;
        }

        const filtered = allProfiles.filter((p) => {
            return (
                p.name?.toLowerCase().includes(normalized) ||
                p.role?.toLowerCase().includes(normalized) ||
                p.location?.toLowerCase().includes(normalized) ||
                p.uid?.toLowerCase() === normalized
            );
        });
        setProfiles(filtered.slice(0, 6));
    }, [query, allProfiles]);

    return (
        <div className="w-full relative space-y-5">
            {/* Input Capsule Box */}
            <div className="relative flex items-center bg-white/[0.02] border border-white/10 focus-within:border-[#D4AF37]/50 focus-within:shadow-[0_0_20px_rgba(212,175,55,0.05)] rounded-2xl px-5 py-3.5 transition-all duration-300 group">
                <input
                    type="text"
                    placeholder="Search talent, names, roles..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent outline-none text-white text-base transition-all placeholder:text-white/20 pr-10"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-5 h-5 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" strokeWidth={2} />
                </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap gap-2.5 justify-center relative z-10 pt-1">
                {['Actors', 'Directors', 'Casting Calls', 'Movies'].map(tag => (
                    <button 
                        key={tag} 
                        onClick={() => {
                            if (tag === 'Actors') setQuery('Actor');
                            else if (tag === 'Directors') setQuery('Director');
                            else if (tag === 'Casting Calls') onPageNavigate?.('casting');
                            else if (tag === 'Movies') onPageNavigate?.('home');
                        }}
                        className="px-4 py-1.5 rounded-full border border-white/5 hover:border-[#D4AF37] bg-white/[0.02] hover:bg-[#D4AF37]/5 text-white/50 hover:text-[#D4AF37] transition-all duration-300 text-[10px] font-extrabold uppercase tracking-wider"
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {/* Results Container - Relative & Transparent */}
            <div className="relative w-full bg-transparent z-50 overflow-hidden text-left pt-2">
                <div className="max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] space-y-6">
                    {!query && (
                        <div>
                            <div className="px-1 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-3">
                                Quick Navigation
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                {PAGE_LINKS.map(page => (
                                    <button 
                                        key={page.id}
                                        onClick={() => onPageNavigate?.(page.id)}
                                        className="flex flex-col items-center justify-center p-3 bg-white/[0.01] hover:bg-[#D4AF37]/5 rounded-2xl text-center transition-all border border-white/[0.03] hover:border-[#D4AF37]/20 group gap-1.5"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#D4AF37] transition-colors">
                                            {page.icon}
                                        </div>
                                        <div className="text-[10px] font-bold text-white/70 group-hover:text-white truncate w-full">{page.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="px-1 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-3">
                            {query ? `Searching for "${query}"` : "Suggested for you"}
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-3">
                                <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                                <span>Suggested for you...</span>
                            </div>
                        ) : profiles.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-500">
                                {query ? `No profiles found for "${query}"` : "No profiles available"}
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {profiles.map((profile) => (
                                    <li
                                        key={profile.uid}
                                        onClick={() => onActionSelect?.(profile.uid)}
                                        className="group p-3 flex items-center justify-between bg-white/[0.01] hover:bg-white/[0.04] active:bg-white/[0.02] border border-white/[0.03] hover:border-white/10 rounded-2xl cursor-pointer transition-all duration-300"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-10 h-10 flex-shrink-0">
                                                <Avatar 
                                                    user={{
                                                        image: profile.image,
                                                        gender: profile.gender,
                                                        displayName: profile.name
                                                    }}
                                                    size="sm"
                                                    name={profile.name}
                                                    verified={profile.verified}
                                                />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-white group-hover:text-[#00BFFF] transition-colors flex items-center gap-1.5">
                                                    {profile.name}
                                                    {profile.verified && (
                                                        <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                    <span>{profile.role}</span>
                                                    {profile.location && (
                                                        <>
                                                            <span>·</span>
                                                            <MapPin className="w-3 h-3 text-gray-600 shrink-0" />
                                                            <span className="truncate">{profile.location}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 group-hover:text-white group-hover:border-[#00BFFF] group-hover:bg-[#00BFFF]/10 transition-all duration-300">
                                            View Profile
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
