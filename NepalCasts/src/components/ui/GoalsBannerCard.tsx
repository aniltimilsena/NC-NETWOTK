import React, { memo } from 'react';

export interface GoalsBannerCardProps {
  className?: string;
  onNavigate?: (route: string, param?: any) => void;
}

const GoalsBannerCard = memo(function GoalsBannerCard({ className = '' }: GoalsBannerCardProps) {
  return (
    <section
      className={`relative w-full rounded-2xl overflow-hidden p-6 sm:p-8 select-none shadow-card text-left border border-[#E7E5E0] bg-white ${className}`}
    >
      <div className="relative z-10 space-y-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#946019] block font-inter mb-1">
            Mission & Vision
          </span>
          <h2 className="font-display font-semibold text-2xl sm:text-3xl text-[#202923] tracking-tight">
            Our Goals
          </h2>
          <div className="w-10 h-0.5 bg-[#194332] rounded-full mt-2" />
        </div>
        <p className="text-[#414840] font-normal text-base sm:text-lg leading-relaxed max-w-4xl font-inter">
          Building Nepal&apos;s most transparent and accessible entertainment network. We connect Nepal&apos;s finest actors, directors, writers, and film technicians with leading casting agencies, providing a unified platform for talent discovery and casting opportunities across Nepal. By empowering emerging artists with visibility to global production houses and simplifying the casting process for producers, directors, and agencies, we aim to build a strong community that supports and grows Nepal&apos;s entertainment industry.
        </p>
      </div>
    </section>
  );
});

GoalsBannerCard.displayName = 'GoalsBannerCard';

export default GoalsBannerCard;
