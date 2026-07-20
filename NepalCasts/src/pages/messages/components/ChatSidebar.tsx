import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, ChevronLeft } from 'lucide-react';
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
    return '📷 Sent a photo';
  }
  if (text.startsWith('http') && (text.includes('/video/upload/') || text.match(/\.(mp4|webm|ogg|mov)/i))) {
    return '🎥 Sent a video';
  }
  if (text.startsWith('http')) {
    return '📁 Sent a file';
  }
  return text;
};

export default function ChatSidebar({
  conversations,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  callHistory,
  loadingCalls,
  currentUser,
  onStartNewChat,
  onNavigate,
  onInitiateCall
}: ChatSidebarProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');
  const [query, setQuery] = useState('');

  // Long press timer tracking for ChatSidebar
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
    }, 600); // 600ms threshold
  }, [onDeleteChat]);

  const endPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const filteredConversations = conversations.filter((c) =>
    (c.name || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full border-r border-white/5 bg-[#0E0E0E]">
      {/* Sidebar Header */}
      <div className="p-4 pt-6 md:p-4 border-b border-white/5 space-y-3">
        <div className="flex justify-between items-center">
          <button
            onClick={() => onNavigate ? onNavigate('back') : navigate(-1)}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white border border-white/10 transition-colors shrink-0 no-min-h"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="text-base font-bold text-gray-100 tracking-wide">Inbox</h2>

          <button
            onClick={onStartNewChat}
            className="w-8 h-8 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] hover:bg-[#00BFFF]/20 transition-all flex items-center justify-center shrink-0"
            title="New Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nc-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search conversation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/20 outline-none focus:border-[#00BFFF]/20 transition-colors"
          />
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-1.5 rounded-xl text-[10px] no-scale no-min-h font-black uppercase tracking-wider transition-colors ${activeTab === 'chats' ? 'bg-[#00BFFF] text-black' : 'text-nc-muted hover:text-white'
              }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`flex-1 py-1.5 rounded-xl text-[10px] no-scale no-min-h font-black uppercase tracking-wider transition-colors ${activeTab === 'calls' ? 'bg-[#00BFFF] text-black' : 'text-nc-muted hover:text-white'
              }`}
          >
            Calls
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'chats' ? (
          filteredConversations.length > 0 ? (
            <div className="flex flex-col">
              {filteredConversations.map((c) => {
                const isSelected = c.id === activeChatId;
                const unreadCount = c.unreadCounts?.[currentUser.uid] || 0;

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
                    className={`flex items-center gap-3 py-3.5 px-4 border-b border-white/5 cursor-pointer transition-all ${isSelected ? 'bg-white/10' : 'bg-transparent hover:bg-white/5'
                      }`}
                  >
                    <Avatar src={c.avatar} name={c.name} size="md" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[15px] font-bold text-white block truncate">{c.name}</span>
                        {unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#00BFFF] text-black font-black text-[10px] flex items-center justify-center shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-nc-muted truncate font-medium mt-0.5">{formatLastMessage(c.lastMessage)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-nc-muted text-center py-8">No chats found.</p>
          )
        ) : (
          /* Calls History List */
          !loadingCalls ? (
            callHistory.length > 0 ? (
              <div className="flex flex-col">
                {callHistory.map((call) => {
                  const isIncoming = call.calleeId === currentUser.uid;
                  const targetUserId = isIncoming ? call.callerId : call.calleeId;
                  const callType: 'audio' | 'video' = call.callType === 'video' ? 'video' : 'audio';
                  const date = call.createdAt?.toDate ? call.createdAt.toDate().toLocaleDateString() : 'N/A';

                  const handleCallClick = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (targetUserId && onInitiateCall) {
                      onInitiateCall(
                        callType,
                        targetUserId,
                        call.otherUser?.name || 'User',
                        call.otherUser?.image || ''
                      );
                    }
                  };

                  return (
                    <div
                      key={call.id}
                      onClick={handleCallClick}
                      className="flex justify-between items-center py-3.5 px-4 border-b border-white/5 bg-transparent hover:bg-white/5 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={call.otherUser?.image} name={call.otherUser?.name} size="md" />
                        <div className="text-left">
                          <span className="text-[15px] font-bold text-white block">{call.otherUser?.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isIncoming ? (
                              <PhoneIncoming className="w-3 h-3 text-[#00BFFF]" />
                            ) : (
                              <PhoneOutgoing className="w-3 h-3 text-nc-muted" />
                            )}
                            <span className="text-[11px] text-nc-muted font-medium">{date} • {callType}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleCallClick}
                        className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-[#00BFFF] group-hover:text-black flex items-center justify-center text-white/70 hover:text-black transition-all active:scale-95 shrink-0"
                        title={`Call ${call.otherUser?.name || 'User'} (${callType})`}
                      >
                        {callType === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <Phone className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-nc-muted text-center py-8">No call history found.</p>
            )
          ) : (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )
        )}
      </div>
    </div>
  );
}
