import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, VideoOff, Phone, Video, MoreVertical, Reply, Check, Trash2, ChevronLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../../components/ui';
import type { Message } from '../../../types';

interface ChatAreaProps {
  chat: any;
  messages: Message[];
  currentUser: any;
  typingUsers: Record<string, boolean>;
  onBack: () => void;
  onInitiateCall: (type: 'audio' | 'video') => void;
  onReplyTo: (msg: Message) => void;
  onDeleteMessage?: (msgId: string) => void;
}

const formatMessageTime = (timestamp?: any) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

export default function ChatArea({
  chat,
  messages,
  currentUser,
  typingUsers,
  onBack,
  onInitiateCall,
  onReplyTo,
  onDeleteMessage
}: ChatAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const otherParticipantId = chat.participants?.find((p: string) => p !== currentUser.uid);
  const isTyping = typingUsers[otherParticipantId] === true;

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c]">
      {/* Header */}
      <div className="px-6 py-4 pt-6 md:py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="md:hidden w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 flex items-center justify-center text-white border border-white/10 transition-colors shrink-0 no-min-h shadow-sm active:scale-95"
            title="Back to Inbox"
          >
            <ChevronLeft className="w-6 h-6 text-white" strokeWidth={2.2} />
          </button>
          <Avatar src={chat.avatar} name={chat.name} size="md" className="w-11 h-11 sm:w-12 sm:h-12 shrink-0" />
          <div className="text-left">
            <span className="text-base sm:text-lg font-extrabold text-white block leading-tight">{chat.name}</span>
            <span className="text-xs text-nc-muted block uppercase tracking-wider font-semibold mt-0.5">
              {isTyping ? <span className="text-[#00BFFF] animate-pulse">Typing...</span> : 'Online'}
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => onInitiateCall('audio')}
            title="Start Voice Call"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm active:scale-95"
          >
            <Phone className="w-5 h-5 text-white/90" strokeWidth={2} />
          </button>
          <button 
            onClick={() => onInitiateCall('video')}
            title="Start Video Call"
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm active:scale-95"
          >
            <Video className="w-5.5 h-5.5 text-white/90" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Box */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-black/10"
      >
        {messages.length > 0 ? (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            
            return (
              msg.senderId === 'system' ? (
                /* ── System / Call-log pill ── */
                (() => {
                  const text = msg.text || '';
                  const isVideo = text.toLowerCase().startsWith('video');
                  const isMissed = text.includes('Missed') || text.includes('Cancelled') || text.includes('Declined') || text.includes('Busy');
                  const Icon = isMissed
                    ? (isVideo ? VideoOff : PhoneOff)
                    : (isVideo ? Video : Phone);
                  const color = isMissed ? 'text-red-400' : 'text-emerald-400';
                  const borderColor = isMissed ? 'border-red-500/15' : 'border-emerald-500/15';
                  const bgColor = isMissed ? 'bg-red-950/20' : 'bg-emerald-950/20';
                  return (
                    <div key={msg.id} className="flex justify-center my-1">
                      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${borderColor} ${bgColor} backdrop-blur-sm`}>
                        <Icon className={`w-3 h-3 ${color} shrink-0`} />
                        <span className={`text-[11px] font-medium ${color}`}>{text}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
              <div 
                key={msg.id} 
                className={`group flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] my-2 ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Sender Avatar for incoming messages */}
                {!isMe && (
                  <div className="shrink-0 mb-1.5">
                    <Avatar src={chat.avatar} name={chat.name} size="sm" />
                  </div>
                )}

                {/* Bubble and Timestamp Container */}
                <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Reply block if exists */}
                  {msg.replyTo && (
                    <div className="bg-white/5 border-l-2 border-[#00BFFF] p-2 rounded-xl text-[10px] text-nc-muted mb-1 max-w-[240px] truncate text-left">
                      {msg.replyTo.text}
                    </div>
                  )}

                  <div className={`px-4 py-3 text-sm text-left ${
                    isMe 
                      ? 'bg-gradient-to-br from-sky-400 to-sky-500 text-black font-semibold shadow-[0_4px_12px_rgba(56,189,248,0.15)] rounded-2xl rounded-br-none' 
                      : 'bg-[#18181b] text-gray-200 border border-white/[0.03] shadow-sm rounded-2xl rounded-bl-none'
                  }`}>
                    {msg.type === 'image' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/image/upload/') || msg.text.match(/\.(jpeg|jpg|gif|png|webp|svg)/i))) ? (
                      <div className="space-y-1.5">
                        <img 
                          src={msg.text} 
                          alt="Sent a photo" 
                          className="max-w-full sm:max-w-[280px] max-h-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity border border-black/20"
                          onClick={() => setLightboxUrl(msg.text)}
                        />
                        <span className="text-[10px] opacity-60 block italic">Sent a photo</span>
                      </div>
                    ) : msg.type === 'video' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/video/upload/') || msg.text.match(/\.(mp4|webm|ogg|mov)/i))) ? (
                      <div className="space-y-1.5">
                        <video 
                          src={msg.text} 
                          controls 
                          className="max-w-full sm:max-w-[280px] max-h-[200px] rounded-xl object-cover border border-black/20"
                        />
                        <span className="text-[10px] opacity-60 block italic">Sent a video</span>
                      </div>
                    ) : msg.type === 'file' || (msg.text && msg.text.startsWith('http') && msg.text.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)/i)) ? (
                      <div className="flex items-center gap-2">
                        <span>📁</span>
                        <a 
                          href={msg.text} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={`hover:underline font-bold break-all ${isMe ? 'text-black' : 'text-sky-400'}`}
                        >
                          Document File
                        </a>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>

                  {/* Timestamp & read check */}
                  <div className={`flex items-center gap-1.5 mt-1 text-[9px] text-nc-muted ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isMe && <Check className="w-3 h-3 text-[#00BFFF]" />}
                  </div>
                </div>

                {/* Hover Popover Action Controls */}
                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => onReplyTo(msg)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-nc-muted hover:text-white transition-colors"
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  {isMe && onDeleteMessage && (
                    <button 
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-nc-muted hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              )
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-center p-6 text-nc-muted text-xs">
            Start the conversation by sending a message below.
          </div>
        )}

        {isTyping && (
          <div className="mr-auto text-left max-w-[70%] bg-white/5 border border-white/5 px-4 py-2.5 rounded-3xl rounded-tl-none text-xs text-nc-muted flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={lightboxUrl} 
                alt="Fullscreen Preview" 
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute -top-12 right-0 md:-top-4 md:-right-12 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/5 active:scale-95"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export type { ChatAreaProps };
