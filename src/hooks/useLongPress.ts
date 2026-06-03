"use client";

import { useState, useRef, useCallback } from 'react';

interface UseLongPressOptions {
  delay?: number;
  onLongPress: () => void;
}

export function useLongPress({ delay = 500, onLongPress }: UseLongPressOptions) {
  const [isPressing, setIsPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    movedRef.current = false;
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      if (!movedRef.current) {
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
        onLongPress();
      }
      setIsPressing(false);
    }, delay);
  }, [delay, onLongPress]);

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Cancel if the user moves too much (scroll tolerance)
    movedRef.current = true;
  }, []);

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  }, []);

  const handlers = {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: end,
  };

  return { isPressing, handlers };
}
