import React from 'react';
import { Eye, Search, MousePointer, TrendingUp, Users, ArrowUpRight, BarChart2 } from 'lucide-react';

interface AnalyticsData {
  profileViewsThisWeek: number;
  profileViewsLastWeek: number;
  searchAppearances: number;
  profileClicks: number;
  followersGainedThisWeek: number;
  viewsLast7Days: number[];
  viewerCategories: Record<string, number>;
  topCategorySearches: string;
  topLocation: string;
  saves: number;
  messages: number;
}

interface ProfileAnalyticsProps {
  analytics: AnalyticsData | null;
  loading: boolean;
}

export default function ProfileAnalytics({ analytics, loading }: ProfileAnalyticsProps) {
  if (loading) {
    return (
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-2xl p-4 space-y-4 animate-pulse">
        <div className="h-6 bg-white/5 rounded-lg w-1/4" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-white/5 rounded w-1/2" />
              <div className="h-5 bg-white/5 rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const data = analytics || {
    profileViewsThisWeek: 0,
    profileViewsLastWeek: 0,
    searchAppearances: 0,
    profileClicks: 0,
    followersGainedThisWeek: 0,
    viewsLast7Days: [0, 0, 0, 0, 0, 0, 0],
    viewerCategories: {},
    topCategorySearches: 'N/A',
    topLocation: 'N/A',
    saves: 0,
    messages: 0,
  };

  const cards = [
    {
      label: 'Views (7d)',
      value: data.profileViewsThisWeek,
      change: data.profileViewsLastWeek 
        ? `${Math.round(((data.profileViewsThisWeek - data.profileViewsLastWeek) / data.profileViewsLastWeek) * 100)}%` 
        : '0%',
      icon: Eye,
      trend: data.profileViewsThisWeek >= data.profileViewsLastWeek
    },
    {
      label: 'Searches',
      value: data.searchAppearances,
      change: data.topCategorySearches,
      icon: Search,
      trend: true
    },
    {
      label: 'Clicks',
      value: data.profileClicks,
      change: `${data.saves} saves / ${data.messages} DMs`,
      icon: MousePointer,
      trend: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Unified Analytics KPI card */}
      <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-[#00BFFF]" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Performance Insights</span>
          </div>
          <span className="text-[8px] bg-white/5 border border-white/10 text-nc-muted px-2 py-0.5 rounded font-black uppercase tracking-widest">7d Window</span>
        </div>

        <div className="grid grid-cols-3 gap-2 divide-x divide-white/5">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className={`space-y-1 ${idx > 0 ? 'pl-4' : ''}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="w-3 h-3 text-[#00BFFF]/70 shrink-0" />
                  <span className="text-[9px] text-nc-muted uppercase tracking-wider font-black truncate">{card.label}</span>
                </div>
                <div>
                  <span className="text-xl font-black text-white leading-none block">{card.value}</span>
                  <span className={`text-[8px] font-black ${card.trend ? 'text-green-400' : 'text-red-400'} block mt-0.5 truncate`} title={card.change}>
                    {card.change} <span className="text-nc-muted/50 font-normal">vs last week</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visitor Breakdown Panel */}
      {Object.keys(data.viewerCategories).length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00BFFF]" />
              Who Viewed Your Profile
            </h2>
            <div className="space-y-3.5">
              {Object.entries(data.viewerCategories).map(([category, count]) => {
                const total = Object.values(data.viewerCategories).reduce((a, b) => a + b, 0);
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-bold">{category}</span>
                      <span className="text-nc-muted">{percent}% ({count})</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00BFFF] rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Demographics Card */}
          <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#00BFFF]" />
              Audience Insights
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
                <span className="text-nc-muted">Top Location</span>
                <span className="text-white font-bold">{data.topLocation}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
                <span className="text-nc-muted">Followers Gained</span>
                <span className="text-white font-bold">+{data.followersGainedThisWeek}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-nc-muted">Profile Conversion Rate</span>
                <span className="text-white font-bold">
                  {data.profileViewsThisWeek > 0 
                    ? `${Math.round((data.profileClicks / data.profileViewsThisWeek) * 100)}%` 
                    : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Top Demographics Card (Full Width) */
        <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#00BFFF]" />
            Audience Insights
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
              <span className="text-nc-muted">Top Location</span>
              <span className="text-white font-bold">{data.topLocation}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-white/5">
              <span className="text-nc-muted">Followers Gained</span>
              <span className="text-white font-bold">+{data.followersGainedThisWeek}</span>
            </div>
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-nc-muted">Profile Conversion Rate</span>
              <span className="text-white font-bold">
                {data.profileViewsThisWeek > 0 
                  ? `${Math.round((data.profileClicks / data.profileViewsThisWeek) * 100)}%` 
                  : '0%'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export type { AnalyticsData };
