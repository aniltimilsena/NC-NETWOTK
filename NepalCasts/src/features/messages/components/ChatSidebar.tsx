import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, X, MessageSquare, Plus } from 'lucide-react';
import { Avatar } from '../../../components/ui';

interface ChatSidebarProps {
  conversations: any[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  callHistory: any[];
  loadingCalls: boolean;
  currentUser: any;
  onStartNewChat: () => void;
  onNavigate?: (page: string, param?: any) => void;
  onInitiateCall?: (type: 'audio' | 'video', calleeId: string, calleeName: string, calleePhoto: string) => void;
}

const formatLastMessage = (text?: string) => {
  if (!text || typeof text !== 'string') return '';
  if (text.startsWith('http') && (text.includes('/image/upload/') || text.match(/\.(jpeg|jpg|gif|png|webp|svg)/i))) {
    return 'Sent a photo';
  }
  if (text.startsWith('http') && (text.includes('/video/upload/') || text.match(/\.(mp4|webm|ogg|mov)/i))) {
    return 'Sent a video';
  }
  if (text.startsWith('http')) {
    return 'Sent a file';
  }
  if (text.includes('https://') || text.includes('http://')) {
    const cleaned = text
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/Attached File:?/gi, '')
      .replace(/Video Reel:?/gi, '')
      .replace(/Attachment:?/gi, '')
      .trim();
    if (cleaned) return cleaned;
    return 'Sent an attachment';
  }
  if (text.includes('call •') || text.includes('Call •')) {
    return text;
  }
  return text;
};

const formatChatTime = (timestamp?: any) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo`;
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y`;
  } catch {
    return '';
  }
};

type FilterType = 'all' | 'unread' | 'applications';

export default function ChatSidebar({
  conversations,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  currentUser,
  onStartNewChat,
  onNavigate,
}: ChatSidebarProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);

  const startPress = useCallback((convoId: string) => {
    isLongPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressActive.current = true;
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      onDeleteChat(convoId);
    }, 600);
  }, [onDeleteChat]);

  const endPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      navigate('/');
    }
  };

  const filteredConversations = React.useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      if (q) {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const msgMatch = (c.lastMessage || '').toLowerCase().includes(q);
        const roleMatch = (c.roleName || '').toLowerCase().includes(q);
        const titleMatch = (c.castingTitle || '').toLowerCase().includes(q);
        if (!nameMatch && !msgMatch && !roleMatch && !titleMatch) {
          return false;
        }
      }

      const unreadCount = c.unreadCounts?.[currentUser?.uid] || 0;
      const isUnread = unreadCount > 0 || c.unread === true;
      const isApp = Boolean(
        c.isApplication ||
        c.applicationId ||
        c.castingId ||
        c.type === 'application' ||
        c.id?.startsWith('app_') ||
        c.name?.toLowerCase().includes('casting') ||
        c.lastMessage?.toLowerCase().includes('application')
      );

      if (activeFilter === 'unread') {
        return isUnread;
      }
      if (activeFilter === 'applications') {
        return isApp;
      }
      return true;
    });
  }, [conversations, debouncedQuery, activeFilter, currentUser?.uid]);

  const appCount = conversations.filter(c => c.isApplication || c.applicationId || c.castingId || c.type === 'application' || c.id?.startsWith('app_')).length;

  const filterTabs: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'applications', label: 'Applications', count: appCount > 0 ? appCount : undefined },
  ];

  return (
    <div className="w-full h-full bg-[#0d0d0f] border-r border-white/5 flex flex-col shrink-0 select-none">
      {/* Top Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
              title="Back"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Messages
            </h1>
          </div>
          <button
            onClick={onStartNewChat}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all cursor-pointer"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages or applications..."
            className="w-full bg-[#18181c] border border-white/5 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#522C69]/50 focus:border-[#522C69]/50 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[#522C69] text-white shadow-sm shadow-[#522C69]/30'
                    : 'bg-[#18181c] text-gray-400 hover:text-white border border-white/5 hover:border-white/15'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredConversations.length > 0 ? (
          <div className="flex flex-col divide-y divide-white/[0.03]">
            {filteredConversations.map((c) => {
              const isSelected = c.id === activeChatId;
              const unreadCount = c.unreadCounts?.[currentUser?.uid] || 0;
              const timeString = formatChatTime(c.lastMessageAt || c.updatedAt);
              const isAppConvo = Boolean(
                c.isApplication ||
                c.applicationId ||
                c.castingId ||
                c.type === 'application' ||
                c.id?.startsWith('app_')
              );
              return (
                <div
                  key={c.id}
                  onTouchStart={() => startPress(c.id)}
                  onTouchEnd={endPress}
                  onTouchMove={endPress}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    startPress(c.id);
                  }}
                  onMouseUp={endPress}
                  onMouseLeave={endPress}
                  onClick={(e) => {
                    if (isLongPressActive.current) {
                      e.stopPropagation();
                      e.preventDefault();
                      isLongPressActive.current = false;
                      return;
                    }
                    onSelectChat(c.id);
                  }}
                  className={`flex items-center gap-3.5 px-4 sm:px-5 py-3.5 cursor-pointer transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? 'bg-white/[0.08]'
                      : 'bg-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <Avatar
                    userId={c.otherParticipantId}
                    src={c.avatar}
                    name={c.name}
                    size="md"
                    showStatus={true}
                    className="!w-13 !h-13 sm:!w-14 sm:!h-14 shrink-0 rounded-full"
                  />
                  <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-white truncate leading-tight">
                        {c.name || 'User'}
                      </span>
                      {isAppConvo && (
                        <span className="text-[9px] font-bold text-purple-300 bg-[#522C69]/30 border border-[#522C69]/40 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                          {c.roleName || 'Audition'}
                        </span>
                      )}
                    </div>
                    {c.castingTitle && isAppConvo && (
                      <span className="text-[11px] text-gray-400 truncate mt-0.5 block font-medium">
                        {c.castingTitle}
                      </span>
                    )}
                    <p className="text-[13px] text-gray-400 truncate font-normal mt-1 leading-snug">
                      {formatLastMessage(c.lastMessage) || (
                        <span className="italic opacity-50 text-xs">No messages yet</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 ml-2 self-start pt-1">
                    {timeString && (
                      <span
                        className={`text-xs font-medium whitespace-nowrap leading-none ${
                          unreadCount > 0 ? 'text-[#522C69] font-semibold' : 'text-gray-500'
                        }`}
                      >
                        {timeString}
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <span className="min-w-[18px] h-4.5 px-1.5 rounded-full bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white font-extrabold text-[10px] flex items-center justify-center shadow-sm shadow-[#522C69]/30 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-500 mb-1">
              <MessageSquare className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-300">
              {query
                ? 'No matching messages or applications'
                : (activeFilter === 'applications'
                  ? 'No casting applications yet'
                  : 'No messages in this category')}
            </p>
            <p className="text-xs text-gray-500 max-w-xs">
              {query
                ? 'Try searching with a different keyword.'
                : (activeFilter === 'applications'
                  ? 'When performers submit audition applications to your casting calls, their applications will show up here.'
                  : 'Conversations will appear here as you chat.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
