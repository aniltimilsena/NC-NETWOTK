import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from "framer-motion";
import { ActionSearchBar } from "@/components/ui/ActionSearchBar";
import Logo from '../ui/Logo';
import Avatar from '../ui/Avatar';
import { NotificationIcon, MenuCloseIcon, SendIcon } from "@/components/ui/AnimatedStateIcons";
import {
  Home,
  Compass,
  Briefcase,
  MessageSquare,
  Bookmark,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  LogIn,
  LayoutGrid,
  Users,
  Flame,
  Settings,
  Clapperboard,
  PlusCircle,
  Info,
  HelpCircle,
  Mail,
  Shield,
  FileText,
  Scale,
  ChevronLeft
} from "lucide-react";
import { prefetchRoute } from '../../utils/prefetchRoute';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { cacheManager } from '@/utils/cacheManager';

export default function Navbar({ onNavigate, onBack = () => { }, showBack = false, isAdmin = false, user = null, onLogout = () => { } }) {
  const isLoggedIn = !!user;
  const { pathname } = useLocation();
  const isHome = pathname === '/' || pathname === '';
  const [scrolled, setScrolled] = useState(false);
  const effectiveIsAdmin = Boolean(isAdmin || user?.isAdmin === true || user?.role?.toLowerCase() === 'admin');

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const resolveLegacyPath = (page, param = null) => {
    switch (page) {
      case 'home': return '/';
      case 'listing': return '/talents';
      case 'profile': return param ? `/profile/${param}` : '/talents';
      case 'casting': return '/casting';
      case 'casting-detail': return `/casting/${param}`;
      case 'casting-apply': return `/casting/${param}/apply`;
      case 'signin': return '/signin';
      case 'signup': return '/signup';
      case 'profile-create': return '/profile/create';
      case 'casting-create': return '/casting/create';
      case 'messages': return param ? `/messages/${param}` : '/messages';
      case 'notifications': return '/notifications';
      case 'settings': return param ? `/settings?tab=${param}` : '/settings';
      case 'privacy': return '/privacy';
      case 'terms': return '/terms';
      case 'trust': return '/trust-safety';
      case 'trending': return '/trending';
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
      case 'trending': return pathname === '/trending';
      default: return false;
    }
  };

  const isDiscoverActive = pathname === '/discover' || isActionActive('listing') || isActionActive('trending') || pathname.startsWith('/categories');
  const isProjectsActive = isActionActive('casting') || isActionActive('casting-create');
  const isSupportActive = ['/about', '/help', '/contact', '/trust-safety', '/privacy', '/terms'].some(p => pathname === p || pathname.startsWith(`${p}/`));
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (showSearchOverlay || menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSearchOverlay, menuOpen]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    return cacheManager.subscribePooled(`user_notifications_${user.uid}`, (pooledCb) => {
      const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), limit(25));
      return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        pooledCb(notifs, null);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          console.error("Notifications snapshot listener failed:", err);
        }
        pooledCb([], err);
      });
    }, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.read && !n.isRead).length);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadMessagesCount(0);
      return;
    }
    return cacheManager.subscribePooled(`user_conversations_${user.uid}`, (pooledCb) => {
      const q = query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid));
      return onSnapshot(q, (snapshot) => {
        let count = 0;
        snapshot.docs.forEach(d => {
          const data = d.data();
          const uid = user.uid;
          const lastSender = data.lastSenderId;
          if (lastSender && lastSender !== uid) {
            let isUnread = false;
            if (data.readBy && typeof data.readBy === 'object' && !Array.isArray(data.readBy)) {
              isUnread = data.readBy[uid] === false;
            } else if (data.unreadCounts && typeof data.unreadCounts === 'object') {
              isUnread = (data.unreadCounts[uid] || 0) > 0;
            } else if (typeof data.unread === 'boolean') {
              isUnread = data.unread === true;
            } else if (typeof data.unread === 'number') {
              isUnread = data.unread > 0;
            }
            if (isUnread) {
              count++;
            }
          }
        });
        pooledCb(count, null);
      }, (err) => {
        if (err.code !== 'permission-denied') {
          console.error("Conversations snapshot listener failed in Navbar:", err);
        }
        pooledCb(0, err);
      });
    }, (count) => {
      setUnreadMessagesCount(count);
    });
  }, [user?.uid]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#FAF8F4]/95 backdrop-blur-md border-b border-[#E7E5E0] shadow-[0_2px_8px_rgba(32,41,35,0.04)]'
            : 'bg-[#FAF8F4]/90 backdrop-blur-sm border-b border-[#E7E5E0]/70'
        }`}
      >
        <nav className="relative z-30 bg-transparent">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 sm:h-20">
              <div className="flex items-center gap-4 sm:gap-6">
                {showBack && (
                  <button
                    onClick={onBack}
                    className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9] transition-colors cursor-pointer shrink-0"
                    title="Go Back"
                    aria-label="Go Back"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
                  </button>
                )}
                <Logo onNavigate={onNavigate} size="md" showText={false} />

                {/* Desktop Primary Nav Items */}
                <div className="hidden md:flex items-center gap-7 ml-5">
                  <div className="relative group">
                    <button
                      className={`flex items-center gap-1.5 py-2 text-[15px] font-medium tracking-tight transition-colors cursor-pointer ${
                        isDiscoverActive
                          ? 'text-[#194332] font-semibold'
                          : 'text-[#414840] hover:text-[#194332]'
                      }`}
                    >
                      <span>{t('nav_discover')}</span>
                      <svg
                        className="w-3.5 h-3.5 text-[#777C75] group-hover:text-[#194332] group-hover:rotate-180 transition-transform duration-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-xl bg-white border border-[#E7E5E0] shadow-[0_12px_32px_rgba(32,41,35,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-[100] p-2 space-y-1">
                      <Link
                        to="/discover"
                        onMouseEnter={() => prefetchRoute('listing')}
                        onTouchStart={() => prefetchRoute('listing')}
                        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9] transition-all"
                      >
                        <LayoutGrid className="w-4 h-4 text-[#194332] shrink-0" />
                        <span>Category Grid</span>
                      </Link>
                      <Link
                        to="/talents"
                        onMouseEnter={() => prefetchRoute('listing')}
                        onTouchStart={() => prefetchRoute('listing')}
                        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9] transition-all"
                      >
                        <Users className="w-4 h-4 text-[#194332] shrink-0" />
                        <span>{t('nav_talent_directory')}</span>
                      </Link>
                      <Link
                        to="/trending"
                        onMouseEnter={() => prefetchRoute('trending')}
                        onTouchStart={() => prefetchRoute('trending')}
                        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9] transition-all"
                      >
                        <Flame className="w-4 h-4 text-[#D4A373] shrink-0" />
                        <span>{t('nav_trending_now')}</span>
                      </Link>
                      <Link
                        to="/settings"
                        onMouseEnter={() => prefetchRoute('settings')}
                        onTouchStart={() => prefetchRoute('settings')}
                        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9] transition-all"
                      >
                        <Settings className="w-4 h-4 text-[#626860] shrink-0" />
                        <span>{t('nav_settings')}</span>
                      </Link>
                      {effectiveIsAdmin && (
                        <>
                          <div className="mx-2 my-1 border-t border-[#E7E5E0]" />
                          <Link
                            to="/admin"
                            className="w-full text-left flex items-center justify-between px-3.5 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold text-[#194332] hover:bg-[#194332]/10 transition-all"
                          >
                            <span className="flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-[#194332] shrink-0" />
                              <span>{t('nav_admin')}</span>
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#194332]" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative group">
                    <button
                      className={`flex items-center gap-1.5 py-2 text-[15px] font-medium tracking-tight transition-colors cursor-pointer ${
                        isProjectsActive
                          ? 'text-[#194332] font-semibold'
                          : 'text-[#414840] hover:text-[#194332]'
                      }`}
                    >
                      <span>{t('nav_projects')}</span>
                      <svg
                        className="w-3.5 h-3.5 text-[#777C75] group-hover:text-[#194332] group-hover:rotate-180 transition-transform duration-200"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-60 rounded-xl bg-white border border-[#E7E5E0] shadow-[0_12px_32px_rgba(32,41,35,0.08)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-[100] p-2 space-y-1">
                      <Link
                        to="/casting"
                        onMouseEnter={() => prefetchRoute('casting')}
                        onTouchStart={() => prefetchRoute('casting')}
                        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9] transition-all"
                      >
                        <Clapperboard className="w-4 h-4 text-[#194332] shrink-0" />
                        <span>{t('nav_casting_calls')}</span>
                      </Link>
                      <Link
                        to="/casting/create"
                        onMouseEnter={() => prefetchRoute('casting-create')}
                        onTouchStart={() => prefetchRoute('casting-create')}
                        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9] transition-all"
                      >
                        <PlusCircle className="w-4 h-4 text-[#194332] shrink-0" />
                        <span>{t('nav_post_project')}</span>
                      </Link>
                    </div>
                  </div>

                  {effectiveIsAdmin && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-colors ${
                        pathname.startsWith('/admin')
                          ? 'bg-[#194332] text-white'
                          : 'bg-[#194332]/10 text-[#194332] hover:bg-[#194332]/20 border border-[#194332]/20'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#194332]" />
                      <span>Admin</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Right side Actions */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowSearchOverlay(true)}
                  className="lg:hidden text-[#414840] hover:text-[#194332] p-2 rounded-lg hover:bg-[#F3F0E9] transition-colors"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {isLoggedIn ? (
                  <>
                    {effectiveIsAdmin && (
                      <Link
                        to="/admin"
                        className={`p-2 rounded-lg transition-colors ${
                          pathname.startsWith('/admin')
                            ? 'text-[#194332] bg-[#194332]/10'
                            : 'text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]'
                        }`}
                        title="Admin Dashboard"
                        aria-label="Admin Dashboard"
                      >
                        <ShieldCheck className="w-5 h-5" />
                      </Link>
                    )}

                    <Link
                      to="/notifications"
                      onMouseEnter={() => prefetchRoute('notifications')}
                      onTouchStart={() => prefetchRoute('notifications')}
                      className={`text-[#414840] hover:text-[#194332] p-2 rounded-lg hover:bg-[#F3F0E9] relative transition-colors ${
                        isActionActive('notifications') ? 'text-[#194332] bg-[#194332]/10' : ''
                      }`}
                      aria-label="Notifications"
                    >
                      <NotificationIcon size={22} color="currentColor" active={false} />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-[#B42318] rounded-full ring-2 ring-[#FAF8F4]" />
                      )}
                    </Link>
                    <Link
                      to="/messages"
                      onMouseEnter={() => prefetchRoute('messages')}
                      onTouchStart={() => prefetchRoute('messages')}
                      className={`text-[#414840] hover:text-[#194332] p-2 rounded-lg hover:bg-[#F3F0E9] relative transition-colors ${
                        isActionActive('messages') ? 'text-[#194332] bg-[#194332]/10' : ''
                      }`}
                      aria-label="Messages"
                    >
                      <SendIcon size={22} color="currentColor" active={isActionActive('messages')} />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-[#194332] rounded-full ring-2 ring-[#FAF8F4]" />
                      )}
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/signin"
                    className="bg-[#194332] hover:bg-[#102F28] active:bg-[#0c241e] text-white text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold transition-all shadow-sm flex items-center justify-center font-inter"
                  >
                    Sign In
                  </Link>
                )}

                <button
                  className="md:hidden text-[#202923] hover:text-[#194332] p-2 rounded-lg hover:bg-[#F3F0E9] flex items-center justify-center h-10 w-10 transition-colors"
                  onClick={() => setMenuOpen(!menuOpen)}
                  title="Toggle Menu"
                  aria-label="Toggle Menu"
                >
                  <MenuCloseIcon active={menuOpen} size={28} color="#202923" />
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex justify-end">
          <div
            className="absolute inset-0 bg-[#202923]/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative w-[300px] h-full bg-[#FAF8F4] border-l border-[#E7E5E0] flex flex-col overflow-y-auto shadow-2xl z-10 animate-slide-in-right">
            <div className="px-6 py-4 flex items-center justify-between border-b border-[#E7E5E0]" onClick={() => setMenuOpen(false)}>
              <Logo size="sm" className="!mx-0" />
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9]"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col space-y-1 px-4 py-4 flex-1 overflow-y-auto text-left">
              {isLoggedIn && (
                <Link
                  to={`/profile/${user?.uid}`}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3.5 w-full px-4 py-2.5 rounded-lg text-left transition-all ${
                    pathname.startsWith('/profile')
                      ? "bg-[#194332]/10 text-[#194332] font-semibold"
                      : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                  }`}
                >
                  <Avatar
                    userId={user?.uid}
                    user={user}
                    src={user?.photoURL || user?.profileImage || user?.image}
                    name={user?.displayName || user?.name}
                    size="none"
                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-[#E7E5E0]"
                  />
                  <span className="text-[15px] font-medium font-inter">My Profile</span>
                </Link>
              )}

              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3.5 w-full px-4 py-2.5 rounded-lg text-left transition-all ${
                  pathname === '/' || pathname === ''
                    ? "bg-[#194332]/10 text-[#194332] font-semibold"
                    : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                }`}
              >
                <Home className="w-5 h-5 shrink-0 text-[#194332]" />
                <span className="text-[15px] font-medium font-inter">{t('nav_home')}</span>
              </Link>

              {/* Discover Accordion */}
              <div className="w-full text-left">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'discover' ? null : 'discover')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isDiscoverActive
                      ? "bg-[#194332]/10 text-[#194332] font-semibold"
                      : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 text-left shrink-0">
                    <Compass className="w-5 h-5 shrink-0 text-[#194332]" />
                    <span className="text-[15px] font-medium font-inter">{t('nav_discover')}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 ml-auto shrink-0 text-[#777C75] transition-transform duration-200 ${
                      expandedSection === 'discover' ? 'rotate-180 text-[#194332]' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedSection === 'discover' && (
                  <div className="pl-8 pr-2 py-1 space-y-1 my-1 text-left w-full">
                    <Link
                      to="/discover"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]"
                    >
                      <LayoutGrid className="w-4 h-4 shrink-0 text-[#194332]" />
                      <span>Category Grid</span>
                    </Link>
                    <Link
                      to="/talents"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]"
                    >
                      <Users className="w-4 h-4 shrink-0 text-[#194332]" />
                      <span>{t('nav_talent_directory')}</span>
                    </Link>
                    <Link
                      to="/trending"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]"
                    >
                      <Flame className="w-4 h-4 shrink-0 text-[#D4A373]" />
                      <span>{t('nav_trending_now')}</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]"
                    >
                      <Settings className="w-4 h-4 shrink-0 text-[#626860]" />
                      <span>{t('nav_settings')}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Projects Accordion */}
              <div className="w-full text-left">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isProjectsActive
                      ? "bg-[#194332]/10 text-[#194332] font-semibold"
                      : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 text-left shrink-0">
                    <Briefcase className="w-5 h-5 shrink-0 text-[#194332]" />
                    <span className="text-[15px] font-medium font-inter">{t('nav_projects')}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 ml-auto shrink-0 text-[#777C75] transition-transform duration-200 ${
                      expandedSection === 'projects' ? 'rotate-180 text-[#194332]' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedSection === 'projects' && (
                  <div className="pl-8 pr-2 py-1 space-y-1 my-1 text-left w-full">
                    <Link
                      to="/casting"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]"
                    >
                      <Clapperboard className="w-4 h-4 shrink-0 text-[#194332]" />
                      <span>{t('nav_casting_calls')}</span>
                    </Link>
                    <Link
                      to="/casting/create"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]"
                    >
                      <PlusCircle className="w-4 h-4 shrink-0 text-[#194332]" />
                      <span>{t('nav_post_project')}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* User Links */}
              {isLoggedIn && (
                <>
                  <Link
                    to="/messages"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3.5 w-full px-4 py-2.5 rounded-lg text-left transition-all ${
                      pathname.startsWith('/messages')
                        ? "bg-[#194332]/10 text-[#194332] font-semibold"
                        : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 shrink-0 text-[#194332]" />
                    <span className="text-[15px] font-medium font-inter">Messages</span>
                  </Link>

                  <Link
                    to="/saved-castings"
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3.5 w-full px-4 py-2.5 rounded-lg text-left transition-all ${
                      pathname.startsWith('/saved')
                        ? "bg-[#194332]/10 text-[#194332] font-semibold"
                        : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                    }`}
                  >
                    <Bookmark className="w-5 h-5 shrink-0 text-[#194332]" />
                    <span className="text-[15px] font-medium font-inter">Saved Calls</span>
                  </Link>
                </>
              )}

              {effectiveIsAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3.5 w-full px-4 py-2.5 rounded-lg text-left transition-all ${
                    pathname.startsWith("/admin")
                      ? "bg-[#194332]/10 text-[#194332] font-semibold"
                      : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0 text-[#194332]" />
                  <span className="text-[15px] font-medium font-inter">Admin Panel</span>
                </Link>
              )}

              {/* Support Accordion */}
              <div className="w-full text-left">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'support' ? null : 'support')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isSupportActive
                      ? "bg-[#194332]/10 text-[#194332] font-semibold"
                      : "text-[#414840] hover:bg-[#F3F0E9] hover:text-[#202923]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 text-left shrink-0">
                    <LifeBuoy className="w-5 h-5 shrink-0 text-[#194332]" />
                    <span className="text-[15px] font-medium font-inter">Support</span>
                  </div>
                  <svg
                    className={`w-4 h-4 ml-auto shrink-0 text-[#777C75] transition-transform duration-200 ${
                      expandedSection === 'support' ? 'rotate-180 text-[#194332]' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedSection === 'support' && (
                  <div className="pl-8 pr-2 py-1 space-y-1 my-1 text-left w-full">
                    <Link
                      to="/about"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm ${
                        pathname === '/about' ? 'text-[#194332] font-semibold bg-[#194332]/10' : 'text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]'
                      }`}
                    >
                      <Info className="w-4 h-4 shrink-0 text-[#777C75]" />
                      <span>About Us</span>
                    </Link>
                    <Link
                      to="/help"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm ${
                        pathname === '/help' ? 'text-[#194332] font-semibold bg-[#194332]/10' : 'text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 shrink-0 text-[#777C75]" />
                      <span>Help & FAQ</span>
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm ${
                        pathname === '/contact' ? 'text-[#194332] font-semibold bg-[#194332]/10' : 'text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]'
                      }`}
                    >
                      <Mail className="w-4 h-4 shrink-0 text-[#777C75]" />
                      <span>Contact</span>
                    </Link>
                    <Link
                      to="/trust-safety"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm ${
                        pathname === '/trust-safety' ? 'text-[#194332] font-semibold bg-[#194332]/10' : 'text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]'
                      }`}
                    >
                      <Shield className="w-4 h-4 shrink-0 text-[#777C75]" />
                      <span>Trust & Safety</span>
                    </Link>
                    <Link
                      to="/privacy"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm ${
                        pathname === '/privacy' ? 'text-[#194332] font-semibold bg-[#194332]/10' : 'text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0 text-[#777C75]" />
                      <span>Privacy Policy</span>
                    </Link>
                    <Link
                      to="/terms"
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 w-full py-2 px-3 rounded-md text-sm ${
                        pathname === '/terms' ? 'text-[#194332] font-semibold bg-[#194332]/10' : 'text-[#414840] hover:text-[#194332] hover:bg-[#F3F0E9]'
                      }`}
                    >
                      <Scale className="w-4 h-4 shrink-0 text-[#777C75]" />
                      <span>Terms of Service</span>
                    </Link>
                  </div>
                )}
              </div>

              {isLoggedIn ? (
                <button
                  onClick={() => {
                    onLogout();
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3.5 w-full px-4 py-2.5 rounded-lg text-[#B42318] hover:bg-[#FEE4E2] text-left font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span className="text-[15px] font-inter">Logout</span>
                </button>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3.5 w-full px-4 py-2.5 rounded-lg text-[#194332] font-semibold bg-[#194332]/10 hover:bg-[#194332]/20"
                >
                  <LogIn className="w-5 h-5 shrink-0" />
                  <span className="text-[15px] font-inter">Sign In</span>
                </Link>
              )}
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
            className="fixed inset-0 z-[100] bg-[#202923]/40 backdrop-blur-md flex flex-col items-center justify-start pt-10 px-4 overflow-y-auto"
          >
            <div className="w-full max-w-3xl relative z-10 pb-12">
              <div className="relative z-50 bg-white border border-[#E7E5E0] rounded-2xl shadow-elevated p-2">
                <ActionSearchBar
                  onClose={() => setShowSearchOverlay(false)}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
