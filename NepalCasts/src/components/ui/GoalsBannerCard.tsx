import React, { memo } from 'react';

export interface GoalsBannerCardProps {
  className?: string;
  onNavigate?: (route: string, param?: any) => void;
}

const GoalsBannerCard = memo(function GoalsBannerCard({ className = '' }: GoalsBannerCardProps) {
  return (
    <section
      className={`relative w-full rounded-2xl overflow-hidden p-4 sm:p-6 select-none shadow-md text-left border-0 bg-black bg-gradient-to-r from-[#522C69] to-[#522C69]/20 ${className}`}
    >
      <div className="relative z-10 space-y-3.5">
        <div className="space-y-1">
          <span className="relative inline-flex items-center pb-2 text-white font-bold text-lg sm:text-xl md:text-2xl tracking-normal select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-white/80 to-white/10 rounded-full pointer-events-none" />
            Our Goals
          </span>
        </div>
        <p className="text-gray-200 font-medium text-base sm:text-lg md:text-xl leading-relaxed text-justify max-w-4xl drop-shadow-sm">
          Building Nepal's most transparent and accessible entertainment network. We connect Nepal's finest actors, directors, writers, and film technicians with leading casting agencies, providing a unified platform for talent discovery and casting opportunities across Nepal. By empowering emerging artists with visibility to global production houses and simplifying the casting process for producers, directors, and agencies, we aim to build a strong community that supports and grows Nepal's entertainment industry.
        </p>
      </div>
    </section>
  );
});

GoalsBannerCard.displayName = 'GoalsBannerCard';

export default GoalsBannerCard;
