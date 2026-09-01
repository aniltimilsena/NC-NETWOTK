import React, { useState } from 'react';
import { X, Copy, MessageCircle, Download } from 'lucide-react';
interface ProfileData {
    id: string;
    name: string;
    role: string;
    location: string;
    followers: number;
    rating: number;
    image?: string | null;
    verified?: boolean;
    username?: string | null;
}
interface ShareSheetProps {
    profile: ProfileData;
    onClose: () => void;
}
export default function ShareSheet({ profile, onClose }: ShareSheetProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const cleanUsername = (profile.username || profile.id || '').replace(/^@/, '');
    const shareUrl = `${window.location.origin}/talent/${cleanUsername}`;
    const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
        window.dispatchEvent(new CustomEvent('nc-alert', { detail: { message, type } }));
    };
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            triggerToast('Link copied!', 'success');
        }
        catch (err) {
            console.error('Failed to copy link:', err);
            triggerToast('Failed to copy link', 'error');
        }
    };
    const handleWhatsAppShare = () => {
        const text = `Check out ${profile.name}'s professional profile on NepalCasts:`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
    };
    const handleFacebookShare = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    };
    const handleInstagramShare = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            triggerToast('Link copied! Open Instagram to share.', 'success');
            setTimeout(() => {
                window.open('https://instagram.com/', '_blank');
            }, 1000);
        }).catch(() => {
            window.open('https://instagram.com/', '_blank');
        });
    };
    const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string | CanvasGradient | null, stroke: string | CanvasGradient | null, strokeWidth = 1) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }
    };
    const drawFinderPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, cellSize: number) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + rx * cellSize, y + ry * cellSize, 7 * cellSize, 7 * cellSize);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + (rx + 1) * cellSize, y + (ry + 1) * cellSize, 5 * cellSize, 5 * cellSize);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + (rx + 2) * cellSize, y + (ry + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };
    const drawQRCode = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: string) => {
        drawRoundedRect(ctx, x - 12, y - 12, size + 24, size + 24, 16, '#FFFFFF', null);
        const gridCount = 21;
        const cellSize = size / gridCount;
        drawFinderPattern(ctx, x, y, 0, 0, cellSize);
        drawFinderPattern(ctx, x, y, gridCount - 7, 0, cellSize);
        drawFinderPattern(ctx, x, y, 0, gridCount - 7, cellSize);
        ctx.fillStyle = '#000000';
        for (let i = 8; i < gridCount - 8; i++) {
            if (i % 2 === 0) {
                ctx.fillRect(x + i * cellSize, y + 6 * cellSize, cellSize, cellSize);
                ctx.fillRect(x + 6 * cellSize, y + i * cellSize, cellSize, cellSize);
            }
        }
        let hash = 5381;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) + hash) + seed.charCodeAt(i);
        }
        for (let r = 0; r < gridCount; r++) {
            for (let c = 0; c < gridCount; c++) {
                const isTopLeft = r < 8 && c < 8;
                const isTopRight = r < 8 && c >= gridCount - 8;
                const isBottomLeft = r >= gridCount - 8 && c < 8;
                if (isTopLeft || isTopRight || isBottomLeft)
                    continue;
                if (r === 6 || c === 6)
                    continue;
                const val = Math.abs(Math.sin(hash + r * 17 + c * 31));
                if (val > 0.48) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize + 0.2, cellSize + 0.2);
                }
            }
        }
    };
    const handleDownloadCard = () => {
        if (isDownloading)
            return;
        setIsDownloading(true);
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsDownloading(false);
            triggerToast('Failed to create canvas context', 'error');
            return;
        }
        const bgGrad = ctx.createRadialGradient(400, 600, 50, 400, 600, 750);
        bgGrad.addColorStop(0, '#151b26');
        bgGrad.addColorStop(0.5, '#0a0d14');
        bgGrad.addColorStop(1, '#050609');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 1200);
        ctx.fillStyle = 'rgba(0, 153, 255, 0.04)';
        ctx.beginPath();
        ctx.arc(400, 600, 320, 0, Math.PI * 2);
        ctx.fill();
        const innerCardGrad = ctx.createLinearGradient(60, 60, 740, 1140);
        innerCardGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
        innerCardGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        const borderGrad = ctx.createLinearGradient(60, 60, 740, 1140);
        borderGrad.addColorStop(0, 'rgba(0, 153, 255, 0.25)');
        borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        borderGrad.addColorStop(1, 'rgba(0, 240, 255, 0.15)');
        drawRoundedRect(ctx, 60, 60, 680, 1080, 48, innerCardGrad, borderGrad, 1.5);
        drawRoundedRect(ctx, 290, 115, 50, 50, 14, '#FACC15', null);
        ctx.font = '900 26px Arial, sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NC', 315, 140);
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText('Network', 352, 140);
        const renderTalentDetails = (imageLoaded: boolean, imgObj?: HTMLImageElement) => {
            const avatarX = 400;
            const avatarY = 340;
            const avatarRadius = 105;
            const avatarGlow = ctx.createRadialGradient(avatarX, avatarY, avatarRadius - 5, avatarX, avatarY, avatarRadius + 10);
            avatarGlow.addColorStop(0, 'rgba(0, 153, 255, 0.2)');
            avatarGlow.addColorStop(1, 'rgba(0, 153, 255, 0)');
            ctx.fillStyle = avatarGlow;
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius + 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius - 2, 0, Math.PI * 2);
            ctx.clip();
            if (imageLoaded && imgObj) {
                const imgWidth = imgObj.width;
                const imgHeight = imgObj.height;
                const size = Math.min(imgWidth, imgHeight);
                const sx = (imgWidth - size) / 2;
                const sy = (imgHeight - size) / 2;
                ctx.drawImage(imgObj, sx, sy, size, size, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
            }
            else {
                const avatarBg = ctx.createLinearGradient(avatarX - avatarRadius, avatarY - avatarRadius, avatarX + avatarRadius, avatarY + avatarRadius);
                avatarBg.addColorStop(0, '#0099FF');
                avatarBg.addColorStop(1, '#00F0FF');
                ctx.fillStyle = avatarBg;
                ctx.fillRect(avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                ctx.font = 'bold 85px Arial, sans-serif';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const initial = (profile.name || 'N').charAt(0).toUpperCase();
                ctx.fillText(initial, avatarX, avatarY + 5);
            }
            ctx.restore();
            ctx.font = 'bold 42px Arial, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            const nameText = profile.name || 'Discovery Talent';
            const nameWidth = ctx.measureText(nameText).width;
            ctx.fillText(nameText, avatarX, 530);
            if (profile.verified) {
                const badgeX = avatarX + (nameWidth / 2) + 20;
                const badgeY = 530 - 15;
                ctx.fillStyle = '#00E5FF';
                ctx.beginPath();
                ctx.arc(badgeX, badgeY, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(badgeX - 6, badgeY - 1);
                ctx.lineTo(badgeX - 1.5, badgeY + 4);
                ctx.lineTo(badgeX + 6, badgeY - 4);
                ctx.stroke();
            }
            ctx.font = 'bold 26px Arial, sans-serif';
            ctx.fillStyle = '#00E5FF';
            ctx.textAlign = 'center';
            ctx.fillText(profile.role || 'New User', avatarX, 585);
            ctx.font = '22px Arial, sans-serif';
            ctx.fillStyle = '#99a2b3';
            ctx.textAlign = 'center';
            ctx.fillText(profile.location || 'Nepal', avatarX, 630);
            const dividerX = 400;
            const statsY = 710;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dividerX, statsY - 25);
            ctx.lineTo(dividerX, statsY + 30);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px Arial, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(String(profile.followers || 0), 280, statsY);
            ctx.font = 'bold 15px Arial, sans-serif';
            ctx.fillStyle = '#667085';
            ctx.fillText('FOLLOWERS', 280, statsY + 28);
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px Arial, sans-serif';
            ctx.fillStyle = '#FACC15';
            const ratingText = profile.rating > 0 ? `${profile.rating.toFixed(1)} ★` : '0.0 ★';
            ctx.fillText(ratingText, 520, statsY);
            ctx.font = 'bold 15px Arial, sans-serif';
            ctx.fillStyle = '#667085';
            ctx.fillText('RATING', 520, statsY + 28);
            const qrSize = 150;
            const qrX = 400 - (qrSize / 2);
            const qrY = 820;
            drawQRCode(ctx, qrX, qrY, qrSize, profile.id || 'seed');
            ctx.font = 'bold 14px Arial, sans-serif';
            ctx.fillStyle = '#667085';
            ctx.textAlign = 'center';
            ctx.fillText('SCAN TO VIEW PROFILE', avatarX, qrY + qrSize + 30);
            ctx.font = 'bold 18px Arial, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.textAlign = 'center';
            ctx.fillText('NC NETWORK • TALENT DECK', avatarX, 1115);
            try {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = `${cleanUsername}_profile_card.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                triggerToast('Profile Card downloaded!', 'success');
            }
            catch (err) {
                console.error('Canvas export error:', err);
                triggerToast('Failed to export image', 'error');
            }
            finally {
                setIsDownloading(false);
            }
        };
        if (profile.image) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const timeout = setTimeout(() => {
                img.onload = null;
                img.onerror = null;
                renderTalentDetails(false);
            }, 4500);
            img.onload = () => {
                clearTimeout(timeout);
                renderTalentDetails(true, img);
            };
            img.onerror = () => {
                clearTimeout(timeout);
                renderTalentDetails(false);
            };
            img.src = profile.image;
        }
        else {
            renderTalentDetails(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />

            <div className="relative w-full sm:max-w-[360px] bg-[#0F0F13]/95 border-t sm:border border-[#1A1F2D] rounded-t-[1.75rem] sm:rounded-[1.75rem] shadow-2xl p-5 sm:p-6 backdrop-blur-xl z-10 transform translate-y-0 transition-transform duration-300 ease-out flex flex-col max-h-[92vh] sm:max-h-none overflow-y-auto">
                <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

                <div className="flex items-center justify-between mb-5 shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-white tracking-tight">Share Profile</h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">Share {profile.name}'s talent profile</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#181C26] hover:bg-[#222736] flex items-center justify-center text-gray-400 hover:text-white border border-[#212738]/40 transition-colors active:scale-90" aria-label="Close">
                        <X size={14} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 mb-2 shrink-0">
                    {/* Copy Link */}
                    <button onClick={handleCopyLink} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#151821] hover:bg-[#1C202E] border border-white/[0.03] hover:border-white/[0.08] transition-all group text-left active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#522C69]/10 flex items-center justify-center text-[#522C69] group-hover:scale-105 transition-transform">
                                <Copy size={16} />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-white">Copy Link</span>
                                <span className="block text-[10px] text-gray-500 mt-0.5">Copy profile URL to clipboard</span>
                            </div>
                        </div>
                        <span className="text-[10px] text-[#522C69] font-semibold bg-[#522C69]/5 px-2 py-0.5 rounded-md border border-[#522C69]/10 opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                    </button>

                    {/* WhatsApp */}
                    <button onClick={handleWhatsAppShare} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#151821] hover:bg-[#1C202E] border border-white/[0.03] hover:border-white/[0.08] transition-all group text-left active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-105 transition-transform">
                                <MessageCircle size={16} />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-white">Share on WhatsApp</span>
                                <span className="block text-[10px] text-gray-500 mt-0.5">Send directly to chats</span>
                            </div>
                        </div>
                    </button>

                    {/* Instagram */}
                    <button onClick={handleInstagramShare} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#151821] hover:bg-[#1C202E] border border-white/[0.03] hover:border-white/[0.08] transition-all group text-left active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                                </svg>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-white">Share on Instagram</span>
                                <span className="block text-[10px] text-gray-500 mt-0.5">Post to story or DM</span>
                            </div>
                        </div>
                    </button>

                    {/* Facebook */}
                    <button onClick={handleFacebookShare} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#151821] hover:bg-[#1C202E] border border-white/[0.03] hover:border-white/[0.08] transition-all group text-left active:scale-[0.99]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                                </svg>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-white">Share on Facebook</span>
                                <span className="block text-[10px] text-gray-500 mt-0.5">Share to feed or groups</span>
                            </div>
                        </div>
                    </button>

                    {/* Download Story Card */}
                    <button onClick={handleDownloadCard} disabled={isDownloading} className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all group text-left active:scale-[0.99] ${isDownloading
                        ? 'bg-[#151821]/50 border-white/[0.01] opacity-60 cursor-not-allowed'
                        : 'bg-[#151821] hover:bg-[#1C202E] border-white/[0.03] hover:border-white/[0.08]'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform">
                                {isDownloading ? (<div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />) : (<Download size={16} />)}
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-white">Download Profile Card</span>
                                <span className="block text-[10px] text-gray-500 mt-0.5">Generate and save story image</span>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
