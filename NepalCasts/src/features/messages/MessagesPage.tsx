import React, { useState } from 'react';
import { useMessages } from './hooks/useMessages';
import ChatSidebar from './components/ChatSidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import NewChatModal from './components/NewChatModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useCall } from '../../context/CallContext';
import { deleteMessage, deleteConversation, pinMessage } from './services/messaging';
import type { Message } from '../../types';
import { Pin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../components/ui';

interface MessagesPageProps {
  onNavigate: (page: string, param?: any) => void;
  user: any;
  initialUserId?: string | null;
  showAlert: (message: string, type?: any, detail?: string) => void;
}

export default function MessagesPage({
  onNavigate,
  user,
  initialUserId,
  showAlert
}: MessagesPageProps) {
  const {
    conversations,
    activeChatId,
    setActiveChatId,
    messages,
    loading,
    typingUsers,
    callHistory,
    loadingCalls,
    updateTyping,
    dispatchMessage
  } = useMessages(user, initialUserId ?? null);

  const { initiateCall } = useCall();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [deletingConvoId, setDeletingConvoId] = useState<string | null>(null);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);

  const activeChat = conversations.find((c) => c.id === activeChatId);

  const handleDeleteConversation = async (convoId: string) => {
    try {
      const res = await deleteConversation(convoId);
      if (res.success) {
        showAlert('Conversation deleted.', 'info');
        if (activeChatId === convoId) {
          setActiveChatId(null);
        }
      } else {
        showAlert(res.error || 'Failed to delete conversation.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete conversation.', 'error');
    }
  };

  const handleSendMessage = async (text: string, type: 'text' | 'image' | 'video' = 'text') => {
    const res = await dispatchMessage(text, replyingTo, type);
    if (res.success) {
      setReplyingTo(null);
    } else {
      showAlert(res.error || 'Failed to send message', 'error');
    }
  };

  const handleInitiateDirectCall = (type: 'audio' | 'video', calleeId: string, calleeName: string, calleePhoto: string) => {
    if (!calleeId) return;
    initiateCall({
      calleeId,
      calleeName: calleeName || 'User',
      calleePhoto: calleePhoto || '',
      callType: type
    });
  };

  const handleInitiateCall = (type: 'audio' | 'video') => {
    if (!activeChat) return;
    const otherParticipantId = activeChat.participants?.find((p: string) => p !== user.uid);
    if (otherParticipantId) {
      handleInitiateDirectCall(type, otherParticipantId, activeChat.name || 'User', activeChat.avatar || '');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChatId) return;
    try {
      await deleteMessage(activeChatId, msgId);
      showAlert('Message deleted.', 'info');
    } catch (err) {
      console.error(err);
      showAlert('Failed to delete message.', 'error');
    }
  };

  const handleSelectUser = async (targetUserId: string) => {
    onNavigate('messages', targetUserId);
  };

  const handlePinMessage = async (msgId: string) => {
    if (!activeChatId) return;
    try {
      const msg = messages.find((m: any) => m.id === msgId);
      const isCurrentlyPinned = msg?.isPinned === true;
      const res = await pinMessage(activeChatId, msgId);
      if (res.success) {
        showAlert(isCurrentlyPinned ? 'Message unpinned.' : 'Message pinned.', 'info');
      } else {
        showAlert(res.error || 'Failed to pin/unpin message.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to pin/unpin message.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-nc-dark text-white flex">
        {/* Messages Shell Container */}
        <div className="max-w-[1600px] mx-auto w-full px-3.5 sm:px-8 lg:px-12 py-3 sm:py-8 flex gap-6 h-[calc(100vh-80px)]">
          {/* Left Column: Sidebar Skeleton */}
          <div className="w-80 border border-white/5 bg-[#111]/80 rounded-[2rem] p-5 hidden md:flex flex-col space-y-6 shrink-0">
            <div className="flex items-center justify-between pb-2">
              <div className="h-6 skeleton w-24" />
              <div className="w-9 h-9 rounded-full skeleton" />
            </div>
            <div className="h-10 skeleton rounded-xl w-full" />
            <div className="flex-1 space-y-4 overflow-hidden pt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-12 h-12 rounded-full skeleton shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 skeleton w-2/3" />
                    <div className="h-3 skeleton w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Chat Area Skeleton */}
          <div className="flex-1 border border-white/5 bg-[#111]/80 rounded-[2rem] p-6 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full skeleton" />
                <div className="space-y-1.5">
                  <div className="h-4 skeleton w-28" />
                  <div className="h-3 skeleton w-16" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full skeleton" />
                <div className="w-8 h-8 rounded-full skeleton" />
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 py-6 space-y-5 overflow-hidden">
              <div className="flex items-end gap-2.5 max-w-md">
                <div className="w-8 h-8 rounded-full skeleton shrink-0 mb-1.5" />
                <div className="h-14 skeleton w-64 rounded-2xl rounded-bl-none" />
              </div>
              <div className="flex items-end gap-2.5 max-w-md ml-auto justify-end">
                <div className="h-10 skeleton w-48 rounded-2xl rounded-br-none" />
              </div>
              <div className="flex items-end gap-2.5 max-w-md">
                <div className="w-8 h-8 rounded-full skeleton shrink-0 mb-1.5" />
                <div className="h-12 skeleton w-56 rounded-2xl rounded-bl-none" />
              </div>
            </div>

            {/* Input bar */}
            <div className="h-12 skeleton rounded-2xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-nc-dark pb-24 flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-nc-muted text-sm max-w-xs mb-6">
          Please log in to check your messages.
        </p>
        <button
          onClick={() => onNavigate('signin')}
          className="px-6 py-2.5 bg-[#00BFFF] text-black font-bold rounded-2xl"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-nc-dark flex">
      {/* Messages Grid Container */}
      <div className="w-full flex h-full overflow-hidden shadow-2xl">
        {/* Sidebar Column */}
        <div className={`w-full md:w-96 h-full shrink-0 ${activeChatId ? 'hidden md:block' : 'block'}`}>
          <ChatSidebar 
            conversations={conversations}
            activeChatId={activeChatId}
            onSelectChat={setActiveChatId}
            onDeleteChat={setDeletingConvoId}
            callHistory={callHistory}
            loadingCalls={loadingCalls}
            currentUser={user}
            onStartNewChat={() => setShowNewChatModal(true)}
            onNavigate={onNavigate}
            onInitiateCall={handleInitiateDirectCall}
          />
        </div>

        {/* Active Chat Thread Column */}
        <div className={`flex-1 h-full flex flex-col ${!activeChatId ? 'hidden md:flex items-center justify-center bg-[#0E0E0E] text-nc-muted text-xs' : 'flex'}`}>
          {activeChat ? (
            <>
              <div className="flex-1 min-h-0">
                <ChatArea 
                  chat={activeChat}
                  messages={messages}
                  currentUser={user}
                  typingUsers={typingUsers}
                  onBack={() => setActiveChatId(null)}
                  onInitiateCall={handleInitiateCall}
                  onReplyTo={setReplyingTo}
                  onDeleteMessage={handleDeleteMessage}
                  onPinMessage={handlePinMessage}
                  onTogglePinnedDrawer={() => setShowPinnedDrawer(!showPinnedDrawer)}
                  isPinnedDrawerOpen={showPinnedDrawer}
                />
              </div>
              <MessageInput 
                onSend={handleSendMessage}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onTyping={updateTyping}
              />
            </>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <span className="text-2xl">✉️</span>
              </div>
              <p>Select a chat thread or start a new conversation to begin messaging.</p>
            </div>
          )}
        </div>

        {/* Pinned Messages Sidebar/Drawer (Right) */}
        <AnimatePresence>
          {showPinnedDrawer && activeChat && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 md:w-96 lg:static lg:h-full lg:w-80 border-l border-white/5 bg-[#0E0E0E] flex flex-col shadow-2xl shrink-0"
            >
              {/* Drawer Header */}
              <div className="p-4 pt-6 md:p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="w-5 h-5 text-[#00BFFF]" />
                  <h3 className="text-lg font-bold text-white">Pinned Messages</h3>
                </div>
                <button
                  onClick={() => setShowPinnedDrawer(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/10 transition-all cursor-pointer flex shrink-0 items-center justify-center"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pinned Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {messages.filter(m => m.isPinned).length > 0 ? (
                  messages.filter(m => m.isPinned).map((msg) => {
                    const isMsgMe = msg.senderId === user.uid;
                    const senderName = isMsgMe ? 'You' : (activeChat.name || 'User');
                    const senderAvatar = isMsgMe ? (user.photoURL || '') : (activeChat.avatar || '');
                    
                    return (
                      <div 
                        key={msg.id}
                        className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-2 relative group hover:border-[#00BFFF]/20 transition-all text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar src={senderAvatar} name={senderName} size="xs" className="w-6 h-6" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{senderName}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-300 break-words line-clamp-4">
                          {msg.type === 'image' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/image/upload/') || msg.text.match(/\.(jpeg|jpg|gif|png|webp|svg)/i))) ? (
                            <span className="italic text-nc-muted">📷 Sent a photo</span>
                          ) : msg.type === 'video' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/video/upload/') || msg.text.match(/\.(mp4|webm|ogg|mov)/i))) ? (
                            <span className="italic text-nc-muted">🎥 Sent a video</span>
                          ) : msg.type === 'file' || (msg.text && msg.text.startsWith('http') && msg.text.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)/i)) ? (
                            <span className="italic text-[#00BFFF]">📁 Document File</span>
                          ) : (
                            msg.text
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-nc-muted space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Pin className="w-6 h-6 text-white/40" />
                    </div>
                    <p className="text-xs font-medium text-nc-muted">No pinned messages in this conversation yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NewChatModal 
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={handleSelectUser}
      />

      <ConfirmDialog
        isOpen={deletingConvoId !== null}
        title="Delete Chat Thread?"
        description="Are you sure you want to delete this chat conversation? All messages in this thread will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onClose={() => setDeletingConvoId(null)}
        onConfirm={async () => {
          if (deletingConvoId) {
            await handleDeleteConversation(deletingConvoId);
            setDeletingConvoId(null);
          }
        }}
      />
    </div>
  );
}
