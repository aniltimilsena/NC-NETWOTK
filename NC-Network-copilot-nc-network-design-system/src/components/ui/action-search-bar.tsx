"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import Avatar from "./Avatar";

import { collection, getDocs, limit, query as firestoreQuery, orderBy, where } from "firebase/firestore";

function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

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
}


export function ActionSearchBar({
    onActionSelect,
    onPageNavigate,
}: {
    onActionSelect?: (profileId: string) => void;
    onPageNavigate?: (page: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [profiles, setProfiles] = useState<ProfileSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [allProfiles, setAllProfiles] = useState<ProfileSuggestion[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Fetch all profiles once when search bar is focused
    useEffect(() => {
        if (!isFocused || hasLoaded) return;

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
    }, [isFocused, hasLoaded]);

    // Filter profiles locally when query or allProfiles changes
    useEffect(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            // Suggest first 6 profiles when query is empty
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

    const containerVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, staggerChildren: 0.04 } },
        exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.15 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -8 },
        show: { opacity: 1, x: 0 },
    };

    return (
        <div className="w-full relative">
            <div className="relative group">
                <input
                    type="text"
                    placeholder="Search talent, names, roles..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    className="w-full bg-white text-black rounded-full pl-6 pr-12 py-3 text-base font-medium shadow-2xl focus:outline-none transition-all placeholder:text-gray-400"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <Search className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
                </div>
            </div>

            <AnimatePresence>
                {isFocused && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="absolute top-full left-0 right-0 mt-4 bg-[#0d0d0d] border border-white/10 rounded-[2rem] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
                    >
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            {!query && (
                                <div className="mb-4">
                                    <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-2">
                                        Quick Navigation
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 p-2">
                                        {PAGE_LINKS.map(page => (
                                            <button 
                                                key={page.id}
                                                onClick={() => onPageNavigate?.(page.id)}
                                                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-nc-accent/10 rounded-2xl text-left transition-all border border-transparent hover:border-nc-accent/20 group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-nc-accent transition-colors">
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

                            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-2">
                                {query ? `Searching for "${query}"` : "Suggested Experts"}
                            </div>

                            {loading ? (
                                <div className="py-6 text-center text-sm text-gray-500">Searching...</div>
                            ) : profiles.length === 0 ? (
                                <div className="py-6 text-center text-sm text-gray-500">
                                    {query ? `No profiles found for "${query}"` : "No profiles available"}
                                </div>
                            ) : (
                                <ul className="space-y-1">
                                    {profiles.map((profile) => (
                                        <motion.li
                                            key={profile.uid}
                                            variants={itemVariants}
                                            onClick={() => onActionSelect?.(profile.uid)}
                                            className="group p-2 flex items-center justify-between hover:bg-white/5 rounded-full cursor-pointer transition-all border border-transparent hover:border-white/5"
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
                                                    />
                                                </div>

                                                <div>
                                                    <div className="text-sm font-bold text-white group-hover:text-nc-accent transition-colors">
                                                        {profile.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
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
                                            <span className="text-[10px] font-bold text-nc-accent/60 group-hover:text-nc-accent transition-colors">
                                                View
                                            </span>
                                        </motion.li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
