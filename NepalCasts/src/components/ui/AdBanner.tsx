import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Megaphone, ArrowRight, Clapperboard, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AdItem {
  id?: string;
  badge?: string;
  discount?: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: string;
  onCtaClick?: () => void;
}

export interface AdBannerProps {
  id?: string;
  variant?: 'top-bar' | 'card' | 'in-feed';
  items?: AdItem[];
  badge?: string;
  discount?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: string;
  onCtaClick?: () => void;
  dismissible?: boolean;
  intervalMs?: number;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  id = 'demo-ad',
  variant = 'card',
  items,
  badge = 'SPONSORED',
  discount,
  title = '',
  subtitle,
  ctaText = 'Learn More',
  ctaUrl = '#',
  image = '/assets/ads/masterclass_promo.png',
  onCtaClick,
  dismissible = true,
  intervalMs = 4000,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  // Normalize single ad props into items array if items is empty
  const adList: AdItem[] = items && items.length > 0 ? items : [{
    id,
    badge,
    discount,
    title,
    subtitle,
    ctaText,
    ctaUrl,
    image,
    onCtaClick,
  }];

  // Auto-rotate ads every intervalMs (4 seconds) if there are 2 or more items
  useEffect(() => {
    if (adList.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % adList.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [adList.length, intervalMs]);

  const currentAd = adList[currentIndex] || adList[0];

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
  };

  const handleCta = (e: React.MouseEvent, url?: string, callback?: () => void) => {
    if (callback) {
      e.preventDefault();
      callback();
      return;
    }
    const targetUrl = url || currentAd.ctaUrl || ctaUrl;
    if (targetUrl && targetUrl.startsWith('/')) {
      e.preventDefault();
      navigate(targetUrl);
    }
  };

  if (dismissed) return null;

  const currentTitle = currentAd.title || title;
  const currentSubtitle = currentAd.subtitle || subtitle;
  const currentBadge = currentAd.badge || badge;
  const currentDiscount = currentAd.discount || discount;
  const currentCtaText = currentAd.ctaText || ctaText;
  const currentCtaUrl = currentAd.ctaUrl || ctaUrl;
  const currentImage = currentAd.image || image;

  // 1. TOP ANNOUNCEMENT BAR (Unbroken Infinite Line — No Blinking)
  if (variant === 'top-bar') {
    const renderAdSet = (prefix: string) =>
      adList.map((ad, idx) => {
        const adTitle = ad.title || title;
        const adSubtitle = ad.subtitle || subtitle;
        const adBadge = ad.badge || badge;
        const fullText = `${adTitle} ${adSubtitle ? `— ${adSubtitle}` : ''}`;
        return (
          <span key={`${prefix}-${idx}`} className="inline-flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/25 via-blue-500/25 to-purple-500/25 text-cyan-300 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase border border-cyan-400/40 shadow-sm shrink-0">
              <Clapperboard className="w-3 h-3 text-cyan-300" />
              {adBadge}
            </span>
            <span className="text-gray-200 font-semibold">{fullText}</span>
            <span className="text-cyan-400/50 font-bold ml-2">•</span>
          </span>
        );
      });

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="relative bg-gradient-to-r from-[#0B132B]/95 via-[#1C2541]/95 to-[#0B132B]/95 border-b border-cyan-500/30 backdrop-blur-md text-xs py-1 sm:py-1.5 px-2 sm:px-4 z-[51] shadow-lg group overflow-hidden"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            {/* Smooth Moving Marquee Track (All Ads in One Unbroken Line) */}
            <div className="relative flex-1 overflow-hidden h-6 flex items-center select-none">
              {/* Fade Edges for Marquee Mask */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0B132B] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0B132B] to-transparent z-10 pointer-events-none" />

              <motion.div
                className="flex whitespace-nowrap gap-10 cursor-default"
                animate={{ x: ['0%', '-50%'] }}
                transition={{
                  repeat: Infinity,
                  ease: 'linear',
                  duration: adList.length > 1 ? 30 : 20,
                }}
                style={{ willChange: 'transform' }}
              >
                <div className="flex items-center gap-10">{renderAdSet('track1')}</div>
                <div className="flex items-center gap-10">{renderAdSet('track2')}</div>
              </motion.div>
            </div>

            {/* Fixed Right CTA & Dismiss Button */}
            <div className="shrink-0 z-10 flex items-center gap-2 sm:gap-3 bg-[#0B132B]/90 pl-2 rounded-l-lg">
              <a
                href={currentCtaUrl}
                onClick={(e) => handleCta(e, currentCtaUrl, currentAd.onCtaClick)}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold text-xs transition-colors hover:underline"
              >
                <span>{currentCtaText}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </a>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                  aria-label="Dismiss banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // 2. FEATURED BANNER CARD (Auto-Rotating every 4 seconds)
  if (variant === 'card') {
    return (
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[#121620]/95 via-[#0A0D14]/95 to-[#181226]/95 border border-cyan-500/20 shadow-2xl p-4 sm:p-5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center gap-4 sm:gap-6"
          >
            {/* Prominent Ad Image with Big Discount Overlay */}
            {currentImage && (
              <div className="w-full md:w-56 h-48 sm:h-44 rounded-xl overflow-hidden relative border border-white/10 shrink-0 shadow-lg group/img">
                <img
                  src={currentImage}
                  alt={currentTitle}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Big Premium Discount Badge Overlay */}
                {currentDiscount && (
                  <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black px-3 py-1 rounded-full text-xs tracking-wider uppercase shadow-[0_4px_16px_rgba(245,158,11,0.6)] border border-yellow-200/60 backdrop-blur-md transition-all duration-300 group-hover/img:scale-105">
                    <Tag className="w-3.5 h-3.5 fill-black text-black" />
                    <span className="drop-shadow-sm">{currentDiscount}</span>
                  </div>
                )}
              </div>
            )}

            {/* Minimal Text Content */}
            <div className="flex-1 min-w-0 space-y-2 text-left flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 font-bold px-2.5 py-0.5 rounded-md text-[10px] tracking-wider uppercase border border-cyan-500/30">
                  <Megaphone className="w-3 h-3 text-cyan-400 animate-pulse" />
                  {currentBadge}
                </span>
                {dismissible && (
                  <button
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                    aria-label="Dismiss ad"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug group-hover:text-cyan-200 transition-colors">
                {currentTitle}
              </h3>

              {currentSubtitle && (
                <p className="text-gray-300 text-xs sm:text-sm line-clamp-1 leading-normal">
                  {currentSubtitle}
                </p>
              )}

              <div className="pt-1 flex items-center justify-between">
                <a
                  href={currentCtaUrl}
                  onClick={(e) => handleCta(e, currentCtaUrl, currentAd.onCtaClick)}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold px-4 py-2 rounded-xl text-xs transition-all duration-200 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>{currentCtaText}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Dots indicator for multiple ads */}
                {adList.length > 1 && (
                  <div className="flex items-center gap-1.5 pl-4">
                    {adList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentIndex ? 'w-5 bg-cyan-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`Go to ad ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // 3. IN-FEED SPONSORED CARD
  return (
    <div className="relative rounded-2xl bg-[#0F131D]/80 border border-purple-500/30 p-5 backdrop-blur-md flex flex-col justify-between h-full group hover:border-purple-500/60 transition-all duration-300">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
            {currentBadge}
          </span>
          {dismissible && (
            <button onClick={handleDismiss} className="text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {currentImage && (
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10">
            <img src={currentImage} alt={currentTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </div>
        )}

        <h4 className="text-base font-bold text-white leading-tight group-hover:text-purple-300 transition-colors">
          {currentTitle}
        </h4>
        {currentSubtitle && <p className="text-xs text-gray-400 line-clamp-2">{currentSubtitle}</p>}
      </div>

      <div className="pt-4">
        <a
          href={currentCtaUrl}
          onClick={(e) => handleCta(e, currentCtaUrl, currentAd.onCtaClick)}
          className="w-full inline-flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
        >
          <span>{currentCtaText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
