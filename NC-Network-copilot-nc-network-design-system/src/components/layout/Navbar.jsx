import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { ActionSearchBar } from "@/components/ui/action-search-bar";
import Logo from '../ui/Logo';
import { 
  NotificationIcon, 
  MenuCloseIcon, 
  SendIcon, 
  SuccessIcon 
} from "@/components/ui/animated-state-icons";
import Avatar from '../ui/Avatar';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, limit } from 'firebase/firestore';

import { formatMessagePreview } from '../../utils/format';

export default function Navbar({ onNavigate, currentPage, onBack, showBack, isAdmin, user, onLogout }) {
  const isLoggedIn = !!user;
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const resolveLegacyPath = (page, param = null) => {
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
      default: return '/';
    }
  };

  const isActionActive = (action) => {
    switch (action) {
      case 'home': return pathname === '/';
      case 'listing': return pathname === '/talents';
      case 'casting': return pathname === '/casting' || pathname.startsWith('/casting/');
      case 'profile': return pathname.startsWith('/profile') && !pathname.startsWith('/profile/create');
      case 'profile-create': return pathname === '/profile/create';
      case 'casting-create': return pathname === '/casting/create';
      case 'messages': return pathname.startsWith('/messages');
      case 'notifications': return pathname === '/notifications';
      case 'settings': return pathname.startsWith('/settings');
      case 'premium': return pathname === '/premium';
      default: return false;
    }
  };

  const isDiscoverActive = isActionActive('listing') || isActionActive('home') || isActionActive('settings') || pathname.startsWith('/admin');
  const isProjectsActive = isActionActive('casting') || isActionActive('casting-create');

  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(['Achyut', 'Kathmandu', 'Commercials']);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        console.error("Notifications snapshot listener failed:", err);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'now';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h';
    return Math.floor(hours / 24) + 'd';
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  const navItems = [
    { label: 'Home', page: 'home', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { label: 'Talent', page: 'listing', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
    { label: 'Casting', page: 'casting', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg> },
    { label: 'Profile', page: 'profile', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  ];

  const menuSections = [
    {
      id: 'talent',
      label: 'Talents',
      action: 'listing',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
      items: [
        { label: 'Actors/Actress' },
        { label: 'Directors' },
        { label: 'Editor/VFX' },
        { label: 'Dancers' },
        { label: 'Models' },
        { label: 'Musicians' },
        { label: 'Writers' },
        { label: 'Comedians' },
      ]
    },
    {
      id: 'casting',
      label: 'Casting Calls',
      action: 'casting',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
      items: [
        { label: 'Feature Films' },
        { label: 'Short Films' },
        { label: 'TV & Web Series' },
        { label: 'Commercials' },
        { label: 'Music Videos' },
        { label: 'Theater & Stage' },
      ]
    },
    {
      id: 'movies',
      label: 'Upcoming Movies',
      action: 'home',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />,
      items: [
        { label: 'Action & Thriller' },
        { label: 'Drama & Romance' },
        { label: 'Comedy' },
        { label: 'Sci-Fi & Fantasy' },
        { label: 'Horror' },
        { label: 'Documentary' },
      ]
    },

  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-nc-dark/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo & Back */}
            <div className="flex items-center gap-4 sm:gap-8">
              {showBack && (
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <Logo onNavigate={onNavigate} size="md" />
            </div>
            
            <div className="hidden md:flex items-center justify-center flex-1 mx-8 gap-8">
              <div className="relative group">
                <button className={`flex items-center gap-1.5 py-2 text-sm font-medium transition-colors ${isDiscoverActive ? 'text-white' : 'text-[#888] hover:text-white'}`}>
                  Discover
                  <svg className="w-3 h-3 opacity-50 group-hover:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 rounded-3xl bg-[#0A0A0A]/95 backdrop-blur-md border border-white/5 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 py-2">
                  <Link to="/talents" className="w-full text-left block px-4 py-2.5 text-sm text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-colors">Talent Directory</Link>
                  <Link to="/" className="w-full text-left block px-4 py-2.5 text-sm text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-colors">Upcoming Movies</Link>
                  <Link to="/settings" className="w-full text-left block px-4 py-2.5 text-sm text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-colors">Settings</Link>
                  {isAdmin && (
                    <>
                      <div className="mx-2 my-1 border-t border-white/5"></div>
                      <Link to="/admin" className="w-full text-left block px-4 py-2.5 text-[10px] uppercase tracking-widest font-black text-admin-primary hover:text-white hover:bg-admin-primary/20 transition-all flex items-center justify-between group/admin">
                        <span>Admin</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-admin-primary shadow-[0_0_8px_#38bdf8] group-hover/admin:scale-125 transition-transform"></span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="relative group">
                <button className={`flex items-center gap-1.5 py-2 text-sm font-medium transition-colors ${isProjectsActive ? 'text-white' : 'text-[#888] hover:text-white'}`}>
                  Projects
                  <svg className="w-3 h-3 opacity-50 group-hover:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-52 rounded-3xl bg-[#0A0A0A]/95 backdrop-blur-md border border-white/5 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 py-2">
                  <Link to="/casting" className="w-full text-left block px-4 py-2.5 text-sm text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-colors">Casting Calls Board</Link>
                  <Link to="/casting/create" className="w-full text-left block px-4 py-2.5 text-sm text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-colors">Post a Project</Link>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {/* Removed redundant Sign In button as per user request */}
              <button
                onClick={() => setShowSearchOverlay(true)}
                className="text-nc-secondary hover:text-white p-1.5 transition-colors"
                aria-label="Search"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              {/* Notifications Link */}
              <Link
                to="/notifications"
                className={`text-nc-secondary hover:text-white p-1.5 relative transition-colors ${isActionActive('notifications') ? 'text-white' : ''}`}
                aria-label="Notifications"
              >
                <NotificationIcon size={24} color="currentColor" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-nc-dark animate-pulse shadow-[0_0_8px_#ef4444]" />
                )}
              </Link>
              <Link
                to="/messages"
                className={`text-nc-secondary hover:text-white p-1.5 relative transition-colors ${isActionActive('messages') ? 'text-white' : ''}`}
                aria-label="Messages"
              >
                <SendIcon size={24} color="currentColor" active={isActionActive('messages')} />
              </Link>
 
              {!isAdmin && !user?.premium && (
                <Link
                  to="/premium"
                  className={`hidden lg:block px-3 py-1.5 rounded-lg text-sm font-bold transition-all ml-1 ${
                    isActionActive('premium')
                      ? 'text-nc-darker bg-nc-pro hover:bg-yellow-400'
                      : 'text-nc-pro hover:bg-nc-pro/10 border border-nc-pro/20'
                  }`}
                >
                  Go PRO
                </Link>
              )}
 
              {isLoggedIn ? (
                <div className="relative group">
                  <Link 
                    to={user ? `/profile/${user.uid}` : '/signin'}
                    className="w-10 h-10 rounded-full overflow-hidden hover:border-nc-accent transition-all flex items-center justify-center p-0 block"
                  >
                    <Avatar 
                      user={user} 
                      size="sm" 
                      name={user.displayName}
                      className="w-full h-full"
                    />
                  </Link>
 
                  <div className="absolute top-full right-0 mt-2 w-48 rounded-3xl bg-[#0A0A0A] border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 py-2">
                    <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <p className="text-white text-xs font-bold truncate">{user.displayName || 'Discovery Talent'}</p>
                      <p className="text-nc-muted text-[10px] truncate">{user.email}</p>
                    </div>
                    <Link to={user ? `/profile/${user.uid}` : '/signin'} className="w-full text-left block px-4 py-2 text-sm text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-colors">My Profile</Link>
                    <Link to="/settings?tab=about" className="w-full text-left block px-4 py-2 text-sm text-[#A1A1A1] hover:text-white hover:bg-white/5 transition-colors">Edit Profile</Link>
                    <div className="mx-2 my-1 border-t border-white/5"></div>
                    <button onClick={onLogout} className="w-full text-left block px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors">Logout</button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/signup"
                  className="hidden md:block bg-nc-accent text-nc-darker text-sm px-4 py-1.5 rounded-lg font-bold hover:bg-sky-400 transition-all ml-1 shadow-lg shadow-nc-accent/20"
                >
                  Join Now
                </Link>
              )}
              <button
                className="md:hidden text-nc-secondary hover:text-white p-1.5 -mr-1 flex items-center justify-center h-10 w-10"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MenuCloseIcon active={menuOpen} size={28} color="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </nav>
        
      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex">
          {/* Backdrop Dimmer */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setMenuOpen(false)}></div>
          
          {/* Sidebar Drawer */}
          <div className="relative w-[280px] h-full bg-[#0d0d0d] border-r border-[#2A2A2A] flex flex-col overflow-y-auto shadow-2xl z-10 animate-slide-in-right">
            
            <div className="p-6 border-b border-white/5" onClick={() => setMenuOpen(false)}>
              <Logo size="sm" />
            </div>

            {/* Nav Items Group 1 */}
            <div className="flex flex-col py-6">
              {[
                { name: "Home", path: "/", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
                { name: "Talent", path: "/talents", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
                { name: "Casting", path: "/casting", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                { name: "Create", path: "/casting/create", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                { name: "Messages", path: "/messages", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                { name: "Profile", path: user ? `/profile/${user.uid}` : '/signin', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/> },
              ].map((item, i) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                return (
                  <Link
                    key={i}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center w-full relative px-8 py-3.5 transition-colors ${
                      isActive ? "text-[#FACC15] bg-gradient-to-r from-transparent to-[#FACC15]/5" : "text-[#777] hover:text-[#CCC]"
                    }`}
                  >
                    <svg className="w-[22px] h-[22px] mr-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                    <span className="font-bold text-[15px]">{item.name}</span>
                    
                    {/* Active Right Border Indicator */}
                    {isActive && (
                      <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-nc-accent shadow-[-2px_0_10px_rgba(250,204,21,0.4)]"></div>
                    )}
                  </Link>
                );
              })}
            </div>

            {!isAdmin && !user?.premium && <div className="flex-1"></div>}

            <div className="px-6 pb-6">
              {/* Premium Box Container */}
              {!isAdmin && !user?.premium && (
                <div className="bg-[#1C1C1C] rounded-[2rem] p-5 mb-5 border border-[#2A2A2A] relative overflow-hidden">
                  <h4 className="text-white font-bold text-[15px] mb-1 relative z-10">Go PRO</h4>
                  <p className="text-[#888] text-[12px] leading-relaxed mb-4 max-w-[200px] relative z-10">
                    Unlock exclusive casting calls and AI talent matching.
                  </p>
                  <Link 
                    to="/premium" 
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-center block bg-nc-pro text-black rounded-xl py-2.5 font-bold text-[13px] hover:bg-nc-pro/90 transition-colors relative z-10 shadow-lg shadow-nc-pro/20 animate-none"
                    style={{ backgroundColor: '#FACC15' }}
                  >
                    Go PRO
                  </Link>
                  
                  {/* Subtle top-right glow matching screenshot */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-nc-accent blur-3xl opacity-10 rounded-full"></div>
                </div>
              )}

              {/* Bottom Actions Container */}
              <div className="flex flex-col gap-1 px-2 mb-4">
                <Link 
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center text-[#777] hover:text-[#CCC] transition-colors py-3"
                >
                  <svg className="w-[18px] h-[18px] mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-semibold text-[14px]">Settings</span>
                </Link>
                <Link 
                  to="/trust-safety"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center text-[#777] hover:text-[#CCC] transition-colors py-3"
                >
                  <svg className="w-[18px] h-[18px] mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-[14px]">Support</span>
                </Link>
                
                <hr className="border-white/5 my-2" />
                
                {isLoggedIn ? (
                  <button 
                    onClick={() => { 
                      onLogout();
                      setMenuOpen(false); 
                    }}
                    className="flex items-center text-[#777] hover:text-white transition-colors py-3 w-full text-left"
                  >
                    <svg className="w-[18px] h-[18px] mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-semibold text-[14px]">Logout</span>
                  </button>
                ) : (
                  <Link 
                    to="/signin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center text-[#777] hover:text-white transition-colors py-3"
                  >
                    <svg className="w-[18px] h-[18px] mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-semibold text-[14px]">Sign In</span>
                  </Link>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* Search Overlay */}
      <AnimatePresence>
        {showSearchOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-start pt-12 px-4 shadow-[0_0_50px_rgba(56,189,248,0.1)]"
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowSearchOverlay(false)}
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 z-[110]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="w-full max-w-xl space-y-6 animate-slide-up">
              <div className="text-center space-y-1 mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Search</h2>
                <p className="text-[#888] text-sm font-medium">Find talent by name, role, or location.</p>
              </div>

              <div className="relative z-50">
                <ActionSearchBar 
                  onActionSelect={(profileId) => {
                    setShowSearchOverlay(false);
                    navigate(`/profile/${profileId}`);
                  }} 
                  onPageNavigate={(page) => {
                    setShowSearchOverlay(false);
                    navigate(resolveLegacyPath(page));
                  }}
                />
              </div>

              {/* Quick Filters / Tips */}
              <div className="flex flex-wrap justify-center gap-2 mt-8 opacity-60">
                {['Actors', 'Directors', 'Casting Calls', 'Movies'].map(tag => (
                  <button key={tag} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-[#888] hover:text-white hover:bg-white/10 transition-all">
                    Search for {tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
