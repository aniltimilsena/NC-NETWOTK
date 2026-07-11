import React, { useState } from 'react';
import { useMessages } from './hooks/useMessages';
import ChatSidebar from './components/ChatSidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import NewChatModal from './components/NewChatModal';
import { useCall } from '../../context/CallContext';
import { deleteMessage } from '../../services/messaging';
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

  const activeChat = conversations.find((c) => c.id === activeChatId);

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
      initiateCall({
        calleeId: otherParticipantId,
        calleeName: activeChat.name || 'User',
        calleePhoto: activeChat.avatar || '',
        callType: type
      });
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
      <div className="min-h-screen bg-nc-dark pb-24 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
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
            callHistory={callHistory}
            loadingCalls={loadingCalls}
            currentUser={user}
            onStartNewChat={() => setShowNewChatModal(true)}
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
    </div>
  );
}
