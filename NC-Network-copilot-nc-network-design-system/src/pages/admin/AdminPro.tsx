import React from 'react';
import { CreditCard, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';

const revenueStats = [
  { label: 'MRR', value: '$42,402', change: '+14%'},
  { label: 'ARPU', value: '$24.20', change: '+2%'},
  { label: 'Conversion', value: '18.4%', change: '+0.8%'},
];

export default function AdminPro() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Revenue Operations</h2>
          <p className="text-nc-muted text-sm mt-1">Monetization health and PRO subscription lifecycle.</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-admin-primary text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-xl shadow-admin-primary/20">
            Export Financial Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {revenueStats.map(stat => (
          <div key={stat.label} className="bg-admin-surface border border-admin-border p-6 rounded-2xl">
            <p className="text-[10px] font-black text-nc-muted uppercase tracking-widest mb-2">{stat.label}</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
              <span className="text-[10px] font-bold text-admin-success bg-admin-success/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-admin-surface border border-admin-border rounded-2xl p-8 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-bold text-lg text-white">Subscription Conversion Funnel</h4>
            <div className="flex items-center gap-2 text-admin-primary text-[10px] font-black uppercase">
              <Zap className="w-3.5 h-3.5" /> Improved over last month
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { label: 'Active Free Users', value: '38,204', percent: 100 },
              { label: 'Viewed Pricing', value: '12,402', percent: 32 },
              { label: 'Started Checkout', value: '4,102', percent: 11 },
              { label: 'Paid PRO Sub', value: '4,102', percent: 11 },
            ].map((step, i) => (
              <div key={i} className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-white/50">{step.label}</span>
                    <span className="text-lg font-black text-white">{step.value}</span>
                 </div>
                 <div className="h-2 w-full bg-admin-bg rounded-full overflow-hidden border border-admin-border p-0.5">
                    <div className="h-full bg-admin-primary rounded-full" style={{ width: `${step.percent}%` }}></div>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-admin-surface border border-admin-border rounded-2xl p-6">
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Tier Distribution</h4>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-admin-primary"></div>
                  <span className="text-sm font-bold">Monthly PRO</span>
               </div>
               <span className="text-sm text-white/40">2,102 (51%)</span>
            </div>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-white"></div>
                  <span className="text-sm font-bold">Yearly PRO</span>
               </div>
               <span className="text-sm text-white/40">1,824 (44%)</span>
            </div>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 rounded-full"></div>
                  <span className="text-sm font-bold">Enterprise</span>
               </div>
               <span className="text-sm text-white/40">176 (5%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
