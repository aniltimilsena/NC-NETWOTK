import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  const PULL_THRESHOLD = 65;
  const MAX_PULL = 110;

  const getScrollTop = () => {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (getScrollTop() <= 0) {
      startYRef.current = e.touches[0].pageY;
      isPullingRef.current = true;
      hasTriggeredHapticRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    const currentY = e.touches[0].pageY;
    const diff = currentY - startYRef.current;

    if (diff > 0 && getScrollTop() <= 0) {
      // Apply smooth logarithmic resistance
      const resistedDistance = Math.min(MAX_PULL, Math.pow(diff, 0.82));
      setPullDistance(resistedDistance);

      // Trigger subtle haptic click when passing threshold
      if (resistedDistance >= PULL_THRESHOLD && !hasTriggeredHapticRef.current) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(15);
          } catch (_) {}
        }
        hasTriggeredHapticRef.current = true;
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(54); // Hold indicator in place while refreshing
      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.error('Refresh error:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startYRef.current = 0;
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD);

  return (
    <div
      className="relative w-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull / Refresh Indicator Header */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ height: Math.max(pullDistance, isRefreshing ? 54 : 0) }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
              {isRefreshing ? (
                <>
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="font-apple text-[11px] font-medium text-slate-200 tracking-normal">
                    Refreshing...
                  </span>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ rotate: pullDistance >= PULL_THRESHOLD ? 180 : progress * 180 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ArrowDown className={`w-3.5 h-3.5 transition-colors ${pullDistance >= PULL_THRESHOLD ? 'text-cyan-400' : 'text-slate-400'}`} />
                  </motion.div>
                  <span className="font-apple text-[11px] font-medium text-slate-300 tracking-normal">
                    {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Spring Pushdown */}
      <motion.div
        animate={{ y: isRefreshing ? 54 : pullDistance * 0.7 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
