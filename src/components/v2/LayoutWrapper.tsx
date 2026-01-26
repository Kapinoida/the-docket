'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import { Menu, PanelRight } from 'lucide-react';
import { RightSidebarProvider, useRightSidebar } from '../../contexts/RightSidebarContext';

import { usePeriodicSync } from '@/hooks/usePeriodicSync';



function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isOpen: isRightSidebarOpen, openSidebar: openRightSidebar, toggleSidebar: toggleRightSidebar } = useRightSidebar();

  // Background Sync (Every 5 minutes)
  usePeriodicSync(300000);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex w-full h-full overflow-hidden bg-bg-primary">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      {/* Mobile: Fixed, slide-in. Desktop: Static (flex item) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
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
        <main className="flex-1 overflow-y-auto w-full relative flex">
          <div className="flex-1 overflow-y-auto w-full">
            {children}
          </div>
           {/* Right Sidebar */}
           <RightSidebar />
           {!isRightSidebarOpen && (
              <button
                onClick={() => toggleRightSidebar()}
                className="absolute top-4 right-4 p-2 rounded-md bg-secondary text-secondary-foreground hover:bg-muted shadow-md z-20 hidden md:flex items-center justify-center border border-border"
                aria-label="Toggle Right Sidebar"
              >
                <PanelRight size={20} />
              </button>
           )}
        </main>
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
