"use client";

import React, { useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const scrollTopAtStart = useRef(0);

  const THRESHOLD = 60; // px to trigger refresh

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    scrollTopAtStart.current = el.scrollTop;
    startY.current = e.touches[0].clientY;
    isPulling.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const delta = currentY - startY.current;

    // Only activate pull-to-refresh when at the top of the scroll container
    if (el.scrollTop <= 0 && delta > 0) {
      isPulling.current = true;
      // Add resistance (feels more natural)
      const damped = Math.min(delta * 0.4, 120);
      setPullDistance(damped);
      
      // Prevent page-level pull-to-refresh / overscroll
      if (delta > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || pullDistance < THRESHOLD) {
      setPullDistance(0);
      isPulling.current = false;
      return;
    }

    setIsRefreshing(true);
    setPullDistance(48); // Show spinner at indicator height

    try {
      await onRefresh();
    } catch (e) {
      console.error('Pull-to-refresh failed', e);
    }

    // Animate out
    setPullDistance(0);
    setTimeout(() => setIsRefreshing(false), 300);
    isPulling.current = false;
  }, [pullDistance, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto overscroll-contain md:overflow-visible ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: `${pullDistance}px`, opacity: pullDistance > 0 ? 1 : 0 }}
      >
        <div className={`flex items-center gap-2 text-sm text-text-muted ${isRefreshing ? '' : ''}`}>
          <RefreshCw
            size={16}
            className={isRefreshing ? 'animate-spin text-accent-orange' : ''}
          />
          <span>
            {isRefreshing
              ? 'Refreshing...'
              : pullDistance >= THRESHOLD
              ? 'Release to refresh'
              : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
};
