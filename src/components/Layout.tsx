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
      isPinned: false,
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

    const remainingTabs = tabs.filter(t => t.id !== tabId);
    setTabs(remainingTabs);
    
    // If closing active tab, switch to first available tab or create a blank state
    if (tabId === activeTabId) {
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[0].id);
      } else {
        // No tabs left, set to null to show empty state
        setActiveTabId('');
      }
    }
  }, [tabs, activeTabId]);

  const handleTabPin = useCallback((tabId: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
    ));
  }, []);

  const handleNotesChange = useCallback(async () => {
    // Trigger refresh of sidebar notes when notes are modified
    setSidebarRefreshTrigger(prev => prev + 1);
    
    // Update any note tabs that might have changed by fetching fresh data
    const updatedTabs = await Promise.all(
      tabs.map(async (tab) => {
        if (tab.type === 'note' && tab.content.noteId) {
          try {
            console.log(`[Layout] Refreshing note data for tab ${tab.id}, noteId: ${tab.content.noteId}`);
            const response = await fetch(`/api/notes/${tab.content.noteId}`);
            if (response.ok) {
              const updatedNote = await response.json();
              console.log(`[Layout] Updated note data:`, { id: updatedNote.id, title: updatedNote.title, contentLength: updatedNote.content?.length });
              return { 
                ...tab, 
                title: updatedNote.title,
                content: { ...tab.content, note: updatedNote }
              };
            }
          } catch (error) {
            console.error(`[Layout] Error fetching updated note ${tab.content.noteId}:`, error);
          }
        }
        return tab;
      })
    );
    
    setTabs(updatedTabs);
  }, [tabs]);

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

  const handleTasksViewClick = useCallback(() => {
    // Check if tasks view is already open in a tab
    const existingTab = tabs.find(tab => tab.type === 'tasks');
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      // Create new tasks tab
      const newTasksTab = createTab('tasks', 'All Tasks', {});
      setTabs(prev => [...prev, newTasksTab]);
      setActiveTabId(newTasksTab.id);
    }
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

  const handleHomeClick = useCallback(() => {
    // Check if home tab exists
    const homeTab = tabs.find(tab => tab.type === 'home');
    if (homeTab) {
      setActiveTabId(homeTab.id);
    } else {
      // Create new home tab
      const newHomeTab = createTab('home', 'Home', {});
      setTabs(prev => [...prev, newHomeTab]);
      setActiveTabId(newHomeTab.id);
    }
  }, [tabs, createTab]);

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

  const activeTab = tabs.find(tab => tab.id === activeTabId) || null;

  // Keyboard shortcuts for tab management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 't':
            e.preventDefault();
            // Open or focus home tab
            handleHomeClick();
            break;
          case 'w':
            e.preventDefault();
            // Close current tab (if not pinned)
            if (activeTabId) {
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
              <button
                onClick={handleHomeClick}
                className="text-base font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                title="Go to Home"
              >
                The Docket
              </button>
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
            
            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Quick Actions
              </div>
              <button
                onClick={handleTasksViewClick}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                All Tasks
              </button>
            </div>
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
          {activeTab ? (
            <TabContent
              tab={activeTab}
              onNotesChange={handleNotesChange}
              onNoteSelect={handleNoteSelect}
              onTaskSelect={handleTaskSelect}
              onTasksViewClick={handleTasksViewClick}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No tabs open
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select a folder or note from the sidebar to get started, or click "The Docket" to open the dashboard.
                </p>
                <button
                  onClick={handleHomeClick}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Open Dashboard
                </button>
              </div>
            </div>
          )}
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