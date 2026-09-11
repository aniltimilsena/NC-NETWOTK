import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { getAvatarOptimizedUrl } from '../../utils/media';

interface ProfileData {
    id: string;
    name: string;
    role?: string;
    location?: string;
    followers?: number;
    rating?: number;
    image?: string | null;
    verified?: boolean;
    username?: string | null;
}

interface ShareSheetProps {
    profile?: ProfileData;
    title?: string;
    url?: string;
    onClose: () => void;
}

export default function ShareSheet({ profile, title, url, onClose }: ShareSheetProps) {
    const [copied, setCopied] = useState(false);

    const displayName = profile?.name || title || 'NepalCasts Profile';
    const cleanUsername = (profile?.username || profile?.id || '').replace(/^@/, '');
    const shareUrl = url || (profile ? `${window.location.origin}/talent/${cleanUsername}` : window.location.href);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleWhatsAppShare = () => {
        const text = `Check out ${displayName} on NepalCasts:`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
    };

    const handleFacebookShare = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const handleTwitterShare = () => {
        const text = `Check out ${displayName} on NepalCasts!`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const handleLinkedInShare = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 select-none"
                role="dialog"
                aria-modal="true"
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                />

                {/* Facebook-style Modal Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="relative w-full max-w-[460px] bg-[#242526] border border-[#3E4042] rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.6)] overflow-hidden text-left"
                >
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-[#3E4042] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-[#B0B3B8]" />
                            <h3 className="text-base font-bold text-[#E4E6EB] tracking-tight">
                                Share
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-[#3A3B3C]/50 hover:bg-[#3A3B3C] text-[#B0B3B8] hover:text-[#E4E6EB] flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Preview Card */}
                    <div className="p-5 space-y-4">
                        <div className="bg-[#18191A] border border-[#3E4042] rounded-lg p-3 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-[#3A3B3C] overflow-hidden shrink-0 flex items-center justify-center text-[#B0B3B8]">
                                {profile?.image ? (
                                    <img
                                      src={getAvatarOptimizedUrl(profile.image, 'md')}
                                      alt={displayName}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Share2 className="w-6 h-6" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-[#E4E6EB] truncate">
                                    {displayName}
                                </h4>
                                <p className="text-xs text-[#B0B3B8] truncate mt-0.5">
                                    {profile?.role ? `${profile.role} • ` : ''}nepalcasts.com
                                </p>
                            </div>
                        </div>

                        {/* Copy Link Input Bar */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#B0B3B8] block">
                                Page Link
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="bg-[#18191A] border border-[#3E4042] rounded-md px-3 py-2 text-xs text-[#E4E6EB] flex-1 font-mono truncate focus:outline-none select-all"
                                />
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                                        copied
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-[#1877F2] hover:bg-[#166FE5] text-white'
                                    }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Social Share Grid */}
                        <div className="space-y-2 pt-2 border-t border-[#3E4042]">
                            <label className="text-xs font-semibold text-[#B0B3B8] block">
                                Share To
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {/* WhatsApp */}
                                <button
                                    type="button"
                                    onClick={handleWhatsAppShare}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[#3A3B3C]/50 transition-colors cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-medium text-[#B0B3B8] group-hover:text-[#E4E6EB]">
                                        WhatsApp
                                    </span>
                                </button>

                                {/* Facebook */}
                                <button
                                    type="button"
                                    onClick={handleFacebookShare}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[#3A3B3C]/50 transition-colors cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                        </svg>
                                    </div>
                                    <span className="text-[11px] font-medium text-[#B0B3B8] group-hover:text-[#E4E6EB]">
                                        Facebook
                                    </span>
                                </button>

                                {/* Twitter / X */}
                                <button
                                    type="button"
                                    onClick={handleTwitterShare}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[#3A3B3C]/50 transition-colors cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/10 text-[#E4E6EB] flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </div>
                                    <span className="text-[11px] font-medium text-[#B0B3B8] group-hover:text-[#E4E6EB]">
                                        X
                                    </span>
                                </button>

                                {/* LinkedIn */}
                                <button
                                    type="button"
                                    onClick={handleLinkedInShare}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-[#3A3B3C]/50 transition-colors cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#0A66C2]/15 text-[#0A66C2] flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.54a1.65 1.65 0 0 0-1.66 1.64c0 .91.75 1.65 1.66 1.65.9 0 1.65-.74 1.65-1.65 0-.9-.75-1.64-1.65-1.64" />
                                        </svg>
                                    </div>
                                    <span className="text-[11px] font-medium text-[#B0B3B8] group-hover:text-[#E4E6EB]">
                                        LinkedIn
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 bg-[#1C1E21] border-t border-[#3E4042] flex items-center justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-md bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] text-sm font-semibold transition-colors cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
