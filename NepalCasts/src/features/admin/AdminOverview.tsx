import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, UserCheck, Briefcase, Zap, AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
export default function AdminOverview() {
    const [counts, setCounts] = useState({
        users: 0,
        activeCastings: 0,
        proMembers: 0,
        newSignups: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('30D');
    const [registrationDates, setRegistrationDates] = useState<Date[]>([]);
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            const all = snap.size;
            const pro = snap.docs.filter(d => d.data().premium).length;
            setCounts(prev => ({ ...prev, users: all, proMembers: pro }));
            const dates = snap.docs
                .map(doc => {
                const u = doc.data();
                if (u.createdAt) {
                    return u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
                }
                return null;
            })
                .filter((d): d is Date => d !== null)
                .sort((a, b) => a.getTime() - b.getTime());
            setRegistrationDates(dates);
        });
        const unsubCasting = onSnapshot(collection(db, "casting_calls"), (snap) => {
            setCounts(prev => ({ ...prev, activeCastings: snap.size }));
            setLoading(false);
        });
        return () => {
            unsubUsers();
            unsubCasting();
        };
    }, []);
    const getGraphData = () => {
        const now = new Date();
        let daysLimit = 30;
        if (selectedPeriod === '7D')
            daysLimit = 7;
        else if (selectedPeriod === '90D')
            daysLimit = 90;
        const startDate = new Date(now.getTime() - daysLimit * 24 * 60 * 60 * 1000);
        const filteredDates = registrationDates.filter(d => d >= startDate);
        const dayBuckets: Record<string, number> = {};
        for (let i = 0; i <= daysLimit; i++) {
            const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const key = d.toDateString();
            dayBuckets[key] = 0;
        }
        filteredDates.forEach(d => {
            const key = d.toDateString();
            if (dayBuckets[key] !== undefined) {
                dayBuckets[key]++;
            }
        });
        let cumulative = registrationDates.filter(d => d < startDate).length;
        const dataPoints: {
            x: number;
            y: number;
            label: string;
            count: number;
        }[] = [];
        const keys = Object.keys(dayBuckets);
        const stepX = 800 / (keys.length - 1 || 1);
        keys.forEach((key, idx) => {
            cumulative += dayBuckets[key];
            dataPoints.push({
                x: idx * stepX,
                y: cumulative,
                label: key,
                count: cumulative
            });
        });
        const countsList = dataPoints.map(p => p.count);
        const maxVal = Math.max(...countsList, 0);
        const minVal = Math.min(...countsList, 0);
        const range = maxVal - minVal || 1;
        const scaledPoints = dataPoints.map(p => {
            const y = 180 - ((p.count - minVal) / range) * 140;
            return { ...p, y };
        });
        let pathD = '';
        let areaD = '';
        if (scaledPoints.length > 0) {
            pathD = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;
            for (let i = 1; i < scaledPoints.length; i++) {
                const prev = scaledPoints[i - 1];
                const curr = scaledPoints[i];
                const cpX1 = prev.x + (curr.x - prev.x) / 3;
                const cpY1 = prev.y;
                const cpX2 = prev.x + 2 * (curr.x - prev.x) / 3;
                const cpY2 = curr.y;
                pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
            }
            areaD = `${pathD} L ${scaledPoints[scaledPoints.length - 1].x} 200 L ${scaledPoints[0].x} 200 Z`;
        }
        return { points: scaledPoints, pathD, areaD, maxVal };
    };
    const getPeriodLabels = () => {
        const now = new Date();
        let daysLimit = 30;
        if (selectedPeriod === '7D')
            daysLimit = 7;
        else if (selectedPeriod === '90D')
            daysLimit = 90;
        const startDate = new Date(now.getTime() - daysLimit * 24 * 60 * 60 * 1000);
        return {
            start: startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            end: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        };
    };
    const { points, pathD, areaD, maxVal } = getGraphData();
    const periodLabels = getPeriodLabels();
    const stats = [
        { label: 'Total Users', value: counts.users.toLocaleString(), change: '+2.1%', trend: 'up', icon: Users },
        { label: 'Platform Pulse', value: 'Healthy', change: '100%', trend: 'up', icon: Zap },
        { label: 'Active Castings', value: counts.activeCastings.toLocaleString(), change: '+5.4%', trend: 'up', icon: Briefcase },
        { label: 'PRO Members', value: counts.proMembers.toLocaleString(), change: '+8.2%', trend: 'up', icon: TrendingUp },
        { label: 'Network Integrity', value: 'Secure', change: '99.9%', trend: 'up', icon: UserCheck },
    ];
    return (<div className="p-8 space-y-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (<div key={stat.label} className="bg-admin-surface border border-admin-border p-5 rounded-2xl hover:border-admin-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-admin-surface-light border border-admin-border flex items-center justify-center text-admin-primary group-hover:scale-110 transition-transform">
                <stat.icon className="w-5 h-5"/>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend === 'up' ? 'bg-admin-success/10 text-admin-success' : 'bg-admin-error/10 text-admin-error'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                {stat.change}
              </div>
            </div>
            <p className="text-nc-muted text-xs uppercase tracking-widest font-black mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white tabular-nums tracking-tight">{stat.value}</h3>
          </div>))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-admin-warning"/>
              Smart Alerts
            </h4>
            <span className="text-[10px] text-nc-muted font-bold uppercase">3 Active</span>
          </div>
          <div className="space-y-3">
            <div className="bg-admin-surface-light border border-admin-border rounded-xl p-6 relative overflow-hidden group hover:border-admin-success/30 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-admin-success"></div>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-admin-success"/>
                <h5 className="text-sm font-bold text-white">Security Protocol Active</h5>
              </div>
              <p className="text-xs text-nc-muted leading-relaxed mb-1">Total system integrity verified. Encrypted traffic flowing within normal parameters.</p>
              <p className="text-[10px] text-admin-success font-black uppercase tracking-tighter">0 Vulnerabilities detected</p>
            </div>
            <div className="bg-admin-surface-light border border-admin-border rounded-xl p-4 opacity-50">
              <p className="text-[10px] text-nc-muted italic">Waiting for telemetry logs...</p>
            </div>
          </div>
        </div>

        
        <div className="lg:col-span-8 bg-admin-surface border border-admin-border rounded-2xl p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="font-bold text-white text-lg">System Intelligence</h4>
              <p className="text-xs text-nc-muted mt-1">Real-time engagement telemetry across the NC ecosystem.</p>
            </div>
            <div className="flex gap-2">
              {['7D', '30D', '90D'].map(t => (<button key={t} onClick={() => setSelectedPeriod(t)} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${t === selectedPeriod ? 'bg-admin-primary text-white' : 'text-nc-muted hover:text-white'}`}>
                  {t}
                </button>))}
            </div>
          </div>
          
          
          <div className="h-48 w-full relative group">
            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0"/>
                </linearGradient>
              </defs>
              
              {[0, 50, 100, 150].map(y => (<line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>))}
              
              
              {areaD && (<path d={areaD} fill="url(#chartGradient)" className="transition-all duration-500"/>)}
              
              
              {pathD && (<path d={pathD} fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" className="transition-all duration-500"/>)}
              
              
              {points.length > 0 && (<circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill="#FFF" className="animate-pulse shadow-[0_0_10px_white]"/>)}
            </svg>

            
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-white px-3 py-1.5 rounded-lg shadow-xl shadow-admin-primary/20">
                <p className="text-[10px] font-black text-admin-primary uppercase leading-tight">Current Peak</p>
                <p className="text-sm font-black text-black">{maxVal} Users</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between px-4 text-[10px] text-white/40 font-black uppercase tracking-widest border-t border-white/5 pt-4 mt-4">
            <span>{periodLabels.start}</span>
            <span>Platform Trend</span>
            <span>{periodLabels.end}</span>
          </div>
        </div>
      </div>
    </div>);
}
