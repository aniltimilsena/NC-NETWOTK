import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, Megaphone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AdBannerProps {
  id?: string;
  variant?: 'top-bar' | 'card' | 'in-feed';
  badge?: string;
  discount?: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: string;
  onCtaClick?: () => void;
  dismissible?: boolean;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  id = 'demo-ad',
  variant = 'card',
  badge = 'SPONSORED',
  discount,
  title,
  subtitle,
  ctaText = 'Learn More',
  ctaUrl = '#',
  image = '/assets/ads/masterclass_promo.png',
  onCtaClick,
  dismissible = true,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
  };

  const handleCta = (e: React.MouseEvent) => {
    if (onCtaClick) {
      e.preventDefault();
      onCtaClick();
    }
  };

  if (dismissed) return null;

  // 1. TOP ANNOUNCEMENT BAR
  if (variant === 'top-bar') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="relative bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-cyan-950/80 border-b border-cyan-500/20 backdrop-blur-md text-xs py-2 px-4 z-[51]"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase border border-cyan-500/30">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                {badge}
              </span>
              <span className="text-gray-200 font-medium truncate">
                {title} {subtitle && <span className="text-gray-400 font-normal hidden sm:inline">— {subtitle}</span>}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href={ctaUrl}
                onClick={handleCta}
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors hover:underline text-xs"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
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

  // 2. FEATURED BANNER CARD (Large Image, Big Discount Badge, Minimal Text)
  if (variant === 'card') {
    return (
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[#121620]/95 via-[#0A0D14]/95 to-[#181226]/95 border border-cyan-500/20 shadow-2xl p-4 sm:p-5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

        <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center gap-4 sm:gap-6">
          {/* Bigger Prominent Ad Image with Big Discount Overlay */}
          {image && (
            <div className="w-full md:w-56 h-48 sm:h-44 rounded-xl overflow-hidden relative border border-white/10 shrink-0 shadow-lg group/img">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Big Premium Discount Badge Overlay */}
              {discount && (
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black px-3 py-1 rounded-full text-xs tracking-wider uppercase shadow-[0_4px_16px_rgba(245,158,11,0.6)] border border-yellow-200/60 backdrop-blur-md transition-all duration-300 group-hover/img:scale-105">
                  <Sparkles className="w-3.5 h-3.5 fill-black stroke-none" />
                  <span className="drop-shadow-sm">{discount}</span>
                </div>
              )}
            </div>
          )}

          {/* Minimal Text Content */}
          <div className="flex-1 min-w-0 space-y-2 text-left flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 font-bold px-2.5 py-0.5 rounded-md text-[10px] tracking-wider uppercase border border-cyan-500/30">
                <Megaphone className="w-3 h-3 text-cyan-400 animate-pulse" />
                {badge}
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
              {title}
            </h3>

            {subtitle && (
              <p className="text-gray-300 text-xs sm:text-sm line-clamp-1 leading-normal">
                {subtitle}
              </p>
            )}

            <div className="pt-1">
              <a
                href={ctaUrl}
                onClick={handleCta}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold px-4 py-2 rounded-xl text-xs transition-all duration-200 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{ctaText}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. IN-FEED SPONSORED CARD (Directory / Grid)
  return (
    <div className="relative rounded-2xl bg-[#0F131D]/80 border border-purple-500/30 p-5 backdrop-blur-md flex flex-col justify-between h-full group hover:border-purple-500/60 transition-all duration-300">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
            {badge}
          </span>
          {dismissible && (
            <button onClick={handleDismiss} className="text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {image && (
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10">
            <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </div>
        )}

        <h4 className="text-base font-bold text-white leading-tight group-hover:text-purple-300 transition-colors">
          {title}
        </h4>
        {subtitle && <p className="text-xs text-gray-400 line-clamp-2">{subtitle}</p>}
      </div>

      <div className="pt-4">
        <a
          href={ctaUrl}
          onClick={handleCta}
          className="w-full inline-flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
        >
          <span>{ctaText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
