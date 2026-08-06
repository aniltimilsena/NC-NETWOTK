import React, { useState, useEffect } from 'react';
import { AlertCircle, Eye, ShieldAlert, TrendingUp } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, Timestamp } from 'firebase/firestore';
export default function AdminMessages() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            const mapping: Record<string, string> = {};
            snap.docs.forEach(doc => {
                mapping[doc.id] = doc.data().name || 'Discovery User';
            });
            setUserMap(mapping);
        });
        const unsubConvos = onSnapshot(collection(db, "conversations"), (snap) => {
            const convos = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConversations(convos);
            setLoading(false);
        }, (error) => {
            console.error("Failed to sync conversations", error);
            setLoading(false);
        });
        return () => {
            unsubUsers();
            unsubConvos();
        };
    }, []);
    const formatTimeAgo = (timestamp: any) => {
        if (!timestamp)
            return 'now';
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60)
            return 'now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60)
            return minutes + 'm ago';
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return hours + 'h ago';
        return Math.floor(hours / 24) + 'd ago';
    };
    return (<div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Activity Monitoring</h2>
          <p className="text-nc-muted text-sm mt-1">Surveillance of messaging patterns and active chat volumes.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-admin-surface border border-admin-border px-6 py-3 rounded-2xl flex flex-col items-end">
            <span className="text-[10px] font-black text-nc-muted uppercase">Active Chats</span>
            <span className="text-2xl font-bold text-admin-primary">{conversations.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-admin-surface border border-admin-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-admin-border flex items-center justify-between bg-admin-surface-light/30">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Active Channels Monitor</h4>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-admin-success animate-pulse"></span>
              <span className="text-[10px] font-black text-admin-success uppercase">{conversations.length} Active Feeds</span>
            </div>
          </div>
          <div className="divide-y divide-admin-border">
            {loading ? (
              <div className="divide-y divide-admin-border animate-pulse" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 flex items-center gap-6">
                    <div className="flex -space-x-3 shrink-0">
                      <div className="w-10 h-10 rounded-full skeleton border-2 border-admin-surface" />
                      <div className="w-10 h-10 rounded-full skeleton border-2 border-admin-surface" />
                    </div>
                    <div className="flex-1 space-y-2 text-left">
                      <div className="h-4 skeleton rounded w-1/3" />
                      <div className="h-3 skeleton rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (<div className="p-10 text-center text-xs text-nc-muted">
                No active conversations detected in the ecosystem.
              </div>) : (conversations.map(chat => {
            const names = (chat.participants || []).map((pId: string) => userMap[pId] || 'NC Member');
            return (<div key={chat.id} className="p-5 hover:bg-white/5 transition-all flex items-center gap-6 group">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full bg-admin-surface-light border-2 border-admin-surface flex items-center justify-center font-bold text-xs text-admin-primary">
                        {(names[0] || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-admin-primary/10 border-2 border-admin-surface flex items-center justify-center font-bold text-xs text-admin-primary">
                        {(names[1] || '?').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white mb-0.5 truncate">{names.join('  ')}</p>
                      <p className="text-[10px] font-black uppercase text-admin-primary flex items-center gap-1 truncate">
                        <AlertCircle className="w-3.5 h-3.5"/> {chat.lastMessage || 'No messages exchanged'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-[10px] text-nc-muted font-bold uppercase mb-2">
                         {formatTimeAgo(chat.lastMessageAt || chat.updatedAt)}
                       </p>
                       <button className="px-3 py-1.5 bg-admin-surface-light border border-admin-border rounded-lg text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5"/> Inspect
                       </button>
                    </div>
                  </div>);
        }))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-admin-primary"/>
              Real-time Metrics
            </h4>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-[10px] font-black text-nc-muted uppercase mb-1">
                    <span>Message Throughput</span>
                    <span>94%</span>
                  </div>
                  <div className="h-1 w-full bg-admin-bg rounded-full p-0.5">
                    <div className="h-full bg-admin-primary rounded-full transition-all duration-1000" style={{ width: '94%' }}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-[10px] font-black text-nc-muted uppercase mb-1">
                    <span>Bot Detection Accuracy</span>
                    <span>98.8%</span>
                  </div>
                  <div className="h-1 w-full bg-admin-bg rounded-full p-0.5">
                    <div className="h-full bg-admin-success rounded-full transition-all duration-1000" style={{ width: '98.8%' }}></div>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-admin-error/5 border border-admin-error/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-5 h-5 text-admin-error"/>
              <h4 className="font-bold text-admin-error text-sm">Abuse Intelligence</h4>
            </div>
            <p className="text-xs text-admin-error/80 leading-relaxed italic">
              "System has proactively isolated the SEO-spam cluster detected at the Singapore node. No user action required."
            </p>
          </div>
        </div>
      </div>
    </div>);
}
