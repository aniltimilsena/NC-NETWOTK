import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Paperclip } from 'lucide-react';
import { uploadMedia } from '../../../utils/uploadMedia';
import type { Message } from '../../../types';
import { useDialog } from '../../../providers/DialogProvider';

interface MessageInputProps {
    onSend: (text: string, type?: 'text' | 'image' | 'video') => void;
    replyingTo: Message | null;
    onCancelReply: () => void;
    onTyping: (isTyping: boolean) => void;
}

export default function MessageInput({ onSend, replyingTo, onCancelReply, onTyping }: MessageInputProps) {
    const { showErrorDialog } = useDialog();
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
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
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
                showErrorDialog('Upload Failed', err.message || 'Failed to upload file.');
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter')
            return;
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
            showErrorDialog('Invalid File', 'Only images and videos are supported.');
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

    const hasContent = Boolean(text.trim() || selectedFile);

    return (
        <div className="p-3 sm:p-4 bg-[#141414] border-t border-white/5 space-y-2.5">
            {replyingTo && (
                <div className="flex justify-between items-center bg-[#1a1a1a] p-2.5 rounded-xl text-xs text-gray-400">
                    <div className="text-left truncate max-w-[80%]">
                        <span className="font-bold text-white block mb-0.5">Replying to:</span>
                        <span>{replyingTo.text}</span>
                    </div>
                    <button onClick={onCancelReply} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {previewUrl && selectedFile && (
                <div className="relative inline-block bg-[#1a1a1a] p-2 rounded-xl max-w-[200px] text-left animate-in fade-in zoom-in duration-200">
                    {selectedFile.type.startsWith('image/') ? (
                        <img src={previewUrl} alt="Preview" className="max-w-[180px] max-h-[120px] rounded-lg object-cover" />
                    ) : (
                        <video src={previewUrl} className="max-w-[180px] max-h-[120px] rounded-lg object-cover" />
                    )}
                    <button type="button" onClick={handleRemovePreview} disabled={uploading} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all z-10 cursor-pointer" title="Remove attachment">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {uploading && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-[#522C69] font-bold">
                        <span>Uploading attachment...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#522C69] transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                    </div>
                </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2 sm:gap-3 items-center">
                <button type="button" onClick={handleAttachClick} disabled={uploading} className="w-10 h-10 sm:w-11 sm:h-11 bg-[#1a1a1a] hover:bg-[#242424] disabled:opacity-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0 active:scale-95 cursor-pointer" title="Attach photo or video">
                    <Paperclip className="w-4 h-4" />
                </button>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />

                <input type="text" placeholder={uploading ? "Uploading media..." : "Write a message..."} value={text} disabled={uploading} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 bg-[#1a1a1a] rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-white/20 transition-all disabled:opacity-50" />

                <button
                    type="submit"
                    disabled={!hasContent || uploading}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black transition-all shrink-0 active:scale-95 ${
                        hasContent
                            ? 'bg-[#522C69] text-white hover:bg-[#663782] shadow-sm cursor-pointer'
                            : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed'
                    }`}
                    title="Send message"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}

export type { MessageInputProps };
