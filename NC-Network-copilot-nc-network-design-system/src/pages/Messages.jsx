import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../context/CallContext';
import GlassCard from '../components/ui/GlassCard';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
      if (active && active.unread && active.lastSenderId !== user.uid) {
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

  return (
    <div className="bg-nc-dark flex flex-col md:flex-row w-full h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)] mt-16 sm:mt-20 overflow-hidden">
      <ConfirmDialog 
        {...confirmConfig} 
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
      
      {/* Conversations List */}
      <div className={`flex flex-col w-full md:w-[320px] lg:w-[380px] shrink-0 border-r border-white/5 bg-[#0D0D12] h-full ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white">Messages</h2>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => setShowNewChatModal(true)} 
            className="px-3 py-1 text-xs h-auto min-h-0"
          >
            New
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-3 border-b border-white/5 shrink-0">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nc-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              id="messages-search"
              name="messages-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..." 
              className="w-full bg-nc-dark/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-nc-muted focus:outline-none focus:border-nc-accent transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChatId(chat.id)}
                className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-white/5 hover:bg-white/5 ${activeChatId === chat.id ? 'bg-white/10' : ''}`}
              >
                <div className="relative">
                  <Avatar 
                    src={chat.avatar} 
                    gender={chat.gender} 
                    name={chat.name} 
                    size="md" 
                  />
                  {chat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1A]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-white text-sm truncate pr-2">{chat.name}</h3>
                    <span className="text-xs text-nc-muted flex-shrink-0">
                      {chat.lastMessageAt?.toDate ? (() => {
                        const date = chat.lastMessageAt.toDate();
                        const now = new Date();
                        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
                        if (diff < 60) return 'now';
                        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
                        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
                        return date.toLocaleDateString();
                      })() : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-xs truncate ${(chat.unread && chat.lastSenderId !== user?.uid) ? 'text-white font-medium font-semibold' : 'text-nc-muted'}`}>
                      {formatMessagePreview(chat.lastMessage)}
                    </p>
                    {chat.unread && chat.lastSenderId !== user?.uid && (
                      <span className="w-2.5 h-2.5 bg-nc-accent rounded-full shadow-lg shadow-nc-accent/50 shrink-0 animate-pulse" title="Unread" />
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-nc-muted text-sm border-t border-white/5">
              {isLoading ? 'Loading...' : 'No messages found.'}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 h-full flex flex-col overflow-hidden bg-[#08080C] ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-nc-accent mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-bold text-xl text-white mb-2">Your Messages</h3>
            <p className="text-nc-muted text-sm max-w-xs mx-auto">Select a conversation from the list to view your messages or start a new chat.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center gap-3 shrink-0">
              <button 
                className="md:hidden p-2 -ml-2 text-nc-muted hover:text-white"
                onClick={() => setActiveChatId(null)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {activeChat && (
                  <>
                    <Avatar 
                      src={activeChat.avatar} 
                      gender={activeChat.gender} 
                      name={activeChat.name} 
                      size="sm" 
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-sm">{activeChat.name}</h3>
                      <p className="text-xs text-nc-accent">{activeChat.online ? 'Online' : 'Offline'}</p>
                    </div>
                  </>
                )}
              
              <div className="flex items-center gap-1">
                {activeChat && (
                  <>
                    <button 
                      onClick={() => handleStartCall('audio')}
                      className="p-2 text-nc-muted hover:text-nc-accent transition-colors"
                      title="Audio Call"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleStartCall('video')}
                      className="p-2 text-nc-muted hover:text-nc-accent transition-colors"
                      title="Video Call"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  className="text-nc-muted hover:text-white p-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showChatMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowChatMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-nc-dark border border-white/10 rounded-xl py-1 shadow-xl z-50">
                      <button onClick={() => { 
                        const otherId = activeChat?.participants?.find(p => p !== user?.uid);
                        if (otherId) onNavigate('profile', otherId); 
                        setShowChatMenu(false); 
                      }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5">View Profile</button>
                      <button onClick={handleDeleteConversation} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">Delete Chat</button>
                      <button onClick={handleBlockUser} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">Block User</button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg, i) => {
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
                      icon = (
                        <svg className="w-3.5 h-3.5 text-red-400 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L9.228 3.684A1 1 0 008.28 3H5z" />
                        </svg>
                      );
                    } else if (textLower.includes('declined') || textLower.includes('busy') || textLower.includes('cancelled') || textLower.includes('offline') || textLower.includes('error')) {
                      pillClass = "bg-orange-500/10 border-orange-500/20 text-orange-400";
                      icon = (
                        <svg className="w-3.5 h-3.5 text-orange-400 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      );
                    } else {
                      // Completed call
                      pillClass = "bg-green-500/10 border-green-500/20 text-green-400";
                      icon = (
                        <svg className="w-3.5 h-3.5 text-green-400 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      );
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
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative mb-2`}
                  >
                    {/* Reply Context */}
                    {msg.replyTo && (
                      <div className={`text-[10px] text-nc-muted mb-1 flex items-center gap-1 ${isMine ? 'pr-4' : 'pl-4'}`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Replying to: <span className="italic truncate max-w-[100px]">{msg.replyTo.text}</span>
                      </div>
                    )}

                    <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%]`}>
                      {!isMine && <Avatar src={activeChat?.avatar} size="xs" gender={activeChat?.gender} />}
                      
                      <div 
                        className="relative"
                        onMouseDown={() => startLongPress(msg.id)}
                        onMouseUp={endLongPress}
                        onMouseLeave={endLongPress}
                        onTouchStart={() => startLongPress(msg.id)}
                        onTouchEnd={endLongPress}
                      >
                        {/* Long Press Interaction Menu */}
                        {showOptionsId === msg.id && (
                          <div className={`absolute -top-14 ${isMine ? 'right-0' : 'left-0'} z-50 animate-bounce-in`}>
                            <div className="fixed inset-0 -z-10" onClick={(e) => { e.stopPropagation(); setShowOptionsId(null); }} />
                            
                            {activeMenu === 'main' && (
                              <div className="flex items-center gap-2.5 bg-[#2A1B3D]/90 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 shadow-2xl">
                                {/* More Options */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenu('more'); }}
                                  className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:scale-110"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>

                                {/* Reply */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setShowOptionsId(null); }}
                                  className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:scale-110"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: 'scaleX(-1)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </button>

                                {/* Reactions */}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveMenu('emojis'); }}
                                  className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all transform hover:scale-110"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              </div>
                            )}

                            {activeMenu === 'emojis' && (
                              <div className="flex items-center gap-1 bg-nc-surface/95 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 shadow-2xl">
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
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                              </div>
                            )}

                            {activeMenu === 'more' && (
                              <div className="flex flex-col bg-[#2A1B3D]/95 backdrop-blur-xl border border-white/10 rounded-2xl py-1 shadow-2xl min-w-[160px] overflow-hidden">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCopyMessage(msg.text); setShowOptionsId(null); }}
                                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-nc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                  </svg>
                                  Copy Text
                                </button>

                                <button 
                                  onClick={(e) => { e.stopPropagation(); handlePinMessage(msg.id, msg.isPinned); setShowOptionsId(null); }}
                                  className={`flex items-center gap-2 px-4 py-2.5 text-sm ${msg.isPinned ? 'text-nc-accent' : 'text-white'} hover:bg-white/5 transition-colors`}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                  {msg.isPinned ? 'Unpin' : 'Pin Message'}
                                </button>

                                <button 
                                  onClick={(e) => { e.stopPropagation(); alert('Forwarding coming soon!'); setShowOptionsId(null); }}
                                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-nc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                  </svg>
                                  Forward
                                </button>

                                {isMine && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); startEdit(msg); setShowOptionsId(null); }}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                                  >
                                    <svg className="w-4 h-4 text-nc-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Edit Message
                                  </button>
                                )}

                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setShowOptionsId(null); }}
                                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
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

                        <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isMine 
                            ? 'bg-nc-accent text-[#0A0A0A] rounded-tr-none font-medium' 
                            : 'bg-nc-surface border border-white/5 text-white rounded-tl-none'
                        }`}>
                          {msg.type === 'image' ? (
                            <img 
                              src={msg.text} 
                              alt="Shared Image" 
                              className="max-w-full rounded-lg max-h-60 object-contain cursor-pointer" 
                              onClick={() => window.open(msg.text, '_blank')} 
                            />
                          ) : msg.type === 'video' ? (
                            <video 
                              src={msg.text} 
                              controls 
                              className="max-w-full rounded-lg max-h-60" 
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
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 sm:p-6 border-t border-white/5 bg-white/[0.01]">
              {/* Reply/Edit Preview */}
              {(replyingTo || editingMessage) && (
                <div className="mb-3 p-3 bg-white/5 border-l-4 border-nc-accent rounded-r-xl flex items-center justify-between animate-fade-in">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-nc-accent">
                      {editingMessage ? 'Editing Message' : `Replying to ${activeChat.name}`}
                    </p>
                    <p className="text-sm text-nc-muted truncate">
                      {editingMessage ? editingMessage.text : replyingTo.text}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setReplyingTo(null); setEditingMessage(null); if(editingMessage) setNewMessage(''); }}
                    className="p-1 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Quick Replies */}
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
                    onClick={() => setNewMessage(text)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all whitespace-nowrap active:scale-95"
                  >
                    {text}
                  </button>
                ))}
              </div>

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
                  className="text-nc-muted hover:text-nc-accent p-1 transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <div className="flex-1 relative">
                  {isUploadingMedia ? (
                    <div className="w-full bg-nc-surface border border-nc-border rounded-[2rem] px-5 py-3.5 text-sm text-nc-accent flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-nc-accent border-t-transparent rounded-full animate-spin" />
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
                      className="w-full bg-nc-surface border border-nc-border rounded-[2rem] px-5 py-3.5 text-sm text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-all"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isSending}
                    />
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="w-12 h-12 rounded-full bg-nc-accent text-nc-darker flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-nc-accent/20"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-nc-darker border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-black text-white mb-1 tracking-tight">New Conversation</h2>
              <p className="text-xs text-nc-muted mb-4 font-medium">Select a profile to start messaging</p>

              {/* Search Bar */}
              <div className="relative mb-4">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nc-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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
                  <div className="py-8 text-center text-sm text-nc-muted">Loading profiles...</div>
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
                        <div className="font-bold text-sm text-white group-hover:text-nc-accent transition-colors">{profile.name}</div>
                        <div className="text-xs text-nc-muted capitalize">{profile.role || 'Talent'}</div>
                      </div>
                      <span className="text-[10px] font-bold text-nc-accent opacity-0 group-hover:opacity-100 transition-opacity">
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
