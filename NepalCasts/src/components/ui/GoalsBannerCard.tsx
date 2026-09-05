import React from 'react';

export interface GoalsBannerCardProps {
  className?: string;
  onNavigate?: (route: string, param?: any) => void;
}

export default function GoalsBannerCard({ className = '' }: GoalsBannerCardProps) {
  return (
    <section
      className={`relative w-full rounded-2xl overflow-hidden p-4 sm:p-6 select-none shadow-md text-left ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1fb5cf 0%, #38bdf8 52%, #2dd4bf 100%)',
      }}
    >
      {/* Curved organic glowing wave highlight matching the reference card */}
      <div className="absolute right-0 top-0 bottom-0 w-3/5 pointer-events-none overflow-hidden">
        <div className="absolute -right-16 -top-20 w-[140%] h-[180%] rounded-[50%] bg-gradient-to-br from-white/30 via-white/10 to-transparent blur-xl" />
        <div className="absolute -right-6 top-1/4 w-[100%] h-[120%] rounded-full bg-cyan-100/25 blur-2xl" />
      </div>

      <div className="relative z-10 space-y-3.5">
        <div className="space-y-1">
          <span className="relative inline-flex items-center pb-2 text-white font-apple font-black text-lg sm:text-xl md:text-2xl tracking-wider uppercase select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <span className="absolute bottom-0 left-0 w-3/4 h-[2.5px] bg-gradient-to-r from-[#522C69] to-[#522C69]/10 rounded-full pointer-events-none" />
            Our Goals
          </span>
        </div>
        <p className="font-apple text-slate-900 font-bold text-base sm:text-lg md:text-xl leading-relaxed text-justify max-w-4xl">
          Building Nepal's most transparent and accessible entertainment network. We connect Nepal's finest actors, directors, writers, and film technicians with leading casting agencies, providing a unified platform for talent discovery and casting opportunities across Nepal. By empowering emerging artists with visibility to global production houses and simplifying the casting process for producers, directors, and agencies, we aim to build a strong community that supports and grows Nepal's entertainment industry.
        </p>
      </div>
    </section>
  );
}
