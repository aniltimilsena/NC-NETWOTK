import React from 'react';

export default function CuratorTopbar() {
  return (
    <header className="flex justify-between items-center h-16 px-8 sticky top-0 z-50 bg-oc-bg/80 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-oc-border group-focus-within:text-oc-primary transition-colors">search</span>
          <input 
            className="bg-oc-surface-low border-none focus:ring-1 focus:ring-oc-primary/40 rounded-full pl-10 pr-4 py-1.5 text-sm w-64 transition-all text-white placeholder:text-oc-border/50" 
            placeholder="Search Obsidian..." 
            type="text"
          />
        </div>
        <div className="flex items-center gap-2 text-oc-secondary text-xs font-bold font-body uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
          <span className="material-symbols-outlined text-base">bolt</span>
          Smart Alerts
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-oc-border hover:text-white transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-oc-border hover:text-white transition-colors">
          <span className="material-symbols-outlined">grid_view</span>
        </button>
        <div className="h-8 w-8 rounded-full bg-oc-surface-highest overflow-hidden border border-oc-border/30">
          <img 
            alt="Admin Profile" 
            /* eslint-disable-next-line no-secrets/no-secrets */
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhUXdVxppvXN-qUGt__9MmSHQj7f3yaeowhd-D6ufrbJXurkjFuNpn3y7kx4mJ_7pHPH_2P9FaOxkzD36OaJ_6mCkYzjXAQSdtHweYmwvK-1vTPrfVqActUYWPFk4O3UPaNpGzmwQZ7QdM73W0964w5EsgKed3pu-uf6PZBRAIJA2zNJQw-ML1dK1UHFHZ6-hlRkbceck4Fjct7SwuYjkeegifld6DVX8INd-EVKL6RQMhoO127niqsQn1_d7H8e-x0UZRRIUhe-I"
          />
        </div>
      </div>
    </header>
  );
}
