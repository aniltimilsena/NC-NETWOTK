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

type FilterType = 'all' | 'unread' | 'connections' | 'applications';

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

  const filteredConversations = conversations.filter((c) => {
    const nameMatch = (c.name || '').toLowerCase().includes(query.toLowerCase());
    const msgMatch = (c.lastMessage || '').toLowerCase().includes(query.toLowerCase());
    if (query && !nameMatch && !msgMatch) {
      return false;
    }

    const unreadCount = c.unreadCounts?.[currentUser?.uid] || 0;
    const isUnread = unreadCount > 0 || c.unread === true;
    const isApp = Boolean(
      c.isApplication ||
      c.castingId ||
      c.type === 'application' ||
      c.name?.toLowerCase().includes('casting') ||
      c.lastMessage?.toLowerCase().includes('application')
    );

    if (activeFilter === 'unread') {
      return isUnread;
    }
    if (activeFilter === 'connections') {
      return !isApp;
    }
    if (activeFilter === 'applications') {
      return isApp;
    }
    return true;
  });

  const filterTabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'connections', label: 'Connections' },
    { id: 'applications', label: 'Applications' },
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
            placeholder="Search messages..."
            className="w-full bg-[#18181c] border border-white/5 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ffb400]/50 focus:border-[#ffb400]/50 transition-all"
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
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ffb400] text-[#0A0A0A] shadow-sm shadow-[#ffb400]/20'
                    : 'bg-[#18181c] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
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
                  className={`flex items-center gap-3.5 px-4 sm:px-5 py-3.5 cursor-pointer transition-all ${
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
                    className="!w-12 !h-12 md:!w-13 md:!h-13 shrink-0 rounded-full"
                  />
                  <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
                    <span className="text-[15px] font-bold text-white block truncate leading-tight">
                      {c.name || 'User'}
                    </span>
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
                          unreadCount > 0 ? 'text-[#ffb400] font-semibold' : 'text-gray-500'
                        }`}
                      >
                        {timeString}
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <span className="min-w-[18px] h-4.5 px-1.5 rounded-full bg-[#ffb400] text-black font-extrabold text-[10px] flex items-center justify-center shadow-sm shadow-[#ffb400]/30 leading-none">
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
              {query ? 'No matching messages' : 'No messages in this category'}
            </p>
            <p className="text-xs text-gray-500 max-w-xs">
              {query ? 'Try searching with a different keyword.' : 'Conversations will appear here as you chat.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
