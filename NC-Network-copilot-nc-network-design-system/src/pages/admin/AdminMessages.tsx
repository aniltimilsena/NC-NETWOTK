import React from 'react';
import { MessageSquare, AlertCircle, Eye, ShieldAlert, TrendingUp, Search } from 'lucide-react';

export default function AdminMessages() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Activity Monitoring</h2>
          <p className="text-nc-muted text-sm mt-1">Surveillance of messaging patterns and automated abuse detection.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-admin-surface border border-admin-border px-6 py-3 rounded-2xl flex flex-col items-end">
            <span className="text-[10px] font-black text-nc-muted uppercase">24h Volumne</span>
            <span className="text-2xl font-bold text-admin-primary">12.4K</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-admin-surface border border-admin-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-admin-border flex items-center justify-between bg-admin-surface-light/30">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">Flagged Conversations</h4>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-admin-error animate-pulse"></span>
              <span className="text-[10px] font-black text-admin-error uppercase">3 Anomalies Detected</span>
            </div>
          </div>
          <div className="divide-y divide-admin-border">
            {[
              { id: 1, participants: ['Marcus K.', 'Julian T.'], reason: 'Keyword: "Payment Outside"', priority: 'High', time: '12m ago' },
              { id: 2, participants: ['bot_01', 'talent_82'], reason: 'Pattern: Bulk Spamming', priority: 'Critical', time: '1h ago' },
              { id: 3, participants: ['Anonymous', 'Director_X'], reason: 'Sentiment: Aggressive', priority: 'Moderate', time: '3h ago' },
            ].map(chat => (
              <div key={chat.id} className="p-5 hover:bg-white/5 transition-all flex items-center gap-6 group">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full bg-admin-surface-light border-2 border-admin-surface flex items-center justify-center font-bold text-xs text-admin-primary">{chat.participants[0].charAt(0)}</div>
                  <div className="w-10 h-10 rounded-full bg-admin-primary/10 border-2 border-admin-surface flex items-center justify-center font-bold text-xs text-admin-primary">{chat.participants[1].charAt(0)}</div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white mb-0.5">{chat.participants.join(' ↔ ')}</p>
                  <p className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                    chat.priority === 'Critical' ? 'text-admin-error' : 
                    chat.priority === 'High' ? 'text-admin-warning' : 'text-admin-primary'
                  }`}>
                    <AlertCircle className="w-3 h-3" /> {chat.reason}
                  </p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] text-nc-muted font-bold uppercase mb-2">{chat.time}</p>
                   <button className="px-3 py-1.5 bg-admin-surface-light border border-admin-border rounded-lg text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5" /> Inspect
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-admin-primary" />
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
              <ShieldAlert className="w-5 h-5 text-admin-error" />
              <h4 className="font-bold text-admin-error text-sm">Abuse Intelligence</h4>
            </div>
            <p className="text-xs text-admin-error/80 leading-relaxed italic">
              "System has proactively isolated the SEO-spam cluster detected at the Singapore node. No user action required."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
