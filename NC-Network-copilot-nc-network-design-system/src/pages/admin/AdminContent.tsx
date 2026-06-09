import React from 'react';
import { Image as ImageIcon, Video, CheckCircle, XCircle, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';

const contentQueue = [
  { id: 1, type: 'Profile Photo', user: 'Maya Rose', status: 'Pending', meta: 'Studio High-res', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: 2, type: 'Video Reel', user: 'Julian T.', status: 'Flagged', meta: 'Showreel 2024', flag: 'Potential Copyright' },
  { id: 3, type: 'Portfolio Gallery', user: 'Sasha Kole', status: 'Approved', meta: 'Vogue Collection' },
];

export default function AdminContent() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Content Integrity</h2>
          <p className="text-nc-muted text-sm mt-1">Audit talent portfolios and verify media authenticity.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-admin-surface border border-admin-border px-6 py-3 rounded-2xl flex flex-col items-end">
            <span className="text-[10px] font-black text-nc-muted uppercase">Pending Audit</span>
            <span className="text-2xl font-bold text-admin-primary">824</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {contentQueue.map((item) => (
          <div key={item.id} className="bg-admin-surface border border-admin-border rounded-2xl p-6 hover:bg-admin-surface-light/30 transition-all flex gap-6 relative group">
            <div className="w-24 h-24 rounded-xl bg-admin-surface-light border border-admin-border flex-shrink-0 relative overflow-hidden flex items-center justify-center">
              {item.img ? (
                <img src={item.img} alt="content" className="w-full h-full object-cover" />
              ) : (
                <Video className="w-8 h-8 text-nc-muted" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button className="p-2 bg-admin-primary rounded-lg text-black">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-white text-lg">{item.user}</h4>
                  <p className="text-xs text-nc-muted uppercase tracking-widest font-black">{item.type}</p>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                  item.status === 'Approved' ? 'bg-admin-success/10 text-admin-success' :
                  item.status === 'Flagged' ? 'bg-admin-error/10 text-admin-error animate-pulse' :
                  'bg-admin-warning/10 text-admin-warning'
                }`}>
                  {item.status}
                </span>
              </div>
              
              <p className="text-sm text-white/60 mb-4">{item.meta}</p>
              
              {item.flag && (
                <div className="mb-4 flex items-center gap-2 text-[10px] font-bold text-admin-error bg-admin-error/5 border border-admin-error/10 p-2 rounded">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {item.flag}
                </div>
              )}

              <div className="mt-auto flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-admin-primary/90 hover:bg-admin-primary text-white text-[10px] font-black uppercase rounded-lg transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-admin-surface-light hover:bg-admin-error/10 text-admin-error text-[10px] font-black uppercase border border-admin-border rounded-lg transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
