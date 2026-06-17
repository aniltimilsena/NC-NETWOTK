import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../context/CallContext';
import GlassCard from '../components/ui/GlassCard';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { 
  subscribeToMessages, 
  sendMessage, 
  subscribeToConversations, 
  findOrCreateConversation, 
  deleteConversation, 
  blockUser,
  updateMessage,
  deleteMessage,
  reactToMessage,
  pinMessage,
  markConversationAsRead
} from '../services/messaging';
import { uploadProfileMedia } from '../services/profile';
import { formatMessagePreview } from '../utils/format';
import { 
  ChevronLeft, 
  Search, 
  MessageSquare, 
  Video, 
  Settings, 
  Trash2, 
  Check, 
  MoreVertical,
  Reply,
  Smile,
  Copy,
  Pin,
  Share2,
  Edit2
} from 'lucide-react';

export default function Messages({ onNavigate, user, initialUserId, showAlert }) {
  const { initiateCall: startCall } = useCall();
  const [activeChatId, setActiveChatId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showOptionsId, setShowOptionsId] = useState(null);
  const [activeMenu, setActiveMenu] = useState('main'); // 'main', 'emojis', 'more'
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    type: 'default'
  });
  const longPressTimer = useRef(null);
  const messagesEndRef = useRef(null);

  const activeChat = conversations.find(c => c.id === activeChatId);

  const [isSending, setIsSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allProfiles, setAllProfiles] = useState([]);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const fileInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [typingTimeoutRef, setTypingTimeoutRef] = useState(null);

  // Sync typing status helper to Firestore
  const updateTypingStatus = async (isTyping) => {
    if (!activeChatId || !user?.uid) return;
    try {
      const convoRef = doc(db, 'conversations', activeChatId);
      await updateDoc(convoRef, {
        [`typing.${user.uid}`]: isTyping
      });
    } catch (err) {
      console.warn("Could not update typing status:", err);
    }
  };

  // Handle typing input changes with debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);

    if (!val.trim()) {
      updateTypingStatus(false);
      if (typingTimeoutRef) {
        clearTimeout(typingTimeoutRef);
      }
      return;
    }

    updateTypingStatus(true);

    if (typingTimeoutRef) {
      clearTimeout(typingTimeoutRef);
    }

    const timeout = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
    setTypingTimeoutRef(timeout);
  };

  // Reset typing status on unmount or chat switch
  useEffect(() => {
    return () => {
      if (typingTimeoutRef) {
        clearTimeout(typingTimeoutRef);
      }
      if (activeChatId) {
        updateTypingStatus(false);
      }
    };
  }, [activeChatId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId || !user?.uid) return;

    setIsUploadingMedia(true);
    setUploadProgress(0);

    try {
      const url = await uploadProfileMedia(user.uid, file, (progress) => {
        setUploadProgress(Math.round(progress));
      });

      if (url) {
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        const result = await sendMessage(activeChatId, user.uid, url, false, null, fileType);
        if (!result.success) {
          showAlert(result.error || 'Failed to send file', 'error');
        }
      } else {
        showAlert('Failed to upload file. Please try again.', 'error');
      }
    } catch (err) {
      console.error("File upload error:", err);
      showAlert('Error uploading file.', 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredProfiles = allProfiles.filter(p => 
    p.name?.toLowerCase().includes(newChatSearch.toLowerCase()) ||
    p.role?.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  // Fetch profiles when New Chat modal is opened
  useEffect(() => {
    if (showNewChatModal) {
      const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
          const snapshot = await getDocs(collection(db, 'profiles'));
          const list = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.id !== user?.uid); // exclude current user
          setAllProfiles(list);
        } catch (err) {
          console.error("Error fetching profiles for new chat:", err);
        } finally {
          setLoadingProfiles(false);
        }
      };
      fetchProfiles();
    }
  }, [showNewChatModal, user?.uid]);

  const handleStartNewChat = async (targetUserId) => {
    if (!user?.uid) return;
    try {
      const { id, error } = await findOrCreateConversation([user.uid, targetUserId]);
      if (id) {
        setActiveChatId(id);
        setShowNewChatModal(false);
        setNewChatSearch('');
      } else if (error) {
        showAlert(error, 'error');
      }
    } catch (err) {
      console.error("Error creating new chat:", err);
      showAlert('Failed to start chat', 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChatId || isSending) return;
    
    // Stop typing status instantly
    updateTypingStatus(false);
    if (typingTimeoutRef) {
      clearTimeout(typingTimeoutRef);
    }

    setIsSending(true);
    try {
      let result;
      if (editingMessage) {
        result = await updateMessage(activeChatId, editingMessage.id, newMessage);
        if (result.success) {
          setEditingMessage(null);
          setNewMessage('');
        } else {
          showAlert(result.error || 'Failed to update message', 'error');
        }
      } else {
        result = await sendMessage(activeChatId, user.uid, newMessage, false, replyingTo);
        if (result.success) {
          setReplyingTo(null);
          setNewMessage('');
        } else {
          showAlert(result.error || 'Failed to send message', 'error');
        }
      }
    } catch (error) {
      showAlert('Failed to connect to messaging service. Please try again.', 'error');
      console.error("Send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReact = async (messageId, emoji) => {
    await reactToMessage(activeChatId, messageId, emoji, user.uid);
  };

  const handleDeleteMessage = async (messageId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Message',
      description: 'Are you sure you want to delete this message? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        await deleteMessage(activeChatId, messageId);
      }
    });
  };

  const startEdit = (msg) => {
    setEditingMessage(msg);
    setNewMessage(msg.text);
    setReplyingTo(null);
  };

  const handleDeleteConversation = async () => {
    if (!activeChatId) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Chat',
      description: 'Are you sure you want to delete this entire conversation? All messages will be permanently removed.',
      type: 'danger',
      confirmText: 'Delete Everything',
      onConfirm: async () => {
        const { success, error } = await deleteConversation(activeChatId);
        if (success) {
          setActiveChatId(null);
          showAlert('Conversation deleted', 'info');
        } else {
          showAlert('Failed to delete: ' + error, 'error');
        }
      }
    });
  };

  const handleBlockUser = async () => {
    const otherId = activeChat?.participants?.find(p => p !== user?.uid);
    if (!otherId) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Block User',
      description: 'Block this user? They will no longer be able to message you, and this chat will be closed.',
      type: 'danger',
      confirmText: 'Block User',
      onConfirm: async () => {
        const { success, error } = await blockUser(user.uid, otherId);
        if (success) {
          setActiveChatId(null);
          showAlert('User blocked', 'success');
        } else {
          showAlert('Failed to block: ' + error, 'error');
        }
      }
    });
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    showAlert('Message copied to clipboard', 'success');
  };

  const handlePinMessage = async (messageId, isPinned) => {
    await pinMessage(activeChatId, messageId, !isPinned);
  };

  const startLongPress = (id) => {
    longPressTimer.current = setTimeout(() => {
      setShowOptionsId(id);
      setActiveMenu('main');
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
  };

  const endLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };
  
  const handleStartCall = (type) => {
    if (!activeChat || !user) return;
    const otherId = activeChat.participants?.find(p => p !== user.uid);
    if (!otherId) return;

    startCall({
      calleeId: otherId,
      calleeName: activeChat.name || "User",
      calleePhoto: activeChat.avatar || "",
      callType: type
    });
  };

  const [showChatMenu, setShowChatMenu] = useState(false);

  const filteredConversations = conversations.filter(chat => 
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToConversations(user.uid, (convos) => {
        setConversations(convos);
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Handle direct messaging from profile
  useEffect(() => {
    if (user?.uid && initialUserId && initialUserId !== user.uid) {
      const initChat = async () => {
        const { id, error } = await findOrCreateConversation([user.uid, initialUserId]);
        if (id) {
          setActiveChatId(id);
        } else if (error) {
          showAlert(error, 'error');
        }
      };
      initChat();
    }
  }, [user?.uid, initialUserId]);

  // Clear unread count when a conversation is opened
  useEffect(() => {
    if (activeChatId && user?.uid) {
      const active = conversations.find(c => c.id === activeChatId);
      if (active && active.isUnreadForMe) {
        markConversationAsRead(activeChatId);
      }
    }
  }, [activeChatId, conversations, user?.uid]);

  useEffect(() => {
    if (activeChatId) {
      const unsubscribe = subscribeToMessages(activeChatId, (msgs) => {
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);
      });
      return () => unsubscribe();
    }
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format date/times for conversation cards
  const formatConvoTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    
    const dateTime = date.getTime();
    const diffSeconds = Math.floor((now.getTime() - dateTime) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400 && dateTime >= startOfToday) {
      return `${Math.floor(diffSeconds / 3600)}h ago`;
    }
    if (dateTime >= startOfYesterday && dateTime < startOfToday) {
      return 'Yesterday';
    }
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  // Format date separators inside conversation window
  const formatSeparatorTime = (timeMs) => {
    const date = new Date(timeMs);
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (timeMs >= startOfToday) {
      return `Today • ${timeString}`;
    }
    if (timeMs >= startOfYesterday && timeMs < startOfToday) {
      return `Yesterday • ${timeString}`;
    }
    const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dateString} • ${timeString}`;
  };

  // Render typing bouncy dots indicator
  const otherParticipantId = activeChat?.participants?.find(p => p !== user?.uid);
  const isOtherTyping = activeChat?.typing?.[otherParticipantId] === true;

  // Render messages separating them by time groups
  const renderMessagesWithSeparators = () => {
    const elements = [];
    let lastTimestamp = null;

    messages.forEach((msg, index) => {
      const msgTime = msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : Date.now();
      
      let showSeparator = false;
      if (index === 0) {
        showSeparator = true;
      } else if (lastTimestamp) {
        const diffMinutes = (msgTime - lastTimestamp) / (1000 * 60);
        if (diffMinutes > 15) {
          showSeparator = true;
        }
      }

      if (showSeparator) {
        elements.push(
          <div key={`sep-${msg.id || index}`} className="flex justify-center my-4">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
              {formatSeparatorTime(msgTime)}
            </span>
          </div>
        );
      }

      lastTimestamp = msgTime;
      elements.push(renderMessageBubble(msg));
    });

    return elements;
  };

  // Render individual message bubble
  const renderMessageBubble = (msg) => {
    const isMine = msg.senderId === user.uid;
    const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
    
    if (msg.isSystem) {
      const textLower = msg.text.toLowerCase();
      const isCall = textLower.includes('call') || textLower.includes('missed') || textLower.includes('declined') || textLower.includes('busy');
      
      let icon = null;
      let pillClass = "bg-white/5 border-white/5 text-nc-muted";
      
      if (isCall) {
        if (textLower.includes('missed')) {
          pillClass = "bg-red-500/10 border-red-500/20 text-red-400";
          icon = <PhoneMissed className="w-3.5 h-3.5 mr-1.5 shrink-0" />;
        } else if (textLower.includes('declined') || textLower.includes('busy') || textLower.includes('cancelled') || textLower.includes('offline') || textLower.includes('error')) {
          pillClass = "bg-orange-500/10 border-orange-500/20 text-orange-400";
          icon = <PhoneOff className="w-3.5 h-3.5 mr-1.5 shrink-0" />;
        } else {
          pillClass = "bg-green-500/10 border-green-500/20 text-green-400";
          icon = <Check className="w-3.5 h-3.5 mr-1.5 shrink-0" />;
        }
      }

      return (
        <div key={msg.id} className="flex justify-center my-4">
          <div className={`border px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wide backdrop-blur-sm flex items-center ${pillClass}`}>
            {icon}
            {msg.text}
          </div>
        </div>
      );
    }

    return (
      <div 
        key={msg.id} 
        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative mb-2 w-full`}
      >
        {/* Reply Context */}
        {msg.replyTo && (
          <div className={`text-[10px] text-nc-muted mb-1 flex items-center gap-1 ${isMine ? 'pr-4' : 'pl-4'}`}>
            <Reply className="w-3 h-3" style={{ transform: 'scaleX(-1)' }} />
            Replying to: <span className="italic truncate max-w-[100px]">{msg.replyTo.text}</span>
          </div>
        )}

        <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%]`}>
          {!isMine && <Avatar src={activeChat?.avatar} size="xs" gender={activeChat?.gender} className="!w-6 !h-6" />}
          
          <div 
            className="relative"
            onMouseDown={() => startLongPress(msg.id)}
            onMouseUp={endLongPress}
            onMouseLeave={endLongPress}
            onTouchStart={() => startLongPress(msg.id)}
            onTouchEnd={endLongPress}
          >
            {/* Long Press Options */}
            {showOptionsId === msg.id && (
              <div className={`absolute -top-14 ${isMine ? 'right-0' : 'left-0'} z-50 animate-bounce-in`}>
                <div className="fixed inset-0 -z-10" onClick={(e) => { e.stopPropagation(); setShowOptionsId(null); }} />
                
                {activeMenu === 'main' && (
                  <div className="flex items-center gap-2.5 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenu('more'); }}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setShowOptionsId(null); }}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"
                    >
                      <Reply className="w-4 h-4" style={{ transform: 'scaleX(-1)' }} />
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenu('emojis'); }}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeMenu === 'emojis' && (
                  <div className="flex items-center gap-1 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 shadow-2xl">
                    {['❤️', '👍', '😂', '😮', '🔥', '😢', '🙏'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); setShowOptionsId(null); }}
                        className="hover:scale-125 active:scale-150 transition-all p-1 text-lg leading-none"
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenu('main'); }}
                      className="p-1 text-nc-muted hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeMenu === 'more' && (
                  <div className="flex flex-col bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl py-1 shadow-2xl min-w-[160px] overflow-hidden">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCopyMessage(msg.text); setShowOptionsId(null); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-[#00BFFF]" />
                      Copy Text
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePinMessage(msg.id, msg.isPinned); setShowOptionsId(null); }}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm ${msg.isPinned ? 'text-[#00BFFF]' : 'text-white'} hover:bg-white/5 transition-colors`}
                    >
                      <Pin className="w-4 h-4" />
                      {msg.isPinned ? 'Unpin' : 'Pin Message'}
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); alert('Forwarding coming soon!'); setShowOptionsId(null); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-[#00BFFF]" />
                      Forward
                    </button>

                    {isMine && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEdit(msg); setShowOptionsId(null); }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-[#00BFFF]" />
                        Edit Message
                      </button>
                    )}

                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setShowOptionsId(null); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                    
                    <div className="h-px bg-white/5 my-1" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenu('main'); }}
                      className="px-4 py-2 text-xs text-nc-muted text-center hover:text-white"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bubble alignment and styles */}
            <div className={
              msg.type === 'image' || msg.type === 'video'
                ? `rounded-2xl overflow-hidden shadow-sm max-w-full ${isMine ? 'rounded-tr-none' : 'rounded-tl-none'}`
                : `p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMine 
                      ? 'bg-[#00BFFF] text-[#0A0A0A] rounded-tr-none font-medium' 
                      : 'bg-[#1e1e1e] border border-white/5 text-white rounded-tl-none'
                  }`
            }>
              {msg.type === 'image' ? (
                <img 
                  src={msg.text} 
                  alt="Shared Image" 
                  className="max-w-full max-h-60 object-contain select-none" 
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              ) : msg.type === 'video' ? (
                <video 
                  src={msg.text} 
                  controls 
                  controlsList="nodownload"
                  className="max-w-full max-h-60" 
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <>
                  {msg.text}
                  {msg.isEdited && <span className="text-[9px] opacity-50 ml-2">(edited)</span>}
                </>
              )}
            </div>

            {/* Reactions Display */}
            {hasReactions && (
              <div className={`flex items-center gap-1 mt-[-8px] ${isMine ? 'mr-2 justify-end' : 'ml-2'}`}>
                {Object.entries(msg.reactions).map(([emoji, users]) => (
                  <div 
                    key={emoji} 
                    onClick={() => handleReact(msg.id, emoji)}
                    className="bg-[#151515] border border-white/10 rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-1 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <span>{emoji}</span>
                    <span className="text-white/60 font-bold">{users.length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0a0a0a] flex flex-col md:flex-row w-full h-dvh overflow-hidden text-white">
      <ConfirmDialog 
        {...confirmConfig} 
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
      
      {/* Conversations List */}
      <div className={`flex flex-col w-full md:w-[320px] lg:w-[380px] shrink-0 border-r border-white/5 bg-[#0D0D12] h-full ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Redesigned Header: Back left, centered title, pill cyan border "New" right */}
        <div className="grid grid-cols-3 items-center p-4 border-b border-white/5 bg-[#0D0D12] shrink-0">
          <div className="flex justify-start">
            <button
              onClick={() => onNavigate('home')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex justify-center">
            <h2 className="text-base font-bold text-white tracking-tight whitespace-nowrap">Messages</h2>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={() => setShowNewChatModal(true)} 
              className="px-4 py-1.5 rounded-full border border-[#00BFFF] text-[#00BFFF] hover:bg-[#00BFFF]/10 text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
            >
              New
            </button>
          </div>
        </div>
        
        {/* Redesigned Search Bar: full-width, pill shaped, dark bg #1a1a1a */}
        <div className="p-3 border-b border-white/5 shrink-0">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              id="messages-search"
              name="messages-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..." 
              className="w-full bg-[#1a1a1a] border border-transparent rounded-full pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00BFFF]/50 focus:bg-[#222] transition-all"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map(chat => {
              const isUnread = chat.isUnreadForMe === true;
              const cardBgClass = isUnread
                ? 'bg-[#0d1f3a] hover:bg-[#112244]'
                : 'bg-transparent hover:bg-white/[0.025]';
              const nameWeightClass = isUnread
                ? 'font-bold text-white'
                : 'font-medium text-gray-300';
              const previewTextClass = isUnread
                ? 'font-semibold text-gray-100'
                : 'text-gray-500 font-normal';
              const timeClass = isUnread ? 'text-[#00BFFF] font-semibold' : 'text-nc-muted font-medium';

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-white/5 items-center ${cardBgClass} ${
                    activeChatId === chat.id ? 'bg-white/5 border-l-2 border-l-[#00BFFF]' : ''
                  }`}
                >
                  {/* Left: avatar with online indicator */}
                  <div className="relative shrink-0">
                    <Avatar
                      src={chat.avatar}
                      gender={chat.gender}
                      name={chat.name}
                      size="md"
                      className="!w-12 !h-12 border-none shrink-0"
                    />
                    {chat.online && (
                      <span className="absolute bottom-[1px] right-[1px] w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D12]" />
                    )}
                  </div>

                  {/* Center: Name + preview */}
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className={`text-[15px] truncate mb-0.5 leading-snug flex items-center gap-1 ${nameWeightClass}`}>
                      <span className="truncate">{chat.name}</span>
                      {chat.verified && (
                        <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                      )}
                    </h3>
                    <p className={`text-xs truncate leading-normal ${previewTextClass}`}>
                      {formatMessagePreview(chat.lastMessage)}
                    </p>
                  </div>

                  {/* Right: time + unread dot */}
                  <div className="flex flex-col items-end gap-1.5 self-center shrink-0">
                    <span className={`text-[11px] ${timeClass}`}>
                      {formatConvoTime(chat.lastMessageAt)}
                    </span>
                    {isUnread ? (
                      <span
                        className="w-2.5 h-2.5 bg-[#00BFFF] rounded-full shadow-lg shadow-[#00BFFF]/40 animate-pulse shrink-0"
                        title="Unread"
                      />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          ) : isLoading ? (
            /* Shimmer rows */
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="p-4 flex gap-3 border-b border-white/5 items-center"
              >
                {/* Left: Avatar Shimmer */}
                <div className="w-12 h-12 rounded-full skeleton shrink-0" />
                {/* Center: Name + preview Shimmer */}
                <div className="flex-1 space-y-2 min-w-0 pr-2">
                  <div className="h-4 skeleton w-1/3" />
                  <div className="h-3.5 skeleton w-2/3" />
                </div>
                {/* Right: time Shimmer */}
                <div className="h-3 skeleton w-10 shrink-0" />
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-nc-muted text-sm border-t border-white/5">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Chat Area Container */}
      <div className={`flex-1 h-full flex flex-col overflow-hidden bg-[#08080C] ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {!activeChat ? (
          /* Redesigned Empty State: illustration + text + Cyan start conversation button */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#08080c]">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-[#00BFFF]/80 mb-5 border border-white/5 shadow-[0_0_15px_rgba(0,191,255,0.05)]">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-xl text-white mb-2">No messages yet</h3>
            <p className="text-nc-muted text-sm max-w-xs mx-auto mb-6">
              Stay connected with your network! Start a conversation with a director, talent, or client.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-6 py-2.5 rounded-full bg-[#00BFFF] hover:bg-[#0099e6] text-[#0A0A0A] text-sm font-bold tracking-wide transition-all active:scale-95 shadow-lg shadow-[#00BFFF]/20"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat Screen Header: Back arrow, Avatar + Name + online status, Video Call Button */}
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0 bg-[#0D0D12]">
              <button 
                className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setActiveChatId(null)}
                title="Back to Chats"
                aria-label="Back to Chats"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="relative shrink-0">
                <Avatar 
                  src={activeChat.avatar} 
                  gender={activeChat.gender} 
                  name={activeChat.name} 
                  size="sm" 
                  className="!w-9 !h-9 border-none shrink-0" 
                />
                {activeChat.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#0d0d12]" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate leading-tight">{activeChat.name}</h3>
                <p className="text-[11px] leading-none mt-0.5">
                  {activeChat.online ? (
                    <span className="text-[#00BFFF] font-semibold">Online</span>
                  ) : (
                    <span className="text-gray-500">Offline</span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleStartCall('video')}
                  className="p-2 text-gray-400 hover:text-[#00BFFF] transition-colors"
                  title="Video Call"
                  aria-label="Video Call"
                >
                  <Video className="w-5 h-5" />
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    className="text-gray-400 hover:text-white p-2"
                    title="Chat Options"
                    aria-label="Chat Options"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showChatMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-nc-dark border border-white/10 rounded-xl py-1 shadow-xl z-50">
                        <button onClick={() => { 
                          const otherId = activeChat?.participants?.find(p => p !== user?.uid);
                          if (otherId) onNavigate('profile', otherId); 
                          setShowChatMenu(false); 
                        }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 font-semibold">View Profile</button>
                        <button onClick={handleDeleteConversation} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 font-semibold">Delete Chat</button>
                        <button onClick={handleBlockUser} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 font-semibold">Block User</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Messages Panel with Separator Timestamps */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {renderMessagesWithSeparators()}
              
              {/* Typing indicator bouncy dots */}
              {isOtherTyping && (
                <div className="flex items-end gap-2 mb-2 animate-fade-in select-none">
                  <Avatar src={activeChat?.avatar} size="xs" gender={activeChat?.gender} className="!w-6 !h-6" />
                  <div className="bg-[#1e1e1e] px-3.5 py-2.5 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input Panel */}
            <div className="p-4 sm:p-6 border-t border-white/5 bg-white/[0.01]">
              
              {/* Replying or Editing Indicator */}
              {(replyingTo || editingMessage) && (
                <div className="mb-3 p-3 bg-white/5 border-l-4 border-[#00BFFF] rounded-r-xl flex items-center justify-between animate-fade-in">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00BFFF]">
                      {editingMessage ? 'Editing Message' : `Replying to ${activeChat.name}`}
                    </p>
                    <p className="text-sm text-nc-muted truncate">
                      {editingMessage ? editingMessage.text : replyingTo.text}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setReplyingTo(null); setEditingMessage(null); if(editingMessage) setNewMessage(''); }}
                    className="p-1 hover:text-white transition-colors"
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Quick replies pills */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide shrink-0 px-1">
                {[
                  "Available for Casting",
                  "Send Availability",
                  "Interested",
                  "Not Available",
                  "Request More Info"
                ].map((text) => (
                  <button
                    key={text}
                    onClick={() => {
                      setNewMessage(text);
                      updateTypingStatus(true);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all whitespace-nowrap active:scale-95"
                  >
                    {text}
                  </button>
                ))}
              </div>

              {/* Input row */}
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  id="messages-file-upload"
                  name="messages-file-upload"
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  accept="image/*,video/*" 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia || isSending}
                  className="text-nc-muted hover:text-[#00BFFF] p-1 transition-colors disabled:opacity-50"
                  title="Attach Media"
                  aria-label="Attach Media"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                <div className="flex-1 relative">
                  {isUploadingMedia ? (
                    <div className="w-full bg-nc-surface border border-nc-border rounded-[2rem] px-5 py-3.5 text-sm text-[#00BFFF] flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
                        Uploading media...
                      </span>
                      <span className="font-black text-xs">{uploadProgress}%</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      id="messages-new-message"
                      name="messages-new-message"
                      placeholder="Type a message..."
                      className="w-full bg-nc-surface border border-nc-border rounded-[2rem] px-5 py-3.5 text-sm text-white placeholder-nc-muted outline-none focus:border-[#00BFFF] transition-all"
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={isSending}
                    />
                  )}
                </div>

                {/* Cyan Send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="w-12 h-12 rounded-full bg-[#00BFFF] text-nc-darker flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-[#00BFFF]/20 shrink-0"
                  title="Send Message"
                  aria-label="Send Message"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-nc-darker border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-nc-dark border border-white/10 rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl relative flex flex-col max-h-[80vh]"
            >
              {/* Close Button */}
              <button 
                onClick={() => { setShowNewChatModal(false); setNewChatSearch(''); }}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
                title="Close"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-black text-white mb-1 tracking-tight">New Conversation</h2>
              <p className="text-xs text-nc-muted mb-4 font-medium">Select a profile to start messaging</p>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nc-muted" />
                <input 
                  type="text" 
                  id="messages-new-chat-search"
                  name="messages-new-chat-search"
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="Search by name or role..." 
                  className="w-full bg-nc-dark/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-nc-muted focus:outline-none focus:border-nc-accent transition-colors"
                />
              </div>

              {/* Profiles List */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh] custom-scrollbar pr-1">
                {loadingProfiles ? (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-full skeleton shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 skeleton w-1/3" />
                          <div className="h-3 skeleton w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProfiles.length > 0 ? (
                  filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => handleStartNewChat(profile.id)}
                      className="p-3 flex items-center gap-3 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-2xl cursor-pointer transition-all group"
                    >
                      <Avatar 
                        src={profile.image} 
                        gender={profile.gender} 
                        name={profile.name} 
                        size="sm" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white group-hover:text-[#00BFFF] transition-colors flex items-center gap-1">
                          <span>{profile.name}</span>
                          {profile.verified && (
                            <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                          )}
                        </div>
                        <div className="text-xs text-nc-muted capitalize">{profile.role || 'Talent'}</div>
                      </div>
                      <span className="text-[10px] font-bold text-[#00BFFF] opacity-0 group-hover:opacity-100 transition-opacity">
                        Chat
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-[#555]">No users found.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
