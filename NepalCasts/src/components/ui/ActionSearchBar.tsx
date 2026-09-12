"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, ChevronLeft } from "lucide-react";
import { AuthService } from "@/services/AuthService";
import Avatar from "./Avatar";
import { subscribeToTalents } from "@/features/profile/services/users";
import { getAvatarOptimizedUrl } from "@/utils/media";
import { db } from "@/lib/firebase";
import { collection, query as firestoreQuery, getDocs, limit as firestoreLimit } from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { useTranslation } from "react-i18next";

interface ProfileSuggestion {
    uid: string;
    name: string;
    username?: string;
    role: string;
    location?: string;
    image?: string;
    gender?: string;
    verified?: boolean;
    bio?: string;
}

interface HistoryItem {
    type: 'text' | 'profile';
    value: string;
    name?: string;
    image?: string;
    verified?: boolean;
    role?: string;
    location?: string;
}

export function ActionSearchBar({ onActionSelect, onPageNavigate, onClose, }: {
    onActionSelect?: (profileId: string) => void;
    onPageNavigate?: (page: string) => void;
    onClose?: () => void;
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 150);
        return () => clearTimeout(timer);
    }, [query]);

    const containerRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const [loading, setLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerSearchAnimation = () => {
        setIsSearching(true);
        if (searchTimerRef.current)
            clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setIsSearching(false);
        }, 450);
    };

    const [allProfiles, setAllProfiles] = useState<ProfileSuggestion[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
    const [remoteProfiles, setRemoteProfiles] = useState<ProfileSuggestion[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("nc_search_history_v3");
            if (saved) {
                setHistory(JSON.parse(saved));
            }
        }
        catch (err) {
            console.error("Failed to load search history from localStorage:", err);
        }
    }, []);

    const addToHistory = (item: HistoryItem) => {
        setHistory((prev) => {
            const cleanItem: HistoryItem = item.type === 'profile'
                ? { type: 'profile', value: item.value }
                : { type: 'text', value: item.value, name: item.name };
            const filtered = prev.filter((h) => h.value !== cleanItem.value);
            const updated = [cleanItem, ...filtered].slice(0, 8);
            try {
                localStorage.setItem("nc_search_history_v3", JSON.stringify(updated));
                localStorage.removeItem("nc_search_history_cleared");
            }
            catch (err) {
                console.error("Failed to save search history to localStorage:", err);
            }
            return updated;
        });
    };

    const removeFromHistory = (value: string) => {
        setHistory((prev) => {
            const updated = prev.filter((item) => item.value !== value);
            try {
                localStorage.setItem("nc_search_history_v3", JSON.stringify(updated));
            }
            catch (err) {
                console.error("Failed to update search history in localStorage:", err);
            }
            return updated;
        });
    };

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToTalents((data) => {
            const loaded: ProfileSuggestion[] = data
                .filter((p: any) => !p.deactivated)
                .map((p: any) => ({
                    uid: p.id || p.uid,
                    name: ((p.name || p.displayName || p.fullName || p.username) as string) || "Talent",
                    username: (p.username as string) || "",
                    role: (p.role as string) || (p.category as string) || "Talent",
                    location: p.location as string | undefined,
                    image: (p.image || p.photoURL || p.profileImage) as string | undefined,
                    gender: p.gender as string | undefined,
                    verified: !!p.verified,
                    bio: (p.bio as string) || undefined,
                }));
            setAllProfiles(loaded);
            setLoading(false);
            setHasLoaded(true);
        }, 150);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (hasLoaded && allProfiles.length > 0 && history.length === 0) {
            const wasCleared = localStorage.getItem("nc_search_history_cleared") === "true";
            if (wasCleared)
                return;
            const currentUid = AuthService.getUserId();
            const initialHistory: HistoryItem[] = allProfiles
                .filter(p => !currentUid || p.uid !== currentUid)
                .slice(0, 5)
                .map(p => ({
                    type: 'profile',
                    value: p.uid,
                    name: p.name,
                    image: p.image,
                    role: p.role,
                    location: p.location,
                    verified: p.verified
                }));
            setHistory(initialHistory);
            try {
                localStorage.setItem("nc_search_history_v3", JSON.stringify(initialHistory));
            }
            catch (err) {
                console.error("Failed to save default history to localStorage:", err);
            }
        }
    }, [hasLoaded, allProfiles, history.length]);

    const normalized = debouncedQuery.trim().toLowerCase();
    const cleanNormalized = normalized.replace(/^@/, '');

    const profiles = useMemo(() => {
        const historyProfileUids = history
            .filter(h => h.type === 'profile')
            .map(h => h.value);
        const currentUid = AuthService.getUserId();

        if (!normalized) {
            return allProfiles
                .filter(p => (!currentUid || p.uid !== currentUid) && !dismissedSuggestionIds.includes(p.uid) && !historyProfileUids.includes(p.uid))
                .slice(0, 6);
        }

        // When searching, never exclude profiles simply because they are in history or belong to current user
        return allProfiles.filter((p) => {
            if (dismissedSuggestionIds.includes(p.uid)) return false;

            const name = p.name?.toLowerCase() || '';
            const username = p.username?.toLowerCase().replace(/^@/, '') || '';
            const role = p.role?.toLowerCase() || '';
            const location = p.location?.toLowerCase() || '';
            const bio = p.bio?.toLowerCase() || '';
            const uid = p.uid?.toLowerCase() || '';

            return (
                name.includes(cleanNormalized) ||
                username.includes(cleanNormalized) ||
                role.includes(cleanNormalized) ||
                location.includes(cleanNormalized) ||
                bio.includes(cleanNormalized) ||
                uid === cleanNormalized
            );
        }).slice(0, 8);
    }, [normalized, cleanNormalized, allProfiles, dismissedSuggestionIds, history]);

    // Live remote search fallback for profiles beyond the initial loaded set
    useEffect(() => {
        if (!cleanNormalized || cleanNormalized.length < 2) {
            setRemoteProfiles([]);
            return;
        }

        let isCancelled = false;

        const performRemoteSearch = async () => {
            try {
                const localMatches = allProfiles.filter(p => {
                    const name = p.name?.toLowerCase() || '';
                    const username = p.username?.toLowerCase().replace(/^@/, '') || '';
                    return name.includes(cleanNormalized) || username.includes(cleanNormalized);
                });
                if (localMatches.length >= 6) {
                    return;
                }

                const snap = await getDocs(firestoreQuery(collection(db, COLLECTIONS.PROFILES), firestoreLimit(80)));
                if (isCancelled) return;

                const remote: ProfileSuggestion[] = [];
                snap.forEach((docSnap) => {
                    const d = docSnap.data() || {};
                    const name = ((d.name || d.displayName || d.fullName || d.username) as string) || '';
                    const username = ((d.username || '') as string).replace(/^@/, '');
                    const role = ((d.role || d.category || 'Talent') as string);
                    const location = (d.location as string) || '';
                    const bio = (d.bio as string) || '';
                    const uid = docSnap.id;

                    if (
                        name.toLowerCase().includes(cleanNormalized) ||
                        username.toLowerCase().includes(cleanNormalized) ||
                        role.toLowerCase().includes(cleanNormalized) ||
                        location.toLowerCase().includes(cleanNormalized) ||
                        bio.toLowerCase().includes(cleanNormalized) ||
                        uid.toLowerCase() === cleanNormalized
                    ) {
                        remote.push({
                            uid,
                            name: name || 'User',
                            username,
                            role,
                            location: d.location as string | undefined,
                            image: (d.image || d.photoURL || d.profileImage) as string | undefined,
                            gender: d.gender as string | undefined,
                            verified: !!d.verified,
                            bio: d.bio as string | undefined,
                        });
                    }
                });

                if (!isCancelled) {
                    setRemoteProfiles(remote);
                }
            } catch (_err) {
                // Ignore fallback network issues
            }
        };

        performRemoteSearch();

        return () => {
            isCancelled = true;
        };
    }, [cleanNormalized, allProfiles]);

    const combinedProfiles = useMemo(() => {
        if (!normalized) return profiles;
        const seen = new Set<string>();
        const list: ProfileSuggestion[] = [];
        for (const p of [...profiles, ...remoteProfiles]) {
            if (!seen.has(p.uid) && !dismissedSuggestionIds.includes(p.uid)) {
                seen.add(p.uid);
                list.push(p);
            }
        }
        return list.slice(0, 8);
    }, [profiles, remoteProfiles, normalized, dismissedSuggestionIds]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && query.trim()) {
            addToHistory({
                type: 'text',
                value: query.trim(),
                name: query.trim()
            });
        }
    };

    const handleProfileSelect = (profile: ProfileSuggestion) => {
        addToHistory({
            type: 'profile',
            value: profile.uid,
            name: profile.name,
            image: profile.image,
            role: profile.role,
            location: profile.location,
            verified: profile.verified
        });
        onActionSelect?.(profile.uid);
    };

    return (
        <div ref={containerRef} className="w-full relative space-y-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
                {onClose && (
                    <button onClick={onClose} className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors shrink-0 cursor-pointer" title="Go Back" aria-label="Go Back">
                        <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
                    </button>
                )}
                <div className="relative flex-1 flex items-center bg-[#242526] rounded-full px-4 py-2 border-0">
                    <input
                        ref={inputRef}
                        type="text"
                        autoFocus
                        placeholder={t('ui.searchPlaceholder')}
                        value={query}
                        onFocus={() => setIsFocused(true)}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            triggerSearchAnimation();
                        }}
                        onKeyDown={(e) => {
                            handleKeyDown(e);
                            if (e.key === 'Enter') {
                                triggerSearchAnimation();
                            }
                        }}
                        className="w-full bg-transparent outline-none text-white text-[15px] placeholder:text-white/40 pr-16 border-0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {query && (
                            <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-white p-0.5 cursor-pointer transition-colors" title="Clear">
                                <X size={15}/>
                            </button>
                        )}
                        <button type="button" onClick={() => {
                            triggerSearchAnimation();
                            if (inputRef.current) {
                                inputRef.current.focus();
                            }
                        }} className="text-gray-400 hover:text-sky-400 p-0.5 cursor-pointer transition-colors" title="Search" aria-label="Search">
                            <Search className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {(isFocused || query.trim().length > 0) && (
                <div className="relative w-full bg-transparent z-50 text-left pt-2">
                    <div className="space-y-6">
                        {!query && history.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between px-1 py-2 mb-3">
                                    <span className="text-base font-extrabold text-white">
                                        Recent
                                    </span>
                                </div>
                                <ul className="space-y-1">
                                    {history.map((item, idx) => {
                                        const profileData = item.type === 'profile' 
                                            ? allProfiles.find(p => p.uid === item.value) 
                                            : null;
                                            
                                        if (item.type === 'profile' && !profileData && hasLoaded && !item.name) {
                                            return null;
                                        }

                                        const displayName = item.type === 'text' 
                                            ? item.name 
                                            : (profileData?.name || item.name || "Talent Profile");
                                            
                                        const displayImage = item.type === 'profile' 
                                            ? (profileData?.image || item.image) 
                                            : undefined;
                                            
                                        const displayRole = item.type === 'profile' 
                                            ? (profileData?.role || item.role) 
                                            : undefined;
                                            
                                        const displayLocation = item.type === 'profile' 
                                            ? (profileData?.location || item.location) 
                                            : undefined;
                                            
                                        const displayVerified = item.type === 'profile' 
                                            ? (profileData?.verified ?? item.verified) 
                                            : false;

                                        return (
                                            <li key={`${item.value}-${idx}`} className="flex items-center justify-between py-2.5 px-1 hover:bg-white/[0.04] transition-colors rounded-xl cursor-pointer">
                                                <div onClick={() => {
                                                    if (item.type === 'text') {
                                                        setQuery(item.value);
                                                    } else {
                                                        onActionSelect?.(item.value);
                                                    }
                                                    addToHistory(item);
                                                }} className="flex items-center gap-3.5 min-w-0 flex-1 text-left">
                                                    {item.type === 'text' ? (
                                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 md:w-11 md:h-11 shrink-0">
                                                            <Avatar userId={item.value} size="sm" name={displayName} verified={displayVerified}/>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="min-w-0">
                                                        <span className="font-apple text-[15px] font-medium text-white tracking-normal truncate flex items-center gap-1.5">
                                                            {displayName}
                                                            {item.type === 'profile' && displayVerified && (
                                                                <span className="w-3.5 h-3.5 rounded-full bg-[#522C69] flex items-center justify-center text-white text-[8px] font-black shrink-0" title="Verified">
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </span>
                                                        {item.type === 'profile' && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-[#522C69] shrink-0"/>
                                                                <span className="truncate">{displayRole || 'Talent'} {displayLocation ? `• ${displayLocation}` : ""}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                                    {item.type === 'profile' && displayImage && (
                                                        <img
                                                          src={getAvatarOptimizedUrl(displayImage, 'xs')}
                                                          alt=""
                                                          loading="lazy"
                                                          decoding="async"
                                                          className="w-7 h-7 object-cover rounded-[6px] border border-white/5 opacity-80"
                                                          onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                          }}
                                                        />
                                                    )}
                                                    <button onClick={() => removeFromHistory(item.value)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0" title="Remove">
                                                        <X size={15}/>
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {query && (
                            <div>
                                {loading || isSearching ? (
                                    <div className="py-4 space-y-3">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="animate-pulse flex items-center justify-between py-2 px-1">
                                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 shrink-0"/>
                                                    <div className="space-y-2 flex-1 min-w-0">
                                                        <div className="h-3.5 bg-white/5 rounded w-1/3"/>
                                                        <div className="h-2.5 bg-white/5 rounded w-1/2"/>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : combinedProfiles.length === 0 ? (
                                    <div className="py-12 text-center text-sm text-gray-500">
                                        No profiles found for "{query}"
                                    </div>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {combinedProfiles.map((profile) => (
                                            <li key={profile.uid} onClick={() => handleProfileSelect(profile)} className="flex items-center justify-between py-2 px-1 hover:bg-white/[0.04] transition-colors rounded-xl cursor-pointer">
                                                <div className="flex items-start gap-3.5 min-w-0 text-left">
                                                    <div className="w-10 h-10 md:w-11 md:h-11 shrink-0">
                                                        <Avatar userId={profile.uid} size="sm" name={profile.name} verified={profile.verified}/>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h3 className="font-apple font-medium text-white text-[15px] tracking-normal truncate flex items-center gap-1.5">
                                                            {profile.name}
                                                            {profile.username && (
                                                                <span className="text-xs font-normal text-white/50">
                                                                    @{profile.username.replace(/^@/, '')}
                                                                </span>
                                                            )}
                                                            {profile.verified && (
                                                                <span className="w-3.5 h-3.5 rounded-full bg-[#522C69] flex items-center justify-center text-white text-[8px] font-black shrink-0" title="Verified">
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#522C69] shrink-0"/>
                                                            <span className="truncate">{profile.role} {profile.location ? `• ${profile.location}` : ""}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                                                    {profile.image && (
                                                      <img
                                                        src={getAvatarOptimizedUrl(profile.image, 'xs')}
                                                        alt=""
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-7 h-7 object-cover rounded-[6px] border border-white/5 opacity-80"
                                                        onError={(e) => {
                                                          e.currentTarget.style.display = 'none';
                                                        }}
                                                      />
                                                    )}
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDismissedSuggestionIds(prev => [...prev, profile.uid]);
                                                    }} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors shrink-0" title="Remove">
                                                        <X size={15}/>
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
