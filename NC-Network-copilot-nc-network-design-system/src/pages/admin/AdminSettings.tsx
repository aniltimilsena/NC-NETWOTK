import React from 'react';
import { ToggleLeft as Toggle, Sliders, Database, Globe, Lock, Bell, Trash2, Plus } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold text-white tracking-tight">Platform Configuration</h2>
        <p className="text-nc-muted text-sm mt-1">Global feature toggles, category orchestration, and security protocols.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Feature Toggles */}
        <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
          <h4 className="font-bold text-white mb-6 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-admin-primary" />
            Feature Toggles
          </h4>
          <div className="space-y-4">
            {[
              { id: 1, label: 'Public Talent Discovery', desc: 'Allow guests to search profiles.', enabled: true },
              { id: 2, label: 'AI Casting Matcher v2', desc: 'Neural candidate suggestion engine.', enabled: true },
              { id: 3, label: 'Real-time Messaging', desc: 'WebSocket-based user chat.', enabled: false },
              { id: 4, label: 'PRO-only Screenings', desc: 'Gated content for membership tiers.', enabled: true },
            ].map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all">
                <div>
                  <p className="text-sm font-bold text-white leading-none mb-1">{f.label}</p>
                  <p className="text-[10px] text-nc-muted uppercase">{f.desc}</p>
                </div>
                <button className={`w-10 h-5 rounded-full p-1 transition-all ${f.enabled ? 'bg-admin-success flex justify-end' : 'bg-admin-border flex justify-start'}`}>
                  <div className="w-3 h-3 bg-white rounded-full shadow-lg"></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Categories / Data management */}
        <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
           <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-admin-secondary" />
              Taxonomy Settings
            </h4>
            <button className="p-1.5 bg-admin-secondary/10 text-admin-secondary rounded-lg hover:bg-admin-secondary transition-all hover:text-black">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Actors', 'Directors', 'Editor/VFX', 'Dancers', 'Models', 'Musicians', 'Writers', 'Comedians'].map(cat => (
              <div key={cat} className="group relative flex items-center gap-2 px-3 py-1.5 bg-admin-surface-light border border-admin-border rounded-lg text-xs font-bold text-white hover:border-admin-secondary transition-all">
                {cat}
                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-admin-error">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-admin-border space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-admin-primary/10 flex items-center justify-center text-admin-primary">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">Maintenance Mode</span>
                </div>
                <button className="px-3 py-1 text-[10px] font-black uppercase text-admin-error border border-admin-error/20 rounded-lg hover:bg-admin-error/10">Activate</button>
             </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-admin-secondary/10 flex items-center justify-center text-admin-secondary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">API Access Tokens</span>
                </div>
                <button className="text-[10px] font-black uppercase text-admin-secondary hover:underline">Manage Keys</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
