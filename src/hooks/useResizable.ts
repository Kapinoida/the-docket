import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizableOptions {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  storageKey?: string;
}

export function useResizable({
  minWidth,
  maxWidth,
  defaultWidth,
  storageKey
}: UseResizableOptions) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (parsedWidth >= minWidth && parsedWidth <= maxWidth) {
          setWidth(parsedWidth);
        }
      }
    }
  }, [storageKey, minWidth, maxWidth]);

  // Save width to localStorage when it changes
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = e.clientX;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    width,
    isResizing,
    resizeHandleRef,
    handleMouseDown
  };
}