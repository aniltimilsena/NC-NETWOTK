import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PhoneOff, VideoOff, Phone, Video, Check, Trash2, ChevronLeft, X, Pin, PinOff, Clock, Copy } from 'lucide-react';
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
    onPinMessage?: (msgId: string) => void;
    onTogglePinnedDrawer?: () => void;
    isPinnedDrawerOpen?: boolean;
}
const formatMessageTime = (timestamp?: any) => {
    if (!timestamp)
        return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime()))
            return '';
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    catch (e) {
        return '';
    }
};
const getMsgMs = (timestamp?: any) => {
    if (!timestamp)
        return 0;
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return isNaN(date.getTime()) ? 0 : date.getTime();
    }
    catch (e) {
        return 0;
    }
};
export default function ChatArea({ chat, messages, currentUser, typingUsers, onBack, onInitiateCall, onReplyTo, onDeleteMessage, onPinMessage, onTogglePinnedDrawer, isPinnedDrawerOpen }: ChatAreaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [activeActionMessage, setActiveActionMessage] = useState<Message | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressActive = useRef(false);
    const isInitialMount = useRef(true);
    const otherParticipantId = chat?.participants?.find((p: string) => p !== currentUser?.uid) || chat?.otherParticipantId;
    const isTyping = otherParticipantId ? typingUsers?.[otherParticipantId] === true : false;
    const [isOnline, setIsOnline] = useState<boolean>(chat?.online === true || chat?.isOnline === true);
    useEffect(() => {
        setIsOnline(chat?.online === true || chat?.isOnline === true);
        if (!otherParticipantId)
            return;
        const unsubUser = onSnapshot(doc(db, 'users', otherParticipantId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (typeof data.isOnline === 'boolean')
                    setIsOnline(data.isOnline);
                else if (typeof data.online === 'boolean')
                    setIsOnline(data.online);
            }
        }, () => { });
        const unsubProfile = onSnapshot(doc(db, 'profiles', otherParticipantId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (typeof data.isOnline === 'boolean')
                    setIsOnline(data.isOnline);
                else if (typeof data.online === 'boolean')
                    setIsOnline(data.online);
            }
        }, () => { });
        return () => {
            unsubUser();
            unsubProfile();
        };
    }, [otherParticipantId, chat?.online, chat?.isOnline]);
    const startMessagePress = (msg: Message) => {
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressActive.current = true;
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(60);
            }
            setActiveActionMessage(msg);
        }, 1000);
    };
    const endMessagePress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setTimeout(() => {
            isLongPressActive.current = false;
        }, 50);
    };
    useEffect(() => {
        if (containerRef.current) {
            const behavior = isInitialMount.current ? 'auto' : 'smooth';
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior
            });
            isInitialMount.current = false;
        }
    }, [messages.length, typingUsers, chat?.id]);
    useEffect(() => {
        isInitialMount.current = true;
    }, [chat?.id]);
    return (<div className="flex flex-col h-full bg-[#0b0b0c]">
      
      <div className="px-6 py-4 pt-6 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-all shrink-0 shadow-sm active:scale-95 cursor-pointer" title="Back to Inbox" aria-label="Back to Inbox">
            <ChevronLeft className="w-6 h-6 text-white" strokeWidth={2.5}/>
          </button>
          <Avatar userId={otherParticipantId} src={chat?.avatar} name={chat?.name} size="md" className="w-11 h-11 sm:w-12 sm:h-12 shrink-0" showStatus={true} status={isOnline ? 'online' : 'offline'}/>
          <div className="text-left">
            <span className="text-base sm:text-lg font-extrabold text-white block leading-tight">{chat?.name}</span>
            <span className="text-xs block uppercase tracking-wider font-semibold mt-0.5">
              {isTyping ? <span className="text-[#00BFFF] animate-pulse">Typing...</span> : isOnline ? <span className="text-emerald-400">Online</span> : <span className="text-nc-muted">Offline</span>}
            </span>
          </div>
        </div>

        
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => onInitiateCall('audio')} title="Start Voice Call" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 shadow-sm active:scale-95">
            <Phone className="w-5 h-5 text-white/90" strokeWidth={2}/>
          </button>
          {onTogglePinnedDrawer && (<button onClick={onTogglePinnedDrawer} title="View Pinned Messages" className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm active:scale-95 border ${isPinnedDrawerOpen
                ? 'bg-[#00BFFF] border-[#00BFFF] text-black hover:bg-[#00BFFF]/90'
                : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/10'}`}>
              <Pin className="w-5 h-5" strokeWidth={2}/>
            </button>)}
        </div>
      </div>

      
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-1 no-scrollbar bg-black/10 flex flex-col">
        {messages.length > 0 ? (messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser?.uid;
            const isSystemMsg = msg.senderId === 'system' || msg.isSystem || (typeof msg.text === 'string' && (msg.text.includes('call •') || msg.text.includes('Call •')));
            if (isSystemMsg) {
                const text = msg.text || '';
                const isVideo = text.toLowerCase().includes('video');
                const isMissed = text.includes('Missed') || text.includes('Cancelled') || text.includes('Declined') || text.includes('Busy') || text.includes('Failed') || text.includes('Offline') || text.includes('Error');
                const Icon = isMissed
                    ? (isVideo ? VideoOff : PhoneOff)
                    : (isVideo ? Video : Phone);
                const color = isMissed ? 'text-red-400' : 'text-emerald-400';
                const borderColor = isMissed ? 'border-red-900/50' : 'border-emerald-900/50';
                const bgColor = isMissed ? 'bg-[#1F0A0B]' : 'bg-[#0B1F12]';
                return (<div key={msg.id} className="flex justify-center my-3">
                      <div className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full border ${borderColor} ${bgColor} shadow-md backdrop-blur-md`}>
                        <Icon className={`w-4 h-4 ${color} shrink-0`}/>
                        <span className={`text-xs sm:text-sm font-semibold ${color}`}>{text}</span>
                      </div>
                    </div>);
            }
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            const isSameSenderPrev = prevMsg && !prevMsg.isSystem && prevMsg.senderId === msg.senderId;
            const isSameSenderNext = nextMsg && !nextMsg.isSystem && nextMsg.senderId === msg.senderId;
            const timePrevDiff = isSameSenderPrev ? Math.abs(getMsgMs(msg.createdAt) - getMsgMs(prevMsg?.createdAt)) : Infinity;
            const timeNextDiff = isSameSenderNext ? Math.abs(getMsgMs(nextMsg?.createdAt) - getMsgMs(msg.createdAt)) : Infinity;
            const isGroupedWithPrev = Boolean(isSameSenderPrev && timePrevDiff <= 120000);
            const isGroupedWithNext = Boolean(isSameSenderNext && timeNextDiff <= 120000);
            let cornerRadius: string;
            if (isMe) {
                if (isGroupedWithPrev && isGroupedWithNext) {
                    cornerRadius = 'rounded-2xl rounded-tr-sm rounded-br-sm';
                } else if (isGroupedWithNext) {
                    cornerRadius = 'rounded-2xl rounded-tr-sm';
                } else {
                    cornerRadius = 'rounded-2xl rounded-br-none';
                }
            } else {
                if (isGroupedWithPrev && isGroupedWithNext) {
                    cornerRadius = 'rounded-2xl rounded-tl-sm rounded-bl-sm';
                } else if (isGroupedWithNext) {
                    cornerRadius = 'rounded-2xl rounded-tl-sm';
                } else {
                    cornerRadius = 'rounded-2xl rounded-bl-none';
                }
            }
            const marginClass = (isGroupedWithPrev || isGroupedWithNext) ? 'my-0.5' : 'my-2.5';
            const showAvatar = !isMe && !isGroupedWithNext;
            const showTimestamp = !isGroupedWithNext || msg.isPinned || msg.hasPendingWrites;
            return (<div key={msg.id} className={`group flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] ${marginClass} ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`} onTouchStart={() => startMessagePress(msg)} onTouchEnd={endMessagePress} onTouchMove={endMessagePress} onMouseDown={(e) => {
                    if (e.button !== 0)
                        return;
                    startMessagePress(msg);
                }} onMouseUp={endMessagePress} onMouseLeave={endMessagePress}>
                
                {!isMe && (<div className="shrink-0 mb-0.5">
                    {showAvatar ? (
                        <Avatar userId={otherParticipantId} src={chat.avatar} name={chat.name} size="sm"/>
                    ) : (
                        <div className="w-8 h-8 shrink-0"/>
                    )}
                  </div>)}

                
                <div className="flex flex-col min-w-0">
                  {msg.replyTo && (<div className="bg-white/5 border-l-2 border-[#00BFFF] p-2 rounded-xl text-[10px] text-nc-muted mb-1 max-w-[240px] truncate text-left">
                      {msg.replyTo.text}
                    </div>)}

                  {(() => {
                    const isImage = msg.type === 'image' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/image/upload/') || msg.text.match(/\.(jpeg|jpg|gif|png|webp|svg)/i)));
                    const isVideo = msg.type === 'video' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/video/upload/') || msg.text.match(/\.(mp4|webm|ogg|mov)/i)));
                    const isMediaMsg = Boolean(isImage || isVideo);

                    return (
                      <div className={`text-sm text-left ${isMediaMsg
                        ? `p-1 bg-[#18181b] border border-white/10 shadow-md ${cornerRadius} overflow-hidden`
                        : isMe
                          ? `px-4 py-2.5 bg-gradient-to-br from-sky-400 to-sky-500 text-black font-semibold shadow-[0_4px_12px_rgba(56,189,248,0.15)] ${cornerRadius}`
                          : `px-4 py-2.5 bg-[#18181b] text-gray-200 border border-white/[0.03] shadow-sm ${cornerRadius}`}`}>
                        {isImage ? (
                          <div className="overflow-hidden rounded-xl">
                            <img src={msg.text} alt="Sent photo" className="max-w-full sm:max-w-[280px] max-h-[280px] rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity" onClick={(e) => {
                              if (isLongPressActive.current) {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                              }
                              setLightboxUrl(msg.text);
                            }}/>
                          </div>
                        ) : isVideo ? (
                          <div className="overflow-hidden rounded-xl">
                            <video src={msg.text} controls className="max-w-full sm:max-w-[280px] max-h-[280px] rounded-xl object-cover"/>
                          </div>
                        ) : msg.type === 'file' || (msg.text && msg.text.startsWith('http') && msg.text.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)/i)) ? (<div className="flex items-center gap-2">
                            <span>📄</span>
                            <a href={msg.text} target="_blank" rel="noopener noreferrer" className={`hover:underline font-bold break-all ${isMe ? 'text-black' : 'text-sky-400'}`} onClick={(e) => {
                            if (isLongPressActive.current) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }}>
                              Document File
                            </a>
                          </div>) : (msg.text)}
                      </div>
                    );
                  })()}

                  
                  {showTimestamp && (<div className={`flex items-center gap-1.5 mt-1 text-[9px] text-nc-muted ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {msg.isPinned && <Pin className="w-2.5 h-2.5 text-[#00BFFF] shrink-0"/>}
                    <span>{msg.hasPendingWrites ? 'Sending...' : formatMessageTime(msg.createdAt)}</span>
                    {isMe && (msg.hasPendingWrites ? (<Clock className="w-3 h-3 text-nc-muted animate-pulse"/>) : (<Check className="w-3 h-3 text-[#00BFFF]"/>))}
                  </div>)}
                </div>

                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                  {onPinMessage && (<button onClick={() => onPinMessage(msg.id)} className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors ${msg.isPinned ? 'text-[#00BFFF]' : 'text-nc-muted hover:text-[#00BFFF]'}`} title={msg.isPinned ? 'Unpin Message' : 'Pin Message'}>
                      {msg.isPinned
                        ? <PinOff className="w-3.5 h-3.5"/>
                        : <Pin className="w-3.5 h-3.5"/>}
                    </button>)}
                  {isMe && onDeleteMessage && (<button onClick={() => onDeleteMessage(msg.id)} className="p-1.5 hover:bg-white/5 rounded-lg text-nc-muted hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>)}
                </div>
              </div>);
        })) : (<div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center p-6 my-auto text-nc-muted text-xs space-y-2.5">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-1 border border-white/5">
              <span className="text-2xl">💬</span>
            </div>
            <p className="font-medium text-gray-300">No messages yet. Start a conversation!</p>
          </div>)}

        {isTyping && (<div className="mr-auto text-left max-w-[70%] bg-white/5 border border-white/5 px-4 py-2.5 rounded-3xl rounded-tl-none text-xs text-nc-muted flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }}/>
          </div>)}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightboxUrl(null)} className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxUrl} alt="Fullscreen Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"/>
              <button onClick={() => setLightboxUrl(null)} className="absolute -top-12 right-0 md:-top-4 md:-right-12 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/5 active:scale-95" title="Close">
                <X className="w-5 h-5"/>
              </button>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>

      
      <AnimatePresence>
        {activeActionMessage && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveActionMessage(null)} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="bg-[#18181b] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="text-center pb-2 border-b border-white/5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Message Actions</h4>
                <p className="text-[11px] text-nc-muted truncate mt-1 px-4">
                  {activeActionMessage.text}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                
                {onPinMessage && (<button onClick={() => {
                    onPinMessage(activeActionMessage.id);
                    setActiveActionMessage(null);
                }} className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all active:scale-[0.98] text-left flex items-center gap-3 cursor-pointer font-sans">
                    {activeActionMessage.isPinned
                    ? <PinOff className="w-4 h-4 text-[#00BFFF]"/>
                    : <Pin className="w-4 h-4 text-[#00BFFF]"/>}
                    {activeActionMessage.isPinned ? 'Unpin Message' : 'Pin Message'}
                  </button>)}

                
                {activeActionMessage.text && (<button onClick={() => {
                    navigator.clipboard.writeText(activeActionMessage.text);
                    setActiveActionMessage(null);
                }} className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all active:scale-[0.98] text-left flex items-center gap-3 cursor-pointer font-sans">
                    <Copy className="w-4 h-4 text-nc-muted"/>
                    Copy Message
                  </button>)}

                
                {activeActionMessage.senderId === currentUser?.uid && onDeleteMessage && (<button onClick={() => {
                    onDeleteMessage(activeActionMessage.id);
                    setActiveActionMessage(null);
                }} className="w-full py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs transition-all active:scale-[0.98] text-left flex items-center gap-3 cursor-pointer font-sans">
                    <Trash2 className="w-4 h-4 text-red-400"/>
                    Delete Message
                  </button>)}
              </div>

              <button onClick={() => setActiveActionMessage(null)} className="w-full py-3 text-center text-xs font-bold text-nc-muted hover:text-white transition-colors cursor-pointer font-sans">
                Cancel
              </button>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>
    </div>);
}
