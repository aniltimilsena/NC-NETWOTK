import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Phone, Video, PhoneIncoming, PhoneOutgoing, ChevronLeft } from 'lucide-react';
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
  if (!text || typeof text !== 'string')
    return '';
  if (text.startsWith('http') && (text.includes('/image/upload/') || text.match(/\.(jpeg|jpg|gif|png|webp|svg)/i))) {
    return ' Sent a photo';
  }
  if (text.startsWith('http') && (text.includes('/video/upload/') || text.match(/\.(mp4|webm|ogg|mov)/i))) {
    return ' Sent a video';
  }
  if (text.startsWith('http')) {
    return ' Sent a file';
  }
  if (text.includes('call •') || text.includes('Call •')) {
    const isVideo = text.toLowerCase().includes('video');
    return isVideo ? ` ${text}` : ` ${text}`;
  }
  return text;
};

const formatChatTime = (timestamp?: any) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp));
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
  } catch {
    return '';
  }
};

export default function ChatSidebar({ conversations, activeChatId, onSelectChat, onDeleteChat, callHistory, loadingCalls, currentUser, onStartNewChat, onNavigate, onInitiateCall }: ChatSidebarProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');
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

  const filteredConversations = conversations.filter((c) => {
    const nameMatch = c.name?.toLowerCase().includes(query.toLowerCase());
    const msgMatch = c.lastMessage?.toLowerCase().includes(query.toLowerCase());
    return nameMatch || msgMatch;
  });

  return (<div className="w-full h-full bg-[#141414] border-r border-white/5 flex flex-col shrink-0 select-none">

    <div className="p-4 border-b border-white/5 space-y-3">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onNavigate && (<button onClick={() => onNavigate('home')} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer" title="Back to Home" aria-label="Back to Home">
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>)}
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Messages</h2>
        </div>
        <button onClick={onStartNewChat} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-white hover:text-gray-300 transition-colors shrink-0 cursor-pointer" title="New Message">
          <MessageSquare className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
      </div>


      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages..." className="w-full bg-[#1a1a1a] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all" />
      </div>


      <div className="flex bg-[#181818] rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none ${
            activeTab === 'chats'
              ? 'bg-[#282828] text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab('calls')}
          className={`flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none ${
            activeTab === 'calls'
              ? 'bg-[#282828] text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Calls
        </button>
      </div>
    </div>


    <div className="flex-1 overflow-y-auto no-scrollbar py-2">
      {activeTab === 'chats' ? (filteredConversations.length > 0 ? (<div className="flex flex-col gap-0.5">
        {filteredConversations.map((c) => {
          const isSelected = c.id === activeChatId;
          const unreadCount = c.unreadCounts?.[currentUser?.uid] || 0;
          const timeString = formatChatTime(c.lastMessageAt || c.updatedAt);
          return (<div key={c.id} onTouchStart={() => startPress(c.id)} onTouchEnd={endPress} onTouchMove={endPress} onMouseDown={(e) => {
            if (e.button !== 0)
              return;
            startPress(c.id);
          }} onMouseUp={endPress} onMouseLeave={endPress} onClick={(e) => {
            if (isLongPressActive.current) {
              e.stopPropagation();
              e.preventDefault();
              isLongPressActive.current = false;
              return;
            }
            onSelectChat(c.id);
          }} className={`flex items-center gap-3 py-3 px-3.5 mx-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-white/10' : 'bg-transparent hover:bg-white/[0.04]'}`}>
            <Avatar userId={c.otherParticipantId} src={c.avatar} name={c.name} size="md" />
            <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
              <span className="text-[14px] font-bold text-white block truncate leading-snug">{c.name}</span>
              <p className="text-[12px] text-gray-400 truncate font-medium mt-0.5 leading-snug">
                {formatLastMessage(c.lastMessage) || <span className="italic opacity-50 text-xs">No messages yet</span>}
              </p>
            </div>
            <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 ml-2 self-center">
              {timeString && (<span className={`text-[10px] font-medium leading-none ${unreadCount > 0 ? 'text-[#00BFFF] font-semibold' : 'text-gray-400'}`}>
                {timeString}
              </span>)}
              {unreadCount > 0 && (<span className="min-w-[18px] h-4.5 px-1.5 rounded-full bg-[#00BFFF] text-black font-extrabold text-[10px] flex items-center justify-center shadow-sm shadow-[#00BFFF]/30 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>)}
            </div>
          </div>);
        })}
      </div>) : (<p className="text-xs text-gray-400 text-center py-8">No chats found.</p>)) : (!loadingCalls ? (callHistory.length > 0 ? (<div className="flex flex-col gap-0.5">
        {callHistory.map((call) => {
          const isIncoming = call.calleeId === currentUser?.uid;
          const targetUserId = isIncoming ? call.callerId : call.calleeId;
          const callType: 'audio' | 'video' = call.callType === 'video' ? 'video' : 'audio';
          const date = call.createdAt?.toDate ? call.createdAt.toDate().toLocaleDateString() : 'N/A';
          const handleCallClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (targetUserId && onInitiateCall) {
              onInitiateCall(callType, targetUserId, call.otherUser?.name || 'User', call.otherUser?.image || '');
            }
          };
          return (<div key={call.id} onClick={handleCallClick} className="flex justify-between items-center py-3.5 px-4 bg-transparent hover:bg-white/5 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <Avatar userId={targetUserId} src={call.otherUser?.image} name={call.otherUser?.name} size="md" />
              <div className="text-left">
                <span className="text-[15px] font-bold text-white block">{call.otherUser?.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isIncoming ? (<PhoneIncoming className="w-3 h-3 text-[#00BFFF]" />) : (<PhoneOutgoing className="w-3 h-3 text-nc-muted" />)}
                  <span className="text-[11px] text-nc-muted font-medium">{date} • {callType}</span>
                </div>
              </div>
            </div>

            <button onClick={handleCallClick} className="w-8 h-8 rounded-xl bg-white/5 group-hover:bg-[#00BFFF] group-hover:text-black flex items-center justify-center text-white/70 hover:text-black transition-all active:scale-95 shrink-0" title={`Call ${call.otherUser?.name || 'User'} (${callType})`}>
              {callType === 'video' ? (<Video className="w-4 h-4" />) : (<Phone className="w-4 h-4" />)}
            </button>
          </div>);
        })}
      </div>) : (<p className="text-xs text-nc-muted text-center py-8">No call history found.</p>)) : (
        <div className="flex flex-col">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center py-3.5 px-4 bg-transparent animate-pulse gap-3" aria-hidden="true">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full skeleton shrink-0" />
                <div className="space-y-2 text-left">
                  <div className="h-4 skeleton rounded w-24" />
                  <div className="h-3 skeleton rounded w-16" />
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl skeleton shrink-0" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>);
}
