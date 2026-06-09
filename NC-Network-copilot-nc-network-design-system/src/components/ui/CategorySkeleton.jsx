import { memo } from 'react';

/**
 * CategorySkeleton — Premium shimmer skeleton for category cards.
 *
 * Renders exactly 8 ghost cards that match the final category‑card
 * dimensions, spacing, border‑radius, and responsive behaviour so
 * there is zero Cumulative Layout Shift (CLS) when real data loads.
 *
 * Animations use only `transform` + `opacity` (GPU‑composited) and
 * honour `prefers‑reduced‑motion`.
 */

const CARD_COUNT = 8;

/* ── Single skeleton card ──────────────────────────────────────── */
const SkeletonCard = memo(function SkeletonCard({ index }) {
  return (
    <div
      /* Same sizing / responsive classes as the real category card */
      className={`
        w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.57rem)] lg:w-[calc(12.5%-0.66rem)]
        bg-nc-card/50 backdrop-blur-sm border border-white/[0.04]
        rounded-3xl p-5 flex flex-col items-center gap-3
        relative overflow-hidden
        cat-skeleton-card
      `}
      style={{ animationDelay: `${index * 0.08}s` }}
      aria-hidden="true"
    >
      {/* ── Shimmer sweep (decorative) ─────────────────────────── */}
      <div
        className="cat-skeleton-shimmer"
        aria-hidden="true"
      />

      {/* ── Icon placeholder ───────────────────────────────────── */}
      <div className="relative z-10 w-10 h-10 rounded-xl bg-white/[0.06] cat-skeleton-bone" />

      {/* ── Text placeholder ───────────────────────────────────── */}
      <div className="relative z-10 h-3.5 w-14 rounded-md bg-white/[0.06] cat-skeleton-bone" />
    </div>
  );
});

/* ── Grid of 8 skeleton cards ──────────────────────────────────── */
const CategorySkeleton = memo(function CategorySkeleton() {
  return (
    <div
      className="flex flex-wrap gap-3"
      role="status"
      aria-busy="true"
      aria-label="Loading categories"
    >
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}

      {/* SR‑only live text */}
      <span className="sr-only">Loading categories…</span>
    </div>
  );
});

export default CategorySkeleton;
