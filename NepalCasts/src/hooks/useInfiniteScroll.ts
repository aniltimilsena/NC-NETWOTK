import { useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  /** Callback fired when the sentinel element scrolls into view */
  onLoadMore: () => void;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether a batch is currently loading */
  isLoading?: boolean;
  /** Margin around the root. Default '350px' loads the next batch before the user reaches the absolute bottom */
  rootMargin?: string;
  /** Visibility ratio threshold to trigger callback */
  threshold?: number;
}

/**
 * Reusable React hook for windowed infinite scrolling with IntersectionObserver.
 * Keeps DOM element count low by rendering data in sequential pages and seamlessly
 * requesting the next batch before scroll reaches the bottom.
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading = false,
  rootMargin = '350px',
  threshold = 0.05,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(isLoading);
  loadingRef.current = isLoading;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadMoreRef.current();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, rootMargin, threshold]);

  return sentinelRef;
}
