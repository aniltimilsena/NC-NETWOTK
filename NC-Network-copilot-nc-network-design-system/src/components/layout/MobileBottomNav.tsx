import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Camera, Mail } from 'lucide-react';
import { subscribeToConversations } from '../../services/messaging';
import { useCall } from '../../context/CallContext';

interface MobileBottomNavProps {
  user: any;
}

export default function MobileBottomNav({ user }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Scroll visibility states
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Lightbox overlay detection
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Active call check
  let activeCall = null;
  try {
    const callCtx = useCall();
    activeCall = callCtx?.activeCall;
  } catch {
    // Graceful fallback if context is not available
  }
  const isCallActive = !!activeCall;

  // Unread messages subscription
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }
    const unsub = subscribeToConversations(user.uid, (convos) => {
      const count = convos.filter((c) => c.isUnreadForMe === true).length;
      setUnreadCount(count);
    });
    return () => unsub();
  }, [user?.uid]);

  // Scroll detection to auto-hide bottom bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsVisible(false); // scrolling down
      } else {
        setIsVisible(true); // scrolling up
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // MutationObserver to watch if fullscreen lightbox or overlay with bg-black/95 is rendered
  useEffect(() => {
    const checkLightbox = () => {
      const hasLightbox = 
        !!document.querySelector('.fixed.inset-0.z-\\[150\\]') || 
        !!document.querySelector('.fixed.inset-0.z-\\[200\\]') ||
        document.body.classList.contains('overflow-hidden') ||
        document.body.style.overflow === 'hidden';
      setIsLightboxOpen(hasLightbox);
    };

    checkLightbox();

    const observer = new MutationObserver(checkLightbox);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => observer.disconnect();
  }, []);

  // Haptic feedback function
  const haptic = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/talents')) return 'discover';
    if (path.startsWith('/casting')) return 'casting';
    if (path.startsWith('/profile') || path.startsWith('/settings')) return 'profile';
    if (path.startsWith('/messages')) return 'messages';
    return '';
  };

  const activeTab = getActiveTab();

  // Hide constraints
  const isChatConversation = location.pathname.startsWith('/messages/') && location.pathname.split('/').filter(Boolean).length > 1;
  const shouldHideNav = isCallActive || isChatConversation || isLightboxOpen || !isVisible;

  // Nav tabs layout mapping to website paths
  const tabs = [
    { id: 'home', label: 'HOME', path: '/', isHome: true },
    { id: 'discover', label: 'DISCOVER', path: '/talents', icon: Camera },
    { id: 'casting', label: 'CASTING', path: '/casting', icon: Camera }, // Will use Camera icon or custom SVG later
    { id: 'profile', label: 'ABOUT', path: user?.uid ? `/profile/${user.uid}` : '/signin', icon: User },
    { id: 'messages', label: 'MESSAGES', path: '/messages', icon: Mail, hasBadge: true },
  ];

  return (
    <div 
      className={`md:hidden fixed bottom-4 left-4 right-4 z-50 transition-all duration-300 transform select-none max-w-lg mx-auto ${
        shouldHideNav ? 'translate-y-[120px] pointer-events-none opacity-0' : 'translate-y-0 pointer-events-auto opacity-100'
      }`}
    >
      {/* Viewfinder Hump (centered top edge) */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] w-[50px] h-[8px] bg-gradient-to-b from-[#252525] to-[#161616] border-t border-l border-r border-white/10 rounded-t-[6px] z-0" />
      
      {/* Left Strap Mount Loop */}
      <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[7px] h-[20px] rounded-l-md border border-r-0 border-white/20 bg-[#161616] z-0 shadow-md" />
      
      {/* Right Strap Mount Loop */}
      <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[7px] h-[20px] rounded-r-md border border-l-0 border-white/20 bg-[#161616] z-0 shadow-md" />

      <div 
        className="relative flex items-center justify-center bg-gradient-to-b from-[#181818] to-[#0c0c0c] border border-white/10 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] px-2 py-2"
        style={{ height: '70px' }}
      >
        {/* NAVIGATION ITEMS */}
        <div className="flex items-center justify-around w-full h-full px-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComponent = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptic();
                  navigate(tab.path);
                }}
                className="flex flex-col items-center justify-center h-full relative focus:outline-none transition-all duration-200 select-none flex-1 px-1"
              >
                {/* Bracket corners overlay for active tab */}
                {isActive && (
                  <div className="absolute inset-0 pointer-events-none z-10 m-[3px] py-1 px-0.5">
                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/35" />
                    <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/35" />
                    <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/35" />
                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/35" />
                  </div>
                )}

                {/* Active glowing orange dot */}
                {isActive && (
                  <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF8C00] glow-orange animate-pulse" />
                )}

                {/* Tab Icon or text only (for Home) */}
                <div 
                  className={`relative flex flex-col items-center justify-center transition-all duration-200 ${
                    isActive ? 'scale-105 opacity-100' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {tab.isHome ? (
                    <span className={`text-[10px] font-black tracking-[0.5px] uppercase select-none mt-1 h-5 flex items-center ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`}>
                      {tab.label}
                    </span>
                  ) : tab.id === 'casting' ? (
                    <>
                      {/* Film Icon drawn as custom SVG to keep the film strip design */}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M7 3v18" />
                        <path d="M17 3v18" />
                        <path d="M3 7.5h4" />
                        <path d="M3 12h4" />
                        <path d="M3 16.5h4" />
                        <path d="M17 7.5h4" />
                        <path d="M17 12h4" />
                        <path d="M17 16.5h4" />
                      </svg>
                      <span className={`text-[8px] font-black tracking-[0.5px] uppercase select-none mt-1.5 ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}>
                        {tab.label}
                      </span>
                    </>
                  ) : IconComponent ? (
                    <>
                      <IconComponent size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-gray-400'} />
                      <span className={`text-[8px] font-black tracking-[0.5px] uppercase select-none mt-1.5 ${
                        isActive ? 'text-white' : 'text-gray-400'
                      }`}>
                        {tab.label}
                      </span>
                    </>
                  ) : null}

                  {/* Messages count badge overlay */}
                  {tab.hasBadge && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-[#0c0c0c] animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
