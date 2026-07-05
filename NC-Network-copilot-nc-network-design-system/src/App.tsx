import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Routes, Route, useParams, useSearchParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import OneSignal from 'react-onesignal';
import { AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { logger } from './utils/logger';

let oneSignalInitialized = false;
let oneSignalInitPromise: Promise<void> | null = null;

export const initOneSignal = async () => {
  if (typeof window === 'undefined') return;
  if (oneSignalInitialized) return;
  if (oneSignalInitPromise) return oneSignalInitPromise;

  oneSignalInitPromise = (async () => {
    
    const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string | undefined;
    if (!ONESIGNAL_APP_ID) {
      if (import.meta.env.DEV) {
        console.error('[OneSignal] VITE_ONESIGNAL_APP_ID is not set. Push notifications disabled.');
      }
      return;
    }

    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: {
          scope: '/',
        },
      });

      oneSignalInitialized = true;

      if (OneSignal.Notifications) {
        OneSignal.Notifications.addEventListener(
          'permissionChange',
          (permission) => {
            if (import.meta.env.DEV) {
              console.log('OneSignal permission:', permission);
            }
          }
        );
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('OneSignal init error:', error);
      }
    }
  })();

  return oneSignalInitPromise;
};




import { CallProvider } from './context/CallContext';
import { PermissionProvider } from './context/PermissionContext';
import CallingOverlay from './components/calling/CallingOverlay';
import IncomingCallPopup from './components/calling/IncomingCallPopup';
import { AlertBanner, type AlertPayload, type AlertType } from './components/ui/AlertBanner';

import RouteLoader from './components/RouteLoader';
import PageTransition from './components/PageTransition';
import SplashScreen from './components/SplashScreen';
import Onboarding from './components/Onboarding';


import PublicLayout from './layouts/PublicLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';


import { auth, db } from './lib/firebase';
import { onAuthStateChanged, onIdTokenChanged, getIdTokenResult, type User, updateProfile } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useNotifications } from './hooks/useNotifications';
import { UserContext } from './context/UserContext';


const Home = lazyWithRetry(() => import('./pages/Home'));
const TalentListing = lazyWithRetry(() => import('./pages/TalentListing'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const CastingCall = lazyWithRetry(() => import('./pages/CastingCall'));
const CastingCallDetail = lazyWithRetry(() => import('./pages/CastingCallDetail'));
const SignIn = lazyWithRetry(() => import('./pages/SignIn'));
const SignUp = lazyWithRetry(() => import('./pages/SignUp'));
const ProfileCreate = lazyWithRetry(() => import('./pages/ProfileCreate'));
const CastingCallCreate = lazyWithRetry(() => import('./pages/CastingCallCreate'));
const Premium = lazyWithRetry(() => import('./pages/Premium'));
const Messages = lazyWithRetry(() => import('./pages/Messages'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const TrustSafety = lazyWithRetry(() => import('./pages/TrustSafety'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const Trending = lazyWithRetry(() => import('./pages/Trending'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
const SavedCastingCalls = lazyWithRetry(() => import('./pages/SavedCastingCalls'));


const AdminOverview = lazyWithRetry(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazyWithRetry(() => import('./pages/admin/AdminUsers'));
const AdminAnalytics = lazyWithRetry(() => import('./pages/admin/AdminAnalytics'));
const AdminContent = lazyWithRetry(() => import('./pages/admin/AdminContent'));
const AdminCasting = lazyWithRetry(() => import('./pages/admin/AdminCasting'));
const AdminMessages = lazyWithRetry(() => import('./pages/admin/AdminMessages'));
const AdminPro = lazyWithRetry(() => import('./pages/admin/AdminPro'));
const AdminModeration = lazyWithRetry(() => import('./pages/admin/AdminModeration'));
const AdminSettings = lazyWithRetry(() => import('./pages/admin/AdminSettings'));
const AdminDataRequests = lazyWithRetry(() => import('./pages/admin/DataRequests'));



export function getRoutePath(page: string, param: any = null): string {
  switch (page) {
    case 'home': return '/';
    case 'listing': return param ? `/talents?category=${encodeURIComponent(param)}` : '/talents';
    case 'profile': return param ? `/profile/${param}` : '/talents';
    case 'casting': return '/casting';
    case 'casting-detail': return `/casting/${param}`;
    case 'signin': return '/signin';
    case 'signup': return '/signup';
    case 'profile-create': return '/profile/create';
    case 'casting-create': return '/casting/create';
    case 'premium': return '/premium';
    case 'messages': return param ? `/messages/${param}` : '/messages';
    case 'notifications': return '/notifications';
    case 'settings': return param ? `/settings?tab=${param}` : '/settings';
    case 'privacy': return '/privacy';
    case 'terms': return '/terms';
    case 'trust': return '/trust-safety';
    case 'trending': return '/trending';
    
    
    case 'admin-overview': return '/admin';
    case 'admin-users': return '/admin/users';
    case 'admin-analytics': return '/admin/analytics';
    case 'admin-content': return '/admin/content';
    case 'admin-casting': return '/admin/casting';
    case 'admin-messages': return '/admin/messages';
    case 'admin-pro': return '/admin/pro';
    case 'admin-moderation': return '/admin/moderation';
    case 'admin-settings': return '/admin/settings';
    case 'admin-data-requests': return '/admin/data-requests';
    case 'saved-castings': return '/saved-castings';
    
    default: return '/';
  }
}

function useLegacyNavigate() {
  const navigate = useNavigate();
  const handleLegacyNavigate = (page: string, param: any = null) => {
    navigate(getRoutePath(page, param));
  };
  return { handleLegacyNavigate };
}



const HomeRoute = () => {
  const { user } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Home | NC Network</title>
        <meta name="description" content="Nepal's premier casting and professional talent network." />
      </Helmet>
      <Home onNavigate={handleLegacyNavigate} user={user} />
    </PageTransition>
  );
};

const TalentListingRoute = () => {
  const { handleLegacyNavigate } = useLegacyNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  return (
    <PageTransition>
      <Helmet>
        <title>Browse Talents | NC Network</title>
        <meta name="description" content="Discover Nepal's top cinema talents, actors, directors, and models." />
      </Helmet>
      <TalentListing onNavigate={handleLegacyNavigate} initialCategory={category} />
    </PageTransition>
  );
};

const TrendingRoute = () => {
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Trending Now | NC Network</title>
        <meta name="description" content="Check out Nepal's trending professional talent, actors, directors, and models." />
      </Helmet>
      <Trending onNavigate={handleLegacyNavigate} />
    </PageTransition>
  );
};

const ProfileRoute = () => {
  const { id } = useParams();
  const { user, isAdmin, showAlert } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Talent Profile | NC Network</title>
      </Helmet>
      <ErrorBoundary fallback={<div className="p-12 text-center text-red-500 font-bold border border-red-500/20 bg-red-500/5 rounded-3xl max-w-md mx-auto mt-12">Profile failed to load</div>}>
        <Profile onNavigate={handleLegacyNavigate} user={user} profileId={id || null} isAdmin={isAdmin} showAlert={showAlert} />
      </ErrorBoundary>
    </PageTransition>
  );
};

const SettingsRoute = () => {
  const { user, showToast, isAdmin } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab'); 
  return (
    <PageTransition>
      <Helmet>
        <title>Settings | NC Network</title>
      </Helmet>
      <Settings onNavigate={handleLegacyNavigate} user={user} initialTab={tab} showToast={showToast} isAdmin={isAdmin} />
    </PageTransition>
  );
};

const SavedCastingCallsRoute = () => {
  const { user, showToast } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Saved Casting Calls | NC Network</title>
      </Helmet>
      <SavedCastingCalls onNavigate={handleLegacyNavigate} user={user} showToast={showToast} />
    </PageTransition>
  );
};

const CastingCallRoute = () => {
  const { user, isAdmin } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Casting Calls & Auditions | NC Network</title>
        <meta name="description" content="Find the latest auditions and casting calls in Nepal." />
      </Helmet>
      <CastingCall onNavigate={handleLegacyNavigate} user={user} isAdmin={isAdmin} />
    </PageTransition>
  );
};

const CastingDetailRoute = () => {
  const { id } = useParams();
  const { user, showAlert } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Audition Details | NC Network</title>
      </Helmet>
      <CastingCallDetail
        onNavigate={handleLegacyNavigate}
        castingId={id || null}
        user={user}
        showAlert={showAlert}
      />
    </PageTransition>
  );
};

const SignInRoute = () => {
  const { showAlert } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Sign In | NC Network</title>
      </Helmet>
      <SignIn onNavigate={handleLegacyNavigate} showAlert={showAlert} />
    </PageTransition>
  );
};

const SignUpRoute = () => {
  const { showAlert } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Sign Up | NC Network</title>
      </Helmet>
      <SignUp onNavigate={handleLegacyNavigate} showAlert={showAlert} />
    </PageTransition>
  );
};

const ProfileCreateRoute = () => {
  const { user, showAlert } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Create Profile | NC Network</title>
      </Helmet>
      <ProfileCreate onNavigate={handleLegacyNavigate} user={user} showAlert={showAlert} />
    </PageTransition>
  );
};

const CastingCreateRoute = () => {
  const { user, showAlert } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Post a Casting Call | NC Network</title>
      </Helmet>
      <CastingCallCreate onNavigate={handleLegacyNavigate} user={user} showAlert={showAlert} />
    </PageTransition>
  );
};

const PremiumRoute = () => {
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Premium Membership | NC Network</title>
        <meta name="description" content="Upgrade to NC Network PRO to access exclusive casting calls and talent matching." />
      </Helmet>
      <Premium onNavigate={handleLegacyNavigate} />
    </PageTransition>
  );
};

const MessagesRoute = () => {
  const { user, showAlert } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  const [searchParams] = useSearchParams();
  const userParam = searchParams.get('user');
  const { id } = useParams();
  const activeUserId = id || userParam || null;
  return (
    <PageTransition>
      <Helmet>
        <title>Inbox & Messages | NC Network</title>
      </Helmet>
      <ErrorBoundary fallback={<div className="p-12 text-center text-red-500 font-bold border border-red-500/20 bg-red-500/5 rounded-3xl max-w-md mx-auto mt-12">Messages failed to load</div>}>
        <Messages onNavigate={handleLegacyNavigate} user={user} initialUserId={activeUserId} showAlert={showAlert} />
      </ErrorBoundary>
    </PageTransition>
  );
};

const NotificationsRoute = () => {
  const { user } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Notifications | NC Network</title>
      </Helmet>
      <Notifications onNavigate={handleLegacyNavigate} user={user} />
    </PageTransition>
  );
};



const PrivacyRoute = () => (
  <PageTransition>
    <Helmet>
      <title>Privacy Policy | NC Network</title>
    </Helmet>
    <PrivacyPolicy />
  </PageTransition>
);

const TermsRoute = () => (
  <PageTransition>
    <Helmet>
      <title>Terms of Service | NC Network</title>
    </Helmet>
    <TermsOfService />
  </PageTransition>
);

const TrustRoute = () => (
  <PageTransition>
    <Helmet>
      <title>Trust & Safety | NC Network</title>
    </Helmet>
    <TrustSafety />
  </PageTransition>
);

function getSessionInfo() {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  if (ua.includes("Windows NT 10.0")) os = "Windows 11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.2")) os = "Windows 8";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  
  return { os, browser };
}

async function fetchLocation() {
  try {
    const res = await fetch("https://freeipapi.com/api/json");
    if (res.ok) {
      const data = await res.json();
      if (data.cityName && data.countryName) {
        return `${data.cityName}, ${data.countryName}`;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch location from IP:", err);
  }
  return "Unknown Location";
}

async function registerSession(uid: string) {
  let sessionId = localStorage.getItem('nc_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('nc_session_id', sessionId);
  }
  const { os, browser } = getSessionInfo();
  const locationStr = await fetchLocation();
  
  const sessionRef = doc(db, 'profiles', uid, 'sessions', sessionId);
  await setDoc(sessionRef, {
    id: sessionId,
    os,
    browser,
    location: locationStr,
    lastActive: serverTimestamp(),
    userAgent: navigator.userAgent
  }, { merge: true });
}



export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, any> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);


  
  const [alerts, setAlerts] = useState<AlertPayload[]>([]);


  const showAlert = useCallback((
    message: string,
    type: AlertType = 'info',
    detail?: string,
    onAction?: () => void,
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setAlerts(prev => {
      if (prev.some(a => a.message === message && a.type === type)) return prev;
      const queue = prev.length >= 4 ? prev.slice(1) : prev;
      return [...queue, { id, message, type, detail, onAction }];
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: 'success' | 'logout' | 'info' | 'error' = 'info',
  ) => showAlert(message, type), [showAlert]);

  useEffect(() => {
    const handleCustomAlert = (e: Event) => {
      const { message, type, detail, onAction } = (e as CustomEvent).detail || {};
      if (message) {
        showAlert(message, type || 'info', detail, onAction);
      }
    };
    window.addEventListener('nc-alert', handleCustomAlert);
    return () => window.removeEventListener('nc-alert', handleCustomAlert);
  }, [showAlert]);

  
  const handleLegacyNavigate = useCallback((page: string, param: any = null) => {
    navigate(getRoutePath(page, param));
  }, [navigate]);

  
  const lastVersionCheckRef = useRef<number>(0);
  useEffect(() => {
    let localVersion = 'dev';
    try {
      localVersion = __BUILD_VERSION__;
    } catch {
      logger.warn("Build version not defined in environment");
    }

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?cb=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && data.version !== localVersion) {
            logger.log(`[Version Check] New build version detected: ${data.version} (Local: ${localVersion})`);
            
            
            sessionStorage.clear();
            
            showAlert(
              "System Update Available",
              "info",
              "A new version of NC Network is available. Click here to reload and fetch the latest features.",
              () => {
                const url = new URL(window.location.href);
                url.searchParams.set('reload', Date.now().toString());
                window.location.href = url.toString();
              }
            );
          }
        }
      } catch (err) {
        console.debug("Failed to fetch version.json:", err);
      }
    };

    
    checkVersion();

    
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [showAlert]);

  
  useEffect(() => {
    const now = Date.now();
    if (now - lastVersionCheckRef.current < 60000) return;
    lastVersionCheckRef.current = now;

    let localVersion = 'dev';
    try {
      localVersion = __BUILD_VERSION__;
    } catch {
      
    }

    const checkVersionOnNav = async () => {
      try {
        const res = await fetch(`/version.json?cb=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && data.version !== localVersion) {
            sessionStorage.clear();
            showAlert(
              "System Update Available",
              "info",
              "A new version of NC Network is available. Click here to reload and fetch the latest features.",
              () => {
                const url = new URL(window.location.href);
                url.searchParams.set('reload', Date.now().toString());
                window.location.href = url.toString();
              }
            );
          }
        }
      } catch {
        
      }
    };

    checkVersionOnNav();
  }, [location.pathname, showAlert]);

  
  useNotifications(user, showAlert, handleLegacyNavigate);

  
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
        .then((permission) => {
          logger.log('Notification permission requested on mount:', permission);
        })
        .catch((err) => {
          console.error('Error requesting notification permission on mount:', err);
        });
    }
  }, []);

  useEffect(() => {
    
    const timer = setTimeout(() => {
      initOneSignal();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        
        try {
          if (oneSignalInitialized) {
            await OneSignal.login(firebaseUser.uid);
          } else {
            const OneSignalDeferred = (window as any).OneSignalDeferred || [];
            OneSignalDeferred.push(async function(os: any) {
              await os.login(firebaseUser.uid);
            });
          }
        } catch (e) {
          console.warn("OneSignal login failed:", e);
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            
            
            setIsAdmin(userDoc.data().isAdmin === true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Failed to check admin status:", err);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);

        
        try {
          if (oneSignalInitialized) {
            await OneSignal.logout();
          } else {
            const OneSignalDeferred = (window as any).OneSignalDeferred || [];
            OneSignalDeferred.push(async function(os: any) {
              await os.logout();
            });
          }
        } catch (e) {
          console.warn("OneSignal logout failed:", e);
        }
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  
  useEffect(() => {
    if (!user?.uid) return;
    
    const sessionId = localStorage.getItem('nc_session_id');
    let isInitial = true;
    let unsub = () => {};
    
    const setupListener = async () => {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('nc_session_id', currentSessionId);
      }
      
      const sessionRef = doc(db, 'profiles', user.uid, 'sessions', currentSessionId);
      
      unsub = onSnapshot(sessionRef, async (snap) => {
        if (isInitial) {
          isInitial = false;
          if (!snap.exists()) {
            try {
              await registerSession(user.uid);
            } catch (err) {
              console.error("Failed to register session:", err);
            }
          }
          return;
        }
        
        if (!snap.exists()) {
          showAlert(
            "Session Revoked",
            "logout",
            "Your active session was revoked from another device. Please sign in again."
          );
          localStorage.removeItem('nc_session_id');
          await auth.signOut();
          navigate('/signin');
        }
      }, (err) => {
        if (err.code !== 'permission-denied') {
          console.error("Session listener failed:", err);
        }
      });
    };

    setupListener();
    
    return () => unsub();
  }, [user?.uid, navigate, showAlert]);

  
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      try {
        
        await getIdTokenResult(currentUser, true);
      } catch (error: any) {
        if (
          error.code === 'auth/user-token-expired' ||
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/user-disabled'
        ) {
          showAlert(
            "Account Revoked",
            "logout",
            "Your account has been deleted or disabled by an administrator."
          );
          localStorage.clear();
          await auth.signOut();
          navigate('/signin');
        }
      }
    });

    return () => unsubscribe();
  }, [navigate, showAlert]);

  
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await getIdTokenResult(currentUser, true);
        } catch {
          showAlert(
            "Session Expired",
            "logout",
            "Your session is no longer valid."
          );
          localStorage.clear();
          await auth.signOut();
          navigate('/signin');
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [navigate, showAlert]);

  
  useEffect(() => {
    if (!user?.uid) return;

    const profileRef = doc(db, 'profiles', user.uid);

    const setOnlineStatus = async (isOnline: boolean) => {
      try {
        await setDoc(profileRef, {
          online: isOnline,
          lastActive: serverTimestamp(),
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.warn("[Presence] Failed to update online status:", err);
      }
    };

    
    setOnlineStatus(true);

    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setOnlineStatus(true);
      }
    }, 60000);

    
    const handleVisibilityChange = () => {
      setOnlineStatus(document.visibilityState === 'visible');
    };

    
    const handleBeforeUnload = () => {
      updateDoc(profileRef, {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      
      updateDoc(profileRef, {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(() => {});
    };
  }, [user?.uid]);

  
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
            showAlert('Welcome Back!', 'success', 'Your deactivated profile has been automatically reactivated and is now visible.');
          } catch (err) {
            console.warn("Auto-reactivation failed:", err);
          }
        }
      }
    }, (err) => {
      if (err.code !== 'permission-denied') {
        console.error("Profile snapshot listener failed:", err);
      }
    });
    return () => unsub();
  }, [user?.uid, showAlert]);

  
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

  const updateAvatar = async (newUrl: string | null) => {
    if (!auth.currentUser) return;
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
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await updateProfile(auth.currentUser, { photoURL: '' });
    await updateDoc(doc(db, 'profiles', uid), {
      image: null,
      photoURL: null,
      updatedAt: serverTimestamp()
    });
    setUser({ ...auth.currentUser } as any);
  };

  
  const [lastUser, setLastUser] = useState<User | null>(null);
  const isInitialAuth = useRef(true);

  useEffect(() => {
    if (!authReady) return;

    if (isInitialAuth.current) {
      setLastUser(user);
      isInitialAuth.current = false;
      return;
    }

    if (user && !lastUser) {
      showAlert(
        `Welcome back, ${user.displayName || user.email}`,
        'success',
        'You are signed in to NC Network',
      );
      if (localStorage.getItem('nc_suspicious_login') === 'true') {
        showAlert(
          "Suspicious Login Detected",
          "error",
          "We detected a successful login from a location that does not match your recent login history. Please check your active sessions."
        );
        localStorage.removeItem('nc_suspicious_login');
      }
    } else if (!user && lastUser) {
      showAlert('You have been signed out', 'logout');
    }
    setLastUser(user);
  }, [user, authReady, showAlert, lastUser]);

  const handleCancelDeletion = async () => {
    if (!user?.uid) return;
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
      showToast("Account successfully restored!", "success");
    } catch (err) {
      console.error("Failed to cancel deletion:", err);
      showToast("Failed to restore account. Please try again.", "error");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  
  useEffect(() => {
    const savedFontSize = localStorage.getItem('nc_font_size') || 'small';
    document.documentElement.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.documentElement.classList.add(`font-size-${savedFontSize}`);
  }, []);

  const showOnboarding = authReady && !!user && !!userProfile && userProfile.onboarded !== true;

  return (
    <PermissionProvider>
      <CallProvider user={user}>
        <UserContext.Provider value={{ user: enrichedUser, updateAvatar, deleteAvatar }}>
          {user && userProfile?.deletionScheduled === true && (
            <div className="fixed inset-0 z-[99999] bg-[#0A0A0A]/95 backdrop-blur-md flex items-center justify-center p-6 font-sans">
              <div className="max-w-md w-full bg-[#111] border border-white/5 shadow-[0_0_50px_rgba(239,68,68,0.15)] rounded-3xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Account Scheduled for Deletion</h2>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Your account is currently in a 30-day grace period and is scheduled for permanent deletion on{" "}
                    <strong className="text-white">
                      {userProfile.deletionGracePeriodEndsAt
                        ? new Date(userProfile.deletionGracePeriodEndsAt.seconds ? userProfile.deletionGracePeriodEndsAt.seconds * 1000 : userProfile.deletionGracePeriodEndsAt).toLocaleDateString()
                        : "30 days from request"}
                    </strong>.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleCancelDeletion}
                    className="w-full py-3 bg-[#00BFFF] hover:bg-[#009cdb] text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all"
                  >
                    Cancel Deletion & Restore Account
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
          <AnimatePresence>
            {!authReady && <SplashScreen />}
            {showOnboarding && (
              <Onboarding 
                user={enrichedUser} 
                profile={userProfile} 
                onNavigate={handleLegacyNavigate} 
              />
            )}
          </AnimatePresence>
          <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<RouteLoader />}>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                  {/* Public Route Group */}
                  <Route element={
                    <PublicLayout 
                      user={enrichedUser} 
                      isAdmin={isAdmin} 
                      onLogout={handleLogout} 
                      showAlert={showAlert} 
                      showToast={showToast} 
                    />
                  }>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/talents" element={<TalentListingRoute />} />
                    <Route path="/trending" element={<TrendingRoute />} />
                    <Route path="/profile/:id" element={<ProfileRoute />} />
                    <Route path="/talent/:id" element={<ProfileRoute />} />
                    <Route path="/casting" element={<CastingCallRoute />} />
                    <Route path="/casting/:id" element={<CastingDetailRoute />} />
                    <Route path="/premium" element={<PremiumRoute />} />
                    <Route path="/privacy" element={<PrivacyRoute />} />
                    <Route path="/terms" element={<TermsRoute />} />
                    <Route path="/trust-safety" element={<TrustRoute />} />
                    <Route path="/signin" element={<SignInRoute />} />
                    <Route path="/signup" element={<SignUpRoute />} />
                  </Route>

                  {/* Authenticated User Route Group */}
                  <Route element={<ProtectedRoute user={user} authReady={authReady} />}>
                    <Route element={
                      <UserLayout 
                        user={enrichedUser} 
                        isAdmin={isAdmin} 
                        onLogout={handleLogout} 
                        showAlert={showAlert} 
                        showToast={showToast} 
                      />
                    }>
                      <Route path="/profile/create" element={<ProfileCreateRoute />} />
                      <Route path="/casting/create" element={<CastingCreateRoute />} />
                      <Route path="/messages" element={<MessagesRoute />} />
                      <Route path="/messages/:id" element={<MessagesRoute />} />
                      <Route path="/notifications" element={<NotificationsRoute />} />
                      <Route path="/settings" element={<SettingsRoute />} />
                      <Route path="/saved-castings" element={<SavedCastingCallsRoute />} />
                    </Route>
                  </Route>

                  {/* Admin Route Group */}
                  <Route element={
                    <AdminRoute user={user} isAdmin={isAdmin} authReady={authReady} />
                  }>
                    <Route element={<AdminLayout showToast={showToast} />}>
                      <Route path="/admin" element={<AdminOverview />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/analytics" element={<AdminAnalytics />} />
                      <Route path="/admin/content" element={<AdminContent />} />
                      <Route path="/admin/casting" element={<AdminCasting />} />
                      <Route path="/admin/messages" element={<AdminMessages />} />
                      <Route path="/admin/pro" element={<AdminPro />} />
                      <Route path="/admin/moderation" element={<AdminModeration />} />
                      <Route path="/admin/settings" element={<AdminSettings />} />
                      <Route path="/admin/data-requests" element={<AdminDataRequests />} />
                    </Route>
                  </Route>

                  {/* Fallback 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
            </ErrorBoundary>

            {/* Alert notifications banner */}
            <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

            {/* Calling capabilities UI */}
            <CallingOverlay />
            <IncomingCallPopup />
          </div>
        </UserContext.Provider>
      </CallProvider>
    </PermissionProvider>
  );
}
