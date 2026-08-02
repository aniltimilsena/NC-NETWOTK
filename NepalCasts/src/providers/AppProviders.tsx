import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PermissionProvider } from '../context/PermissionContext';
import { CallProvider } from '../context/CallContext';
import { initOneSignal, oneSignalInitialized } from '../utils/oneSignal';
import OneSignal from 'react-onesignal';
import SplashScreen from '../components/SplashScreen';
import Onboarding from '../components/Onboarding';
import { AlertBanner } from '../components/ui/AlertBanner';
import CallingOverlay from '../features/call/components/CallingOverlay';
import IncomingCallPopup from '../features/call/components/IncomingCallPopup';
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
    const { isLoaded, isSignedIn, user: clerkUser } = useUser();
    const { signOut } = useClerk();
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem('nc_splash_shown') === 'true') {
            return true;
        }
        return false;
    });
    const [alerts, setAlerts] = useState<AlertPayload[]>([]);
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
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setAlerts(prev => {
            if (prev.some(a => a.message === message && a.type === type))
                return prev;
            const queue = prev.length >= 4 ? prev.slice(1) : prev;
            return [...queue, { id, message, type, detail, onAction }];
        });
    }, []);
    const dismissAlert = useCallback((id: string) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);
    const showToast = useCallback((message: string, type: 'success' | 'logout' | 'info' | 'error' = 'info') => showAlert(message, type), [showAlert]);
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
            const photoURL = clerkUser.imageUrl || '';

            setUser({
                uid,
                email,
                displayName: clerkName,
                photoURL,
            });

            (async () => {
                try {
                    if (oneSignalInitialized) {
                        await OneSignal.login(uid);
                    }
                }
                catch (e) {
                    console.warn("OneSignal login failed:", e);
                }
                try {
                    const userDocRef = doc(db, 'users', uid);
                    const userDoc = await getDoc(userDocRef);
                    if (!userDoc.exists()) {
                        await setDoc(userDocRef, {
                            email,
                            displayName: clerkName,
                            createdAt: serverTimestamp(),
                            isAdmin: false,
                        }, { merge: true });
                        setIsAdmin(false);
                    } else {
                        setIsAdmin(userDoc.data()?.isAdmin === true);
                    }

                    const profileDocRef = doc(db, 'profiles', uid);
                    const profileDoc = await getDoc(profileDocRef);
                    const profileData = profileDoc.exists() ? profileDoc.data() : null;
                    const updateData: any = {};

                    if (!profileDoc.exists()) {
                        updateData.name = clerkName;
                        updateData.email = email;
                        updateData.image = photoURL;
                        updateData.photoURL = photoURL;
                        updateData.createdAt = serverTimestamp();
                        updateData.onboarded = true;
                    } else {
                        if (!profileData?.name && clerkName) {
                            updateData.name = clerkName;
                        }
                        const currentImg = profileData?.image || profileData?.photoURL;
                        const isDefault = !currentImg || 
                                          currentImg.includes('default-avatar.png') || 
                                          currentImg.includes('default-male.png') || 
                                          currentImg.includes('default-female.png') || 
                                          currentImg.startsWith('data:image/svg+xml');
                        if (photoURL && (isDefault || currentImg !== photoURL)) {
                            updateData.image = photoURL;
                            updateData.photoURL = photoURL;
                        }
                    }

                    if (Object.keys(updateData).length > 0) {
                        updateData.updatedAt = serverTimestamp();
                        await setDoc(profileDocRef, updateData, { merge: true });
                    }
                }
                catch (err) {
                    console.warn("Error syncing Clerk profile to Firestore:", err);
                }
            })();
        } else if (isLoaded && !isSignedIn) {
            setUser(null);
            setUserProfile(null);
            setIsAdmin(false);
            try {
                if (oneSignalInitialized)
                    OneSignal.logout();
            }
            catch (e) { }
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
                    catch (err) { }
                }
            }
        });
        return () => unsub();
    }, [user?.uid, showAlert]);

    const updateAvatar = async (newUrl: string | null) => {
        if (!user?.uid)
            return;
        const uid = user.uid;
        await updateDoc(doc(db, 'profiles', uid), {
            image: newUrl || null,
            photoURL: newUrl || null,
            updatedAt: serverTimestamp()
        });
        setUser((prev: any) => prev ? { ...prev, photoURL: newUrl || '' } : null);
    };

    const deleteAvatar = async () => {
        if (!user?.uid)
            return;
        const uid = user.uid;
        await updateDoc(doc(db, 'profiles', uid), {
            image: null,
            photoURL: null,
            updatedAt: serverTimestamp()
        });
        setUser((prev: any) => prev ? { ...prev, photoURL: '' } : null);
    };

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
        catch (err) { }
    };

    const handleLogout = async () => {
        await signOut();
    };

    const clerkComputedName = clerkUser ? (clerkUser.fullName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || (user?.email ? user.email.split('@')[0] : '')) : '';

    const enrichedUser = user ? {
        uid: user.uid,
        email: user.email,
        displayName: userProfile?.name || user.displayName || clerkComputedName || (user.email ? user.email.split('@')[0] : 'Talent User'),
        photoURL: userProfile?.photoURL || userProfile?.image || user.photoURL || clerkUser?.imageUrl || '',
        gender: userProfile?.gender || '',
        profileImage: userProfile?.image || user.photoURL || clerkUser?.imageUrl || '',
        premium: userProfile?.premium || isAdmin || false,
        role: userProfile?.category || userProfile?.role || '',
    } : null;

    const showOnboarding = authReady && !!user && !!userProfile && userProfile.onboarded !== true;
    return (<PermissionProvider>
      <CallProvider user={enrichedUser}>
        <AppContext.Provider value={{
            user: enrichedUser,
            isAdmin,
            authReady,
            showAlert,
            showToast,
            handleLogout,
            updateAvatar,
            deleteAvatar
        }}>
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
            {showOnboarding && (<Onboarding user={enrichedUser} profile={userProfile} onNavigate={() => { }}/>)}
          </AnimatePresence>

          <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
            {children}
            <AlertBanner alerts={alerts} onDismiss={dismissAlert}/>
            <CallingOverlay />
            <IncomingCallPopup />
          </div>
        </AppContext.Provider>
      </CallProvider>
    </PermissionProvider>);
}
