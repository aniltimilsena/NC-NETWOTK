import React, { useState, useMemo } from 'react';
import { useMessages, extractOtherParticipantId, isDirectConversationId, getResolvedTargetId } from './hooks/useMessages';
import ChatSidebar from './components/ChatSidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import NewChatModal from './components/NewChatModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useCall } from '../../context/CallContext';
import { deleteMessage, deleteConversation, pinMessage, reactToMessage } from './services/messaging';
import type { Message } from '../../types';
import { Pin, X } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../../components/ui';
import { getSavedRealTalents } from '../profile/services/users';
interface MessagesPageProps {
    onNavigate: (page: string, param?: any) => void;
    user: any;
    initialUserId?: string | null;
    initialConversationId?: string | null;
    activeSubView?: string | null;
    showAlert: (message: string, type?: any, detail?: string) => void;
}
import { useTranslation } from 'react-i18next';

export default function MessagesPage({ onNavigate, user, initialUserId, initialConversationId, activeSubView: _activeSubView, showAlert }: MessagesPageProps) {
    const { t } = useTranslation();
    const { conversations, activeChatId, activeChat: hookActiveChat, setActiveChatId, messages, loading, typingUsers, callHistory, loadingCalls, updateTyping, dispatchMessage, removeConversation } = useMessages(user, initialConversationId || initialUserId || null);
    const { initiateCall } = useCall();
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [deletingConvoId, setDeletingConvoId] = useState<string | null>(null);
    const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
    const activeChat = useMemo(() => {
        if (!activeChatId) return null;
        const found = conversations.find((c) => c.id === activeChatId || c.otherParticipantId === activeChatId);
        if (found) return found;
        if (hookActiveChat && hookActiveChat.name && hookActiveChat.name !== 'User') return hookActiveChat;
        const resolvedOtherId = (activeChatId && isDirectConversationId(activeChatId, user?.uid) && !activeChatId.startsWith('app_'))
            ? extractOtherParticipantId(activeChatId, user?.uid)
            : getResolvedTargetId(activeChatId);

        const saved = getSavedRealTalents();
        const clean = resolvedOtherId.replace(/^@/, '').toLowerCase().trim();
        const cached = saved.find((t: any) => {
            const tUid = t.uid || t.id;
            const tUser = (t.username || '').toLowerCase().trim();
            const tName = (t.name || '').toLowerCase().trim();
            return tUid === resolvedOtherId || (Boolean(clean && tUser) && tUser === clean) || (Boolean(clean && tName) && tName === clean);
        });

        const name = cached?.name ||
            [cached?.firstName, cached?.lastName].filter(Boolean).join(' ') ||
            cached?.displayName ||
            cached?.username ||
            hookActiveChat?.name ||
            'User';
        const avatar = cached?.image || cached?.photoURL || cached?.profileImage || hookActiveChat?.avatar || '';

        return {
            id: activeChatId,
            otherParticipantId: resolvedOtherId,
            participants: user?.uid ? [user.uid, resolvedOtherId] : [resolvedOtherId],
            name,
            avatar,
            online: false
        };
    }, [activeChatId, conversations, hookActiveChat, user?.uid]);
    const handleDeleteConversation = async (convoId: string) => {
        try {
            const targetConvo = conversations.find(c => c.id === convoId);
            const otherId = targetConvo?.otherParticipantId;
            removeConversation?.(convoId);
            if (otherId) {
                removeConversation?.(otherId);
            }
            if (activeChatId === convoId || activeChatId === otherId) {
                setActiveChatId(null);
            }
            const res = await deleteConversation(convoId, user?.uid);
            if (res.success) {
                onNavigate('messages');
            }
            else {
                showAlert(res.error || 'Failed to delete conversation.', 'error');
            }
        }
        catch (err) {
            console.error(err);
            showAlert('Failed to delete conversation.', 'error');
        }
    };
    const handleSendMessage = async (text: string, type: 'text' | 'image' | 'video' = 'text') => {
        const res = await dispatchMessage(text, replyingTo, type);
        if (res.success) {
            setReplyingTo(null);
        }
        else {
            showAlert(res.error || 'Failed to send message', 'error');
        }
    };
    const handleInitiateDirectCall = (calleeId: string, calleeName: string, calleePhoto: string) => {
        if (!calleeId)
            return;
        initiateCall({
            calleeId,
            calleeName: calleeName || 'User',
            calleePhoto: calleePhoto || '',
            callType: 'audio'
        });
    };
    const handleInitiateCall = () => {
        if (!activeChat)
            return;
        const otherParticipantId = activeChat.participants?.find((p: string) => p !== user.uid);
        if (otherParticipantId) {
            handleInitiateDirectCall(otherParticipantId, activeChat.name || 'User', activeChat.avatar || '');
        }
    };
    const handleDeleteMessage = async (msgId: string) => {
        if (!activeChatId)
            return;
        try {
            await deleteMessage(activeChatId, msgId);
        }
        catch (err) {
            console.error(err);
            showAlert('Failed to delete message.', 'error');
        }
    };
    const handleSelectUser = async (targetUserId: string) => {
        onNavigate('messages', targetUserId);
    };
    const handlePinMessage = async (msgId: string) => {
        if (!activeChatId)
            return;
        try {
            const msg = messages.find((m: any) => m.id === msgId);
            const isCurrentlyPinned = msg?.isPinned === true;
            const res = await pinMessage(activeChatId, msgId);
            if (res.success) {
                showAlert(isCurrentlyPinned ? 'Message unpinned.' : 'Message pinned.', 'info');
            }
            else {
                showAlert(res.error || 'Failed to pin/unpin message.', 'error');
            }
        }
        catch (err) {
            console.error(err);
            showAlert('Failed to pin/unpin message.', 'error');
        }
    };
    const handleReactToMessage = async (msgId: string, emoji: string) => {
        if (!activeChatId || !user?.uid) return;
        try {
            await reactToMessage(activeChatId, msgId, emoji, user.uid);
        } catch (err) {
            console.error(err);
        }
    };
    const handleForwardMessage = async (text: string, toConversationId: string) => {
        try {
            const { sendMessage } = await import('./services/messaging');
            await sendMessage(toConversationId, user?.uid, text);
        } catch (err) {
            console.error(err);
            showAlert('Failed to forward message.', 'error');
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-[#FAF8F4] text-[#202923] flex font-inter">
        
        <div className="max-w-[1600px] mx-auto w-full px-3.5 sm:px-8 lg:px-12 py-3 sm:py-8 flex gap-6 h-[calc(100vh-80px)]">
          
          <div className="w-80 border border-[#E7E5E0] bg-white rounded-2xl p-5 hidden md:flex flex-col space-y-6 shrink-0 shadow-card">
            <div className="flex items-center justify-between pb-2">
              <div className="h-6 skeleton w-24"/>
              <div className="w-9 h-9 rounded-full skeleton"/>
            </div>
            <div className="h-10 skeleton rounded-xl w-full"/>
            <div className="flex-1 space-y-4 overflow-hidden pt-2">
              {[1, 2, 3, 4].map(i => (<div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-12 h-12 rounded-full skeleton shrink-0"/>
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 skeleton w-2/3"/>
                    <div className="h-3 skeleton w-1/2"/>
                  </div>
                </div>))}
            </div>
          </div>

          
          <div className="flex-1 border border-[#E7E5E0] bg-white rounded-2xl p-6 flex flex-col justify-between shadow-card">
            
            <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full skeleton"/>
                <div className="space-y-1.5">
                  <div className="h-4 skeleton w-28"/>
                  <div className="h-3 skeleton w-16"/>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full skeleton"/>
                <div className="w-8 h-8 rounded-full skeleton"/>
              </div>
            </div>

            
            <div className="flex-1 py-6 space-y-5 overflow-hidden">
              <div className="flex items-end gap-2.5 max-w-md">
                <div className="w-8 h-8 rounded-full skeleton shrink-0 mb-1.5"/>
                <div className="h-14 skeleton w-64 rounded-2xl rounded-bl-none"/>
              </div>
              <div className="flex items-end gap-2.5 max-w-md ml-auto justify-end">
                <div className="h-10 skeleton w-48 rounded-2xl rounded-br-none"/>
              </div>
              <div className="flex items-end gap-2.5 max-w-md">
                <div className="w-8 h-8 rounded-full skeleton shrink-0 mb-1.5"/>
                <div className="h-12 skeleton w-56 rounded-2xl rounded-bl-none"/>
              </div>
            </div>

            
            <div className="h-12 skeleton rounded-2xl w-full"/>
          </div>
        </div>
      </div>);
    }
    if (!user) {
        return (<div className="min-h-screen bg-[#FAF8F4] pb-24 flex flex-col items-center justify-center text-center p-6 font-inter">
        <h2 className="font-display text-2xl font-semibold text-[#202923] mb-2">Access Denied</h2>
        <p className="text-[#626860] text-sm max-w-xs mb-6">
          Please log in to check your messages.
        </p>
        <button onClick={() => onNavigate('signin')} className="px-6 py-2.5 bg-[#194332] hover:bg-[#102F28] active:bg-[#0c241e] text-white shadow-sm font-semibold rounded-lg cursor-pointer transition-colors">
          Sign In
        </button>
      </div>);
    }
    return (<div className="h-screen h-dvh bg-[#FAF8F4] flex overflow-hidden font-inter">
      
      <div className="w-full flex h-full overflow-hidden">
        
        <div className={`w-full md:w-[380px] lg:w-[420px] xl:w-[450px] h-full shrink-0 ${activeChatId ? 'hidden md:block' : 'block'}`}>
          <ChatSidebar conversations={conversations} activeChatId={activeChatId} onSelectChat={setActiveChatId} onDeleteChat={setDeletingConvoId} callHistory={callHistory} loadingCalls={loadingCalls} currentUser={user} onStartNewChat={() => setShowNewChatModal(true)} onNavigate={onNavigate} onInitiateCall={handleInitiateDirectCall}/>
        </div>

        
        <div className={`flex-1 h-full flex flex-col ${!activeChatId ? 'hidden md:flex items-center justify-center bg-[#FAF8F4] text-[#626860] text-xs' : 'flex'}`}>
          {activeChat ? (<>
              <div className="flex-1 min-h-0">
                <ChatArea chat={activeChat} messages={messages} currentUser={user} typingUsers={typingUsers} onBack={() => setActiveChatId(null)} onInitiateCall={handleInitiateCall} onReplyTo={setReplyingTo} onDeleteMessage={handleDeleteMessage} onPinMessage={handlePinMessage} onReactToMessage={handleReactToMessage} onForwardMessage={handleForwardMessage} conversations={conversations} onTogglePinnedDrawer={() => setShowPinnedDrawer(!showPinnedDrawer)} isPinnedDrawerOpen={showPinnedDrawer}/>
              </div>
              <MessageInput onSend={handleSendMessage} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} onTyping={updateTyping}/>
            </>) : (<div className="space-y-3 text-center flex flex-col items-center justify-center p-6 h-full my-auto">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto border border-[#E7E5E0] shadow-sm">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-sm font-medium text-[#202923]">{t('messages.empty')}</p>
            </div>)}
        </div>

        
        <AnimatePresence>
          {showPinnedDrawer && activeChat && (<motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 md:w-96 lg:static lg:h-full lg:w-80 border-l border-[#E7E5E0] bg-white flex flex-col shadow-xl shrink-0">
              
              <div className="p-4 pt-6 md:p-4 border-b border-[#E7E5E0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-[#194332]"/>
                  <h3 className="text-base font-semibold text-[#202923]">Pinned Messages</h3>
                </div>
                <button onClick={() => setShowPinnedDrawer(false)} className="w-8 h-8 rounded-full bg-[#FAF8F4] hover:bg-[#F3F0E9] flex items-center justify-center text-[#202923] border border-[#E7E5E0] transition-all cursor-pointer shrink-0" title="Close Drawer">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {messages.filter(m => m.isPinned).length > 0 ? (messages.filter(m => m.isPinned).map((msg) => {
                const isMsgMe = msg.senderId === user.uid;
                const senderName = isMsgMe ? 'You' : (activeChat.name || 'User');
                const senderAvatar = isMsgMe ? (user.photoURL || '') : (activeChat.avatar || '');
                return (<div key={msg.id} className="bg-[#FAF8F4] border border-[#E7E5E0] rounded-xl p-3.5 space-y-2 relative group hover:border-[#D5D1C7] transition-all text-left">
                        <div className="flex items-center gap-2">
                          <Avatar userId={msg.senderId} src={senderAvatar} name={senderName} size="xs" className="w-6 h-6"/>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-[#202923] block truncate">{senderName}</span>
                          </div>
                        </div>
                        <div className="text-xs text-[#414840] break-words line-clamp-4">
                          {msg.type === 'image' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/image/upload/') || msg.text.match(/\.(jpeg|jpg|gif|png|webp|svg)/i))) ? (<span className="italic text-[#777C75]"> Sent a photo</span>) : msg.type === 'video' || (msg.text && msg.text.startsWith('http') && (msg.text.includes('/video/upload/') || msg.text.match(/\.(mp4|webm|ogg|mov)/i))) ? (<span className="italic text-[#777C75]"> Sent a video</span>) : msg.type === 'file' || (msg.text && msg.text.startsWith('http') && msg.text.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)/i)) ? (<span className="italic text-[#194332] font-semibold"> Document File</span>) : (msg.text)}
                        </div>
                      </div>);
            })) : (<div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#777C75] space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#E7E5E0] flex items-center justify-center">
                      <Pin className="w-5 h-5 text-[#777C75]"/>
                    </div>
                    <p className="text-xs font-medium text-[#777C75]">No pinned messages in this conversation yet.</p>
                  </div>)}
              </div>
            </motion.div>)}
        </AnimatePresence>
      </div>

      <NewChatModal isOpen={showNewChatModal} onClose={() => setShowNewChatModal(false)} onSelectUser={handleSelectUser}/>

      <ConfirmDialog isOpen={deletingConvoId !== null} title="Delete Chat Thread?" description="Are you sure you want to delete this chat conversation? All messages in this thread will be permanently deleted." confirmText="Delete" cancelText="Cancel" type="danger" onClose={() => setDeletingConvoId(null)} onConfirm={async () => {
            if (deletingConvoId) {
                await handleDeleteConversation(deletingConvoId);
                setDeletingConvoId(null);
            }
        }}/>
    </div>);
}
