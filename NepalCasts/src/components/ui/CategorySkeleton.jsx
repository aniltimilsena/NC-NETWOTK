import { memo } from 'react';

/* ── Single skeleton card ──────────────────────────────────────── */
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div
      /* Same sizing / responsive classes as the real category card */
      className="w-full h-[156px] skeleton rounded-[20px]"
      aria-hidden="true"
    />
  );
});

/* ── Grid of skeleton cards ──────────────────────────────────── */
const CategorySkeleton = memo(function CategorySkeleton({ count = 2 }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8 max-w-3xl mx-auto"
      role="status"
      aria-busy="true"
      aria-label="Loading categories"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}

      {/* SR‑only live text */}
      <span className="sr-only">Loading categories…</span>
    </div>
  );
});

export default CategorySkeleton;
