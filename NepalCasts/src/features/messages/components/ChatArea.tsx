import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PhoneOff, VideoOff, Phone, Video, Check, Trash2, ChevronLeft, X, Pin, PinOff, Clock, Copy, Download, Share2, ExternalLink, FileText } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../../components/ui';
import { saveImageDirectly } from '../../../utils/media';
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
    const otherParticipantId = chat?.participants?.find((p: string) => p !== currentUser?.uid) || chat?.otherParticipantId || chat?.id;
    const isTyping = otherParticipantId ? typingUsers?.[otherParticipantId] === true : false;
    const [isOnline, setIsOnline] = useState<boolean>(chat?.online === true || chat?.isOnline === true);

    useEffect(() => {
        setIsOnline(chat?.online === true || chat?.isOnline === true);
        if (!otherParticipantId) return;

        const checkPresence = (data: any) => {
            if (!data) return;
            if (typeof data.isOnline === 'boolean') {
                setIsOnline(data.isOnline);
            } else if (typeof data.online === 'boolean') {
                setIsOnline(data.online);
            }
        };

        const unsubUser = onSnapshot(doc(db, 'users', otherParticipantId), (snap) => {
            if (snap.exists()) checkPresence(snap.data());
        }, () => {});

        const unsubProfile = onSnapshot(doc(db, 'profiles', otherParticipantId), (snap) => {
            if (snap.exists()) checkPresence(snap.data());
        }, () => {});

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
        if (isInitialMount.current) {
            isInitialMount.current = false;
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        } else {
            if (containerRef.current) {
                containerRef.current.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [messages.length]);

    useEffect(() => {
        isInitialMount.current = true;
    }, [chat?.id]);

    const isAppChat = Boolean(
        chat?.isApplication ||
        chat?.applicationId ||
        chat?.castingId ||
        chat?.type === 'application' ||
        chat?.id?.startsWith('app_')
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-hidden select-none">
            {/* Top Chat Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-white/5 bg-[#0d0d0f] flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Back"
                        aria-label="Back"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </button>
                    <Avatar
                        userId={otherParticipantId}
                        src={chat?.avatar}
                        name={chat?.name}
                        size="md"
                        showStatus={true}
                        className="!w-12 !h-12 sm:!w-13 sm:!h-13 shrink-0 rounded-full"
                    />
                    <div className="text-left flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white leading-tight">
                                {chat?.name || 'User'}
                            </span>
                            {isAppChat && (
                                <span className="text-[9px] font-bold text-purple-300 bg-[#522C69]/30 border border-[#522C69]/40 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                    {chat?.roleName || 'Audition'}
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] block tracking-wide font-medium mt-0.5">
                            {isTyping ? (
                                <span className="text-[#522C69] animate-pulse font-semibold">Typing...</span>
                            ) : isOnline ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    Online
                                </span>
                            ) : (
                                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
                                    Offline
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => onInitiateCall('audio')} title="Start Voice Call" className="p-2 text-gray-300 hover:text-white transition-colors cursor-pointer active:scale-95">
                        <Phone className="w-5 h-5" strokeWidth={1.8} />
                    </button>
                    {onTogglePinnedDrawer && (
                        <button onClick={onTogglePinnedDrawer} title="View Pinned Messages" className={`p-2 transition-colors cursor-pointer active:scale-95 ${isPinnedDrawerOpen ? 'text-[#522C69]' : 'text-gray-300 hover:text-white'}`}>
                            <Pin className="w-5 h-5" strokeWidth={1.8} />
                        </button>
                    )}
                </div>
            </div>

            {/* Application Detail Header Banner */}
            {isAppChat && (chat?.castingTitle || chat?.roleName) && (
                <div className="px-4 py-2.5 bg-[#522C69]/15 border-b border-[#522C69]/30 flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#522C69]/30 flex items-center justify-center shrink-0 text-purple-300">
                            <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white truncate">
                                    {chat.castingTitle || 'Casting Call'}
                                </span>
                                {chat.status && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        {chat.status}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 block truncate">
                                Applied Role: <span className="text-purple-300 font-semibold">{chat.roleName || 'Audition'}</span>
                            </span>
                        </div>
                    </div>
                    {chat.castingId && (
                        <a
                            href={`/casting/${chat.castingId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 shrink-0 transition-all"
                        >
                            <span>View Call</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            )}

            {/* Messages Scroll Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 no-scrollbar bg-[#141414] flex flex-col">
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
                      <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border ${borderColor} ${bgColor} shadow-md backdrop-blur-md`}>
                        <Icon className={`w-3.5 h-3.5 ${color} shrink-0`}/>
                        <span className={`text-xs font-semibold ${color}`}>{text}</span>
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
                    cornerRadius = 'rounded-xl rounded-tr-sm rounded-br-sm';
                } else if (isGroupedWithNext) {
                    cornerRadius = 'rounded-xl rounded-tr-sm';
                } else {
                    cornerRadius = 'rounded-xl rounded-br-none';
                }
            } else {
                if (isGroupedWithPrev && isGroupedWithNext) {
                    cornerRadius = 'rounded-xl rounded-tl-sm rounded-bl-sm';
                } else if (isGroupedWithNext) {
                    cornerRadius = 'rounded-xl rounded-tl-sm';
                } else {
                    cornerRadius = 'rounded-xl rounded-bl-none';
                }
            }
            const marginClass = (isGroupedWithPrev || isGroupedWithNext) ? 'my-0.5' : 'my-2.5';
            const showAvatar = !isMe && !isGroupedWithNext;
            const showTimestamp = !isGroupedWithNext || msg.isPinned || msg.hasPendingWrites;
            return (<div key={msg.id} className={`group flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] ${marginClass} ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'} cv-auto-chat`} onTouchStart={() => startMessagePress(msg)} onTouchEnd={endMessagePress} onTouchMove={endMessagePress} onMouseDown={(e) => {
                    if (e.button !== 0)
                        return;
                    startMessagePress(msg);
                }} onMouseUp={endMessagePress} onMouseLeave={endMessagePress}>
                
                {!isMe && (<div className="shrink-0 mb-0.5">
                    {showAvatar ? (
                        <Avatar userId={otherParticipantId} src={chat.avatar} name={chat.name} size="md" className="!w-10 !h-10 shrink-0 rounded-full"/>
                    ) : (
                        <div className="w-10 h-10 shrink-0"/>
                    )}
                  </div>)}

                
                <div className="flex flex-col min-w-0">
                  {msg.replyTo && (<div className="bg-white/5 border-l-2 border-[#522C69] p-2 rounded-xl text-[10px] text-gray-400 mb-1 max-w-[240px] truncate text-left">
                      {msg.replyTo.text}
                    </div>)}

                  {(() => {
                    const rawText = msg.text || '';
                    const urlMatches = rawText.match(/https?:\/\/[^\s]+/g) || [];
                    const allMediaUrls = [...urlMatches];
                    if ((msg as any).fileUrl && !allMediaUrls.includes((msg as any).fileUrl)) allMediaUrls.push((msg as any).fileUrl);
                    if ((msg as any).attachmentUrl && !allMediaUrls.includes((msg as any).attachmentUrl)) allMediaUrls.push((msg as any).attachmentUrl);
                    if ((msg as any).selfTapeUrl && !allMediaUrls.includes((msg as any).selfTapeUrl)) allMediaUrls.push((msg as any).selfTapeUrl);

                    // Clean text by stripping out raw URLs and labels
                    let cleanedText = rawText;
                    urlMatches.forEach(u => {
                      cleanedText = cleanedText.replace(u, '');
                    });
                    cleanedText = cleanedText
                      .replace(/Attached File:?/gi, '')
                      .replace(/Video Reel:?/gi, '')
                      .replace(/Attachment:?/gi, '')
                      .replace(/File:?/gi, '')
                      .trim();

                    const isOnlyImage = msg.type === 'image' || (allMediaUrls.length === 1 && !cleanedText && (allMediaUrls[0].includes('/image/upload/') || allMediaUrls[0].match(/\.(jpeg|jpg|gif|png|webp|svg)/i)));
                    const isOnlyVideo = msg.type === 'video' || (allMediaUrls.length === 1 && !cleanedText && (allMediaUrls[0].includes('/video/upload/') || allMediaUrls[0].match(/\.(mp4|webm|ogg|mov)/i)));
                    const isMediaOnly = isOnlyImage || isOnlyVideo;

                    return (
                      <div className={`text-sm text-left ${isMediaOnly
                        ? `p-0 bg-[#181818] shadow-sm ${cornerRadius} overflow-hidden`
                        : isMe
                          ? `px-3.5 py-2.5 bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white font-medium shadow-sm ${cornerRadius}`
                          : `px-3.5 py-2.5 bg-[#222222] text-gray-200 shadow-sm ${cornerRadius}`}`}>
                        
                        {/* Display Text Content */}
                        {cleanedText && (
                          <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">{cleanedText}</p>
                        )}

                        {/* Display Attached Media or Files */}
                        {allMediaUrls.length > 0 && (
                          <div className={`space-y-2 ${cleanedText ? 'mt-2.5 pt-2 border-t border-white/10' : ''}`}>
                            {allMediaUrls.map((mediaUrl, mIdx) => {
                              const isImg = mediaUrl.includes('/image/upload/') || mediaUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || msg.type === 'image';
                              const isVid = mediaUrl.includes('/video/upload/') || mediaUrl.match(/\.(mp4|webm|ogg|mov)/i) || msg.type === 'video';

                              if (isImg) {
                                return (
                                  <div key={mIdx} className="overflow-hidden rounded-xl aspect-square w-52 sm:w-64 max-w-full">
                                    <img
                                      src={mediaUrl}
                                      alt="Attachment"
                                      className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                      onClick={(e) => {
                                        if (isLongPressActive.current) {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          return;
                                        }
                                        setLightboxUrl(mediaUrl);
                                      }}
                                    />
                                  </div>
                                );
                              }

                              if (isVid) {
                                return (
                                  <div key={mIdx} className="overflow-hidden rounded-xl max-w-full sm:max-w-[320px] bg-black/40 border border-white/10">
                                    <video
                                      src={mediaUrl}
                                      controls
                                      playsInline
                                      className="w-full max-h-[280px] rounded-xl object-contain"
                                    />
                                  </div>
                                );
                              }

                              return (
                                <a
                                  key={mIdx}
                                  href={mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all max-w-full truncate"
                                  onClick={(e) => {
                                    if (isLongPressActive.current) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                  }}
                                >
                                  <FileText className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                                  <span className="truncate">View Attached File</span>
                                  <ExternalLink className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  
                  {showTimestamp && (<div className={`flex items-center gap-1.5 mt-1 text-[9px] text-nc-muted ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {msg.isPinned && <Pin className="w-2.5 h-2.5 text-white shrink-0"/>}
                    <span>{msg.hasPendingWrites ? 'Sending...' : formatMessageTime(msg.createdAt)}</span>
                    {isMe && (msg.hasPendingWrites ? (<Clock className="w-3 h-3 text-nc-muted animate-pulse"/>) : (<Check className="w-3 h-3 text-white"/>))}
                  </div>)}
                </div>

                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                  {onPinMessage && (<button onClick={() => onPinMessage(msg.id)} className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer ${msg.isPinned ? 'text-[#522C69]' : 'text-nc-muted hover:text-[#522C69]'}`} title={msg.isPinned ? 'Unpin Message' : 'Pin Message'}>
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
        {activeActionMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveActionMessage(null)} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} transition={{ type: 'spring', damping: 25, stiffness: 350 }} className="bg-[#121216] border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl p-4 sm:p-5 space-y-3 text-left" onClick={(e) => e.stopPropagation()}>
              <div className="text-left pb-2 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">Message Options</h4>
                  <p className="text-[11px] text-gray-400 font-medium truncate max-w-[200px]">
                    {activeActionMessage.text || 'Selected Message'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveActionMessage(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {/* Save Option (for images/media) */}
                {activeActionMessage.text && (activeActionMessage.type === 'image' || activeActionMessage.text.startsWith('http')) && (
                  <button
                    onClick={() => {
                      const target = activeActionMessage.text;
                      setActiveActionMessage(null);
                      saveImageDirectly(target, 'nepalcasts-media.jpg');
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-gray-200 hover:text-white font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-gray-300" />
                    <span>Save Image</span>
                  </button>
                )}

                {/* Share Option */}
                {activeActionMessage.text && (
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'NepalCasts Attachment',
                          url: activeActionMessage.text,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(activeActionMessage.text);
                      }
                      setActiveActionMessage(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-gray-200 hover:text-white font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-gray-300" />
                    <span>Share</span>
                  </button>
                )}

                {/* Pin Option */}
                {onPinMessage && (
                  <button
                    onClick={() => {
                      onPinMessage(activeActionMessage.id);
                      setActiveActionMessage(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-gray-200 hover:text-white font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                  >
                    {activeActionMessage.isPinned ? <PinOff className="w-4 h-4 text-gray-300" /> : <Pin className="w-4 h-4 text-gray-300" />}
                    <span>{activeActionMessage.isPinned ? 'Unpin Message' : 'Pin Message'}</span>
                  </button>
                )}

                {/* Copy Text Option */}
                {activeActionMessage.text && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeActionMessage.text);
                      setActiveActionMessage(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-gray-200 hover:text-white font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-gray-300" />
                    <span>Copy Message</span>
                  </button>
                )}

                {/* Delete Option */}
                {(activeActionMessage.senderId === currentUser?.uid || currentUser?.role === 'admin') && onDeleteMessage && (
                  <button
                    onClick={() => {
                      onDeleteMessage(activeActionMessage.id);
                      setActiveActionMessage(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="pt-1">
                <button onClick={() => setActiveActionMessage(null)} className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-bold text-gray-400 hover:text-white transition-all cursor-pointer">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>);
}
