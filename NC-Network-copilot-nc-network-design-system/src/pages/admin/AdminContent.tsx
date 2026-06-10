import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, CheckCircle, XCircle, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function AdminContent() {
  const [contentQueue, setContentQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "profiles"), (snap) => {
      const items: any[] = [];
      snap.docs.forEach(docSnap => {
        const profile = docSnap.data();
        if (Array.isArray(profile.media) && profile.media.length > 0) {
          profile.media.forEach((url: string, index: number) => {
            items.push({
              id: `${docSnap.id}-${index}`,
              userId: docSnap.id,
              user: profile.name || 'Unknown User',
              type: 'Portfolio Image',
              status: 'Approved',
              meta: `Media Asset #${index + 1} for profile`,
              img: url
            });
          });
        }
      });
      setContentQueue(items);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync content queue", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

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
            <span className="text-2xl font-bold text-admin-primary">{contentQueue.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-xs text-nc-muted p-6 col-span-full">Synchronizing media assets...</p>
        ) : contentQueue.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-admin-surface rounded-2xl border border-dashed border-admin-border w-full">
            <p className="text-nc-muted text-sm font-medium">No uploaded portfolio media assets detected.</p>
          </div>
        ) : (
          contentQueue.map((item) => (
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
        )))}
      </div>
    </div>
  );
}
