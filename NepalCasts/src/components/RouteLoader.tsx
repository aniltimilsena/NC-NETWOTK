import React from 'react';
export default function RouteLoader() {
    return (<div className="min-h-[60vh] flex flex-col items-center justify-center px-4 bg-[#0A0A0F] text-white relative overflow-hidden">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-nc-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-sm bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden cat-skeleton-card">
        
        <div className="cat-skeleton-shimmer"></div>

        
        <div className="space-y-6">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 shrink-0 cat-skeleton-bone"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-white/5 border border-white/10 rounded-lg cat-skeleton-bone"></div>
              <div className="h-3 w-1/2 bg-white/5 border border-white/10 rounded-lg cat-skeleton-bone"></div>
            </div>
          </div>

          
          <div className="space-y-3">
            <div className="h-3.5 w-full bg-white/5 border border-white/10 rounded-lg cat-skeleton-bone"></div>
            <div className="h-3.5 w-5/6 bg-white/5 border border-white/10 rounded-lg cat-skeleton-bone"></div>
            <div className="h-3.5 w-4/5 bg-white/5 border border-white/10 rounded-lg cat-skeleton-bone"></div>
          </div>

          
          <div className="pt-2">
            <div className="h-10 w-full bg-nc-accent/5 border border-nc-accent/20 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.1)] cat-skeleton-bone"></div>
          </div>
        </div>
      </div>

    </div>);
}
