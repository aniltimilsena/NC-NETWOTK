import React, { createContext, useContext, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useDialog } from './DialogProvider';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { signOut as firebaseSignOut, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { AuthService } from '../services/AuthService';
import { CurrentUser } from '../utils/CurrentUser';
import { PermissionProvider } from '../context/PermissionContext';
import { CallProvider } from '../context/CallContext';
import { initOneSignal, oneSignalInitialized } from '../utils/oneSignal';
import OneSignal from 'react-onesignal';
import SplashScreen from '../components/SplashScreen';
const Onboarding = lazy(() => import('../components/Onboarding'));
const CallingOverlay = lazy(() => import('../features/call/components/CallingOverlay'));
const IncomingCallPopup = lazy(() => import('../features/call/components/IncomingCallPopup'));
import { AnimatePresence } from 'framer-motion';

export interface AppContextType {
    user: any;
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
interface AlertPayload {
    id: string;
    message: string;
    type: AlertType;
    detail?: string;
    onAction?: () => void;
}
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
                    imageUrl: clerkUser.imageUrl || null,
                    getToken: () => getToken(),
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
                userProfile.role || 'user',
                userProfile.premium === true || userProfile.isPremium === true
            );
            // Sync canonical profile image and name so CurrentUser returns the
            // Firestore values instead of stale Clerk defaults.
            CurrentUser.setImageUrl(userProfile.image || null);
            CurrentUser.setName(userProfile.name || null);
        } else {
            CurrentUser.setProfileInfo('user', false);
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
    useEffect(() => {
        firebaseSignOut(auth).catch((err) => {
            console.warn("Failed to clear stale Firebase Auth session:", err);
        });
    }, []);
    const showAlert = useCallback((message: string, type: AlertType = 'info', detail?: string, onAction?: () => void) => {
        if (type === 'success') {
            showSuccessDialog("Success", message, onAction);
        } else if (type === 'error') {
            showErrorDialog("Error", message);
        } else if (type === 'logout') {
            showWarningDialog("Signed Out", message, () => {
                if (onAction) onAction();
            });
        } else {
            showConfirmDialog("Notice", message, () => {
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
        const timer = setTimeout(() => initOneSignal(), 1000);
        return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
        if (isLoaded && isSignedIn && clerkUser) {
            const uid = clerkUser.id;
            const email = clerkUser.primaryEmailAddress?.emailAddress || '';
            const clerkName = clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || (email ? email.split('@')[0] : 'Talent User');
            const rawClerkPhoto = clerkUser.imageUrl || '';
            const photoURL = rawClerkPhoto.includes('img.clerk.com') ? '' : rawClerkPhoto;

            const isSuperAdminEmail = Boolean(email && email.toLowerCase() === 'aniltimilsena53@gmail.com');
            setIsAdmin(isSuperAdminEmail);

            setUser({ uid, email, displayName: clerkName, photoURL, });

            (async () => {
                try {
                    if (oneSignalInitialized) { await OneSignal.login(uid); }
                } catch (e) { console.warn("OneSignal login failed:", e); }
                try {
                    if (!auth.currentUser) {
                        try {
                            const token = await getToken({ template: 'integration_firebase' }).catch(() => null);
                            if (token) {
                                await signInWithCustomToken(auth, token).catch(() => {});
                            }
                        } catch (_aErr) {}
                    }
                    const userDocRef = doc(db, 'users', uid);
                    const userDoc = await getDoc(userDocRef);
                    const isSuperAdminEmail = email && email.toLowerCase() === 'aniltimilsena53@gmail.com';
                    const hasAdminFlag = userDoc.exists() && userDoc.data()?.isAdmin === true;
                    const shouldBeAdmin = Boolean(isSuperAdminEmail || hasAdminFlag);

                    if (!userDoc.exists()) {
                        await setDoc(userDocRef, { email, displayName: clerkName, createdAt: serverTimestamp(), isAdmin: shouldBeAdmin, }, { merge: true });
                        setIsAdmin(shouldBeAdmin);
                    } else {
                        if (isSuperAdminEmail && !hasAdminFlag) { await setDoc(userDocRef, { isAdmin: true }, { merge: true }); }
                        setIsAdmin(shouldBeAdmin);
                    }

                    const profileDocRef = doc(db, 'profiles', uid);
                    const profileDoc = await getDoc(profileDocRef);
                    const profileData = profileDoc.exists() ? profileDoc.data() : null;
                    const updateData: any = {};

                    try {
                        const legacySnapshots = await Promise.all([
                            email ? getDocs(query(collection(db, 'profiles'), where('email', '==', email))).catch(() => null) : null,
                            clerkName ? getDocs(query(collection(db, 'profiles'), where('name', '==', clerkName))).catch(() => null) : null,
                        ]);
                        for (const snap of legacySnapshots) {
                            if (!snap) continue;
                            for (const docSnap of snap.docs) {
                                if (docSnap.id === uid) continue;
                                const legacyData = docSnap.data();
                                Object.assign(updateData, {
                                    name: profileData?.name || legacyData.name || clerkName,
                                    role: profileData?.role || legacyData.role || 'Model',
                                    category: profileData?.category || legacyData.category || legacyData.role || 'Model',
                                    bio: profileData?.bio || legacyData.bio || '',
                                    location: profileData?.location || legacyData.location || '',
                                    gender: profileData?.gender || legacyData.gender || '',
                                    skills: profileData?.skills || legacyData.skills || [],
                                    experience: profileData?.experience || legacyData.experience || [],
                                    education: profileData?.education || legacyData.education || [],
                                    languages: profileData?.languages || legacyData.languages || [],
                                    username: profileData?.username || legacyData.username || '',
                                    verified: profileData?.verified ?? legacyData.verified ?? false,
                                    premium: profileData?.premium ?? legacyData.premium ?? false,
                                    isPremium: profileData?.isPremium ?? legacyData.isPremium ?? false,
                                    featured: profileData?.featured ?? legacyData.featured ?? false,
                                    rating: profileData?.rating || legacyData.rating || 0,
                                    reviews: profileData?.reviews || legacyData.reviews || 0,
                                    coverImage: profileData?.coverImage || legacyData.coverImage || '',
                                    photoURL: profileData?.photoURL || profileData?.image || legacyData.photoURL || legacyData.image || '',
                                    image: profileData?.image || profileData?.photoURL || legacyData.image || legacyData.photoURL || '',
                                    onboarded: profileData?.onboarded !== undefined ? profileData.onboarded : (legacyData.onboarded !== undefined ? legacyData.onboarded : true)
                                });
                                try {
                                    await deleteDoc(doc(db, 'profiles', docSnap.id)).catch(() => {});
                                    await deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
                                } catch (_delErr) {}
                            }
                        }
                    } catch (_mergeErr) {}

                    if (!profileDoc.exists()) {
                        if (!updateData.name) updateData.name = clerkName;
                        if (!updateData.image) updateData.image = photoURL;
                        if (!updateData.photoURL) updateData.photoURL = photoURL;
                        updateData.createdAt = serverTimestamp();
                        if (updateData.onboarded === undefined) updateData.onboarded = true;
                    } else {
                        if (!profileData?.name && clerkName) updateData.name = clerkName;
                        const currentImg = profileData?.image || profileData?.photoURL;
                        const isDefault = !currentImg || currentImg.includes('img.clerk.com');
                        if (photoURL && isDefault && !updateData.image) {
                            updateData.image = photoURL;
                            updateData.photoURL = photoURL;
                        }
                    }
                    if (Object.keys(updateData).length > 0) {
                        updateData.updatedAt = serverTimestamp();
                        await setDoc(profileDocRef, updateData, { merge: true });
                        await setDoc(userDocRef, { 
                            email,
                            ...(updateData.name ? { name: updateData.name, displayName: updateData.name } : {}), 
                            ...(updateData.image ? { image: updateData.image, photoURL: updateData.image } : {}), 
                            updatedAt: serverTimestamp() 
                        }, { merge: true });
                    }
                } catch (err) { console.warn("Error syncing Clerk profile to Firestore:", err); }
            })();
        } else if (isLoaded && !isSignedIn) {
            setUser(null);
            setUserProfile(null);
            setIsAdmin(false);
            try {
                if (oneSignalInitialized)
                    OneSignal.logout();
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
        const unsub = onSnapshot(doc(db, 'profiles', user.uid), async (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setUserProfile(data);
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
        });
        return () => unsub();
    }, [user?.uid, showAlert]);

    const updateAvatar = useCallback(async (newUrl: string | null) => {
        if (!user?.uid)
            return;
        const uid = user.uid;
        await updateDoc(doc(db, 'profiles', uid), {
            image: newUrl || null,
            photoURL: newUrl || null,
            updatedAt: serverTimestamp()
        });
        setUser((prev: any) => prev ? { ...prev, photoURL: newUrl || '' } : null);
    }, [user?.uid]);

    const deleteAvatar = useCallback(async () => {
        if (!user?.uid)
            return;
        const uid = user.uid;
        await updateDoc(doc(db, 'profiles', uid), {
            image: null,
            photoURL: null,
            updatedAt: serverTimestamp()
        });
        setUser((prev: any) => prev ? { ...prev, photoURL: '' } : null);
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
        await signOut();
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
        premium: userProfile?.premium || isAdmin || false,
        role: userProfile?.category || userProfile?.role || '',
    } : null, [user, userProfile, clerkComputedName, isAdmin]);

    const appContextValue = React.useMemo(() => ({
        user: enrichedUser,
        isAdmin,
        authReady,
        showAlert,
        showToast,
        handleLogout,
        updateAvatar,
        deleteAvatar
    }), [enrichedUser, isAdmin, authReady, showAlert, showToast, handleLogout, updateAvatar, deleteAvatar]);

    const showOnboarding = authReady && !!user && !!userProfile && userProfile.onboarded !== true;
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
                <button onClick={handleCancelDeletion} className="w-full py-3 bg-[#00BFFF] text-black font-black uppercase text-xs rounded-xl">
                  Restore Account
                </button>
              </div>
            </div>)}
          <AnimatePresence>
            {!minSplashTimeElapsed && !authReady && <SplashScreen />}
            {showOnboarding && (<Suspense fallback={null}><Onboarding user={enrichedUser} profile={userProfile} onNavigate={() => { }}/></Suspense>)}
          </AnimatePresence>

          <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
            {children}
            <Suspense fallback={null}>
              <CallingOverlay />
              <IncomingCallPopup />
            </Suspense>
          </div>
        </AppContext.Provider>
      </CallProvider>
    </PermissionProvider>);
}
