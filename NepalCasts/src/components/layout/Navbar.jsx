import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
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
  Scale
} from "lucide-react";
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { cacheManager } from '@/utils/cacheManager';
export default function Navbar({ onNavigate, onBack = () => { }, showBack = false, isAdmin = false, user = null, onLogout = () => { } }) {
  const isLoggedIn = !!user;
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
    }
    else {
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
      const q = query(collection(db, 'notifications'), where('recipientId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20));
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
      setUnreadCount(notifs.filter(n => !n.read).length);
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
            }
            else if (data.unreadCounts && typeof data.unreadCounts === 'object') {
              isUnread = (data.unreadCounts[uid] || 0) > 0;
            }
            else if (typeof data.unread === 'boolean') {
              isUnread = data.unread === true;
            }
            else if (typeof data.unread === 'number') {
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
  return (<>
    <header className="sticky top-0 left-0 right-0 z-50 bg-[#141414]">
      <nav className="relative z-30 bg-[#141414]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">

            <div className="flex items-center gap-4 sm:gap-6">
              {showBack && (<button onClick={onBack} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 shrink-0" title="Go Back" aria-label="Go Back">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>)}
              <Logo onNavigate={onNavigate} size="md" showText={false} />


              <div className="hidden md:flex items-center gap-6 ml-4">
                <div className="relative group">
                  <button className={`flex items-center gap-1.5 py-2 text-[15px] font-normal tracking-tight transition-colors cursor-pointer ${isDiscoverActive ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                    <span>{t('nav_discover')}</span>
                    <svg className="w-3.5 h-3.5 text-white/50 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-60 rounded-2xl bg-[#0f1015]/95 backdrop-blur-xl border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-[100] p-2 space-y-1">
                    <Link to="/discover" className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                      <LayoutGrid className="w-4 h-4 text-white shrink-0" />
                      <span>Category Grid</span>
                    </Link>
                    <Link to="/talents" className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                      <Users className="w-4 h-4 text-white shrink-0" />
                      <span>{t('nav_talent_directory')}</span>
                    </Link>
                    <Link to="/trending" className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                      <Flame className="w-4 h-4 text-white shrink-0" />
                      <span>{t('nav_trending_now')}</span>
                    </Link>
                    <Link to="/settings" className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                      <Settings className="w-4 h-4 text-white shrink-0" />
                      <span>{t('nav_settings')}</span>
                    </Link>
                    {isAdmin && (
                      <>
                        <div className="mx-2 my-1 border-t border-white/10" />
                        <Link to="/admin" className="w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold text-admin-primary hover:text-white hover:bg-admin-primary/20 transition-all group/admin">
                          <span className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-admin-primary shrink-0" />
                            <span>{t('nav_admin')}</span>
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-admin-primary shadow-[0_0_8px_#38bdf8] group-hover/admin:scale-125 transition-transform" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <button className={`flex items-center gap-1.5 py-2 text-[15px] font-normal tracking-tight transition-colors cursor-pointer ${isProjectsActive ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                    <span>{t('nav_projects')}</span>
                    <svg className="w-3.5 h-3.5 text-white/50 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-2 w-60 rounded-2xl bg-[#0f1015]/95 backdrop-blur-xl border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-[100] p-2 space-y-1">
                    <Link to="/casting" className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                      <Clapperboard className="w-4 h-4 text-white shrink-0" />
                      <span>{t('nav_casting_calls')}</span>
                    </Link>
                    <Link to="/casting/create" className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                      <PlusCircle className="w-4 h-4 text-white shrink-0" />
                      <span>{t('nav_post_project')}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex items-center gap-2 sm:gap-3.5 flex-shrink-0">


              <button onClick={() => setShowSearchOverlay(true)} className="lg:hidden text-nc-secondary hover:text-white p-2 transition-colors" aria-label="Search">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>



              {isLoggedIn ? (<>

                <Link to="/notifications" className={`text-nc-secondary hover:text-white p-2 relative transition-colors ${isActionActive('notifications') ? 'text-white' : ''}`} aria-label="Notifications">
                  <NotificationIcon size={24} color="currentColor" active={false} />
                  {unreadCount > 0 && (<span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-nc-dark animate-pulse shadow-[0_0_8px_#ef4444]" />)}
                </Link>
                <Link to="/messages" className={`text-nc-secondary hover:text-white p-2 relative transition-colors ${isActionActive('messages') ? 'text-white' : ''}`} aria-label="Messages">
                  <SendIcon size={24} color="currentColor" active={isActionActive('messages')} />
                  {unreadMessagesCount > 0 && (<span className="absolute top-2 right-2 w-2 h-2 bg-[#00BFFF] rounded-full border border-nc-dark animate-pulse shadow-[0_0_8px_#00BFFF]" />)}
                </Link>



              </>) : (<Link to="/signup" className="bg-[#522C69] hover:bg-[#663782] text-white text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-xl font-bold transition-all ml-1 shadow-md active:scale-95 flex items-center justify-center">
                Join Now
              </Link>)}

              <button className="md:hidden text-white hover:text-white/80 p-1 flex items-center justify-center h-10 w-10 active:scale-95 transition-transform" onClick={() => setMenuOpen(!menuOpen)} title="Toggle Menu" aria-label="Toggle Menu">
                <MenuCloseIcon active={menuOpen} size={34} color="white" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>


    {menuOpen && (<div className="fixed inset-0 z-[100] md:hidden flex justify-end">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setMenuOpen(false)}></div>


      <div className="relative w-[280px] h-full bg-[#0d0d0d] border-0 flex flex-col overflow-y-auto shadow-2xl z-10 animate-slide-in-right">

        <div className="px-6 py-2.5" onClick={() => setMenuOpen(false)}>
          <Logo size="sm" className="!mx-0" />
        </div>


        {/* === TWITTER/X STYLE MINIMALIST FLOATING NAVIGATION === */}
        <div className="flex flex-col space-y-1.5 px-3 py-3 flex-1 overflow-y-auto text-left items-stretch">
          {/* My Profile (Before Home) */}
          {isLoggedIn && (
            <Link
              to={`/profile/${user?.uid}`}
              onClick={() => setMenuOpen(false)}
              className={`group flex items-center justify-start gap-3.5 w-full px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
                pathname.startsWith('/profile')
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
              }`}
            >
              <Avatar
                userId={user?.uid}
                user={user}
                src={user?.photoURL || user?.profileImage || user?.image}
                name={user?.displayName || user?.name}
                size="none"
                className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/20"
              />
              <span className="text-[16px] tracking-normal">My Profile</span>
            </Link>
          )}

          {/* Home */}
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className={`group flex items-center justify-start gap-3.5 w-full px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
              pathname === '/' || pathname === ''
                ? "bg-white/10 text-white font-semibold shadow-sm"
                : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-[16px] tracking-normal">{t('nav_home')}</span>
          </Link>

          {/* Discover Accordion */}
          <div className="w-full text-left">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'discover' ? null : 'discover')}
              className={`group w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                isDiscoverActive
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5 text-left shrink-0">
                <Compass className="w-5 h-5 shrink-0" />
                <span className="text-[16px] tracking-normal">{t('nav_discover')}</span>
              </div>
              <svg className={`w-4 h-4 ml-auto shrink-0 text-gray-400 group-hover:text-white transition-transform duration-200 ${expandedSection === 'discover' ? 'rotate-180 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'discover' && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 my-1 text-left w-full">
                <Link to="/discover" onClick={() => setMenuOpen(false)} className="flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                  <LayoutGrid className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Category Grid</span>
                </Link>
                <Link to="/talents" onClick={() => setMenuOpen(false)} className="flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                  <Users className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>{t('nav_talent_directory')}</span>
                </Link>
                <Link to="/trending" onClick={() => setMenuOpen(false)} className="flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                  <Flame className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>{t('nav_trending_now')}</span>
                </Link>
                <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                  <Settings className="w-4 h-4 shrink-0 text-gray-400" />
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
              className={`group w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                isProjectsActive
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5 text-left shrink-0">
                <Briefcase className="w-5 h-5 shrink-0" />
                <span className="text-[16px] tracking-normal">{t('nav_projects')}</span>
              </div>
              <svg className={`w-4 h-4 ml-auto shrink-0 text-gray-400 group-hover:text-white transition-transform duration-200 ${expandedSection === 'projects' ? 'rotate-180 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'projects' && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 my-1 text-left w-full">
                <Link to="/casting" onClick={() => setMenuOpen(false)} className="flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                  <Clapperboard className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>{t('nav_casting_calls')}</span>
                </Link>
                <Link to="/casting/create" onClick={() => setMenuOpen(false)} className="flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left">
                  <PlusCircle className="w-4 h-4 shrink-0 text-gray-400" />
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
                className={`group flex items-center justify-start gap-3.5 w-full px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
                  pathname.startsWith('/messages')
                    ? "bg-white/10 text-white font-semibold shadow-sm"
                    : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
                }`}
              >
                <MessageSquare className="w-5 h-5 shrink-0" />
                <span className="text-[16px] tracking-normal">Messages</span>
              </Link>

              <Link
                to="/saved-castings"
                onClick={() => setMenuOpen(false)}
                className={`group flex items-center justify-start gap-3.5 w-full px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
                  pathname.startsWith('/saved')
                    ? "bg-white/10 text-white font-semibold shadow-sm"
                    : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
                }`}
              >
                <Bookmark className="w-5 h-5 shrink-0" />
                <span className="text-[16px] tracking-normal">Saved Calls</span>
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className={`group flex items-center justify-start gap-3.5 w-full px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
                pathname.startsWith("/admin")
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span className="text-[16px] tracking-normal">Admin Panel</span>
            </Link>
          )}

          {/* Support Accordion */}
          <div className="w-full text-left">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'support' ? null : 'support')}
              className={`group w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                isSupportActive
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3.5 text-left shrink-0">
                <LifeBuoy className="w-5 h-5 shrink-0" />
                <span className="text-[16px] tracking-normal">Support</span>
              </div>
              <svg className={`w-4 h-4 ml-auto shrink-0 text-gray-400 group-hover:text-white transition-transform duration-200 ${expandedSection === 'support' ? 'rotate-180 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'support' && (
              <div className="pl-6 pr-2 py-1 space-y-0.5 my-1 text-left w-full">
                <Link to="/about" onClick={() => setMenuOpen(false)} className={`flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal transition-colors text-left ${pathname === '/about' ? 'text-white font-medium bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Info className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>About Us</span>
                </Link>
                <Link to="/help" onClick={() => setMenuOpen(false)} className={`flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal transition-colors text-left ${pathname === '/help' ? 'text-white font-medium bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <HelpCircle className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Help & FAQ</span>
                </Link>
                <Link to="/contact" onClick={() => setMenuOpen(false)} className={`flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal transition-colors text-left ${pathname === '/contact' ? 'text-white font-medium bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Mail className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Contact</span>
                </Link>
                <Link to="/trust-safety" onClick={() => setMenuOpen(false)} className={`flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal transition-colors text-left ${pathname === '/trust-safety' ? 'text-white font-medium bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Shield className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Trust & Safety</span>
                </Link>
                <Link to="/privacy" onClick={() => setMenuOpen(false)} className={`flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal transition-colors text-left ${pathname === '/privacy' ? 'text-white font-medium bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <FileText className="w-4 h-4 shrink-0 text-gray-400" />
                  <span>Privacy Policy</span>
                </Link>
                <Link to="/terms" onClick={() => setMenuOpen(false)} className={`flex items-center justify-start gap-2.5 w-full py-2 px-3 rounded-lg text-sm font-normal transition-colors text-left ${pathname === '/terms' ? 'text-white font-medium bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Scale className="w-4 h-4 shrink-0 text-gray-400" />
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
              className="group flex items-center justify-start gap-3.5 w-full px-4 py-2.5 rounded-xl transition-all duration-200 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 text-left font-normal cursor-pointer active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="text-[16px] tracking-normal">Logout</span>
            </button>
          ) : (
            <Link
              to="/signin"
              onClick={() => setMenuOpen(false)}
              className={`group flex items-center justify-start gap-3.5 w-full px-4 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
                pathname === '/signin'
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-gray-400 font-normal hover:bg-white/5 hover:text-white"
              }`}
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span className="text-[16px] tracking-normal">Sign In</span>
            </Link>
          )}
        </div>

      </div>
    </div>) }


    <AnimatePresence>
      {showSearchOverlay && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-start pt-6 px-4 overflow-y-auto">

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-r from-[#522C69]/5 to-transparent blur-[100px] rounded-full pointer-events-none z-0" />

        <div className="w-full max-w-3xl animate-slide-up relative z-10 pb-12">
          <div className="relative z-50">
            <ActionSearchBar onClose={() => setShowSearchOverlay(false)} onActionSelect={(profileId) => {
              setShowSearchOverlay(false);
              navigate(`/profile/${profileId}`);
            }} onPageNavigate={(page) => {
              setShowSearchOverlay(false);
              navigate(resolveLegacyPath(page));
            }} />
          </div>
        </div>
      </motion.div>)}
    </AnimatePresence>
  </>);
}
