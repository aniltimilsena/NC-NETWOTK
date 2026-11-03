import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PhoneOff, VideoOff, Phone, Video, Check, Trash2, ChevronLeft, X, Pin, PinOff, Clock, Copy, Download, ExternalLink, FileText, CornerUpLeft, Forward, ImageOff } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../../components/ui';
import { saveImageDirectly, getOptimizedImageUrl } from '../../../utils/media';
import type { Message } from '../../../types';
import { isUserOnline } from '../../../utils/presence';
import { getSavedRealTalents } from '../../profile/services/users';
import { extractOtherParticipantId, isDirectConversationId, getResolvedTargetId } from '../hooks/useMessages';
import { getProfile } from '../../profile/services/profile';

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
    onReactToMessage?: (msgId: string, emoji: string) => void;
    onForwardMessage?: (text: string, toConversationId: string) => Promise<void>;
    conversations?: any[];
    onTogglePinnedDrawer?: () => void;
    isPinnedDrawerOpen?: boolean;
}

const formatMessageTime = (timestamp?: any) => {
    if (!timestamp)
        return '';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

export default function ChatArea({ chat, messages, currentUser, typingUsers, onBack, onInitiateCall, onReplyTo, onDeleteMessage, onPinMessage, onReactToMessage, onForwardMessage, conversations = [], onTogglePinnedDrawer, isPinnedDrawerOpen = false }: ChatAreaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [activeActionMessage, setActiveActionMessage] = useState<Message | null>(null);
    const [popupPos, setPopupPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
    const [forwardMsg, setForwardMsg] = useState<string | null>(null);
    const [failedMediaUrls, setFailedMediaUrls] = useState<Record<string, boolean>>({});
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressActive = useRef(false);
    const isInitialMount = useRef(true);
    const rawOtherId = chat?.otherParticipantId || chat?.participants?.find((p: string) => p !== currentUser?.uid);
    const otherParticipantId = (rawOtherId && currentUser?.uid && isDirectConversationId(rawOtherId, currentUser.uid))
        ? extractOtherParticipantId(rawOtherId, currentUser.uid)
        : (rawOtherId ? getResolvedTargetId(rawOtherId) : (chat?.id && currentUser?.uid && isDirectConversationId(chat.id, currentUser.uid) ? extractOtherParticipantId(chat.id, currentUser.uid) : ''));
    const isTyping = otherParticipantId ? typingUsers?.[otherParticipantId] === true : false;
    const [isOnline, setIsOnline] = useState<boolean>(() => isUserOnline(chat));
    const otherUserDataRef = useRef<any>(null);
    const [liveUserData, setLiveUserData] = useState<any>(null);

    useEffect(() => {
        setIsOnline(isUserOnline(chat));
        if (!otherParticipantId) return;

        // Check local saved talents cache immediately
        const saved = getSavedRealTalents();
        const cleanId = otherParticipantId.replace(/^@/, '').toLowerCase().trim();
        const cached = saved.find((t: any) => {
            const tUid = t.uid || t.id;
            const tUser = (t.username || '').toLowerCase().trim();
            const tName = (t.name || '').toLowerCase().trim();
            return tUid === otherParticipantId || (Boolean(cleanId && tUser) && tUser === cleanId) || (Boolean(cleanId && tName) && tName === cleanId);
        });
        if (cached) {
            setLiveUserData(cached);
        } else {
            getProfile(otherParticipantId).then((res) => {
                if (res.data) handleUserData(res.data);
            }).catch(() => {});
        }

        const handleUserData = (data: any) => {
            if (!data) return;
            otherUserDataRef.current = { ...(otherUserDataRef.current || {}), ...data };
            setLiveUserData((prev: any) => ({ ...(prev || {}), ...data }));
            setIsOnline(isUserOnline(data));
        };

        const unsubUser = onSnapshot(doc(db, 'users', otherParticipantId), (snap) => {
            if (snap.exists()) handleUserData(snap.data());
        }, () => {});

        const unsubProfile = onSnapshot(doc(db, 'profiles', otherParticipantId), (snap) => {
            if (snap.exists()) handleUserData(snap.data());
        }, () => {});

        // Re-evaluate presence every 20 seconds to automatically transition to Offline when inactive
        const presenceTicker = setInterval(() => {
            if (otherUserDataRef.current) {
                setIsOnline(isUserOnline(otherUserDataRef.current));
            } else if (chat) {
                setIsOnline(isUserOnline(chat));
            }
        }, 20000);

        return () => {
            unsubUser();
            unsubProfile();
            clearInterval(presenceTicker);
        };
    }, [otherParticipantId, chat]);

    const displayName = (chat?.name && chat.name !== 'User' && chat.name !== 'Loading...')
        ? chat.name
        : (liveUserData?.name ||
           [liveUserData?.firstName, liveUserData?.lastName].filter(Boolean).join(' ') ||
           liveUserData?.displayName ||
           liveUserData?.username ||
           chat?.name ||
           'User');

    const displayAvatar = (chat?.avatar)
        ? chat.avatar
        : (liveUserData?.image ||
           liveUserData?.photoURL ||
           liveUserData?.profileImage ||
           '');

    const startMessagePress = (msg: Message, el?: HTMLElement | null) => {
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressActive.current = true;
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(60);
            }
            // Compute fixed position from the element bounding rect
            if (el) {
                const rect = el.getBoundingClientRect();
                const isRight = rect.left + rect.width / 2 > window.innerWidth / 2;
                const top = Math.min(rect.bottom + 6, window.innerHeight - 280);
                setPopupPos(
                    isRight
                        ? { top, right: window.innerWidth - rect.right }
                        : { top, left: rect.left }
                );
            }
            setActiveActionMessage(msg);
        }, 350);
    };

    const endMessagePress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setTimeout(() => {
            isLongPressActive.current = false;
        }, 100);
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
        <div className="flex-1 flex flex-col h-full bg-[#FAF8F4] overflow-hidden select-none font-inter">
            {/* Top Chat Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-[#E7E5E0] bg-white flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        type="button"
                        className="md:hidden w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9] transition-colors cursor-pointer shrink-0"
                        title="Back"
                        aria-label="Back"
                    >
                        <ChevronLeft className="w-6 h-6 text-[#202923]" strokeWidth={2.2} />
                    </button>
                    <Avatar
                        userId={otherParticipantId}
                        src={displayAvatar}
                        name={displayName}
                        size="md"
                        showStatus={true}
                        className="!w-12 !h-12 sm:!w-13 sm:!h-13 shrink-0 rounded-full border border-[#E7E5E0]"
                    />
                    <div className="text-left flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-[#202923] leading-tight">
                                {displayName}
                            </span>
                            {isAppChat && (
                                <span className="text-[9px] font-semibold text-[#194332] bg-[#EAF2ED] border border-[#194332]/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                    {chat?.roleName || 'Audition'}
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] block tracking-wide font-medium mt-0.5">
                            {isTyping ? (
                                <span className="text-[#194332] animate-pulse font-semibold">Typing...</span>
                            ) : isOnline ? (
                                <span className="text-[#286847] font-semibold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#286847] inline-block animate-pulse" />
                                    Online
                                </span>
                            ) : (
                                <span className="text-[#777C75] font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D5D1C7] inline-block" />
                                    Offline
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => onInitiateCall('audio')} title="Start Voice Call" className="p-2 text-[#626860] hover:text-[#194332] hover:bg-[#F3F0E9] rounded-full transition-colors cursor-pointer active:scale-95">
                        <Phone className="w-5 h-5" strokeWidth={1.8} />
                    </button>
                    {onTogglePinnedDrawer && (
                        <button onClick={onTogglePinnedDrawer} title="View Pinned Messages" className={`p-2 rounded-full transition-colors cursor-pointer active:scale-95 ${isPinnedDrawerOpen ? 'text-[#194332] bg-[#EAF2ED]' : 'text-[#626860] hover:text-[#202923] hover:bg-[#F3F0E9]'}`}>
                            <Pin className="w-5 h-5" strokeWidth={1.8} />
                        </button>
                    )}
                </div>
            </div>

            {/* Application Detail Header Banner */}
            {isAppChat && (chat?.castingTitle || chat?.roleName) && (
                <div className="px-4 py-2.5 bg-[#FAF4EC] border-b border-[#EADBC8] flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#EADBC8] flex items-center justify-center shrink-0 text-[#946019]">
                            <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#202923] truncate">
                                    {chat.castingTitle || 'Casting Call'}
                                </span>
                                {chat.status && (
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#EAF2ED] text-[#194332] border border-[#194332]/20">
                                        {chat.status}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] text-[#626860] block truncate">
                                Applied Role: <span className="text-[#194332] font-semibold">{chat.roleName || 'Audition'}</span>
                            </span>
                        </div>
                    </div>
                    {chat.castingId && (
                        <a
                            href={`/casting/${chat.castingId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#194332] hover:text-[#102F28] bg-white hover:bg-[#F3F0E9] px-2.5 py-1 rounded-lg border border-[#E7E5E0] shrink-0 transition-all shadow-xs"
                        >
                            <span>View Call</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            )}

            {/* Messages Scroll Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 no-scrollbar bg-[#FAF8F4] flex flex-col">
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
                const color = isMissed ? 'text-[#B42318]' : 'text-[#286847]';
                const borderColor = isMissed ? 'border-[#FDA29B]' : 'border-[#A6F4C5]';
                const bgColor = isMissed ? 'bg-[#FEF3F2]' : 'bg-[#ECFDF3]';
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
            return (<div key={msg.id} className={`group relative flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%] ${marginClass} ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'} cv-auto-chat`} onTouchStart={(e) => startMessagePress(msg, e.currentTarget)} onTouchEnd={endMessagePress} onTouchMove={endMessagePress} onMouseDown={(e) => {
                    if (e.button !== 0)
                        return;
                    startMessagePress(msg, e.currentTarget);
                }} onMouseUp={endMessagePress}>
                
                {!isMe && (<div className="shrink-0 mb-0.5">
                    {showAvatar ? (
                        <Avatar userId={otherParticipantId} src={chat.avatar} name={chat.name} size="md" className="!w-10 !h-10 shrink-0 rounded-full"/>
                    ) : (
                        <div className="w-10 h-10 shrink-0"/>
                    )}
                  </div>)}

                
                <div className="flex flex-col min-w-0">
                  {msg.replyTo && (<div className={`p-2 rounded-xl text-[10px] mb-1 max-w-[240px] truncate text-left ${isMe ? 'bg-black/15 border-l-2 border-[#D4A373] text-white/90' : 'bg-[#F3F0E9] border-l-2 border-[#194332] text-[#626860]'}`}>
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
                        ? `p-0 bg-white border border-[#E7E5E0] shadow-xs ${cornerRadius} overflow-hidden`
                        : isMe
                          ? `px-3.5 py-2.5 bg-[#194332] text-white font-medium shadow-xs ${cornerRadius}`
                          : `px-3.5 py-2.5 bg-white text-[#202923] border border-[#E7E5E0] font-normal shadow-xs ${cornerRadius}`}`}>
                        
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
                                const isFailed = failedMediaUrls[mediaUrl];
                                return (
                                  <div key={mIdx} className="overflow-hidden rounded-xl aspect-square w-52 sm:w-64 max-w-full bg-white/5 border border-white/5 relative">
                                    {isFailed ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-black/40 text-gray-400">
                                        <ImageOff className="w-7 h-7 text-gray-500 mb-1.5" />
                                        <span className="text-[11px] text-gray-400">Media unavailable</span>
                                      </div>
                                    ) : (
                                      <img
                                        src={getOptimizedImageUrl(mediaUrl, { width: 480, quality: 'auto', format: 'auto' })}
                                        alt="Attachment"
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                                        onError={() => {
                                          setFailedMediaUrls(prev => ({ ...prev, [mediaUrl]: true }));
                                        }}
                                        onClick={(e) => {
                                          if (isLongPressActive.current) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            return;
                                          }
                                          setLightboxUrl(mediaUrl);
                                        }}
                                      />
                                    )}
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
                                      preload="none"
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
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF8F4] hover:bg-[#F3F0E9] text-xs font-semibold text-[#194332] border border-[#E7E5E0] transition-all max-w-full truncate"
                                  onClick={(e) => {
                                    if (isLongPressActive.current) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                  }}
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#194332] shrink-0" />
                                  <span className="truncate">View Attached File</span>
                                  <ExternalLink className="w-3 h-3 text-[#777C75] shrink-0 ml-1" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  
                  {showTimestamp && (<div className={`flex items-center gap-1.5 mt-1 text-[9px] ${isMe ? 'text-[#626860] justify-end' : 'text-[#777C75] justify-start'}`}>
                    {msg.isPinned && <Pin className="w-2.5 h-2.5 text-[#194332] shrink-0"/>}
                    <span>{msg.hasPendingWrites ? 'Sending...' : formatMessageTime(msg.createdAt)}</span>
                    {isMe && (msg.hasPendingWrites ? (<Clock className="w-3 h-3 text-[#777C75] animate-pulse"/>) : (<Check className="w-3 h-3 text-[#194332]"/>))}
                  </div>)}

                  {/* Reaction Bubbles */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions)
                        .filter(([, uids]) => uids.length > 0)
                        .map(([emoji, uids]) => {
                          const iMine = uids.includes(currentUser?.uid);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReactToMessage?.(msg.id, emoji)}
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                                iMine
                                  ? 'bg-[#EAF2ED] border-[#194332]/30 text-[#194332] font-semibold'
                                  : 'bg-white border-[#E7E5E0] text-[#414840] hover:bg-[#FAF8F4]'
                              }`}
                            >
                              <span>{emoji}</span>
                              {uids.length > 1 && <span className="text-[10px] font-medium ml-0.5">{uids.length}</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

              </div>);
        })) : (<div className="flex-1 w-full h-full flex flex-col items-center justify-center text-center p-6 my-auto text-[#777C75] text-xs space-y-2.5">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-1 border border-[#E7E5E0] shadow-sm">
              <span className="text-2xl">💬</span>
            </div>
            <p className="font-medium text-[#202923]">No messages yet. Start a conversation!</p>
          </div>)}

        {isTyping && (<div className="mr-auto text-left max-w-[70%] bg-white border border-[#E7E5E0] px-4 py-2.5 rounded-3xl rounded-tl-none text-xs text-[#777C75] flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#194332] animate-bounce" style={{ animationDelay: '0ms' }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-[#194332] animate-bounce" style={{ animationDelay: '150ms' }}/>
            <span className="w-1.5 h-1.5 rounded-full bg-[#194332] animate-bounce" style={{ animationDelay: '300ms' }}/>
          </div>)}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightboxUrl(null)} className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={getOptimizedImageUrl(lightboxUrl, { width: 1440, quality: 'auto', format: 'auto' })}
                alt="Fullscreen Preview"
                decoding="async"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <button onClick={() => setLightboxUrl(null)} className="absolute -top-12 right-0 md:-top-4 md:-right-12 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/5 active:scale-95" title="Close">
                <X className="w-5 h-5"/>
              </button>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>

      {/* Message Action Menu — compact, tight, justified */}
      <AnimatePresence>
        {activeActionMessage && popupPos && (
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => { setActiveActionMessage(null); setPopupPos(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: popupPos.top,
                ...(popupPos.left !== undefined ? { left: popupPos.left } : {}),
                ...(popupPos.right !== undefined ? { right: popupPos.right } : {}),
              }}
              className="z-[61] w-[190px] bg-white border border-[#E7E5E0] rounded-xl shadow-card overflow-hidden select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Quick Emoji Row */}
              {onReactToMessage && (() => {
                const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','😡'];
                const myReactions = Object.entries(activeActionMessage.reactions || {})
                  .filter(([, uids]) => uids.includes(currentUser?.uid))
                  .map(([emoji]) => emoji);
                return (
                  <div className="flex items-center justify-around px-3 py-2.5 border-b border-[#E7E5E0]">
                    {QUICK_EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          onReactToMessage(activeActionMessage.id, e);
                          setActiveActionMessage(null); setPopupPos(null);
                        }}
                        className={`text-[18px] transition-transform hover:scale-125 active:scale-110 cursor-pointer ${
                          myReactions.includes(e) ? 'opacity-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                );
              })()}
              {/* Reply */}
              {onReplyTo && (
                <button
                  type="button"
                  onClick={() => { onReplyTo(activeActionMessage); setActiveActionMessage(null); setPopupPos(null); }}
                  className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] font-normal text-[#202923] hover:bg-[#FAF8F4] transition-colors cursor-pointer border-b border-[#E7E5E0]"
                >
                  <span>Reply</span>
                  <CornerUpLeft className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>
              )}

              {/* Copy */}
              {activeActionMessage.text && (
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(activeActionMessage.text); setActiveActionMessage(null); setPopupPos(null); }}
                  className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] font-normal text-[#202923] hover:bg-[#FAF8F4] transition-colors cursor-pointer border-b border-[#E7E5E0]"
                >
                  <span>Copy</span>
                  <Copy className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>
              )}

              {/* Pin */}
              {onPinMessage && (
                <button
                  type="button"
                  onClick={() => { onPinMessage(activeActionMessage.id); setActiveActionMessage(null); setPopupPos(null); }}
                  className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] font-normal text-[#202923] hover:bg-[#FAF8F4] transition-colors cursor-pointer border-b border-[#E7E5E0]"
                >
                  <span>{activeActionMessage.isPinned ? 'Unpin' : 'Pin'}</span>
                  {activeActionMessage.isPinned
                    ? <PinOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    : <Pin className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                </button>
              )}

              {/* Forward */}
              {activeActionMessage.text && (
                <button
                  type="button"
                  onClick={() => {
                    setForwardMsg(activeActionMessage.text);
                    setActiveActionMessage(null);
                    setPopupPos(null);
                  }}
                  className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] font-normal text-[#202923] hover:bg-[#FAF8F4] transition-colors cursor-pointer border-b border-[#E7E5E0]"
                >
                  <span>Forward</span>
                  <Forward className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>
              )}

              {/* Save Image */}
              {activeActionMessage.text && (activeActionMessage.type === 'image' || activeActionMessage.text.startsWith('http')) && (
                <button
                  type="button"
                  onClick={() => {
                    const t = activeActionMessage.text;
                    setActiveActionMessage(null); setPopupPos(null);
                    saveImageDirectly(t, 'nepalcasts-media.jpg');
                  }}
                  className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] font-normal text-[#202923] hover:bg-[#FAF8F4] transition-colors cursor-pointer border-b border-[#E7E5E0]"
                >
                  <span>Save</span>
                  <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>
              )}

              {/* Delete */}
              {(activeActionMessage.senderId === currentUser?.uid || currentUser?.role === 'admin') && onDeleteMessage && (
                <button
                  type="button"
                  onClick={() => { onDeleteMessage(activeActionMessage.id); setActiveActionMessage(null); setPopupPos(null); }}
                  className="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] font-normal text-[#B42318] hover:bg-[#FEF3F2] transition-colors cursor-pointer"
                >
                  <span>Delete</span>
                  <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Forward Message Picker — portalled to body so parent transforms don't affect fixed positioning */}
      {createPortal(
        <AnimatePresence>
          {forwardMsg !== null && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.5)' }} onClick={() => setForwardMsg(null)} />
              <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(260px, calc(100vw - 2rem))', zIndex: 71 }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.13, ease: 'easeOut' }}
                  style={{ width: '100%', background: '#1C1C1E', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.9)', overflow: 'hidden' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Forward to</span>
                    <button type="button" onClick={() => setForwardMsg(null)} className="w-5 h-5 flex items-center justify-center cursor-pointer text-gray-600 hover:text-gray-300 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {/* List */}
                  <div className="max-h-52 overflow-y-auto">
                    {conversations
                      .filter((c: any) => c.id !== chat?.id)
                      .map((c: any, idx: number, arr: any[]) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={async () => {
                            if (onForwardMessage && forwardMsg) await onForwardMessage(forwardMsg, c.id);
                            setForwardMsg(null);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/6 transition-colors cursor-pointer${idx < arr.length - 1 ? ' border-b border-white/[0.05]' : ''}`}
                        >
                          <Avatar userId={c.otherParticipantId || c.id} src={c.avatar} name={c.name} size="sm" className="!w-7 !h-7 shrink-0 rounded-full" />
                          <span className="text-[12px] text-gray-200 truncate">{c.name || 'Chat'}</span>
                        </button>
                      ))}
                    {conversations.filter((c: any) => c.id !== chat?.id).length === 0 && (
                      <p className="text-center text-gray-500 text-[11px] py-5">No other conversations</p>
                    )}
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>);
}
