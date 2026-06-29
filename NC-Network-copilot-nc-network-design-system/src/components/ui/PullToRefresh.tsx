import { useState, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const controls = useAnimation();

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && startY > 0 && !isRefreshing) {
      const currentY = e.touches[0].pageY;
      const distance = Math.max(0, currentY - startY);
      
      // Add resistance to the pull
      const resistanceDistance = Math.pow(distance, 0.85);
      setPullDistance(resistanceDistance);
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    setStartY(0);
  }, [pullDistance, isRefreshing, onRefresh]);

  return (
    <div 
      className="relative w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div 
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden pointer-events-none z-50"
        style={{ height: pullDistance }}
        animate={{ height: pullDistance }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className={`p-2 rounded-full bg-nc-dark border border-white/10 shadow-2xl transition-all duration-300 ${isRefreshing ? 'animate-spin' : ''}`}>
          <RefreshCw 
            className="w-5 h-5 text-nc-accent" 
            style={{ 
              transform: `rotate(${pullDistance * 2}deg)`,
              opacity: Math.min(1, pullDistance / PULL_THRESHOLD)
            }} 
          />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
