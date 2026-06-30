'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import BottomTabBar from './BottomTabBar';
import { Menu, PanelRight, ChevronLeft } from 'lucide-react';
import { RightSidebarProvider, useRightSidebar } from '../../contexts/RightSidebarContext';

import { usePeriodicSync } from '@/hooks/usePeriodicSync';


function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isOpen: isRightSidebarOpen, openSidebar: openRightSidebar, closeSidebar: closeRightSidebar, toggleSidebar: toggleRightSidebar } = useRightSidebar();

  // Swipe-to-close for left sidebar
  const touchStartX = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 80) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Background Sync (Every 5 minutes)
  usePeriodicSync(300000);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const isFocus = pathname.startsWith('/focus');

  return (
    <div className="flex w-full h-full overflow-hidden bg-bg-primary">
      {/* Mobile Left Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Right Sidebar Overlay */}
      {isRightSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => closeRightSidebar()}
        />
      )}

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 pb-[calc(52px+env(safe-area-inset-bottom,8px))] md:pb-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center p-4 border-b border-border-default bg-bg-secondary flex-shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 -ml-2 rounded-md text-text-secondary hover:bg-bg-tertiary focus:outline-none"
          >
            <Menu size={24} />
          </button>
          <span className="ml-3 font-semibold text-text-primary">The Docket</span>
          <div className="flex-1" />
           <button
            onClick={() => toggleRightSidebar()}
            className="p-2 rounded-md text-text-secondary hover:bg-bg-tertiary focus:outline-none"
          >
            <PanelRight size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <main className={`flex-1 overflow-hidden w-full relative ${isFocus ? 'flex flex-col' : 'flex overflow-y-auto pb-[60px] md:pb-0'}`}>
          {isFocus ? (
            children
          ) : (
            <div className="flex-1 overflow-y-auto w-full">
              {children}
            </div>
          )}
           {!isRightSidebarOpen && !isFocus && (
              <button
                onClick={() => toggleRightSidebar()}
                className="absolute top-1/2 right-0 transform -translate-y-1/2 p-1 rounded-l-md bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-text-primary shadow-sm z-50 hidden md:flex items-center justify-center border-y border-l border-border-subtle transition-all opacity-60 hover:opacity-100"
                aria-label="Toggle Right Sidebar"
              >
                <ChevronLeft size={14} />
              </button>
           )}
        </main>

        {/* Bottom Tab Bar (mobile only) */}
        <BottomTabBar />
      </div>

      {/* Right Sidebar Container */}
      <div className={`
        fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <RightSidebar />
      </div>
    </div>
  );

}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <RightSidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </RightSidebarProvider>
  );
}
