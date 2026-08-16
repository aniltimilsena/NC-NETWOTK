import React, { createContext, useContext, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useDialog } from './DialogProvider';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc, query, collection, where, getDocs, deleteDoc } from 'firebase/firestore';
import { signOut as firebaseSignOut, signInWithCustomToken } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { AuthService } from '../services/AuthService';
import { CurrentUser } from '../utils/CurrentUser';
import { notifyProfileUpdated } from '../features/profile/services/users';
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
                    imageUrl: clerkUser.hasImage ? (clerkUser.imageUrl || null) : null,
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
            const rawClerkPhoto = clerkUser.hasImage ? (clerkUser.imageUrl || '') : '';
            const photoURL = (rawClerkPhoto.includes('img.clerk.com') || rawClerkPhoto.includes('clerk.dev')) ? '' : rawClerkPhoto;

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
                        } catch (_aErr) {
                            /* ignore custom token error */
                        }
                    }
                    const userDocRef = doc(db, 'users', uid);
                    const userDoc = await getDoc(userDocRef);
                    const hasAdminFlag = userDoc.exists() && userDoc.data()?.isAdmin === true;

                    if (!userDoc.exists()) {
                        await setDoc(userDocRef, { email, displayName: clerkName, createdAt: serverTimestamp() }, { merge: true });
                        setIsAdmin(false);
                    } else {
                        setIsAdmin(hasAdminFlag);
                    }

                    const profileDocRef = doc(db, 'profiles', uid);
                    const profileDoc = await getDoc(profileDocRef);
                    const profileData = profileDoc.exists() ? profileDoc.data() : null;
                    const updateData: any = {};
                    if (!profileDoc.exists()) {
                        if (!updateData.name) updateData.name = clerkName;
                        if (!updateData.image) updateData.image = photoURL;
                        if (!updateData.photoURL) updateData.photoURL = photoURL;
                        updateData.createdAt = serverTimestamp();
                        if (updateData.onboarded === undefined) updateData.onboarded = true;
                    } else {
                        if (!profileData?.name && clerkName) updateData.name = clerkName;
                        const currentImg = profileData?.image || profileData?.photoURL;
                        const isDefault = !currentImg || currentImg.includes('img.clerk.com') || currentImg.includes('clerk.dev');
                        if (isDefault && currentImg && (currentImg.includes('img.clerk.com') || currentImg.includes('clerk.dev')) && !clerkUser.hasImage) {
                            updateData.image = '';
                            updateData.photoURL = '';
                        } else if (photoURL && isDefault && !updateData.image) {
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
                    try {
                        const mockFollowerIds = new Set(['uyR9rwPbZBUms2ffermJA0SDbqw2', 'Mm1B6rYaEebs6ajRyu0EJBrrGwT2', uid]);
                        const followsTargetSnap = await getDocs(query(collection(db, 'follows'), where('followingId', '==', uid)));
                        for (const dSnap of followsTargetSnap.docs) {
                            const dData = dSnap.data();
                            if (mockFollowerIds.has(dData.followerId)) {
                                await deleteDoc(doc(db, 'follows', dSnap.id)).catch(() => {});
                            }
                        }
                    } catch (_mockErr) {
                        /* ignore cleanup error */
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
        CurrentUser.setProfileInfo('user', false);
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
