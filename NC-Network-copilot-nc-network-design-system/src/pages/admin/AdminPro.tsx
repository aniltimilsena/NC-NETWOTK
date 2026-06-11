import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  Zap, 
  Search, 
  Filter, 
  Award, 
  Trash2, 
  CheckCircle,
  XCircle,
  X,
  ExternalLink,
  Mail,
  User
} from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { logAdminAction } from '../../services/admin';

type AdminSubscriber = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  premium?: boolean;
  status?: string;
  createdAt?: any;
  joined?: string;
  avatar?: string;
};

export default function AdminPro() {
  const [users, setUsers] = useState<AdminSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | 'PRO' | 'Free'>('All');
  
  // Modal State
  const [selectedSub, setSelectedSub] = useState<AdminSubscriber | null>(null);

  const adminEmail = auth.currentUser?.email || 'admin@nc-network.com';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const data = snap.docs.map(doc => {
        const u = doc.data();
        let joinedDate = 'N/A';
        if (u.createdAt) {
          const date = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
          joinedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return {
          id: doc.id,
          name: u.name || 'Unknown User',
          email: u.email || 'No email',
          role: u.role || 'Talent',
          premium: !!u.premium,
          status: u.status || 'Active',
          joined: joinedDate,
          avatar: (u.name || '?').charAt(0).toUpperCase()
        } as AdminSubscriber;
      });
      setUsers(data);
      setLoading(false);
    }, (error) => {
      console.error("Failed to sync subscribers list", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const counts = {
    total: users.length,
    pro: users.filter(u => u.premium).length,
    free: users.filter(u => !u.premium).length
  };

  const mrr = counts.pro * 9; // $9 MRR per PRO user
  const conversionRate = counts.total > 0 ? ((counts.pro / counts.total) * 100).toFixed(1) : '0.0';

  const revenueStats = [
    { label: 'MRR (Telemetry)', value: `$${mrr.toLocaleString()}`, change: '+14%' },
    { label: 'ARPU', value: counts.pro > 0 ? '$9.00' : '$0.00', change: 'Stable' },
    { label: 'Conversion', value: `${conversionRate}%`, change: '+0.8%' },
  ];

  const funnelSteps = [
    { label: 'Active Free Users', value: counts.free.toLocaleString(), percent: 100 },
    { label: 'Viewed Pricing', value: Math.round(counts.total * 0.45).toLocaleString(), percent: 45 },
    { label: 'Paid PRO Sub', value: counts.pro.toLocaleString(), percent: Math.round((counts.pro / (counts.free || 1)) * 100) },
  ];

  const handleTogglePremium = async (userId: string, currentPremium: boolean) => {
    try {
      const targetPremium = !currentPremium;
      await updateDoc(doc(db, "users", userId), { premium: targetPremium });
      await updateDoc(doc(db, "profiles", userId), { premium: targetPremium });
      
      const actionName = targetPremium ? "Grant PRO Status" : "Revoke PRO Status";
      await logAdminAction(adminEmail, actionName, userId, targetPremium ? "Upgraded user to PRO tier" : "Downgraded user to Free tier");
      
      if (selectedSub?.id === userId) {
        setSelectedSub(prev => prev ? { ...prev, premium: targetPremium } : null);
      }
      alert(targetPremium ? "PRO membership granted successfully!" : "PRO membership revoked successfully!");
    } catch (err) {
      console.error("Failed to update subscription status:", err);
      alert("Error updating subscription status.");
    }
  };

  // Filter Subscribers
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (tierFilter === 'PRO') return matchesSearch && u.premium;
    if (tierFilter === 'Free') return matchesSearch && !u.premium;
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Revenue Operations</h2>
          <p className="text-nc-muted text-sm mt-1">Monetization health, PRO subscription lifecycle, and subscription tier overrides.</p>
        </div>
      </div>

      {/* KPI Cards */}
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
        {/* Conversion Funnel */}
        <div className="lg:col-span-8 bg-admin-surface border border-admin-border rounded-2xl p-8 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-bold text-lg text-white">Subscription Conversion Funnel</h4>
            <div className="flex items-center gap-2 text-admin-primary text-[10px] font-black uppercase">
              <Zap className="w-3.5 h-3.5" /> Improved over last month
            </div>
          </div>
          
          <div className="space-y-4">
            {funnelSteps.map((step, i) => (
              <div key={i} className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-sm font-bold text-white/50">{step.label}</span>
                    <span className="text-lg font-black text-white">{step.value}</span>
                 </div>
                 <div className="h-2 w-full bg-admin-bg rounded-full overflow-hidden border border-admin-border p-0.5">
                    <div className="h-full bg-admin-primary rounded-full animate-pulse" style={{ width: `${step.percent}%` }}></div>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="lg:col-span-4 bg-admin-surface border border-admin-border rounded-2xl p-6">
          <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Tier Distribution</h4>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-admin-primary"></div>
                  <span className="text-sm font-bold">Monthly PRO</span>
               </div>
               <span className="text-sm text-white/40">{counts.pro} ({counts.total > 0 ? ((counts.pro / counts.total) * 100).toFixed(0) : 0}%)</span>
            </div>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-white opacity-20"></div>
                  <span className="text-sm font-bold text-white/20">Yearly PRO</span>
               </div>
               <span className="text-sm text-white/20">0 (0%)</span>
            </div>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 rounded-full"></div>
                  <span className="text-sm font-bold text-white/20">Enterprise</span>
               </div>
               <span className="text-sm text-white/20">0 (0%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriber Management Panel */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Tier Subscriptions Management</h3>
            <p className="text-nc-muted text-xs mt-1">Upgrade or downgrade member billing levels instantly.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nc-muted" />
               <input 
                  type="text" 
                  placeholder="Search subscribers..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-admin-surface border border-admin-border rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-admin-primary w-full sm:w-64" 
               />
            </div>
            
            <div className="flex bg-admin-surface border border-admin-border p-1 rounded-xl">
              {(['All', 'PRO', 'Free'] as const).map(tierVal => (
                <button
                  key={tierVal}
                  onClick={() => setTierFilter(tierVal)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${tierFilter === tierVal ? 'bg-admin-primary text-white' : 'text-nc-muted hover:text-white'}`}
                >
                  {tierVal === 'PRO' ? 'PRO Tier' : tierVal === 'Free' ? 'Free Tier' : 'All Tiers'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-admin-surface border border-admin-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-admin-surface-light/50 border-b border-admin-border">
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Subscriber Identity</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">System Role</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Billing Tier</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Joined</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-admin-surface-light/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-admin-surface-light border border-admin-border flex items-center justify-center font-bold text-admin-primary text-sm">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{user.name}</p>
                          <p className="text-xs text-nc-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/40 border border-white/5">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.premium ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-admin-primary/20 text-admin-primary border border-admin-primary/30 shadow-[0_0_12px_rgba(56,189,248,0.15)] animate-pulse">
                          <Award className="w-3.5 h-3.5" /> PRO Member
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/30 border border-white/5">
                          Free Tier
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-white/50">
                      {user.joined}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => setSelectedSub(user)}
                          title="Inspect Details" 
                          className="p-2 text-nc-muted hover:text-white rounded-lg hover:bg-white/5"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        
                        {user.premium ? (
                          <button 
                            onClick={() => handleTogglePremium(user.id, true)}
                            title="Revoke PRO subscription" 
                            className="px-3 py-1 bg-admin-error/20 hover:bg-admin-error text-admin-error hover:text-white text-[9px] font-black uppercase rounded-lg border border-admin-error/30 transition-all flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Revoke PRO
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleTogglePremium(user.id, false)}
                            title="Grant PRO subscription" 
                            className="px-3 py-1 bg-admin-primary/20 hover:bg-admin-primary text-admin-primary hover:text-white text-[9px] font-black uppercase rounded-lg border border-admin-primary/30 transition-all flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Grant PRO
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-nc-muted text-xs">
                      No subscribers detected matching current search/filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Subscriber Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-admin-surface border border-admin-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-admin-border flex justify-between items-center bg-admin-surface-light/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-admin-bg border border-admin-border flex items-center justify-center text-admin-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Subscriber Dossier</h3>
                  <p className="text-xs text-nc-muted uppercase tracking-widest font-black">Billing & Tier Configuration</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSub(null)}
                className="p-1 text-nc-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-admin-bg/30 border border-admin-border rounded-xl">
                <div className="w-12 h-12 rounded-full bg-admin-surface-light border border-admin-border flex items-center justify-center font-bold text-admin-primary text-lg">
                  {selectedSub.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">{selectedSub.name}</h4>
                  <p className="text-xs text-nc-muted flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-nc-muted" />
                    {selectedSub.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-nc-muted">User Account ID:</span>
                  <span className="font-mono text-white select-all">{selectedSub.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nc-muted">Platform Role:</span>
                  <span className="text-white font-bold">{selectedSub.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nc-muted">Registration Date:</span>
                  <span className="text-white font-medium">{selectedSub.joined}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nc-muted">Billing Cycle:</span>
                  <span className="text-white font-medium">{selectedSub.premium ? 'Monthly ($9.00/mo)' : 'None (Free Plan)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nc-muted">Billing Status:</span>
                  <span className={`font-black uppercase tracking-wider ${selectedSub.premium ? 'text-admin-success' : 'text-nc-muted'}`}>
                    {selectedSub.premium ? 'Active Subscriber' : 'No Active Subscription'}
                  </span>
                </div>
              </div>

              {/* Action Modifiers */}
              <div className="bg-admin-bg/50 border border-admin-border p-4 rounded-xl space-y-3">
                <h4 className="text-[10px] font-black text-admin-primary uppercase tracking-widest flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Subscription Tiers Overrides
                </h4>
                
                <div className="flex gap-2">
                  {selectedSub.premium ? (
                    <button 
                      onClick={() => handleTogglePremium(selectedSub.id, true)}
                      className="w-full px-4 py-2.5 bg-admin-error/20 hover:bg-admin-error text-admin-error hover:text-white text-[10px] font-black uppercase rounded-lg border border-admin-error/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Revoke PRO Status (Downgrade)
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleTogglePremium(selectedSub.id, false)}
                      className="w-full px-4 py-2.5 bg-admin-primary/20 hover:bg-admin-primary text-admin-primary hover:text-white text-[10px] font-black uppercase rounded-lg border border-admin-primary/30 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                    >
                      <CheckCircle className="w-4 h-4" /> Grant PRO Status (Upgrade)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-admin-surface-light/20 border-t border-admin-border flex justify-end">
              <button 
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-admin-surface-light text-white text-xs font-bold rounded-lg border border-admin-border hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
