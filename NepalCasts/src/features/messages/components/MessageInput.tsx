import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Paperclip } from 'lucide-react';
import { uploadMedia } from '../../../utils/uploadMedia';
import type { Message } from '../../../types';
interface MessageInputProps {
    onSend: (text: string, type?: 'text' | 'image' | 'video') => void;
    replyingTo: Message | null;
    onCancelReply: () => void;
    onTyping: (isTyping: boolean) => void;
}
export default function MessageInput({ onSend, replyingTo, onCancelReply, onTyping }: MessageInputProps) {
    const [text, setText] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const typingTimeoutRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && !selectedFile)
            return;
        onTyping(false);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        if (selectedFile) {
            setUploading(true);
            setUploadProgress(0);
            try {
                const result = await uploadMedia(selectedFile, 'chat', (progress: number) => {
                    setUploadProgress(progress);
                });
                onSend(result.url, result.type);
                handleRemovePreview();
            }
            catch (err: any) {
                console.error('Failed to upload chat media:', err);
                alert(err.message || 'Failed to upload file.');
            }
            finally {
                setUploading(false);
                setUploadProgress(0);
            }
        }
        else {
            onSend(text.trim(), 'text');
            setText('');
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
    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert('Only images and videos are supported.');
            return;
        }
        setSelectedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const handleRemovePreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
    };
    return (<div className="p-4 pb-6 md:p-4 bg-[#0E0E0E] border-t border-white/5 space-y-3">
      
      {replyingTo && (<div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-2xl text-xs text-nc-muted">
          <div className="text-left truncate max-w-[80%]">
            <span className="font-bold text-white block mb-0.5">Replying to:</span>
            <span>{replyingTo.text}</span>
          </div>
          <button onClick={onCancelReply} className="text-nc-muted hover:text-white transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>)}

      
      {previewUrl && selectedFile && (<div className="relative inline-block bg-white/5 border border-white/5 p-2 rounded-2xl max-w-[200px] text-left animate-in fade-in zoom-in duration-200">
          {selectedFile.type.startsWith('image/') ? (<img src={previewUrl} alt="Preview" className="max-w-[180px] max-h-[120px] rounded-xl object-cover border border-white/10"/>) : (<video src={previewUrl} className="max-w-[180px] max-h-[120px] rounded-xl object-cover border border-white/10"/>)}
          <button type="button" onClick={handleRemovePreview} disabled={uploading} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all z-10" title="Remove attachment">
            <X className="w-3.5 h-3.5"/>
          </button>
        </div>)}

      
      {uploading && (<div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-[#00BFFF] font-bold">
            <span>Uploading attachment...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#00BFFF] transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }}/>
          </div>
        </div>)}

      
      <form onSubmit={handleSend} className="flex gap-3 items-center">
        <button type="button" onClick={handleAttachClick} disabled={uploading} className="w-11 h-11 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-2xl flex items-center justify-center text-nc-muted hover:text-white transition-all shrink-0 active:scale-95" title="Attach photo or video">
          <Paperclip className="w-4 h-4"/>
        </button>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden"/>

        <input type="text" placeholder={uploading ? "Uploading media..." : "Write your message..."} value={text} disabled={uploading} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#00BFFF]/20 transition-colors disabled:opacity-50"/>

        <button type="submit" disabled={(!text.trim() && !selectedFile) || uploading} className="w-11 h-11 bg-[#00BFFF] hover:bg-[#00BFFF]/80 disabled:opacity-50 disabled:hover:bg-[#00BFFF] rounded-2xl flex items-center justify-center text-black font-black transition-all shrink-0 active:scale-95">
          <Send className="w-4 h-4"/>
        </button>
      </form>
    </div>);
}
export type { MessageInputProps };
