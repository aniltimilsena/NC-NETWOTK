"use client";

import { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
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
    { id: 'home', label: 'Home', description: 'Back to the main dashboard', icon: <Search className="w-4 h-4" /> },
    { id: 'listing', label: 'Talent Directory', description: 'Browse all cinema professionals', icon: <Search className="w-4 h-4" /> },
    { id: 'casting', label: 'Casting Board', description: 'Explore open projects and roles', icon: <Search className="w-4 h-4" /> },
    { id: 'messages', label: 'Messages', description: 'Go to your conversations', icon: <Search className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', description: 'Check your latest alerts', icon: <Search className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', description: 'Manage your profile and account', icon: <Search className="w-4 h-4" /> },
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
        <div className="w-full relative">
            {/* Input Wrapper */}
            <div className="relative group">
                <input
                    type="text"
                    placeholder="Search talent, names, roles..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent border-b border-[#D4AF37]/30 focus:border-[#D4AF37] outline-none text-white text-xl py-4 transition-all duration-500 placeholder:text-white/20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-6 h-6 text-[#D4AF37]/60 group-focus-within:text-[#D4AF37] transition-colors" strokeWidth={1.5} />
                </div>
            </div>

            {/* Results container - always visible, relative flow */}
            <div className="relative w-full mt-6 bg-transparent z-50 overflow-hidden text-left">
                <div className="max-h-[380px] overflow-y-auto pr-1">
                    {!query && (
                        <div className="mb-6 hidden md:block">
                            <div className="px-1 py-2 text-[10px] font-bold text-gray-500/60 uppercase tracking-widest border-b border-white/5 mb-3">
                                Quick Navigation
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {PAGE_LINKS.map(page => (
                                    <button 
                                        key={page.id}
                                        onClick={() => onPageNavigate?.(page.id)}
                                        className="flex items-center gap-3 p-3 bg-white/[0.02] hover:bg-[#D4AF37]/10 rounded-2xl text-left transition-all border border-white/5 hover:border-[#D4AF37]/30 group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#D4AF37] transition-colors">
                                            {page.icon}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white tracking-tight">{page.label}</div>
                                            <div className="text-[10px] text-gray-500 truncate">{page.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="px-1 py-2 text-[10px] font-bold text-gray-500/60 uppercase tracking-widest border-b border-white/5 mb-3">
                        {query ? `Searching for "${query}"` : "Suggested for you"}
                    </div>

                    {loading ? (
                        <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                            <span>Suggested for you...</span>
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            {query ? `No profiles found for "${query}"` : "No profiles available"}
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {profiles.map((profile) => (
                                <li
                                    key={profile.uid}
                                    onClick={() => onActionSelect?.(profile.uid)}
                                    className="group p-2.5 flex items-center justify-between hover:bg-white/5 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5"
                                >
                                    <div className="flex items-center gap-4">
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

                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
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
                                                        <MapPin className="w-3 h-3" />
                                                        <span>{profile.location}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#D4AF37]/60 group-hover:text-[#D4AF37] transition-colors">
                                        View
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
