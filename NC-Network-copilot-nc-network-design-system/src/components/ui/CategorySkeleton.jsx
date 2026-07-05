import { memo } from 'react';



const CARD_COUNT = 8;

/* ── Single skeleton card ──────────────────────────────────────── */
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div
      /* Same sizing / responsive classes as the real category card */
      className="w-[calc(50%-0.375rem)] sm:w-[calc(25%-0.75rem)] lg:w-[calc(25%-0.75rem)] h-[116px] skeleton rounded-[20px]"
      aria-hidden="true"
    />
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
