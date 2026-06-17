import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Clapperboard, MessageSquare, User } from 'lucide-react';
import { subscribeToConversations } from '../../services/messaging';
import { useTranslation } from 'react-i18next';

interface MobileBottomNavProps {
  user: any;
}

export default function MobileBottomNav({ user }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation();

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

  const tabs = [
    { id: 'home', label: t('nav_home'), path: '/', icon: Home },
    { id: 'discover', label: t('nav_discover'), path: '/talents', icon: Compass },
    { id: 'casting', label: t('nav_casting'), path: '/casting', icon: Clapperboard },
    { id: 'messages', label: t('nav_messages'), path: '/messages', icon: MessageSquare, hasBadge: true },
    { id: 'profile', label: t('nav_profile'), path: user?.uid ? `/profile/${user.uid}` : '/signin', icon: User },
  ];

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/talents')) return 'discover';
    if (path.startsWith('/casting')) return 'casting';
    if (path.startsWith('/messages')) return 'messages';
    if (path.startsWith('/profile') || path.startsWith('/settings')) return 'profile';
    return '';
  };

  const activeTab = getActiveTab();

  return (
    <div 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f0f] border-t border-[#1a1a1a] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 pb-[env(safe-area-inset-bottom)]"
      style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around h-[60px] max-w-lg mx-auto px-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all duration-300 focus:outline-none ${
                isActive ? 'text-[#00BFFF]' : 'text-gray-500'
              }`}
            >
              {/* Active Indicator Dot above icon */}
              {isActive && (
                <span className="absolute top-1.5 w-1 h-1 rounded-full bg-[#00BFFF] shadow-[0_0_8px_#00BFFF] animate-fade-in" />
              )}

              {/* Icon with shift */}
              <div 
                className={`relative transition-transform duration-300 ${
                  isActive ? 'translate-y-[-2px]' : 'translate-y-1'
                }`}
              >
                <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
                
                {/* Messages Unread count badge */}
                {tab.hasBadge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-[#0f0f0f]">
                    {unreadCount}
                  </span>
                )}
              </div>

              {/* Label text slide/fade animation */}
              <span 
                className={`text-[9px] font-black uppercase tracking-wider mt-1.5 transition-all duration-300 origin-center select-none
                  ${isActive ? 'opacity-100 scale-100 translate-y-0 h-auto' : 'opacity-0 scale-75 translate-y-2 h-0 overflow-hidden'}
                `}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
