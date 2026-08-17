import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { motion, AnimatePresence } from "framer-motion";
import { ActionSearchBar } from "@/components/ui/ActionSearchBar";
import Logo from '../ui/Logo';
import Avatar from '../ui/Avatar';
import { NotificationIcon, MenuCloseIcon, SendIcon } from "@/components/ui/AnimatedStateIcons";
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
      case 'premium': return '/premium';
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
      case 'premium': return pathname === '/premium';
      case 'trending': return pathname === '/trending';
      default: return false;
    }
  };
  const isDiscoverActive = pathname === '/discover' || isActionActive('listing') || isActionActive('trending') || pathname.startsWith('/categories');
  const isProjectsActive = isActionActive('casting') || isActionActive('casting-create');
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
    <header className="sticky top-0 left-0 right-0 z-50 bg-[#060709]">
      <nav className="relative z-30 bg-[#060709]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-20">

            <div className="flex items-center gap-4 sm:gap-6">
              {showBack && (<button onClick={onBack} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 shrink-0" title="Go Back" aria-label="Go Back">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="absolute top-full left-0 mt-1 w-44 rounded-2xl bg-[#0A0A0A]/95 backdrop-blur-md border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-[100] py-2">
                    <Link to="/discover" className="w-full text-left block px-4 py-2 text-xs font-normal text-[#AAA] hover:text-white hover:bg-white/5 transition-colors">Category Grid</Link>
                    <Link to="/talents" className="w-full text-left block px-4 py-2 text-xs font-normal text-[#AAA] hover:text-white hover:bg-white/5 transition-colors">{t('nav_talent_directory')}</Link>
                    <Link to="/trending" className="w-full text-left block px-4 py-2 text-xs font-normal text-[#AAA] hover:text-white hover:bg-white/5 transition-colors">{t('nav_trending_now')}</Link>
                    <Link to="/settings" className="w-full text-left block px-4 py-2 text-xs font-normal text-[#AAA] hover:text-white hover:bg-white/5 transition-colors">{t('nav_settings')}</Link>
                    {isAdmin && (<>
                      <div className="mx-2 my-1 border-t border-white/5"></div>
                      <Link to="/admin" className="w-full text-left block px-4 py-2 text-[9px] uppercase tracking-widest font-normal text-admin-primary hover:text-white hover:bg-admin-primary/20 transition-all flex items-center justify-between group/admin">
                        <span>{t('nav_admin')}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-admin-primary shadow-[0_0_8px_#38bdf8] group-hover/admin:scale-125 transition-transform"></span>
                      </Link>
                    </>)}
                  </div>
                </div>

                <div className="relative group">
                  <button className={`flex items-center gap-1.5 py-2 text-[15px] font-normal tracking-tight transition-colors cursor-pointer ${isProjectsActive ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                    <span>{t('nav_projects')}</span>
                    <svg className="w-3.5 h-3.5 text-white/50 group-hover:text-white group-hover:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-44 rounded-2xl bg-[#0A0A0A]/95 backdrop-blur-md border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-[100] py-2">
                    <Link to="/casting" className="w-full text-left block px-4 py-2 text-xs font-normal text-[#AAA] hover:text-white hover:bg-white/5 transition-colors">{t('nav_casting_calls')}</Link>
                    <Link to="/casting/create" className="w-full text-left block px-4 py-2 text-xs font-normal text-[#AAA] hover:text-white hover:bg-white/5 transition-colors">{t('nav_post_project')}</Link>
                  </div>
                </div>
              </div>
            </div>


            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">


              <button onClick={() => setShowSearchOverlay(true)} className="lg:hidden text-nc-secondary hover:text-white p-1.5 transition-colors" aria-label="Search">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>



              {isLoggedIn ? (<>

                <Link to="/notifications" className={`text-nc-secondary hover:text-white p-1.5 relative transition-colors ${isActionActive('notifications') ? 'text-white' : ''}`} aria-label="Notifications">
                  <NotificationIcon size={24} color="currentColor" active={false} />
                  {unreadCount > 0 && (<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-nc-dark animate-pulse shadow-[0_0_8px_#ef4444]" />)}
                </Link>
                <Link to="/messages" className={`text-nc-secondary hover:text-white p-1.5 relative transition-colors ${isActionActive('messages') ? 'text-white' : ''}`} aria-label="Messages">
                  <SendIcon size={24} color="currentColor" active={isActionActive('messages')} />
                  {unreadMessagesCount > 0 && (<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00BFFF] rounded-full border border-nc-dark animate-pulse shadow-[0_0_8px_#00BFFF]" />)}
                </Link>

                <div className="relative flex items-center">
                  {/* Clerk UserButton hidden visually but functional for popover */}
                  <div className="opacity-0 absolute inset-0 z-10">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: 'w-9 h-9 rounded-full',
                          userButtonPopoverCard: 'bg-[#111116] border border-white/10 text-white shadow-2xl rounded-2xl p-2 w-64',
                          userButtonPopoverMain: 'space-y-0.5 p-0 bg-transparent',
                          userPreview: 'p-3 border-b border-white/10 mb-1',
                          userPreviewMainIdentifier: 'text-white font-bold text-sm',
                          userPreviewSecondaryIdentifier: 'text-gray-400 text-xs font-medium',
                          userButtonPopoverActions: 'space-y-0.5 p-0',
                          userButtonPopoverActionButton: 'w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-transparent hover:bg-white/10 text-white font-medium transition-all text-sm cursor-pointer border-0 shadow-none',
                          userButtonPopoverActionButtonText: 'text-gray-200 hover:text-white font-semibold text-sm',
                          userButtonPopoverActionButtonIcon: 'text-gray-400',
                          userButtonPopoverFooter: 'hidden',
                        }
                      }}
                    >
                      <UserButton.MenuItems>
                        <UserButton.Link
                          label="View Profile"
                          labelIcon={
                            <svg className="w-4 h-4 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          }
                          href={`/profile/${user?.uid}`}
                        />
                        <UserButton.Action label="manageAccount" />
                        <UserButton.Action label="signOut" />
                      </UserButton.MenuItems>
                    </UserButton>
                  </div>
                  {/* Our custom Avatar as the visible element */}
                  <div className="pointer-events-none">
                    <Avatar
                      userId={user?.uid}
                      user={user}
                      src={user?.photoURL || user?.profileImage || user?.image}
                      name={user?.displayName}
                      size="sm"
                      className="w-9 h-9 border border-white/15 hover:border-[#00BFFF] transition-all shadow-md"
                    />
                  </div>
                </div>

              </>) : (<Link to="/signup" className="bg-nc-accent text-nc-darker text-xs sm:text-sm px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full font-extrabold hover:bg-sky-400 transition-all ml-1 shadow-lg shadow-nc-accent/20">
                Join Now
              </Link>)}

              <button className="md:hidden text-nc-secondary hover:text-white p-1.5 -mr-1 flex items-center justify-center h-10 w-10" onClick={() => setMenuOpen(!menuOpen)} title="Toggle Menu" aria-label="Toggle Menu">
                <MenuCloseIcon active={menuOpen} size={28} color="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>


    {menuOpen && (<div className="fixed inset-0 z-[100] md:hidden flex justify-end">

      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setMenuOpen(false)}></div>


      <div className="relative w-[280px] h-full bg-[#0d0d0d] border-l border-[#2A2A2A] flex flex-col overflow-y-auto shadow-2xl z-10 animate-slide-in-right">

        <div className="px-6 py-2.5 border-b border-white/5" onClick={() => setMenuOpen(false)}>
          <Logo size="sm" className="!mx-0" />
        </div>


        {/* === TWITTER/X STYLE MINIMALIST FLOATING NAVIGATION === */}
        <div className="flex flex-col space-y-1 px-3 py-3 flex-1 overflow-y-auto">
          {/* Home */}
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className={`group flex items-center w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] ${
              pathname === '/' || pathname === ''
                ? "text-white font-medium"
                : "text-gray-400 font-normal hover:text-white"
            }`}
          >
            <span className="text-[17px] tracking-tight">{t('nav_home')}</span>
          </Link>

          {/* Discover Accordion (Reference Image Style) */}
          <div className="flex flex-col">
            <button
              onClick={() => setExpandedSection(expandedSection === 'discover' ? null : 'discover')}
              className={`group flex items-center justify-between w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                isDiscoverActive
                  ? "text-white font-medium"
                  : "text-gray-400 font-normal hover:text-white"
              }`}
            >
              <span className="text-[17px] tracking-tight text-left">{t('nav_discover')}</span>
              <svg className={`w-4 h-4 text-gray-400 group-hover:text-white transition-transform duration-200 ${expandedSection === 'discover' ? 'rotate-180 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'discover' && (
              <div className="pl-6 pr-3 py-1 space-y-1 my-1">
                <Link to="/discover" onClick={() => setMenuOpen(false)} className="block py-2 px-3 text-sm font-normal text-gray-400 hover:text-white transition-colors">Category Grid</Link>
                <Link to="/talents" onClick={() => setMenuOpen(false)} className="block py-2 px-3 text-sm font-normal text-gray-400 hover:text-white transition-colors">{t('nav_talent_directory')}</Link>
                <Link to="/trending" onClick={() => setMenuOpen(false)} className="block py-2 px-3 text-sm font-normal text-gray-400 hover:text-white transition-colors">{t('nav_trending_now')}</Link>
                <Link to="/settings" onClick={() => setMenuOpen(false)} className="block py-2 px-3 text-sm font-normal text-gray-400 hover:text-white transition-colors">{t('nav_settings')}</Link>
              </div>
            )}
          </div>

          {/* Projects Accordion */}
          <div className="flex flex-col">
            <button
              onClick={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
              className={`group flex items-center justify-between w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer ${
                isProjectsActive
                  ? "text-white font-medium"
                  : "text-gray-400 font-normal hover:text-white"
              }`}
            >
              <span className="text-[17px] tracking-tight text-left">{t('nav_projects')}</span>
              <svg className={`w-4 h-4 text-gray-400 group-hover:text-white transition-transform duration-200 ${expandedSection === 'projects' ? 'rotate-180 text-white' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'projects' && (
              <div className="pl-6 pr-3 py-1 space-y-1 my-1">
                <Link to="/casting" onClick={() => setMenuOpen(false)} className="block py-2 px-3 text-sm font-normal text-gray-400 hover:text-white transition-colors">{t('nav_casting_calls')}</Link>
                <Link to="/casting/create" onClick={() => setMenuOpen(false)} className="block py-2 px-3 text-sm font-normal text-gray-400 hover:text-white transition-colors">{t('nav_post_project')}</Link>
              </div>
            )}
          </div>

          {/* User Links */}
          {isLoggedIn && (
            <>
              <Link
                to="/messages"
                onClick={() => setMenuOpen(false)}
                className={`group flex items-center w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] ${
                  pathname.startsWith('/messages')
                    ? "text-white font-medium"
                    : "text-gray-400 font-normal hover:text-white"
                }`}
              >
                <span className="text-[17px] tracking-tight">Messages</span>
              </Link>

              <Link
                to="/saved-castings"
                onClick={() => setMenuOpen(false)}
                className={`group flex items-center w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] ${
                  pathname.startsWith('/saved')
                    ? "text-white font-medium"
                    : "text-gray-400 font-normal hover:text-white"
                }`}
              >
                <span className="text-[17px] tracking-tight">Saved Calls</span>
              </Link>

              <Link
                to={`/profile/${user?.uid}`}
                onClick={() => setMenuOpen(false)}
                className={`group flex items-center w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] ${
                  pathname.startsWith('/profile')
                    ? "text-white font-medium"
                    : "text-gray-400 font-normal hover:text-white"
                }`}
              >
                <span className="text-[17px] tracking-tight">Profile</span>
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className={`group flex items-center w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] ${
                pathname.startsWith("/admin")
                  ? "text-white font-medium"
                  : "text-gray-400 font-normal hover:text-white"
              }`}
            >
              <span className="text-[17px] tracking-tight">Admin Panel</span>
            </Link>
          )}

          <Link
            to="/trust-safety"
            onClick={() => setMenuOpen(false)}
            className={`group flex items-center w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] ${
              pathname === '/trust-safety' || pathname.startsWith('/trust-safety/')
                ? "text-white font-medium"
                : "text-gray-400 font-normal hover:text-white"
            }`}
          >
            <span className="text-[17px] tracking-tight">Support</span>
          </Link>

          <div className="h-[1px] bg-white/[0.06] my-2 mx-3" />

          {isLoggedIn ? (
            <button
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              className="group flex items-center w-full px-4 py-2.5 transition-all duration-200 text-gray-400 hover:text-rose-400 text-left font-normal cursor-pointer active:scale-[0.98]"
            >
              <span className="text-[17px] tracking-tight">Logout</span>
            </button>
          ) : (
            <Link
              to="/signin"
              onClick={() => setMenuOpen(false)}
              className={`group flex items-center w-full px-4 py-2.5 transition-all duration-200 active:scale-[0.98] ${
                pathname === '/signin'
                  ? "text-white font-medium"
                  : "text-gray-400 font-normal hover:text-white"
              }`}
            >
              <span className="text-[17px] tracking-tight">Sign In</span>
            </Link>
          )}
        </div>


        {!isAdmin && !(user?.premium || user?.isPremium || user?.verified) && (<div className="px-6 pb-4 mt-auto">
          <div className="bg-[#1C1C1C] rounded-2xl p-3.5 border border-[#2A2A2A] relative overflow-hidden">
            <h4 className="text-white font-bold text-[14px] mb-0.5 relative z-10">Go PRO</h4>
            <p className="text-[#888] text-[11px] leading-snug mb-2.5 max-w-[200px] relative z-10">
              Get a verified badge and appear first in search results.
            </p>
            <Link to="/premium" onClick={() => setMenuOpen(false)} className="w-full text-center block bg-nc-pro text-black rounded-lg py-1.5 font-bold text-[12px] hover:bg-nc-pro/90 transition-colors relative z-10 shadow-lg shadow-nc-pro/20 animate-none" style={{ backgroundColor: '#FACC15' }}>
              Go PRO
            </Link>
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-nc-accent blur-3xl opacity-10 rounded-full"></div>
          </div>
        </div>)}

      </div>
    </div>)}


    <AnimatePresence>
      {showSearchOverlay && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-start pt-6 px-4 overflow-y-auto">

        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-r from-[#1877F2]/5 to-transparent blur-[100px] rounded-full pointer-events-none z-0" />

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
