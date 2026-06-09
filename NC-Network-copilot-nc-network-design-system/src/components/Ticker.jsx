import React from 'react';

/**
 * Cinematic Infinite Ticker Component
 * Features: Seamless loop, GPU acceleration, hover-to-pause, and gradient edge masking.
 */
export default function Ticker({ 
  items = [], 
  speed = '30s', 
  direction = 'normal' 
}) {
  // If no items are provided, use defaults suited for NC Network
  const defaultItems = [
    "🔥 Casting Call: Cyberpunk 2077 Fan Film",
    "⭐ Just Signed: Zendaya joins Matrix 5",
    "🎬 Now Searching: Lead Male Actor 25-35",
    "📢 Upcoming Global Auditions in LA & London",
    "✦ Upgrade to PRO to view Premium Castings",
  ];
  const listToRender = items.length > 0 ? items : defaultItems;

  return (
    <div className="w-full relative overflow-hidden bg-[#0A0A0A] border-y border-white/5 py-4 mask-edge-fade">
      {/* 
        The scrolling container. 
        We use w-max to allow it to grow beyond the screen, 
        and double the content dynamically in the layout to ensure a seamless -50% translation loop.
      */}
      <div 
        className="flex items-center w-[max-content] animate-ticker will-change-transform"
        style={{ '--duration': speed, animationDuration: speed, animationDirection: direction }}
      >
        {/* We duplicate the array 2 times to guarantee a seamless loop when transforming from 0 to -50% */}
        {[0, 1].map((blockIdx) => (
          <div key={`block-${blockIdx}`} className="flex items-center gap-12 px-6">
            {listToRender.map((item, index) => (
              <div 
                key={`${blockIdx}-${index}`} 
                className="flex items-center text-sm font-semibold tracking-wide text-[#A1A1A1] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {/* Optional subtle dot separator before items (except the first visual element, but loop handles this) */}
                <span className="w-1.5 h-1.5 rounded-full bg-nc-accent/50 mr-6"></span>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
