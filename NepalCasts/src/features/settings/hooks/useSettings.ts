import { useEffect, useState, useCallback } from 'react';
import { doc, collection, query, onSnapshot, deleteDoc, updateDoc, documentId, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getProfile, updateProfileData } from '../../../services';
import type { UserProfile, ServiceResult } from '../../../types';
export function useSettings(currentUser: any) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [blockedUsersList, setBlockedUsersList] = useState<any[]>([]);
    const [loadingBlocks, setLoadingBlocks] = useState(true);
    useEffect(() => {
        if (!currentUser?.uid) {
            setProfile(null);
            setLoading(false);
            return;
        }
        const fetchProfile = async () => {
            try {
                const res = await getProfile(currentUser.uid);
                if (res.data) {
                    setProfile(res.data as unknown as UserProfile);
                } else {
                    setProfile({
                        uid: currentUser.uid,
                        name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Talent User'),
                        email: currentUser.email || '',
                        photoURL: currentUser.photoURL || '',
                        role: currentUser.role || 'Actor',
                        bio: '',
                        location: '',
                        skills: [],
                        experience: [],
                        languages: [],
                        media: [],
                    } as unknown as UserProfile);
                }
            } catch (err) {
                setProfile({
                    uid: currentUser.uid,
                    name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Talent User'),
                    email: currentUser.email || '',
                    photoURL: currentUser.photoURL || '',
                    role: currentUser.role || 'Actor',
                    bio: '',
                    location: '',
                    skills: [],
                    experience: [],
                    languages: [],
                    media: [],
                } as unknown as UserProfile);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser?.uid) {
            setLoadingSessions(false);
            return;
        }
        const q = query(collection(db, 'profiles', currentUser.uid, 'sessions'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(docSnap => docSnap.data());
            setSessions(list);
            setLoadingSessions(false);
        }, (err) => {
            console.warn("Failed to subscribe to sessions:", err);
            setLoadingSessions(false);
        });
        return () => unsub();
    }, [currentUser?.uid]);
    useEffect(() => {
        if (!currentUser?.uid) {
            setLoadingBlocks(false);
            return;
        }
        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), async (snap) => {
            if (!snap.exists()) {
                setBlockedUsersList([]);
                setLoadingBlocks(false);
                return;
            }
            const blockedIds = snap.data()?.blockedUsers || [];
            if (blockedIds.length === 0) {
                setBlockedUsersList([]);
                setLoadingBlocks(false);
                return;
            }
            try {
                const chunks = [];
                for (let i = 0; i < blockedIds.length; i += 30) {
                    chunks.push(blockedIds.slice(i, i + 30));
                }
                const profileMap = new Map<string, any>();
                await Promise.all(chunks.map(async (chunk) => {
                    try {
                        const q = query(collection(db, 'profiles'), where(documentId(), 'in', chunk));
                        const snap = await getDocs(q);
                        snap.docs.forEach(d => {
                            profileMap.set(d.id, d.data());
                        });
                    } catch (err) {
                        console.warn("Failed to batch fetch blocked profiles chunk:", err);
                    }
                }));

                const fetched = blockedIds.map(bid => {
                    const data = profileMap.get(bid);
                    if (data) {
                        return {
                            uid: bid,
                            name: data.name || 'Blocked User',
                            image: data.image || '',
                            role: data.role || 'Talent'
                        };
                    } else {
                        return {
                            uid: bid,
                            name: 'Blocked User',
                            image: '',
                            role: 'Talent'
                        };
                    }
                });
                setBlockedUsersList(fetched);
            }
            catch (err) {
                console.warn("Failed to fetch blocked users profile details:", err);
            }
            setLoadingBlocks(false);
        });
        return () => unsub();
    }, [currentUser?.uid]);
    const updateProfileSettings = useCallback(async (data: Partial<UserProfile>): Promise<ServiceResult> => {
        const activeUid = currentUser?.uid || currentUser?.id || CurrentUser.id;
        if (!activeUid) {
            return { success: false, error: 'Authentication required' };
        }
        const res = await updateProfileData(activeUid, data);
        if (res.success && profile) {
            setProfile({ ...profile, ...data });
        }
        return res;
    }, [currentUser?.uid, currentUser?.id, profile]);
    const revokeSession = useCallback(async (sessionId: string): Promise<ServiceResult> => {
        if (!currentUser?.uid) {
            return { success: false, error: 'Authentication required' };
        }
        try {
            await deleteDoc(doc(db, 'profiles', currentUser.uid, 'sessions', sessionId));
            return { success: true, error: null };
        }
        catch (err: any) {
            return { success: false, error: err.message || 'Failed to revoke session' };
        }
    }, [currentUser?.uid]);
    const unblockUserAction = useCallback(async (targetId: string): Promise<ServiceResult> => {
        if (!currentUser?.uid) {
            return { success: false, error: 'Authentication required' };
        }
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                blockedUsers: blockedUsersList.filter(u => u.uid !== targetId).map(u => u.uid)
            });
            return { success: true, error: null };
        }
        catch (err: any) {
            return { success: false, error: err.message || 'Failed to unblock user' };
        }
    }, [currentUser?.uid, blockedUsersList]);
    return {
        profile,
        loading,
        sessions,
        loadingSessions,
        blockedUsersList,
        loadingBlocks,
        updateProfileSettings,
        revokeSession,
        unblockUserAction
    };
}
export type UseSettingsReturn = ReturnType<typeof useSettings>;
