import React, { useState } from 'react';
import { useMessages } from './hooks/useMessages';
import ChatSidebar from './components/ChatSidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import NewChatModal from './components/NewChatModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useCall } from '../../context/CallContext';
import { deleteMessage, deleteConversation } from '../../services/messaging';
import type { Message } from '../../types';

interface MessagesPageProps {
  onNavigate: (page: string, param?: any) => void;
  user: any;
  initialUserId: string | null;
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
  } = useMessages(user, initialUserId);

  const { initiateCall } = useCall();
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [deletingConvoId, setDeletingConvoId] = useState<string | null>(null);

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

  const handleInitiateCall = (type: 'audio' | 'video') => {
    if (!activeChat) return;
    const otherParticipantId = activeChat.participants?.find((p: string) => p !== user.uid);
    if (otherParticipantId) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) {
        const url = `/call?initiate=true&type=${type}&calleeId=${otherParticipantId}&calleeName=${encodeURIComponent(activeChat.name || 'User')}&calleePhoto=${encodeURIComponent(activeChat.avatar || '')}`;
        window.open(url, '_blank');
      } else {
        initiateCall({
          calleeId: otherParticipantId,
          calleeName: activeChat.name || 'User',
          calleePhoto: activeChat.avatar || '',
          callType: type
        });
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-nc-dark text-white flex">
        {/* Messages Shell Container */}
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-8 flex gap-6 h-[calc(100vh-80px)]">
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
