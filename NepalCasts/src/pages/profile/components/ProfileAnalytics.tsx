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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 skeleton rounded-3xl w-full" />
        ))}
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
      label: 'Profile Views (7d)',
      value: data.profileViewsThisWeek,
      change: data.profileViewsLastWeek 
        ? `${Math.round(((data.profileViewsThisWeek - data.profileViewsLastWeek) / data.profileViewsLastWeek) * 100)}%` 
        : '0%',
      icon: Eye,
      trend: data.profileViewsThisWeek >= data.profileViewsLastWeek
    },
    {
      label: 'Search Appearances',
      value: data.searchAppearances,
      change: data.topCategorySearches,
      icon: Search,
      trend: true
    },
    {
      label: 'Profile Clicks',
      value: data.profileClicks,
      change: `${data.saves} Saves / ${data.messages} DMs`,
      icon: MousePointer,
      trend: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Analytics KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-xs text-nc-muted uppercase tracking-wider font-bold">{card.label}</span>
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#00BFFF]" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-white block">{card.value}</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold ${card.trend ? 'text-green-400' : 'text-red-400'}`}>
                    {card.change}
                  </span>
                  <span className="text-[10px] text-nc-muted font-medium">vs last week</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visitor Breakdown Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.2rem] p-6 space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00BFFF]" />
            Who Viewed Your Profile
          </h2>
          <div className="space-y-3.5">
            {Object.keys(data.viewerCategories).length > 0 ? (
              Object.entries(data.viewerCategories).map(([category, count]) => {
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
              })
            ) : (
              <p className="text-xs text-nc-muted py-4">No viewer demographic data available yet.</p>
            )}
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
    </div>
  );
}
export type { AnalyticsData };
