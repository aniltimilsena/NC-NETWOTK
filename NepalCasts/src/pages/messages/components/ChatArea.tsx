import React, { useEffect, useRef } from 'react';
import { Phone, Video, MoreVertical, Reply, Check, Trash2, ArrowLeft } from 'lucide-react';
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
}

export default function ChatArea({
  chat,
  messages,
  currentUser,
  typingUsers,
  onBack,
  onInitiateCall,
  onReplyTo,
  onDeleteMessage
}: ChatAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const otherParticipantId = chat.participants?.find((p: string) => p !== currentUser.uid);
  const isTyping = typingUsers[otherParticipantId] === true;

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="md:hidden text-nc-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar src={chat.avatar} name={chat.name} size="sm" />
          <div className="text-left">
            <span className="text-sm font-bold text-white block">{chat.name}</span>
            <span className="text-[10px] text-nc-muted block uppercase tracking-wider font-semibold">
              {isTyping ? <span className="text-[#00BFFF] animate-pulse">Typing...</span> : 'Online'}
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onInitiateCall('audio')}
            className="text-nc-muted hover:text-white transition-colors p-2"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onInitiateCall('video')}
            className="text-nc-muted hover:text-white transition-colors p-2"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Box */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-black/10"
      >
        {messages.length > 0 ? (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[75%] ${isMe ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'}`}
              >
                {/* Bubble Container */}
                <div className="space-y-1">
                  {/* Reply block if exists */}
                  {msg.replyTo && (
                    <div className="bg-white/5 border-l-2 border-[#00BFFF] p-2 rounded-xl text-[10px] text-nc-muted mb-1 max-w-[200px] truncate">
                      {msg.replyTo.text}
                    </div>
                  )}

                  <div className={`px-4 py-3 rounded-3xl text-sm ${
                    isMe 
                      ? 'bg-[#00BFFF] text-black font-semibold rounded-tr-none' 
                      : 'bg-white/5 text-white border border-white/5 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>

                  <div className="flex items-center gap-1.5 justify-end text-[9px] text-nc-muted">
                    {/* Timestamp & read check */}
                    {isMe && <Check className="w-3 h-3 text-[#00BFFF]" />}
                  </div>
                </div>

                {/* Popover action hooks */}
                <div className="self-center opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button 
                    onClick={() => onReplyTo(msg)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-nc-muted hover:text-white transition-colors"
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  {isMe && onDeleteMessage && (
                    <button 
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-nc-muted hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-center p-6 text-nc-muted text-xs">
            Start the conversation by sending a message below.
          </div>
        )}

        {isTyping && (
          <div className="mr-auto text-left max-w-[70%] bg-white/5 border border-white/5 px-4 py-2.5 rounded-3xl rounded-tl-none text-xs text-nc-muted flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  );
}
export type { ChatAreaProps };
