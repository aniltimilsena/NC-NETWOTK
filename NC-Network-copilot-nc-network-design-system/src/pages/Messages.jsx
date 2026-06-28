import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCall } from '../context/CallContext';
import GlassCard from '../components/ui/GlassCard';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, onSnapshot, writeBatch, query, where } from 'firebase/firestore';
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
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
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
  const formatCallOutcomeText = (text, chatItem) => {
    if (!text || typeof text !== 'string') return text;
    if (text.includes("Cancelled by ")) {
      const parts = text.split("Cancelled by ");
      const prefix = parts[0]; // e.g., "Video call • " or "Audio call • "
      const identifier = parts[1]?.trim(); // UserID or "Caller"
      
      if (!identifier) return text;
      
      if (identifier === user?.uid) {
        return `${prefix}Cancelled by you`;
      }
      
      // If the identifier is the other participant's UID or looks like a UID, resolve it to their name
      if (chatItem) {
        const otherParticipantId = chatItem.participants?.find(p => p !== user?.uid);
        if (identifier === otherParticipantId || identifier.length > 15) {
          const otherName = chatItem.name || "them";
          const firstName = otherName.split(" ")[0];
          return `${prefix}Cancelled by ${firstName}`;
        }
      }
      
      if (identifier === "Caller") {
        return `${prefix}Cancelled by caller`;
      }
      
      // Fallback
      const otherName = chatItem?.name || "them";
      const firstName = otherName.split(" ")[0];
      return `${prefix}Cancelled by ${firstName}`;
    }
    return text;
  };
  const [activeChatId, setActiveChatId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showOptionsId, setShowOptionsId] = useState(null);
  const [activeMenu, setActiveMenu] = useState('main');
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls'
  const [callHistory, setCallHistory] = useState([]);
  const [callHistoryLoading, setCallHistoryLoading] = useState(true); // 'main', 'emojis', 'more'
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    type: 'default'
  });
  const longPressTimer = useRef(null);
  const messagesEndRef = useRef(null);
  const cleanupCallHistoryRef = useRef(null);

  const activeChat = conversations.find(c => c.id === activeChatId);
  const [remoteProfile, setRemoteProfile] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const messagesContainerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);


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

  const pendingFilesRef = useRef(new Map());

  const sendImageMessage = async (file) => {
    if (!activeChatId || !user?.uid) return;

    // Generate optimistic temp id
    const tempId = `opt-media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate local preview URL
    const localPreviewUrl = URL.createObjectURL(file);

    // Save file in pending files ref for retry logic
    const fileType = file.type.startsWith('video/') ? 'video' : 'image';
    pendingFilesRef.current.set(tempId, { file, fileType, localPreviewUrl });

    // Create optimistic message object
    const optimisticMessage = {
      id: tempId,
      senderId: user.uid,
      text: localPreviewUrl, // local blob URL
      type: fileType,
      createdAt: Date.now(),
      isOptimistic: true,
      uploading: true,
      uploadProgress: 0,
      failed: false,
    };

    // Add to optimisticMessages state
    setOptimisticMessages(prev => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 50);

    // Trigger upload in background
    runBackgroundUpload(tempId, file, fileType, localPreviewUrl);
  };

  const runBackgroundUpload = async (tempId, file, fileType, localPreviewUrl) => {
    try {
      const targetPath = `conversations/${activeChatId}/attachments/${Date.now()}_${file.name}`;
      
      const url = await uploadProfileMedia(user.uid, file, (progress) => {
        // Update ONLY the uploadProgress of this specific message
        setOptimisticMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, uploadProgress: Math.round(progress) } : msg
        ));
      }, targetPath);

      if (!url) {
        throw new Error("Upload failed: No URL returned");
      }

      // Send the real message via database
      const result = await sendMessage(activeChatId, user.uid, url, false, null, fileType, tempId);
      if (!result.success) {
        throw new Error(result.error || "Failed to send message after upload");
      }

      // Success: clean up from pending files and optimistic state
      pendingFilesRef.current.delete(tempId);
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      // Clean up object URL to prevent memory leaks
      try {
        URL.revokeObjectURL(localPreviewUrl);
      } catch (e) {
        console.warn("Error revoking object URL:", e);
      }

    } catch (err) {
      console.error(`Media upload/send failed for temp message ${tempId}:`, err);
      // Mark as failed in optimistic messages state
      setOptimisticMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, uploading: false, failed: true } : msg
      ));
    }
  };

  const handleRetryUpload = async (tempMsg) => {
    const pending = pendingFilesRef.current.get(tempMsg.id);
    if (!pending) {
      showAlert("Cannot retry. Upload session has expired. Please select the file again.", "error");
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== tempMsg.id));
      return;
    }

    // Set status back to uploading
    setOptimisticMessages(prev => prev.map(msg => 
      msg.id === tempMsg.id ? { ...msg, uploading: true, uploadProgress: 0, failed: false } : msg
    ));

    // Restart upload
    runBackgroundUpload(tempMsg.id, pending.file, pending.fileType, pending.localPreviewUrl);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      sendImageMessage(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    const textToSend = newMessage.trim();
    if (!textToSend || !activeChatId) return;
    
    // Stop typing status instantly
    updateTypingStatus(false);
    if (typingTimeoutRef) {
      clearTimeout(typingTimeoutRef);
    }

    if (editingMessage) {
      try {
        const result = await updateMessage(activeChatId, editingMessage.id, textToSend);
        if (result.success) {
          setEditingMessage(null);
          setNewMessage('');
        } else {
          showAlert(result.error || 'Failed to update message', 'error');
        }
      } catch (err) {
        showAlert('Failed to connect to messaging service. Please try again.', 'error');
      }
    } else {
      const clientMsgId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const optMsg = {
        id: clientMsgId,
        senderId: user.uid,
        text: textToSend,
        type: "text",
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId
        } : null,
        createdAt: Date.now(),
        isOptimistic: true,
        status: 'sending'
      };

      setOptimisticMessages(prev => [...prev, optMsg]);
      setNewMessage('');
      setReplyingTo(null);
      setTimeout(scrollToBottom, 50);

      sendMessage(activeChatId, user.uid, textToSend, false, replyingTo).then(result => {
        if (!result.success) {
          setOptimisticMessages(prev => prev.map(m => m.id === clientMsgId ? { ...m, status: 'failed' } : m));
          showAlert(result.error || 'Failed to send message', 'error');
        } else {
          setTimeout(() => {
            setOptimisticMessages(prev => prev.filter(m => m.id !== clientMsgId));
          }, 3000);
        }
      }).catch(err => {
        setOptimisticMessages(prev => prev.map(m => m.id === clientMsgId ? { ...m, status: 'failed' } : m));
        showAlert('Failed to connect to messaging service.', 'error');
      });
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

  const getOnlineStatus = () => {
    if (!remoteProfile) return { isOnline: false, label: 'Offline' };
    
    const lastActive = remoteProfile.lastActive?.toMillis?.() || remoteProfile.lastActive?.seconds * 1000 || (remoteProfile.lastActive ? new Date(remoteProfile.lastActive).getTime() : 0);
    const lastSeen = remoteProfile.lastSeen?.toMillis?.() || remoteProfile.lastSeen?.seconds * 1000 || (remoteProfile.lastSeen ? new Date(remoteProfile.lastSeen).getTime() : 0);
    const activeTime = Math.max(lastActive, lastSeen);
    
    const isOnline = remoteProfile.online === true && (Date.now() - activeTime < 180000);
    if (isOnline) {
      return { isOnline: true, label: 'Online' };
    }
    
    if (activeTime > 0) {
      const date = new Date(activeTime);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      let timeLabel = '';
      if (diffSeconds < 60) {
        timeLabel = 'just now';
      } else if (diffSeconds < 3600) {
        timeLabel = `${Math.floor(diffSeconds / 60)}m ago`;
      } else if (diffSeconds < 86400) {
        timeLabel = `${Math.floor(diffSeconds / 3600)}h ago`;
      } else if (diffSeconds < 172800) {
        timeLabel = 'yesterday';
      } else {
        timeLabel = `on ${date.toLocaleDateString()}`;
      }
      return { isOnline: false, label: `Last seen ${timeLabel}` };
    }
    
    return { isOnline: false, label: 'Offline' };
  };

  const { isOnline, label: presenceLabel } = getOnlineStatus();

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

  // Subscribe to call history
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    setCallHistoryLoading(true);
    
    // Lazy-import to avoid circular deps
    import('../services/call').then(({ subscribeToCallHistory }) => {
      if (cancelled) return;
      const unsub = subscribeToCallHistory(user.uid, (calls) => {
        setCallHistory(calls);
        setCallHistoryLoading(false);
      });
      // Store unsub for cleanup
      cleanupCallHistoryRef.current = unsub;
    });

    return () => {
      cancelled = true;
      if (cleanupCallHistoryRef.current) cleanupCallHistoryRef.current();
    };
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
      setOptimisticMessages([]);
      const unsubscribe = subscribeToMessages(activeChatId, (msgs) => {
        setMessages(msgs);
        setTimeout(scrollToBottom, 100);
      });
      return () => unsubscribe();
    }
  }, [activeChatId]);

  // Listen to remote participant profile in real-time for presence status
  useEffect(() => {
    if (!activeChatId || !user?.uid) {
      setRemoteProfile(null);
      return;
    }
    const active = conversations.find(c => c.id === activeChatId);
    const otherId = active?.participants?.find(p => p !== user.uid);
    if (!otherId) {
      setRemoteProfile(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'profiles', otherId), (snap) => {
      if (snap.exists()) {
        setRemoteProfile(snap.data());
      } else {
        setRemoteProfile(null);
      }
    }, (err) => {
      console.warn("Failed to listen to remote profile presence:", err);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  // Update read receipts for incoming messages when chat changes or new messages arrive
  useEffect(() => {
    if (!activeChatId || !user?.uid || !messages.length) return;

    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== user.uid && msg.read !== true && !msg.isSystem
    );

    if (unreadMessages.length === 0) return;

    const updateIncomingMessagesRead = async () => {
      try {
        const batch = writeBatch(db);
        unreadMessages.forEach((msg) => {
          const msgRef = doc(db, 'conversations', activeChatId, 'messages', msg.id);
          batch.update(msgRef, { read: true, delivered: true });
        });
        
        // Update conversation metadata if the last message is read
        const lastMsg = messages[messages.length - 1];
        if (unreadMessages.some(m => m.id === lastMsg.id)) {
          const convoRef = doc(db, 'conversations', activeChatId);
          batch.update(convoRef, {
            lastMessageRead: true,
            lastMessageDelivered: true
          });
        }

        await batch.commit();
      } catch (err) {
        console.warn("Failed to update read receipts:", err);
      }
    };

    updateIncomingMessagesRead();
  }, [activeChatId, messages, user?.uid]);

  // Update delivery receipts for conversations where last message is undelivered
  useEffect(() => {
    if (!user?.uid || !conversations.length) return;

    const undeliveredConvos = conversations.filter(
      (c) => c.lastSenderId && c.lastSenderId !== user.uid && c.lastMessageDelivered === false
    );

    if (undeliveredConvos.length === 0) return;

    const markUndeliveredAsDelivered = async () => {
      try {
        for (const convo of undeliveredConvos) {
          // Fetch messages that are undelivered
          const msgsQuery = query(
            collection(db, 'conversations', convo.id, 'messages'),
            where('senderId', '!=', user.uid)
          );
          const snap = await getDocs(msgsQuery);
          const undeliveredMsgs = snap.docs.filter(d => d.data().delivered === false);

          if (undeliveredMsgs.length > 0) {
            const batch = writeBatch(db);
            undeliveredMsgs.forEach(d => {
              batch.update(d.ref, { delivered: true });
            });
            const convoRef = doc(db, 'conversations', convo.id);
            batch.update(convoRef, { lastMessageDelivered: true });
            await batch.commit();
          } else {
            const convoRef = doc(db, 'conversations', convo.id);
            await updateDoc(convoRef, { lastMessageDelivered: true });
          }
        }
      } catch (err) {
        console.warn("Failed to mark messages as delivered:", err);
      }
    };

    markUndeliveredAsDelivered();
  }, [conversations, user?.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 300;
    setShowScrollBottom(isScrolledUp);
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

  const getDeduplicatedMessages = () => {
    return [
      ...messages,
      ...optimisticMessages.filter(opt => {
        const hasMatchingClientMsgId = messages.some(dbMsg => dbMsg.clientMsgId === opt.id);
        if (hasMatchingClientMsgId) return false;

        const isAlreadyInDb = messages.some(dbMsg => {
          const dbTime = dbMsg.createdAt?.seconds 
            ? dbMsg.createdAt.seconds * 1000 
            : (dbMsg.createdAt?.toDate ? dbMsg.createdAt.toDate().getTime() : (dbMsg.createdAt ? new Date(dbMsg.createdAt).getTime() : null));
          
          if (dbTime === null || dbTime === 0) {
            return dbMsg.senderId === opt.senderId && dbMsg.text === opt.text;
          }
          
          const timeDiff = Math.abs(dbTime - opt.createdAt);
          return dbMsg.senderId === opt.senderId && dbMsg.text === opt.text && timeDiff < 30000;
        });
        return !isAlreadyInDb;
      })
    ];
  };

  const deduplicatedMessages = getDeduplicatedMessages();

  const formatMessageTime = (timeMs) => {
    if (!timeMs) return '';
    const date = new Date(timeMs);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTicks = (msg, darkBg = false) => {
    const readColor = darkBg ? 'text-blue-400 font-bold' : 'text-blue-800 font-bold';
    const tickColor = darkBg ? 'text-white/60 font-medium' : 'text-[#0A0A0A]/50 font-medium';
    const clockColor = darkBg ? 'text-white/40' : 'text-[#0A0A0A]/40';
    
    if (msg.status === 'sending') {
      return (
        <svg className={`w-3 h-3 ${clockColor} animate-pulse shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    }
    if (msg.status === 'failed') {
      return (
        <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    }
    if (msg.read === true) {
      return (
        <div className="flex -space-x-1 items-center shrink-0">
          <svg className={`w-3.5 h-3.5 ${readColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <svg className={`w-3.5 h-3.5 ${readColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (msg.delivered === true) {
      return (
        <div className="flex -space-x-1 items-center shrink-0">
          <svg className={`w-3.5 h-3.5 ${tickColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <svg className={`w-3.5 h-3.5 ${tickColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    // Sent, but not delivered or read
    return (
      <svg className={`w-3.5 h-3.5 ${tickColor} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  // Render messages separating them by calendar date groups (Today, Yesterday, Date)
  const renderMessagesWithSeparators = () => {
    const elements = [];
    let lastDateStr = null;

    deduplicatedMessages.forEach((msg, index) => {
      const msgTime = msg.createdAt?.seconds 
        ? msg.createdAt.seconds * 1000 
        : (msg.createdAt instanceof Date ? msg.createdAt.getTime() : Number(msg.createdAt) || Date.now());
      
      const date = new Date(msgTime);
      const dateStr = date.toDateString();
      
      let showSeparator = false;
      if (index === 0 || dateStr !== lastDateStr) {
        showSeparator = true;
      }

      if (showSeparator) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const msgTimeStartOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

        let label = '';
        if (msgTimeStartOfDay === startOfToday) {
          label = 'Today';
        } else if (msgTimeStartOfDay === startOfYesterday) {
          label = 'Yesterday';
        } else {
          label = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        }

        elements.push(
          <div key={`sep-${msg.id || index}`} className="flex justify-center my-4">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase bg-white/5 border border-white/5 px-3 py-1 rounded-full">
              {label}
            </span>
          </div>
        );
      }

      lastDateStr = dateStr;
      elements.push(renderMessageBubble(msg));
    });

    return elements;
  };

  // Render individual message bubble
  const renderMessageBubble = (msg) => {
    const isMine = msg.senderId === user.uid;
    const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
    const msgTime = msg.createdAt?.seconds 
      ? msg.createdAt.seconds * 1000 
      : (msg.createdAt instanceof Date ? msg.createdAt.getTime() : Number(msg.createdAt) || Date.now());
    
    if (msg.isSystem || msg.senderId === 'system') {
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

      const displayText = formatCallOutcomeText(msg.text, activeChat);

      return (
        <div key={msg.id} className="flex justify-center my-4">
          <div className={`border px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wide backdrop-blur-sm flex items-center ${pillClass}`}>
            {icon}
            {displayText}
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

                    {isMine && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setShowOptionsId(null); }}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                    
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
                ? `rounded-2xl overflow-hidden shadow-sm max-w-full relative ${isMine ? 'rounded-tr-none' : 'rounded-tl-none'}`
                : `p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMine 
                      ? 'bg-[#00BFFF] text-[#0A0A0A] rounded-tr-none font-medium' 
                      : 'bg-[#1e1e1e] border border-white/5 text-white rounded-tl-none'
                  }`
            }>
              {msg.type === 'image' ? (
                <div 
                  className="relative group/img cursor-pointer"
                  onClick={() => {
                    if (!msg.uploading && !msg.failed) {
                      setLightboxUrl(msg.text);
                    }
                  }}
                >
                  <img 
                    src={msg.text} 
                    alt="Shared Image" 
                    className={`max-w-full max-h-60 object-contain select-none transition-all duration-300 ${msg.uploading || msg.failed ? 'blur-[2px]' : 'hover:scale-[1.02]'}`}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  {msg.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 select-none">
                      <svg width="48" height="48" className="-rotate-90">
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke="#00BFFF"
                          strokeWidth="3.5"
                          strokeDasharray={2 * Math.PI * 20}
                          strokeDashoffset={2 * Math.PI * 20 - (msg.uploadProgress / 100) * (2 * Math.PI * 20)}
                          strokeLinecap="round"
                          className="transition-[stroke-dashoffset] duration-200"
                        />
                      </svg>
                      <span className="text-white text-xs font-bold">{msg.uploadProgress}%</span>
                    </div>
                  )}
                  {msg.failed && (
                    <div className="absolute inset-0 bg-red-950/65 flex flex-col items-center justify-center gap-1.5 select-none text-center p-2">
                      <span className="text-lg">⚠️</span>
                      <span className="text-white text-xs font-semibold">Failed to send</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryUpload(msg);
                        }}
                        className="bg-white text-red-600 border-none rounded-full px-3 py-1 text-[10px] font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md mt-1"
                      >
                        Tap to retry
                      </button>
                    </div>
                  )}
                  {!msg.uploading && !msg.failed && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] text-white/80 flex items-center gap-1 select-none font-semibold">
                      <span>{formatMessageTime(msgTime)}</span>
                      {isMine && renderTicks(msg, true)}
                    </div>
                  )}
                </div>
              ) : msg.type === 'video' ? (
                <div className="relative">
                  <video 
                    src={msg.text} 
                    controls={!msg.uploading && !msg.failed}
                    controlsList="nodownload"
                    className={`max-w-full max-h-60 ${msg.uploading || msg.failed ? 'blur-[2px] pointer-events-none' : ''}`}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  {msg.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 select-none">
                      <svg width="48" height="48" className="-rotate-90">
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="24" cy="24" r="20"
                          fill="none"
                          stroke="#00BFFF"
                          strokeWidth="3.5"
                          strokeDasharray={2 * Math.PI * 20}
                          strokeDashoffset={2 * Math.PI * 20 - (msg.uploadProgress / 100) * (2 * Math.PI * 20)}
                          strokeLinecap="round"
                          className="transition-[stroke-dashoffset] duration-200"
                        />
                      </svg>
                      <span className="text-white text-xs font-bold">{msg.uploadProgress}%</span>
                    </div>
                  )}
                  {msg.failed && (
                    <div className="absolute inset-0 bg-red-950/65 flex flex-col items-center justify-center gap-1.5 select-none text-center p-2">
                      <span className="text-lg">⚠️</span>
                      <span className="text-white text-xs font-semibold">Failed to send</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryUpload(msg);
                        }}
                        className="bg-white text-red-600 border-none rounded-full px-3 py-1 text-[10px] font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md mt-1"
                      >
                        Tap to retry
                      </button>
                    </div>
                  )}
                  {!msg.uploading && !msg.failed && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] text-white/80 flex items-center gap-1 select-none font-semibold">
                      <span>{formatMessageTime(msgTime)}</span>
                      {isMine && renderTicks(msg, true)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="break-words">
                    {msg.text}
                    {msg.isEdited && <span className="text-[9px] opacity-50 ml-2">(edited)</span>}
                  </div>
                  <div className={`flex items-center justify-end gap-1 text-[9px] mt-0.5 select-none font-bold tracking-wide ${
                    isMine ? 'text-[#0A0A0A]/50' : 'text-nc-muted'
                  }`}>
                    <span>{formatMessageTime(msgTime)}</span>
                    {isMine && renderTicks(msg, false)}
                  </div>
                </div>
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

        {/* Chats / Calls Tabs */}
        <div className="flex border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'chats'
                ? 'text-[#00BFFF] border-b-2 border-[#00BFFF]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'calls'
                ? 'text-[#00BFFF] border-b-2 border-[#00BFFF]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Calls
          </button>
        </div>

        {/* Conversation List — shown when 'chats' tab is active */}
        <div className={`flex-1 overflow-y-auto ${activeTab !== 'chats' ? 'hidden' : ''}`}>
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

              const lastActive = chat.lastActive?.toMillis?.() || chat.lastActive?.seconds * 1000 || (chat.lastActive ? new Date(chat.lastActive).getTime() : 0);
              const lastSeen = chat.lastSeen?.toMillis?.() || chat.lastSeen?.seconds * 1000 || (chat.lastSeen ? new Date(chat.lastSeen).getTime() : 0);
              const activeTime = Math.max(lastActive, lastSeen);
              const isChatOnline = chat.online === true && (Date.now() - activeTime < 180000);

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
                    {isChatOnline && (
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
                      {chat.lastSenderId === user?.uid && chat.lastMessage ? 'You: ' : ''}
                      {formatMessagePreview(formatCallOutcomeText(chat.lastMessage, chat))}
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

        {/* Call History — shown when 'calls' tab is active */}
        <div className={`flex-1 overflow-y-auto ${activeTab !== 'calls' ? 'hidden' : ''}`}>
          {callHistoryLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="p-4 flex gap-3 border-b border-white/5 items-center">
                <div className="w-12 h-12 rounded-full skeleton shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 skeleton w-1/3" />
                  <div className="h-3.5 skeleton w-2/3" />
                </div>
                <div className="h-3 skeleton w-10 shrink-0" />
              </div>
            ))
          ) : callHistory.length > 0 ? (
            callHistory.map(call => {
              const isCaller = call.callerId === user?.uid;
              const remoteName = isCaller 
                ? (call.calleeName || call.receiverName || 'Unknown') 
                : (call.callerName || 'Unknown');
              const remotePhoto = isCaller 
                ? (call.calleePhoto || call.receiverAvatar || '') 
                : (call.callerPhoto || call.callerAvatar || '');
              const remoteId = isCaller 
                ? (call.calleeId || call.receiverId) 
                : call.callerId;
              const isVideo = call.callType === 'video';
              const isMissed = call.status === 'no-answer' || call.status === 'rejected';
              const wasAnswered = call.status === 'ended' || call.status === 'accepted';

              let statusLabel = '';
              let statusColor = 'text-gray-500';
              let StatusIcon = isCaller ? PhoneOutgoing : PhoneIncoming;

              if (call.status === 'no-answer') {
                statusLabel = 'Missed';
                statusColor = 'text-red-400';
                StatusIcon = PhoneMissed;
              } else if (call.status === 'rejected') {
                statusLabel = 'Declined';
                statusColor = 'text-red-400';
                StatusIcon = PhoneOff;
              } else if (call.status === 'busy') {
                statusLabel = 'Busy';
                statusColor = 'text-yellow-400';
                StatusIcon = PhoneOff;
              } else if (wasAnswered) {
                statusLabel = isCaller ? 'Outgoing' : 'Incoming';
                statusColor = 'text-green-400';
              } else if (call.status === 'pending') {
                statusLabel = 'Pending';
                statusColor = 'text-yellow-400';
              } else {
                statusLabel = isCaller ? 'Outgoing' : 'Incoming';
              }

              const callTime = call.createdAt?.toDate?.() || (call.createdAt?.seconds ? new Date(call.createdAt.seconds * 1000) : null);
              const timeStr = callTime ? formatConvoTime(callTime) : '';

              return (
                <div
                  key={call.id}
                  className="p-4 flex gap-3 cursor-pointer transition-colors border-b border-white/5 items-center hover:bg-white/[0.025]"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar
                      src={remotePhoto}
                      name={remoteName}
                      size="md"
                      className="!w-12 !h-12 border-none shrink-0"
                    />
                    {/* Call type badge on avatar */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0D0D12] ${
                      isMissed ? 'bg-red-500/80' : 'bg-[#00BFFF]/80'
                    }`}>
                      {isVideo ? (
                        <Video className="w-2.5 h-2.5 text-white" />
                      ) : (
                        <Phone className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-[15px] truncate mb-0.5 leading-snug ${isMissed ? 'text-red-400 font-bold' : 'text-white font-medium'}`}>
                      {remoteName}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`w-3 h-3 ${statusColor} shrink-0`} />
                      <span className={`text-xs ${statusColor}`}>
                        {statusLabel} {isVideo ? 'video' : 'audio'} call
                      </span>
                    </div>
                  </div>

                  {/* Right: time + re-call button */}
                  <div className="flex flex-col items-end gap-1.5 self-center shrink-0">
                    <span className="text-[11px] text-nc-muted font-medium">{timeStr}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (remoteId) {
                          startCall({
                            calleeId: remoteId,
                            calleeName: remoteName,
                            calleePhoto: remotePhoto,
                            callType: call.callType || 'audio'
                          });
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] hover:bg-[#00BFFF]/20 transition-all active:scale-90"
                      title={`Call ${remoteName}`}
                    >
                      {isVideo ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <Phone className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-nc-muted text-sm">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-[#00BFFF]/40" />
              </div>
              <p className="font-semibold text-white/60 mb-1">No call history</p>
              <p className="text-xs text-gray-500">Your recent calls will appear here</p>
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
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#0d0d12]" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate leading-tight">{activeChat.name}</h3>
                <p className="text-[11px] leading-none mt-0.5">
                  <span className={isOnline ? "text-[#00BFFF] font-semibold animate-pulse" : "text-gray-500"}>
                    {presenceLabel}
                  </span>
                </p>
              </div>
              
                <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => handleStartCall('audio')}
                  className="p-2 text-gray-400 hover:text-[#00BFFF] transition-colors"
                  title="Audio Call"
                  aria-label="Audio Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
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
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative"
            >
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

              {/* Floating scroll-to-bottom button */}
              <AnimatePresence>
                {showScrollBottom && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-[#00BFFF] hover:bg-[#0099e6] text-[#0A0A0A] hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg shadow-[#00BFFF]/30 border border-white/10 transition-all"
                    title="Scroll to bottom"
                    aria-label="Scroll to bottom"
                  >
                    <svg className="w-5 h-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
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
                  multiple={true}
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-nc-muted hover:text-[#00BFFF] p-1 transition-colors"
                  title="Attach Media"
                  aria-label="Attach Media"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    id="messages-new-message"
                    name="messages-new-message"
                    placeholder="Type a message..."
                    className="w-full bg-nc-surface border border-nc-border rounded-[2rem] px-5 py-3.5 text-sm text-white placeholder-nc-muted outline-none focus:border-[#00BFFF] transition-all"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                {/* Cyan Send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 rounded-full bg-[#00BFFF] text-nc-darker flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-[#00BFFF]/20 shrink-0"
                  title="Send Message"
                  aria-label="Send Message"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
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

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 cursor-zoom-out select-none"
          >
            {/* Close button top right */}
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 active:scale-95 transition-all"
              title="Close Image"
              aria-label="Close Image"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Centered Image */}
            <motion.img
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              src={lightboxUrl}
              alt="Fullscreen view"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/5"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Instruction tooltip */}
            <p className="text-xs text-nc-muted mt-4 font-semibold tracking-wider uppercase select-none pointer-events-none">
              Click anywhere to dismiss
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
