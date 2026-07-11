"use client";

import { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import Avatar from "./Avatar";
import { collection, getDocs, query as firestoreQuery } from "firebase/firestore";

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
    const [history, setHistory] = useState<string[]>([]);

    // Load search history from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("nc_search_history");
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        } catch (err) {
            console.error("Failed to load search history from localStorage:", err);
        }
    }, []);

    // Helper to add search query to history
    const addToHistory = (searchTerm: string) => {
        const cleanTerm = searchTerm.trim();
        if (!cleanTerm) return;

        setHistory((prev) => {
            const filtered = prev.filter((item) => item.toLowerCase() !== cleanTerm.toLowerCase());
            const updated = [cleanTerm, ...filtered].slice(0, 5); // Keep latest 5 items
            try {
                localStorage.setItem("nc_search_history", JSON.stringify(updated));
            } catch (err) {
                console.error("Failed to save search history to localStorage:", err);
            }
            return updated;
        });
    };

    // Helper to remove search query from history
    const removeFromHistory = (searchTerm: string) => {
        setHistory((prev) => {
            const updated = prev.filter((item) => item !== searchTerm);
            try {
                localStorage.setItem("nc_search_history", JSON.stringify(updated));
            } catch (err) {
                console.error("Failed to update search history in localStorage:", err);
            }
            return updated;
        });
    };

    // Helper to clear all search history
    const clearHistory = () => {
        setHistory([]);
        try {
            localStorage.removeItem("nc_search_history");
        } catch (err) {
            console.error("Failed to clear search history in localStorage:", err);
        }
    };

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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && query.trim()) {
            addToHistory(query);
        }
    };

    const handleProfileSelect = (profile: ProfileSuggestion) => {
        // Save query or profile name to history
        if (query.trim()) {
            addToHistory(query);
        } else {
            addToHistory(profile.name);
        }
        onActionSelect?.(profile.uid);
    };

    const handleChipClick = (tag: string) => {
        if (tag === 'Casting Calls') {
            onPageNavigate?.('casting');
            return;
        }
        if (tag === 'Movies') {
            onPageNavigate?.('home');
            return;
        }

        const term = tag === 'Actors' ? 'Actor' : 'Director';
        setQuery(term);
        addToHistory(term);
    };

    return (
        <div className="w-full relative space-y-5">
            {/* Input Capsule Box */}
            <div className="relative flex items-center bg-white/[0.02] border border-white/10 focus-within:border-[#D4AF37]/50 focus-within:shadow-[0_0_20px_rgba(212,175,55,0.05)] rounded-2xl px-5 py-3.5 transition-all duration-300 group">
                <input
                    type="text"
                    placeholder="Search talent, names, roles..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
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
                        onClick={() => handleChipClick(tag)}
                        className="px-4 py-1.5 rounded-full border border-white/5 hover:border-[#D4AF37] bg-white/[0.02] hover:bg-[#D4AF37]/5 text-white/50 hover:text-[#D4AF37] transition-all duration-300 text-[10px] font-extrabold uppercase tracking-wider"
                    >
                        {tag}
                    </button>
                ))}
            </div>

            {/* Results Container - Relative & Transparent */}
            <div className="relative w-full bg-transparent z-50 overflow-hidden text-left pt-2">
                <div className="max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] space-y-6">
                    {/* Recent Searches Section */}
                    {!query && history.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between px-1 py-2 border-b border-white/5 mb-3">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Recent Searches
                                </span>
                                <button 
                                    onClick={clearHistory}
                                    className="text-[9px] font-bold text-red-500/80 hover:text-red-400 uppercase tracking-wider transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                            <ul className="space-y-1.5">
                                {history.map((term, idx) => (
                                    <li 
                                        key={`${term}-${idx}`}
                                        className="group/history flex items-center justify-between p-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/5 rounded-xl cursor-pointer transition-all duration-200"
                                    >
                                        <div 
                                            onClick={() => {
                                                setQuery(term);
                                                addToHistory(term);
                                            }}
                                            className="flex items-center gap-2.5 min-w-0 flex-1"
                                        >
                                            <svg className="w-3.5 h-3.5 text-gray-600 group-hover/history:text-[#00BFFF] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                            <span className="text-xs text-gray-300 group-hover/history:text-white transition-colors truncate">
                                                {term}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromHistory(term);
                                            }}
                                            className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Delete search history item"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
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
                                        onClick={() => handleProfileSelect(profile)}
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
