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
  calendar: Calendar,
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
    <div className="flex items-center overflow-x-hidden" style={{ 
      backgroundColor: 'var(--bg-secondary)', 
      borderBottom: '1px solid var(--border-default)' 
    }}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          draggable
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          className={`
            group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer
            transition-colors min-w-0 max-w-48
            ${activeTabId === tab.id ? 'border-b-2' : ''}
            ${draggedTab === tab.id ? 'opacity-50' : ''}
          `}
          style={{
            backgroundColor: activeTabId === tab.id ? 'var(--bg-primary)' : 'transparent',
            borderRight: '1px solid var(--border-subtle)',
            borderBottomColor: activeTabId === tab.id ? 'var(--accent-blue)' : 'transparent'
          }}
          onMouseEnter={(e) => {
            if (activeTabId !== tab.id) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTabId !== tab.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => onTabSelect(tab.id)}
        >
          {getTabIcon(tab.type)}
          <span className="truncate text-sm" style={{ color: 'var(--text-primary)' }}>
            {tab.title}
          </span>
          
          <div className="flex items-center gap-0.5 ml-auto">
            {tab.isPinned && (
              <Pin className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            )}
            
            {/* Only show close button if tab is not pinned or on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-accent)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              disabled={tab.isPinned}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
      
      {/* Add new tab button could go here */}
      <div className="flex-shrink-0 px-2 py-1.5">
        <button 
          className="transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <span className="text-base">+</span>
        </button>
      </div>
    </div>
  );
}