'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRightSidebar } from '../../contexts/RightSidebarContext';
import { X, Calendar, Inbox, CheckSquare, GripVertical } from 'lucide-react';
import InboxView from './InboxView';
import TodayView from './TodayView';

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

export default function RightSidebar() {
  const { isOpen, closeSidebar, view, setView } = useRightSidebar();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightSidebarWidth');
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    localStorage.setItem('rightSidebarWidth', width.toString());
  }, [width]);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (view) {
      case 'inbox':
        return <InboxView />;
      case 'today':
        return <TodayView />;
      default:
        return <TodayView />;
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className={`relative flex flex-col flex-shrink-0 h-full border-l border-border-default bg-bg-secondary shadow-xl z-30 transition-shadow duration-300 ease-in-out ${isResizing ? 'select-none' : ''}`}
      style={{ width: `${width}px`, transition: isResizing ? 'none' : 'width 0.3s ease-in-out' }}
    >
      {/* Drag Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 hover:w-2 cursor-col-resize z-40 group flex items-center justify-center -translate-x-1/2 hover:bg-primary/10 transition-all"
        onMouseDown={startResizing}
      >
        <div className="w-[1px] h-full bg-border-default group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-tertiary">
        <div className="flex space-x-2">
            <button
                onClick={() => setView('inbox')}
                className={`p-2 rounded-md hover:bg-bg-primary transition-colors ${view === 'inbox' ? 'bg-bg-primary text-primary' : 'text-text-secondary'}`}
                title="Inbox"
            >
                <Inbox size={18} />
            </button>
            <button
                onClick={() => setView('today')}
                className={`p-2 rounded-md hover:bg-bg-primary transition-colors ${view === 'today' ? 'bg-bg-primary text-primary' : 'text-text-secondary'}`}
                title="Today"
            >
                <CheckSquare size={18} />
            </button>
        </div>
        <button
          onClick={closeSidebar}
          className="p-1 rounded-md text-text-secondary hover:bg-bg-primary transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
}
