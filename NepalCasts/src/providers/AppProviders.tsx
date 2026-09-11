import React, { createContext, useContext, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useDialog } from './DialogProvider';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut as firebaseSignOut, signInWithCustomToken } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { AuthService } from '../services/AuthService';
import { CurrentUser } from '../utils/CurrentUser';
import { notifyProfileUpdated } from '../features/profile/services/users';
import { updateProfileData } from '../features/profile/services/profile';
import { isDefaultImage } from '../utils/avatars';
import { PermissionProvider } from '../context/PermissionContext';
import { CallProvider } from '../context/CallContext';
import { preloadNotificationSound } from '../utils/notification-sound';
import { cacheManager } from '../utils/cacheManager';
import SplashScreen from '../components/SplashScreen';
const CallingOverlay = lazy(() => import('../features/call/components/CallingOverlay'));
const IncomingCallPopup = lazy(() => import('../features/call/components/IncomingCallPopup'));
const UploadProgressModal = lazy(() => import('../components/ui/UploadProgressModal'));
import { AnimatePresence } from 'framer-motion';

export interface AppContextType {
    user: any;
    userProfile: any;
    isAdmin: boolean;
    authReady: boolean;
    showAlert: (message: string, type?: any, detail?: string, onAction?: () => void) => void;
    showToast: (message: string, type?: any) => void;
    handleLogout: () => Promise<void>;
    updateAvatar: (newUrl: string | null) => Promise<void>;
    deleteAvatar: () => Promise<void>;
}
export const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context)
        throw new Error("useApp must be used within AppProviders");
    return context;
};
type AlertType = 'info' | 'success' | 'error' | 'logout';
export default function AppProviders({ children }: {
    children: React.ReactNode;
}) {
    const { showSuccessDialog, showErrorDialog, showConfirmDialog, showWarningDialog } = useDialog();
    const { isLoaded, isSignedIn, user: clerkUser } = useUser();
    const { signOut } = useClerk();
    const { getToken } = useAuth();
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authReady, setAuthReady] = useState(false);

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn && clerkUser) {
                AuthService.setSession({
                    id: clerkUser.id,
                    email: clerkUser.primaryEmailAddress?.emailAddress || null,
                    fullName: clerkUser.fullName || null,
                    username: clerkUser.username || null,
                    imageUrl: clerkUser.imageUrl && !isDefaultImage(clerkUser.imageUrl) ? clerkUser.imageUrl : null,
                    getToken: async () => {
                        if (auth.currentUser) {
                            try {
                                const fbToken = await auth.currentUser.getIdToken();
                                if (fbToken) return fbToken;
                            } catch {
                                // fallback
                            }
                        }
                        return getToken();
                    },
                });
            } else {
                AuthService.setSession({
                    id: null,
                    email: null,
                    fullName: null,
                    username: null,
                    imageUrl: null,
                    getToken: async () => null,
                });
            }
        }
    }, [isLoaded, isSignedIn, clerkUser, getToken]);

    useEffect(() => {
        if (userProfile) {
            CurrentUser.setProfileInfo(
                userProfile.role || 'user'
            );
            // Sync canonical profile image and name so CurrentUser returns the
            // Firestore values instead of stale Clerk defaults.
            CurrentUser.setImageUrl(userProfile.image || null);
            CurrentUser.setName(userProfile.name || null);
        } else {
            CurrentUser.setProfileInfo('user');
            CurrentUser.setImageUrl(null);
            CurrentUser.setName(null);
        }
    }, [userProfile]);
    const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem('nc_splash_shown') === 'true') {
            return true;
        }
        return false;
    });
    useEffect(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem('nc_splash_shown') === 'true') {
            setMinSplashTimeElapsed(true);
            return;
        }
        const timer = setTimeout(() => {
            setMinSplashTimeElapsed(true);
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('nc_splash_shown', 'true');
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, []);
    const showAlert = useCallback((message: string, type: AlertType = 'info', detail?: string, onAction?: () => void) => {
        const description = detail ? `${message}\n${detail}` : message;
        if (type === 'success') {
            showSuccessDialog("Success", description, onAction);
        } else if (type === 'error') {
            showErrorDialog("Error", description);
        } else if (type === 'logout') {
            showWarningDialog("Signed Out", detail || message, () => {
                if (onAction) onAction();
            });
        } else {
            showConfirmDialog("Notice", description, () => {
                if (onAction) onAction();
            });
        }
    }, [showSuccessDialog, showErrorDialog, showConfirmDialog, showWarningDialog]);

    const showToast = useCallback((message: string, type: 'success' | 'logout' | 'info' | 'error' = 'info') => {
        showAlert(message, type);
    }, [showAlert]);
    useEffect(() => {
        const handleCustomAlert = (e: Event) => {
            const { message, type, detail, onAction } = (e as CustomEvent).detail || {};
            if (message)
                showAlert(message, type || 'info', detail, onAction);
        };
        window.addEventListener('nc-alert', handleCustomAlert);
        return () => window.removeEventListener('nc-alert', handleCustomAlert);
    }, [showAlert]);
    useEffect(() => {
        let idleHandle: any = null;
        let timeoutHandle: any = null;
        const triggerInit = () => {
            import('../utils/oneSignal').then(m => m.initOneSignal()).catch(() => {});
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            idleHandle = (window as any).requestIdleCallback(() => {
                triggerInit();
            }, { timeout: 3000 });
        } else {
            timeoutHandle = setTimeout(() => {
                triggerInit();
            }, 2500);
        }
        return () => {
            if (idleHandle && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
                (window as any).cancelIdleCallback(idleHandle);
            }
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        };
    }, []);
    useEffect(() => {
        const handleFirstInteraction = () => {
            preloadNotificationSound();
            window.removeEventListener('pointerdown', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
        };
        window.addEventListener('pointerdown', handleFirstInteraction, { passive: true, once: true });
        window.addEventListener('keydown', handleFirstInteraction, { passive: true, once: true });
        return () => {
            window.removeEventListener('pointerdown', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
        };
    }, []);
    useEffect(() => {
        if (isLoaded && isSignedIn && clerkUser) {
            const uid = clerkUser.id;
            const email = clerkUser.primaryEmailAddress?.emailAddress || '';
            const clerkName = clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || (email ? email.split('@')[0] : 'Talent User');
            const rawClerkPhoto = clerkUser.imageUrl || '';
            const photoURL = isDefaultImage(rawClerkPhoto) ? '' : rawClerkPhoto;

            setUser({ uid, email, displayName: clerkName, photoURL });

            (async () => {
                try {
                    import('../utils/oneSignal').then(m => m.loginOneSignal(uid)).catch(() => {});
                } catch (e) { console.warn("OneSignal login failed:", e); }
                try {
                    if (!auth.currentUser || auth.currentUser.uid !== uid) {
                        try {
                            // 1. Try Clerk native integration template if enabled
                            let token = await getToken({ template: 'integration_firebase' }).catch(() => null);
                            // 2. Fallback to server custom token bridge if Clerk template is not configured
                            if (!token) {
                                const clerkJwt = await getToken().catch(() => null);
                                if (clerkJwt) {
                                    const resp = await fetch('/api/auth/firebase-token', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${clerkJwt}`,
                                            'Content-Type': 'application/json',
                                        },
                                    }).catch(() => null);
                                    if (resp && resp.ok) {
                                        const body = await resp.json().catch(() => null);
                                        token = body?.token || null;
                                    }
                                }
                            }
                            if (token) {
                                await signInWithCustomToken(auth, token).catch((e) => {
                                    console.warn('[AppProviders] signInWithCustomToken warning:', e);
                                });
                            }
                        } catch (_aErr) {
                            /* ignore custom token error */
                        }
                    }
                    const userDocRef = doc(db, 'users', uid);
                    let userDoc = await getDoc(userDocRef).catch(() => null);
                    const profileDocRef = doc(db, 'profiles', uid);
                    let profileDoc = await getDoc(profileDocRef).catch(() => null);

                    let userData = userDoc?.exists() ? userDoc.data() : null;
                    let profileData = profileDoc?.exists() ? profileDoc.data() : null;

                    // Reconcile legacy or admin-provisioned documents created under a different ID for the same email
                    if (!userData && !profileData && email) {
                        try {
                            const cleanEmail = email.toLowerCase().trim();
                            const emailQuery = query(collection(db, 'profiles'), where('email', '==', cleanEmail));
                            const emailSnap = await getDocs(emailQuery).catch(() => null);
                            if (emailSnap && !emailSnap.empty) {
                                const legacyDoc = emailSnap.docs.find(d => d.id !== uid);
                                if (legacyDoc) {
                                    profileData = legacyDoc.data();
                                    const legacyUserSnap = await getDoc(doc(db, 'users', legacyDoc.id)).catch(() => null);
                                    if (legacyUserSnap && legacyUserSnap.exists()) {
                                        userData = legacyUserSnap.data();
                                    }
                                    // Mark legacy records as migrated to avoid orphaned/duplicate entries
                                    const migrationPayload = {
                                        linkedUid: uid,
                                        canonicalUid: uid,
                                        migratedTo: uid,
                                        deactivated: true,
                                        updatedAt: serverTimestamp(),
                                    };
                                    await setDoc(doc(db, 'profiles', legacyDoc.id), migrationPayload, { merge: true }).catch(() => {});
                                    await setDoc(doc(db, 'users', legacyDoc.id), migrationPayload, { merge: true }).catch(() => {});
                                }
                            }
                        } catch (_reconErr) {
                            console.warn("Email profile reconciliation error:", _reconErr);
                        }
                    }

                    let hasAdminFlag =
                        userData?.isAdmin === true ||
                        userData?.role?.toLowerCase() === 'admin' ||
                        profileData?.isAdmin === true ||
                        profileData?.role?.toLowerCase() === 'admin' ||
                        (clerkUser?.publicMetadata as any)?.isAdmin === true ||
                        (clerkUser?.publicMetadata as any)?.role === 'admin';

                    if (!hasAdminFlag && email && email.toLowerCase() === 'aniltimilsena53@gmail.com') {
                        hasAdminFlag = true;
                    }

                    const rawExistingPhoto = profileData?.image || profileData?.photoURL || userData?.image || userData?.photoURL || photoURL;
                    const finalPhoto = isDefaultImage(rawExistingPhoto) ? '' : rawExistingPhoto;
                    const finalName = profileData?.name || profileData?.displayName || userData?.name || userData?.displayName || clerkName;
                    const resolvedUsername = clerkUser?.username || profileData?.username || userData?.username || (email ? email.split('@')[0] : null);

                    const profilePayload: any = {
                        uid,
                        id: uid,
                        email,
                        username: resolvedUsername,
                        name: finalName,
                        displayName: finalName,
                        fullName: finalName,
                        role: profileData?.role || userData?.role || 'Actor',
                        category: profileData?.category || profileData?.role || userData?.role || 'Actor',
                        image: finalPhoto,
                        photoURL: finalPhoto,
                        profileImage: finalPhoto,
                        location: profileData?.location || userData?.location || 'Kathmandu',
                        bio: profileData?.bio || userData?.bio || '',
                        skills: Array.isArray(profileData?.skills) ? profileData.skills : (Array.isArray(userData?.skills) ? userData.skills : ['Actor']),
                        experience: Array.isArray(profileData?.experience) ? profileData.experience : (Array.isArray(userData?.experience) ? userData.experience : []),
                        gender: profileData?.gender || userData?.gender || 'other',
                        followers: typeof profileData?.followers === 'number' ? profileData.followers : (typeof userData?.followers === 'number' ? userData.followers : 0),
                        following: typeof profileData?.following === 'number' ? profileData.following : (typeof userData?.following === 'number' ? userData.following : 0),
                        rating: typeof profileData?.rating === 'number' ? profileData.rating : 5,
                        reviews: typeof profileData?.reviews === 'number' ? profileData.reviews : 0,
                        verified: profileData?.verified ?? false,
                        status: profileData?.status || userData?.status || 'active',
                        deactivated: false,
                        onboarded: true,
                        ...(profileData?.createdAt ? {} : { createdAt: serverTimestamp(), joinedAt: serverTimestamp() }),
                        updatedAt: serverTimestamp(),
                        ...(hasAdminFlag ? { isAdmin: true, role: 'Admin' } : {})
                    };

                    if (auth.currentUser && auth.currentUser.uid === uid) {
                        await updateProfileData(uid, profilePayload).catch((err) => {
                            console.warn("updateProfileData non-fatal warning:", err);
                        });
                    }

                    setUserProfile(profilePayload);
                    CurrentUser.setName(finalName);
                    CurrentUser.setImageUrl(finalPhoto);
                    CurrentUser.setProfileInfo(profilePayload.role);

                    setIsAdmin(Boolean(hasAdminFlag));
                    setUser({
                        uid,
                        email,
                        displayName: finalName,
                        photoURL: finalPhoto,
                        isAdmin: Boolean(hasAdminFlag),
                        role: hasAdminFlag ? 'Admin' : profilePayload.role
                    });
                } catch (err) { console.warn("Error syncing Clerk profile to Firestore:", err); }
            })();
        } else if (isLoaded && !isSignedIn) {
            setUser(null);
            setUserProfile(null);
            setIsAdmin(false);
            try {
                import('../utils/oneSignal').then(m => m.logoutOneSignal()).catch(() => {});
            }
            catch (e) {
                // Ignore OneSignal logout error on auth check
            }
        }
        setAuthReady(isLoaded);
    }, [isLoaded, isSignedIn, clerkUser]);

    useEffect(() => {
        if (!user?.uid) {
            setUserProfile(null);
            return;
        }
        const uid = user.uid;

        // 1. Live presence management
        const setPresence = async (online: boolean) => {
            try {
                const presenceData = {
                    isOnline: online,
                    online: online,
                    lastSeen: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                await setDoc(doc(db, 'users', uid), presenceData, { merge: true }).catch(() => {});
                await setDoc(doc(db, 'profiles', uid), presenceData, { merge: true }).catch(() => {});
            } catch (err) {
                // Ignore presence update errors
            }
        };

        setPresence(true);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setPresence(true);
            } else {
                setPresence(false);
            }
        };

        const handleBeforeUnload = () => {
            setPresence(false);
        };

        const heartbeat = setInterval(() => {
            if (document.visibilityState === 'visible') {
                setPresence(true);
            }
        }, 45000);

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 2. Profile snapshot listener (pooled and throttled when tab is hidden > 45s)
        const unsub = cacheManager.subscribePooled(`profile_doc_${user.uid}`, (pooledCb) => {
            return onSnapshot(doc(db, 'profiles', user.uid), async (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    pooledCb(data, null);
                    if (data.deactivated === true) {
                        try {
                            await setDoc(doc(db, 'profiles', user.uid), {
                                deactivated: false,
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                            showAlert('Welcome Back!', 'success', 'Your deactivated profile has been automatically reactivated.');
                        }
                        catch (err) {
                            // Ignore automatic profile reactivation errors
                        }
                    }
                }
            }, (err) => {
                console.warn('Profile snapshot error in AppProviders:', err);
                pooledCb(null, err);
            });
        }, (data) => {
            if (data) {
                setUserProfile(data);
            }
        });

        return () => {
            clearInterval(heartbeat);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            setPresence(false);
            unsub();
        };
    }, [user?.uid, showAlert]);

    const updateAvatar = useCallback(async (newUrl: string | null) => {
        if (!user?.uid)
            return;
        const uid = user.uid;
        await updateDoc(doc(db, 'profiles', uid), {
            image: newUrl || null,
            photoURL: newUrl || null,
            profileImage: newUrl || null,
            updatedAt: serverTimestamp()
        }).catch(() => {});
        await setDoc(doc(db, 'users', uid), {
            image: newUrl || null,
            photoURL: newUrl || null,
            profileImage: newUrl || null,
            updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
        CurrentUser.setImageUrl(newUrl || null);
        setUser((prev: any) => prev ? { ...prev, photoURL: newUrl || '' } : null);
    }, [user?.uid]);

    const deleteAvatar = useCallback(async () => {
        if (!user?.uid)
            return;
        const uid = user.uid;
        await setDoc(doc(db, 'profiles', uid), {
            image: "",
            photoURL: "",
            profileImage: "",
            updatedAt: serverTimestamp()
        }, { merge: true });
        await setDoc(doc(db, 'users', uid), {
            image: "",
            photoURL: "",
            profileImage: "",
            updatedAt: serverTimestamp()
        }, { merge: true });
        CurrentUser.setImageUrl(null);
        notifyProfileUpdated(uid, "");
        setUser((prev: any) => prev ? { ...prev, photoURL: '', image: '', profileImage: '' } : null);
    }, [user?.uid]);

    const handleCancelDeletion = async () => {
        if (!user?.uid)
            return;
        try {
            await updateDoc(doc(db, 'profiles', user.uid), {
                deletionScheduled: false,
                deletionScheduledAt: null,
                deletionGracePeriodEndsAt: null,
            });
            await updateDoc(doc(db, 'users', user.uid), {
                deletionScheduled: false,
                deletionScheduledAt: null,
                deletionGracePeriodEndsAt: null,
            });
            showAlert("Account restored successfully!", "success");
        }
        catch (err) {
            // Ignore cancel account deletion errors
        }
    };

    const handleLogout = useCallback(async () => {
        AuthService.setSession({
            id: null,
            email: null,
            fullName: null,
            username: null,
            imageUrl: null,
            getToken: async () => null,
        });
        CurrentUser.setProfileInfo('user');
        CurrentUser.setImageUrl(null);
        CurrentUser.setName(null);
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        if (typeof window !== 'undefined') {
            localStorage.removeItem("nc_cached_talents_real");
        }
        await signOut().catch(console.warn);
        await firebaseSignOut(auth).catch(console.warn);
    }, [signOut]);

    const clerkComputedName = clerkUser ? (clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || (user?.email ? user.email.split('@')[0] : '')) : '';

    const enrichedUser = React.useMemo(() => user ? {
        uid: user.uid,
        email: user.email,
        displayName: userProfile?.name || user.displayName || clerkComputedName || (user.email ? user.email.split('@')[0] : 'Talent User'),
        photoURL: userProfile?.image || '',
        gender: userProfile?.gender || '',
        profileImage: userProfile?.image || '',
        role: userProfile?.category || userProfile?.role || '',
    } : null, [user, userProfile, clerkComputedName, isAdmin]);

    const appContextValue = React.useMemo(() => ({
        user: enrichedUser,
        userProfile,
        isAdmin,
        authReady,
        showAlert,
        showToast,
        handleLogout,
        updateAvatar,
        deleteAvatar
    }), [enrichedUser, userProfile, isAdmin, authReady, showAlert, showToast, handleLogout, updateAvatar, deleteAvatar]);

    return (<PermissionProvider>
      <CallProvider user={enrichedUser}>
        <AppContext.Provider value={appContextValue}>
          {user && userProfile?.deletionScheduled === true && (<div className="fixed inset-0 z-[99999] bg-[#0A0A0A]/95 backdrop-blur-md flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#111] border border-white/5 rounded-3xl p-8 text-center space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Account Scheduled for Deletion</h2>
                    <p className="text-gray-400 text-xs">
                      Your account is in a 30-day grace period.
                    </p>
                  </div>
                  <button onClick={handleCancelDeletion} className="w-full py-3 bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-black uppercase text-xs rounded-xl cursor-pointer">
                    Restore Account
                  </button>
                </div>
              </div>)}
            <AnimatePresence>
              {!minSplashTimeElapsed && !authReady && <SplashScreen />}
            </AnimatePresence>

            <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
              {children}
              <Suspense fallback={null}>
                <CallingOverlay />
                <IncomingCallPopup />
                <UploadProgressModal />
              </Suspense>
            </div>
        </AppContext.Provider>
      </CallProvider>
    </PermissionProvider>);
}
