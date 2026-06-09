import { memo } from 'react';

/**
 * TalentCardSkeleton — Premium shimmer skeleton for the talent listing page.
 *
 * Renders ghost cards that exactly match the final talent card dimensions,
 * spacing, border‑radius, and responsive behaviour — zero CLS when real
 * data arrives. Animations use only transform + opacity (GPU‑composited)
 * and honour prefers‑reduced‑motion.
 */

const DEFAULT_COUNT = 10;

/* ── Single talent card skeleton ──────────────────────────────── */
const SkeletonCard = memo(function SkeletonCard({ index }) {
  return (
    <div
      className="talent-skeleton-card bg-nc-card border border-nc-border rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-lg relative overflow-hidden"
      style={{ animationDelay: `${index * 0.1}s` }}
      aria-hidden="true"
    >
      {/* ── Shimmer sweep ──────────────────────────────────────── */}
      <div className="talent-skeleton-shimmer" aria-hidden="true" />

      {/* ── Avatar placeholder ─────────────────────────────────── */}
      <div className="shrink-0 relative z-10">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/[0.06] talent-skeleton-bone" />
      </div>

      {/* ── Text content ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0 relative z-10 space-y-2.5">
        {/* Name row */}
        <div className="flex items-center gap-2">
          <div className="h-3.5 sm:h-4 w-28 sm:w-36 rounded-md bg-white/[0.07] talent-skeleton-bone" />
          <div className="h-3 w-8 rounded-full bg-white/[0.04] talent-skeleton-bone" />
        </div>
        {/* Role • Location */}
        <div className="h-2.5 sm:h-3 w-36 sm:w-48 rounded-md bg-white/[0.05] talent-skeleton-bone" style={{ animationDelay: '0.15s' }} />
        {/* Skill tags */}
        <div className="flex gap-1.5 mt-1.5">
          <div className="h-4 w-14 rounded-full bg-white/[0.04] talent-skeleton-bone" style={{ animationDelay: '0.3s' }} />
          <div className="h-4 w-12 rounded-full bg-white/[0.04] talent-skeleton-bone" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* ── Right stats ────────────────────────────────────────── */}
      <div className="flex flex-col items-end gap-1.5 shrink-0 ml-auto relative z-10">
        <div className="h-3 sm:h-3.5 w-8 rounded-md bg-white/[0.06] talent-skeleton-bone" />
        <div className="h-2.5 w-16 rounded-md bg-white/[0.04] talent-skeleton-bone" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  );
});

/* ── Sync status header ───────────────────────────────────────── */
const SyncHeader = memo(function SyncHeader() {
  return (
    <div className="flex items-center justify-center gap-3 py-6 mb-4 talent-sync-header">
      {/* Glowing sync icon */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 w-8 h-8 rounded-full bg-sky-400/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative w-8 h-8 rounded-full bg-nc-card border border-sky-400/20 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.15)]">
          <svg
            className="w-4 h-4 text-sky-400 talent-sync-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 0 1 9-9" />
          </svg>
        </div>
      </div>

      {/* Status text */}
      <div className="flex flex-col">
        <span className="text-sm font-bold text-white/80 tracking-tight talent-sync-text">
          Syncing network profiles
        </span>
        <span className="text-[10px] text-sky-400/60 font-medium tracking-wide uppercase">
          Establishing connection…
        </span>
      </div>

      {/* Animated dots */}
      <div className="flex gap-0.5 items-center ml-1">
        <span className="w-1 h-1 rounded-full bg-sky-400/50 talent-sync-dot" style={{ animationDelay: '0s' }} />
        <span className="w-1 h-1 rounded-full bg-sky-400/50 talent-sync-dot" style={{ animationDelay: '0.2s' }} />
        <span className="w-1 h-1 rounded-full bg-sky-400/50 talent-sync-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
});

/* ── Full skeleton grid ───────────────────────────────────────── */
const TalentCardSkeleton = memo(function TalentCardSkeleton({ count = DEFAULT_COUNT }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading talent profiles">
      <div className="grid grid-cols-1 md:grid-cols-1 gap-3 sm:gap-4 md:gap-5">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>

      <span className="sr-only">Loading talent profiles…</span>
    </div>
  );
});

export default TalentCardSkeleton;
