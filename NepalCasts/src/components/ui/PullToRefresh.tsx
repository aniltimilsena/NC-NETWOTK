import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 60;
  const MAX_PULL = 100;

  const getScrollTop = () => {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (getScrollTop() <= 1) {
      startYRef.current = e.touches[0].pageY || e.touches[0].clientY;
      isPullingRef.current = true;
      hasTriggeredHapticRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    const currentY = e.touches[0].pageY || e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0 && getScrollTop() <= 1) {
      // Smooth logarithmic drag resistance
      const resistedDistance = Math.min(MAX_PULL, Math.pow(diff, 0.82));
      setPullDistance(resistedDistance);

      // Trigger tactile haptic feedback on threshold
      if (resistedDistance >= PULL_THRESHOLD && !hasTriggeredHapticRef.current) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(15);
          } catch {
            // Ignore vibration API errors on unsupported browsers
          }
        }
        hasTriggeredHapticRef.current = true;
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current && pullDistance === 0) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);
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
      ref={containerRef}
      className="relative w-full overscroll-y-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Pull / Refresh Floating White Circle Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="fixed top-16 sm:top-20 left-0 right-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div className="w-9 h-9 rounded-full bg-black/90 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
              {isRefreshing ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <motion.div
                  style={{ rotate: progress * 360 }}
                  className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content with Spring Offset */}
      <motion.div
        animate={{ y: isRefreshing ? 42 : pullDistance * 0.55 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
