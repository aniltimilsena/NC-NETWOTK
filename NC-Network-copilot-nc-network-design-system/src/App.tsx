import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useParams, useSearchParams, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

// Providers and Overlays
import { CallProvider } from './context/CallContext';
import { PermissionProvider } from './context/PermissionContext';
import CallingOverlay from './components/calling/CallingOverlay';
import IncomingCallPopup from './components/calling/IncomingCallPopup';
import { AlertBanner, type AlertPayload, type AlertType } from './components/ui/AlertBanner';
import PullToRefresh from './components/ui/PullToRefresh';
import RouteLoader from './components/RouteLoader';
import PageTransition from './components/PageTransition';

// Layouts and Protection
import PublicLayout from './layouts/PublicLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

// Firebase
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNotifications } from './hooks/useNotifications';

// Lazy Loaded Pages
const Home = lazy(() => import('./pages/Home'));
const TalentListing = lazy(() => import('./pages/TalentListing'));
const Profile = lazy(() => import('./pages/Profile'));
const CastingCall = lazy(() => import('./pages/CastingCall'));
const CastingCallDetail = lazy(() => import('./pages/CastingCallDetail'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const ProfileCreate = lazy(() => import('./pages/ProfileCreate'));
const CastingCallCreate = lazy(() => import('./pages/CastingCallCreate'));
const Premium = lazy(() => import('./pages/Premium'));
const Messages = lazy(() => import('./pages/Messages'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const TrustSafety = lazy(() => import('./pages/TrustSafety'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin pages
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminCasting = lazy(() => import('./pages/admin/AdminCasting'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminPro = lazy(() => import('./pages/admin/AdminPro'));
const AdminModeration = lazy(() => import('./pages/admin/AdminModeration'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Navigation translate helper
export function getRoutePath(page: string, param: any = null): string {
  switch (page) {
    case 'home': return '/';
    case 'listing': return '/talents';
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
    
    // Admin routes
    case 'admin-overview': return '/admin';
    case 'admin-users': return '/admin/users';
    case 'admin-analytics': return '/admin/analytics';
    case 'admin-content': return '/admin/content';
    case 'admin-casting': return '/admin/casting';
    case 'admin-messages': return '/admin/messages';
    case 'admin-pro': return '/admin/pro';
    case 'admin-moderation': return '/admin/moderation';
    case 'admin-settings': return '/admin/settings';
    
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

// ─── ROUTE WRAPPER ADAPTERS ──────────────────────────────────────────────────

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

const ProfileRoute = () => {
  const { id } = useParams();
  const { user } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Talent Profile | NC Network</title>
      </Helmet>
      <Profile onNavigate={handleLegacyNavigate} user={user} profileId={id || null} />
    </PageTransition>
  );
};

const CastingCallRoute = () => {
  const { handleLegacyNavigate } = useLegacyNavigate();
  return (
    <PageTransition>
      <Helmet>
        <title>Casting Calls & Auditions | NC Network</title>
        <meta name="description" content="Find the latest auditions and casting calls in Nepal." />
      </Helmet>
      <CastingCall onNavigate={handleLegacyNavigate} />
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
      <Messages onNavigate={handleLegacyNavigate} user={user} initialUserId={activeUserId} showAlert={showAlert} />
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

const SettingsRoute = () => {
  const { user, showToast } = useOutletContext<any>();
  const { handleLegacyNavigate } = useLegacyNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'about';
  return (
    <PageTransition>
      <Helmet>
        <title>Settings | NC Network</title>
      </Helmet>
      <Settings onNavigate={handleLegacyNavigate} user={user} initialTab={tab} showToast={showToast} />
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

// ─── MAIN APP COMPONENT ──────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Record<string, any> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Alert queue
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

  // Handle direct navigation conversions from hooks
  const handleLegacyNavigate = useCallback((page: string, param: any = null) => {
    navigate(getRoutePath(page, param));
  }, [navigate]);

  // Initialize Notifications
  useNotifications(user, showAlert, handleLegacyNavigate);

  // Request notification permission immediately when site opens
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
        .then((permission) => {
          console.log('Notification permission requested on mount:', permission);
        })
        .catch((err) => {
          console.error('Error requesting notification permission on mount:', err);
        });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setIsAdmin(userDoc.data().isAdmin === true);
          }
        } catch (err) {
          console.error("Failed to check admin status:", err);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Active session revocation listener
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
      });
    };

    setupListener();
    
    return () => unsub();
  }, [user?.uid, navigate, showAlert]);

  // Subscribe to profile data
  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'profiles', user.uid), (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // Enriched user object for layouts/screens
  const enrichedUser = user ? {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    gender: userProfile?.gender || '',
    profileImage: userProfile?.image || user.photoURL || '',
  } : null;

  // Auth-driven status notifications
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
    } else if (!user && lastUser) {
      showAlert('You have been signed out', 'logout');
    }
    setLastUser(user);
  }, [user, authReady, showAlert, lastUser]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <PermissionProvider>
      <CallProvider user={user}>
        <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
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
                  <Route path="/profile/:id" element={<ProfileRoute />} />
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
                  </Route>
                </Route>

                {/* Admin Route Group */}
                <Route element={
                  <AdminRoute user={user} isAdmin={isAdmin} authReady={authReady} />
                }>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminOverview />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    <Route path="/admin/content" element={<AdminContent />} />
                    <Route path="/admin/casting" element={<AdminCasting />} />
                    <Route path="/admin/messages" element={<AdminMessages />} />
                    <Route path="/admin/pro" element={<AdminPro />} />
                    <Route path="/admin/moderation" element={<AdminModeration />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                  </Route>
                </Route>

                {/* Fallback 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </Suspense>

          {/* Alert notifications banner */}
          <AlertBanner alerts={alerts} onDismiss={dismissAlert} />

          {/* Calling capabilities UI */}
          <CallingOverlay />
          <IncomingCallPopup />
        </div>
      </CallProvider>
    </PermissionProvider>
  );
}
