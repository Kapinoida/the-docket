'use client';

import { ReactNode, useState, useCallback, useEffect } from 'react';
import FolderTree from './FolderTree';
import TabManager from './TabManager';
import TabContent from './TabContent';
import RightSidebar from './RightSidebar';
import { useResizable } from '@/hooks/useResizable';
import { Folder, Note, Tab, TabContent as TabContentType, TaskInstance } from '@/types';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'home',
      type: 'home',
      title: 'Home',
      content: {},
      isPinned: true,
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('home');

  // Resizable left sidebar
  const leftSidebar = useResizable({
    minWidth: 200,
    maxWidth: 500,
    defaultWidth: 256,
    storageKey: 'left-sidebar-width'
  });

  const createTab = useCallback((type: Tab['type'], title: string, content: TabContentType): Tab => {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      content,
    };
  }, []);

  const handleNoteSelect = useCallback((note: Note) => {
    // Check if note is already open in a tab
    const existingTab = tabs.find(tab => tab.content.noteId === note.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab for the note
    const newTab = createTab('note', note.title, { noteId: note.id, note });
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs, createTab]);

  const handleFolderSelect = useCallback((folder: Folder) => {
    setSelectedFolder(folder);
    
    // Check if folder is already open in a tab
    const existingTab = tabs.find(tab => tab.content.folderId === folder.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab for the folder
    const newTab = createTab('folder', folder.name, { folderId: folder.id, folder });
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs, createTab]);

  const handleTabClose = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isPinned) return; // Can't close pinned tabs

    setTabs(prev => prev.filter(t => t.id !== tabId));
    
    // If closing active tab, switch to home or first available tab
    if (tabId === activeTabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[0].id : 'home');
    }
  }, [tabs, activeTabId]);

  const handleTabPin = useCallback((tabId: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
    ));
  }, []);

  const handleNotesChange = useCallback(() => {
    // Trigger refresh of sidebar notes when notes are modified
    setSidebarRefreshTrigger(prev => prev + 1);
    
    // Update any note tabs that might have changed
    setTabs(prev => prev.map(tab => {
      if (tab.type === 'note' && tab.content.note) {
        // In a real app, you'd fetch the updated note here
        return { ...tab, title: tab.content.note.title };
      }
      return tab;
    }));
  }, []);

  const handleCreateNote = useCallback(async (folderId: string) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Note',
          content: '',
          folderId: folderId,
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        handleNoteSelect(newNote);
        handleNotesChange();
      } else {
        alert('Failed to create note');
      }
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Error creating note');
    }
  }, [handleNoteSelect, handleNotesChange]);

  const handleTaskSelect = useCallback((task: TaskInstance) => {
    // Check if task is already open in a tab
    const existingTab = tabs.find(tab => tab.content.task?.id === task.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab for the task
    const newTab = createTab('task', `Task: ${task.content.slice(0, 30)}${task.content.length > 30 ? '...' : ''}`, { task });
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs, createTab]);

  const handleCreateTask = useCallback(async (folderId: string) => {
    // Task creation will be handled by the TabContent component's modals
    // This is just a placeholder for the sidebar button
    console.log('Create task for folder:', folderId);
  }, []);

  const handleCreateStandaloneTask = useCallback(async () => {
    // Create a standalone task with no folder context
    console.log('Create standalone task');
    // TODO: Implement standalone task creation
  }, []);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        handleNotesChange();
      } else {
        alert('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note');
    }
  }, [handleNotesChange]);

  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  // Keyboard shortcuts for tab management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 't':
            e.preventDefault();
            // Focus home tab
            setActiveTabId('home');
            break;
          case 'w':
            e.preventDefault();
            // Close current tab (if not pinned)
            if (activeTabId && activeTabId !== 'home') {
              handleTabClose(activeTabId);
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            // Switch to previous tab
            const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
            if (currentIndex > 0) {
              setActiveTabId(tabs[currentIndex - 1].id);
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            // Switch to next tab
            const nextIndex = tabs.findIndex(tab => tab.id === activeTabId);
            if (nextIndex < tabs.length - 1) {
              setActiveTabId(tabs[nextIndex + 1].id);
            }
            break;
        }
      }
      
      // Number keys for direct tab access (1-9)
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < tabs.length) {
          setActiveTabId(tabs[tabIndex].id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, handleTabClose]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar - File Navigator */}
      {leftSidebarVisible && (
        <div 
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col relative"
          style={{ width: leftSidebar.width }}
        >
          <div className="px-3 py-3 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                The Docket
              </h1>
              <button
                onClick={() => setLeftSidebarVisible(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Hide sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <FolderTree 
              onFolderSelect={handleFolderSelect}
              selectedFolderId={selectedFolder?.id}
              onNoteSelect={handleNoteSelect}
              refreshTrigger={sidebarRefreshTrigger}
              onCreateNote={handleCreateNote}
              onCreateTask={handleCreateStandaloneTask}
              onDeleteNote={handleDeleteNote}
            />
          </div>
          

          {/* Resize Handle */}
          <div
            ref={leftSidebar.resizeHandleRef}
            onMouseDown={leftSidebar.handleMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:opacity-50 transition-all duration-150"
            style={{ transform: 'translateX(50%)' }}
          />
        </div>
      )}

      {/* Left Sidebar Toggle Button */}
      {!leftSidebarVisible && (
        <button
          onClick={() => setLeftSidebarVisible(true)}
          className="fixed top-4 left-4 z-10 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:shadow-md transition-shadow"
          title="Show sidebar"
        >
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Manager */}
        <div className="relative">
          <TabManager
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={setActiveTabId}
            onTabClose={handleTabClose}
            onTabPin={handleTabPin}
          />
          
          {/* Right Sidebar Toggle Button */}
          {!rightSidebarVisible && (
            <button
              onClick={() => setRightSidebarVisible(true)}
              className="absolute top-2 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Show right panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <TabContent
            tab={activeTab}
            onNotesChange={handleNotesChange}
            onNoteSelect={handleNoteSelect}
            onTaskSelect={handleTaskSelect}
          />
        </div>
      </div>

      {/* Right Sidebar - Tasks/Properties */}
      {rightSidebarVisible && (
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-shrink-0 relative">
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={() => setRightSidebarVisible(false)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Hide right panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <RightSidebar selectedFolder={selectedFolder} />
        </div>
      )}
    </div>
  );
}