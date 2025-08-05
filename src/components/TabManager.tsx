'use client';

import { useState } from 'react';
import { Tab, TabType, TabContent } from '@/types';
import { X, Pin, Home, FileText, CheckSquare, Calendar, Folder, List } from 'lucide-react';

interface TabManagerProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabPin: (tabId: string) => void;
}

const tabIcons: Record<TabType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  note: FileText,
  task: CheckSquare,
  tasks: List,
  agenda: Calendar,
  folder: Folder,
};

export default function TabManager({ tabs, activeTabId, onTabSelect, onTabClose, onTabPin }: TabManagerProps) {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const getTabIcon = (type: TabType) => {
    const Icon = tabIcons[type];
    return <Icon className="w-3.5 h-3.5" />;
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-hidden">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          draggable
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          className={`
            group flex items-center gap-1.5 px-3 py-1.5 border-r border-gray-200 dark:border-gray-700 cursor-pointer
            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-0 max-w-48
            ${activeTabId === tab.id ? 'bg-white dark:bg-gray-900 border-b-2 border-blue-500' : ''}
            ${draggedTab === tab.id ? 'opacity-50' : ''}
          `}
          onClick={() => onTabSelect(tab.id)}
        >
          {getTabIcon(tab.type)}
          <span className="truncate text-sm text-gray-700 dark:text-gray-300">
            {tab.title}
          </span>
          
          <div className="flex items-center gap-0.5 ml-auto">
            {tab.isPinned && (
              <Pin className="w-3 h-3 text-gray-400" />
            )}
            
            {/* Only show close button if tab is not pinned or on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 rounded p-0.5 transition-opacity"
              disabled={tab.isPinned}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
      
      {/* Add new tab button could go here */}
      <div className="flex-shrink-0 px-2 py-1.5">
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <span className="text-base">+</span>
        </button>
      </div>
    </div>
  );
}