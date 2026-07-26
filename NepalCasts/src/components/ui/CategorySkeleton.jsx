import { memo } from 'react';
const SkeletonCard = memo(function SkeletonCard() {
    return (<div className="w-full h-[156px] skeleton rounded-[20px]" aria-hidden="true"/>);
});
const CategorySkeleton = memo(function CategorySkeleton({ count = 2 }) {
    return (<div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8 max-w-3xl mx-auto" role="status" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: count }, (_, i) => (<SkeletonCard key={i}/>))}

      
      <span className="sr-only">Loading categories…</span>
    </div>);
});
export default CategorySkeleton;
