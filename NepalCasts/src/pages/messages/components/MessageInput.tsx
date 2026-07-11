import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Paperclip } from 'lucide-react';
import type { Message } from '../../../types';

interface MessageInputProps {
  onSend: (text: string) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  onTyping: (isTyping: boolean) => void;
}

export default function MessageInput({
  onSend,
  replyingTo,
  onCancelReply,
  onTyping
}: MessageInputProps) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef<any>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSend(text.trim());
    setText('');
    onTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = () => {
    onTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  return (
    <div className="p-4 pb-6 md:p-4 bg-[#0E0E0E] border-t border-white/5 space-y-3">
      {/* Replying Preview block */}
      {replyingTo && (
        <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl text-xs text-nc-muted">
          <div className="text-left truncate max-w-[80%]">
            <span className="font-bold text-white block mb-0.5">Replying to:</span>
            <span>{replyingTo.text}</span>
          </div>
          <button 
            onClick={onCancelReply}
            className="text-nc-muted hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input row */}
      <form onSubmit={handleSend} className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Write your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#00BFFF]/20 transition-colors"
        />

        <button
          type="submit"
          disabled={!text.trim()}
          className="w-11 h-11 bg-[#00BFFF] hover:bg-[#00BFFF]/80 disabled:opacity-50 disabled:hover:bg-[#00BFFF] rounded-2xl flex items-center justify-center text-black font-black transition-all shrink-0 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
export type { MessageInputProps };
