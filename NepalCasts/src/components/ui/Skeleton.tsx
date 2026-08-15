import React from 'react';

// 1. Spotlight SpotlightHeroSkeleton
export const SpotlightHeroSkeleton = () => (
  <div className="relative z-20 flex items-end gap-3.5 mt-12 sm:mt-16 w-full" aria-hidden="true">
    <div className="relative shrink-0 flex flex-col items-center overflow-hidden rounded-md shadow-2xl border border-white/10 bg-[#10151c]">
      <div className="w-[120px] h-[165px] sm:w-[145px] sm:h-[195px] skeleton" />
      <div className="w-full h-1.5 bg-white/10" />
    </div>
    <div className="flex flex-col justify-end items-start gap-2 h-[166px] sm:h-[196px] text-left w-full max-w-[200px]">
      <div className="h-6 skeleton w-36" />
      <div className="h-4 skeleton w-24" />
      <div className="h-4 skeleton w-20" />
    </div>
  </div>
);

// 2. Horizontal circular avatars with text underneath
export const AvatarScrollSkeleton = ({ count = 5 }) => (
  <div className="flex gap-3 sm:gap-4 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex flex-col items-center shrink-0 w-[140px] sm:w-[170px]">
        <div className="w-[125px] h-[125px] sm:w-[155px] sm:h-[155px] rounded-full skeleton border-2 border-white/10" />
        <div className="h-3.5 skeleton w-2/3 mt-3" />
        <div className="h-2.5 skeleton w-1/2 mt-2" />
      </div>
    ))}
  </div>
);

// 3. Vertical ranks-based list (Trending)
export const TrendingListSkeleton = ({ count = 3 }) => (
  <div className="flex flex-col gap-1 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center justify-between py-1.5 px-2 gap-4 rounded-xl bg-white/[0.01]">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <span className="font-sans text-2xl sm:text-3xl font-black text-white/5 w-8 text-center shrink-0 select-none">
            {i + 1}
          </span>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full skeleton shrink-0 border-2 border-white/10" />
          <div className="space-y-2 flex-1 text-left">
            <div className="h-4 skeleton w-1/3" />
            <div className="h-3 skeleton w-1/2" />
          </div>
        </div>
        <div className="w-16 h-4 skeleton shrink-0" />
      </div>
    ))}
  </div>
);

// 4. Notifications Skeleton
export const NotificationSkeleton = ({ count = 4 }) => (
  <div className="space-y-3 mt-4 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4 md:gap-6">
        <div className="w-10 h-10 md:w-14 md:h-14 rounded-full skeleton shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 skeleton w-1/3" />
          <div className="h-3 skeleton w-2/3" />
        </div>
        <div className="flex flex-col items-end gap-1.5 self-start pt-0.5 shrink-0 ml-auto">
          <div className="h-3 skeleton w-12" />
        </div>
      </div>
    ))}
  </div>
);

// 5. Casting Call Skeleton
export const CastingCallSkeleton = ({ count = 3 }) => (
  <div className="flex flex-col w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-8 border-b border-white/5 gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 flex-1 w-full">
          <div className="w-full sm:w-48 h-28 rounded-xl skeleton shrink-0 border border-white/5" />
          <div className="space-y-3 flex-1 text-left">
            <div className="h-3 skeleton w-1/4" />
            <div className="h-6 skeleton w-1/2" />
            <div className="h-4 skeleton w-3/4" />
          </div>
        </div>
        <div className="h-10 skeleton w-28 shrink-0" />
      </div>
    ))}
  </div>
);

// 6. Audition Applications Skeleton
export const ApplicationSkeleton = ({ count = 3 }) => (
  <div className="space-y-4 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-16 rounded-xl skeleton shrink-0" />
          <div className="space-y-2 text-left flex-1">
            <div className="h-5 skeleton w-1/2" />
            <div className="h-3.5 skeleton w-1/3" />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <div className="h-6 skeleton w-24 rounded-full" />
          <div className="h-8 skeleton w-20 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

// 7. Bookmarked/Saved Casting Calls Skeleton
export const SavedCallSkeleton = ({ count = 3 }) => (
  <div className="space-y-4 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
        <div className="h-6 skeleton w-2/3" />
        <div className="h-4 skeleton w-1/3" />
        <div className="h-10 skeleton w-full pt-2 rounded-2xl" />
      </div>
    ))}
  </div>
);

// 8. Reviews list Skeleton
export const ReviewSkeleton = ({ count = 2 }) => (
  <div className="space-y-6 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3 py-5 border-b border-white/5 last:border-b-0">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full skeleton" />
            <div className="space-y-1.5 text-left">
              <div className="h-4 skeleton w-28" />
              <div className="h-3 skeleton w-20" />
            </div>
          </div>
          <div className="space-y-1.5 flex flex-col items-end">
            <div className="h-3.5 skeleton w-20" />
            <div className="h-3 skeleton w-16" />
          </div>
        </div>
        <div className="space-y-2 mt-2 text-left">
          <div className="h-3.5 skeleton w-full" />
          <div className="h-3.5 skeleton w-5/6" />
        </div>
      </div>
    ))}
  </div>
);

// 9. Follow list item skeleton (Followers/Following)
export const FollowItemSkeleton = ({ count = 3, type = 'follow' }) => (
  <div className="space-y-3.5 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => {
      if (type === 'projects') {
        return (
          <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2.5">
            <div className="h-4 skeleton w-2/3" />
            <div className="flex justify-between">
              <div className="h-3 skeleton w-16" />
              <div className="h-3 skeleton w-16" />
            </div>
          </div>
        );
      }
      return (
        <div key={i} className="flex justify-between items-center gap-3 p-2 rounded-2xl bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full skeleton" />
            <div className="space-y-1.5 text-left">
              <div className="h-4 skeleton w-24" />
              <div className="h-3 skeleton w-16" />
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// 10. Sidebar items skeleton
export const SidebarWidgetSkeleton = ({ count = 3, type = 'talent' }) => (
  <div className="space-y-1.5 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-2 px-2.5">
        {type === 'talent' ? (
          <>
            <div className="w-10 h-10 rounded-full skeleton shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5 text-left">
              <div className="h-3.5 skeleton w-20" />
              <div className="h-3 skeleton w-12" />
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl skeleton shrink-0" />
            <div className="min-w-0 flex-1 space-y-2 text-left">
              <div className="h-3.5 skeleton w-24" />
              <div className="h-3 skeleton w-16" />
            </div>
          </>
        )}
      </div>
    ))}
  </div>
);

// 11. Admin Stat card skeleton
export const AdminStatSkeleton = () => (
  <div className="bg-admin-surface border border-admin-border p-5 rounded-2xl space-y-4 w-full animate-pulse" aria-hidden="true">
    <div className="flex justify-between items-start">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5" />
      <div className="w-12 h-5 bg-white/5 rounded-full" />
    </div>
    <div className="space-y-2 text-left">
      <div className="h-3 bg-white/5 rounded w-16" />
      <div className="h-6 bg-white/5 rounded w-24" />
    </div>
  </div>
);

// 12. Admin Chart graph skeleton
export const AdminChartSkeleton = () => (
  <div className="h-48 w-full bg-white/[0.01] border border-white/5 rounded-2xl flex flex-col justify-end p-4 gap-2 relative overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 skeleton opacity-10" />
    <div className="flex justify-between items-end h-full w-full gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex-1 bg-white/5 rounded-t-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
      ))}
    </div>
  </div>
);

// 13. Admin Table row skeleton
export const AdminRowSkeleton = ({ cols = 5 }) => (
  <tr className="border-b border-admin-border/30 animate-pulse" aria-hidden="true">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-6 py-5">
        <div className="space-y-2 text-left">
          <div className="h-4 bg-white/5 skeleton rounded w-2/3" />
          {i === 0 && <div className="h-3 bg-white/5 skeleton rounded w-1/2" />}
        </div>
      </td>
    ))}
  </tr>
);

// 14. Admin card overview/moderation/casting skeleton
export const AdminCardSkeleton = () => (
  <div className="bg-admin-surface border border-admin-border rounded-2xl p-6 space-y-4 animate-pulse" aria-hidden="true">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 shrink-0" />
      <div className="space-y-2 flex-1 text-left">
        <div className="h-4 bg-white/5 rounded w-1/3" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-2 pt-2 text-left">
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-5/6" />
    </div>
    <div className="h-8 bg-white/5 rounded-xl w-full" />
  </div>
);

// 15. Admin Settings Configuration loading skeleton
export const AdminSettingsSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full animate-pulse" aria-hidden="true">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="bg-admin-surface border border-admin-border rounded-2xl p-6 space-y-6">
        <div className="h-6 skeleton w-32 mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="space-y-2 text-left">
              <div className="h-3 skeleton w-20" />
              <div className="h-10 skeleton rounded-xl w-full" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
