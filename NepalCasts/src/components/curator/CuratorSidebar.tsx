import React from 'react';

export default function CuratorSidebar({ onNavigate, currentPage }: { onNavigate: any; currentPage: any }) {
  const menuItems = [
    { id: 'curator-overview', label: 'Overview', icon: 'dashboard' },
    { id: 'curator-users', label: 'Users', icon: 'group' },
    { id: 'curator-analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'curator-reports', label: 'Reports', icon: 'assessment' },
    { id: 'home', label: 'Back to Site', icon: 'home' },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-oc-surface-low shadow-[40px_0_60px_-15px_rgba(0,0,0,0.3)] bg-black/60 backdrop-blur-xl flex flex-col py-8 px-4 z-[60]">
      <div className="mb-10 px-2">
        <h1 className="text-xl font-black tracking-tighter text-oc-primary">NepalCasts</h1>
        <p className="font-headline uppercase tracking-widest text-[0.6875rem] font-bold text-oc-border mt-1">Obsidian Curator</p>
      </div>
      
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 transition-all duration-300 rounded ${
              currentPage === item.id 
                ? 'text-oc-primary bg-oc-surface-highest font-bold scale-[0.98]' 
                : 'text-oc-border hover:text-oc-primary hover:bg-oc-surface-highest'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-headline uppercase tracking-widest text-[0.6875rem]">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-oc-border/20 pt-6">
        <button className="w-full bg-gradient-to-br from-oc-primary to-oc-primary/80 text-black px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="font-body text-sm font-medium">New Entry</span>
        </button>
        
        <div className="mt-6 flex items-center gap-3 px-2">
          <img 
            alt="Admin Avatar" 
            className="w-8 h-8 rounded-full border border-oc-primary/30" 
            /* eslint-disable-next-line no-secrets/no-secrets */
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGIHfMTy8iEWFbQDstBg7XNvpU9K2NcNY0rTpWTuGo8AVVz6jqR_XCYlWOm7ziPS1ucnu1uXmtIVdFfJmrAIjenr8G3kORgzAAGcrv-uDVB89fg3IxCj-H3WXjt0JwnFbFuQPGT2g1HCerHgTqRZMxIryVrkaQ3hgF-xlStnNUj-VSRCR7KIIRMEh84-Pb8Hp1bdvWPDJgqIxK3mReyG9Ib1zmWq4gyW2Al4L-I5Bm9QzwPAYbH3tOzDpgBVo-joNFiGwojdpEIcM"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">Admin Avatar</p>
            <p className="text-[0.65rem] text-oc-border truncate uppercase tracking-tighter">Chief Strategist</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
