import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, Megaphone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AdBannerProps {
  id?: string;
  variant?: 'top-bar' | 'card' | 'in-feed';
  badge?: string;
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
  title,
  subtitle,
  ctaText = 'Learn More',
  ctaUrl = '#',
  image = '/assets/ads/masterclass_promo.png',
  onCtaClick,
  dismissible = true,
}) => {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(`nc_ad_dismissed_${id}`) === 'true';
  });

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`nc_ad_dismissed_${id}`, 'true');
    }
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

  // 2. FEATURED BANNER CARD (Compact & Sleek)
  if (variant === 'card') {
    return (
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[#121620]/90 via-[#0A0D14]/90 to-[#181226]/90 border border-cyan-500/20 shadow-xl p-3.5 sm:p-5 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40">
        {/* Glow Effects */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-5">
          {/* Ad Image / Visual (Compact Thumbnail) */}
          {image && (
            <div className="w-full sm:w-28 h-24 sm:h-20 rounded-xl overflow-hidden relative border border-white/10 shrink-0 shadow-md group/img">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          )}

          {/* Ad Content */}
          <div className="flex-1 min-w-0 space-y-1.5 text-left w-full">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase border border-cyan-500/30">
                <Megaphone className="w-3 h-3 text-cyan-400 animate-pulse" />
                {badge}
              </span>
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                  aria-label="Dismiss ad"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug truncate group-hover:text-cyan-200 transition-colors">
              {title}
            </h3>

            {subtitle && (
              <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* CTA Action */}
          <div className="shrink-0 self-end sm:self-center pt-1 sm:pt-0 w-full sm:w-auto">
            <a
              href={ctaUrl}
              onClick={handleCta}
              className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all duration-200 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{ctaText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
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
