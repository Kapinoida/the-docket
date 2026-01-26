'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type SidebarView = 'inbox' | 'today' | 'calendar' | null;

interface RightSidebarContextType {
  isOpen: boolean;
  view: SidebarView;
  openSidebar: (view?: SidebarView) => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setView: (view: SidebarView) => void;
}

const RightSidebarContext = createContext<RightSidebarContextType | undefined>(undefined);

export function RightSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setViewAction] = useState<SidebarView>('today');

  const openSidebar = (newView?: SidebarView) => {
    if (newView) {
      setViewAction(newView);
    }
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const setView = (newView: SidebarView) => {
    setViewAction(newView);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <RightSidebarContext.Provider
      value={{
        isOpen,
        view,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        setView,
      }}
    >
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (context === undefined) {
    throw new Error('useRightSidebar must be used within a RightSidebarProvider');
  }
  return context;
}
