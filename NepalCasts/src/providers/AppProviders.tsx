import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
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
    const [user, setUser] = useState<User | null>(null);
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    if (oneSignalInitialized) {
                        await OneSignal.login(firebaseUser.uid);
                    }
                }
                catch (e) {
                    console.warn("OneSignal login failed:", e);
                }
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    setIsAdmin(userDoc.exists() && userDoc.data()?.isAdmin === true);
                }
                catch (err) {
                    setIsAdmin(false);
                }
            }
            else {
                setUser(null);
                setUserProfile(null);
                setIsAdmin(false);
                try {
                    if (oneSignalInitialized)
                        await OneSignal.logout();
                }
                catch (e) { }
            }
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);
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
        if (!auth.currentUser)
            return;
        const uid = auth.currentUser.uid;
        await updateProfile(auth.currentUser, { photoURL: newUrl || '' });
        await updateDoc(doc(db, 'profiles', uid), {
            image: newUrl || null,
            photoURL: newUrl || null,
            updatedAt: serverTimestamp()
        });
        setUser({ ...auth.currentUser } as any);
    };
    const deleteAvatar = async () => {
        if (!auth.currentUser)
            return;
        const uid = auth.currentUser.uid;
        await updateProfile(auth.currentUser, { photoURL: '' });
        await updateDoc(doc(db, 'profiles', uid), {
            image: null,
            photoURL: null,
            updatedAt: serverTimestamp()
        });
        setUser({ ...auth.currentUser } as any);
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
        await auth.signOut();
    };
    const enrichedUser = user ? {
        uid: user.uid,
        email: user.email,
        displayName: userProfile?.name || user.displayName || '',
        photoURL: userProfile?.photoURL || userProfile?.image || user.photoURL || '',
        gender: userProfile?.gender || '',
        profileImage: userProfile?.image || user.photoURL || '',
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
            {!(authReady && minSplashTimeElapsed) && <SplashScreen />}
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
