import React, { useState, useEffect } from 'react';
import { TrendingDown, Info, Zap } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import Avatar from '../../components/ui/Avatar';
export default function AdminAnalytics() {
    const [funnelData, setFunnelData] = useState({
        total: 0,
        withProfile: 0,
        withExperience: 0,
        withApps: 0
    });
    const [topTalents, setTopTalents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            const docs = snap.docs.map(d => d.data());
            setFunnelData({
                total: docs.length,
                withProfile: docs.filter(d => d.name).length,
                withExperience: docs.filter(d => d.skills?.length > 0).length,
                withApps: docs.filter(d => d.appliedCount > 0).length
            });
            const sorted = [...docs].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
            setTopTalents(sorted);
            setLoading(false);
        });
        return () => unsubUsers();
    }, []);
    const funnelSteps = [
        { label: 'Total Signups', value: funnelData.total.toLocaleString(), percent: '100%', color: 'bg-white/10' },
        { label: 'Profiles Created', value: funnelData.withProfile.toLocaleString(), percent: `${Math.round((funnelData.withProfile / funnelData.total || 0) * 100)}%`, color: 'bg-admin-primary/20' },
        { label: 'Skills Added', value: funnelData.withExperience.toLocaleString(), percent: `${Math.round((funnelData.withExperience / funnelData.total || 0) * 100)}%`, color: 'bg-admin-primary/40' },
    ];
    const metrics = [
        { label: 'Active Sessions', value: '0', status: 'Healthy' },
        { label: 'System Load', value: 'Low', status: 'Healthy' },
        { label: 'Error Rate', value: '0%', status: 'Healthy' }
    ];
    return (<div className="p-8 space-y-8 animate-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-admin-surface border border-admin-border rounded-2xl p-8">
          <div className="flex items-center justify-between mb-8">
             <h4 className="font-bold text-lg text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-admin-primary"/>
              Engagement Funnel
            </h4>
            <div className="flex items-center gap-2 text-admin-error text-[10px] font-black uppercase bg-admin-error/10 px-2 py-1 rounded">
              <TrendingDown className="w-3.5 h-3.5"/>
              High Dropoff Detected
            </div>
          </div>

          <div className="space-y-6">
            {funnelSteps.map((step, i) => (<div key={step.label} className="relative">
                <div className="flex justify-between items-center mb-2 z-10 relative">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-admin-bg border border-admin-border flex items-center justify-center text-[10px] font-bold text-admin-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{step.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{step.value}</p>
                    <p className="text-[10px] text-nc-muted uppercase">{step.percent} of Total</p>
                  </div>
                </div>
                <div className="h-4 w-full bg-admin-bg border border-admin-border rounded-full overflow-hidden p-0.5">
                  <div className={`h-full rounded-full ${step.color} transition-all duration-1000 delay-300`} style={{ width: step.percent }}></div>
                </div>
                {i < funnelSteps.length - 1 && (<div className="absolute left-[10px] top-6 h-4 w-[1px] bg-admin-border"></div>)}
              </div>))}
          </div>
          
          <div className="mt-8 p-4 bg-admin-error/5 border border-admin-error/10 rounded-xl flex gap-4">
            <Info className="w-5 h-5 text-admin-error shrink-0 mt-0.5"/>
            <p className="text-xs text-admin-error leading-relaxed">
              <strong>Insight:</strong> 45% of users drop off between 'Profile Created' and 'Profile Completed'. Recommendation: Implement progressive onboarding and gamified profile badges.
            </p>
          </div>
        </div>

        
        <div className="space-y-6">
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-6">
            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px]">Ecosystem Health</h4>
            <div className="space-y-6">
              {metrics.map((m) => (<div key={m.label} className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-nc-muted font-medium">{m.label}</span>
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${m.status === 'Healthy' ? 'text-admin-success bg-admin-success/10' :
                m.status === 'Critical' ? 'text-admin-error bg-admin-error/10' :
                    'text-admin-primary bg-admin-primary/10'}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white tabular-nums">{m.value}</div>
                </div>))}
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-admin-primary/5 rounded-full blur-2xl group-hover:bg-admin-primary/10 transition-all"></div>
            <h4 className="font-bold text-white mb-4 text-sm">Top Active Entities</h4>
            <div className="space-y-3">
              {topTalents.length > 0 ? topTalents.map(u => (<div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar userId={u.uid || u.id} user={u} size="sm" name={u.name}/>
                    <span className="text-xs font-semibold text-white">{u.name}</span>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-black text-admin-primary">{u.rating || 0} Rating</p>
                    <p className="text-[9px] text-white/40 uppercase">{u.role || 'Talent'}</p>
                  </div>
                </div>)) : <p className="text-nc-muted text-xs">No active entities detected.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
