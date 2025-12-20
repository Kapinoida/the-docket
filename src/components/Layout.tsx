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
  const [leftSidebarExpanded, setLeftSidebarExpanded] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(false);
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
    
    // If closing active tab, switch to tab on the left or previous tab
    if (tabId === activeTabId) {
      if (remainingTabs.length > 0) {
        // Find the index of the closed tab in the original tabs array
        const closedTabIndex = tabs.findIndex(t => t.id === tabId);
        
        // Try to select the tab to the left (previous index)
        let targetTabIndex = closedTabIndex - 1;
        
        // If there's no tab to the left, select the tab that will be at the same position
        // (which is effectively the tab that was to the right)
        if (targetTabIndex < 0) {
          targetTabIndex = 0;
        }
        
        // Make sure we don't go beyond the remaining tabs array bounds
        if (targetTabIndex >= remainingTabs.length) {
          targetTabIndex = remainingTabs.length - 1;
        }
        
        setActiveTabId(remainingTabs[targetTabIndex].id);
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
    
    // Only update note tabs if there are any open note tabs
    const noteTabsToUpdate = tabs.filter(tab => tab.type === 'note' && tab.content.noteId);
    
    if (noteTabsToUpdate.length === 0) {
      return; // No note tabs to update
    }
    
    // Batch fetch all note updates in parallel
    try {
      const noteUpdates = await Promise.all(
        noteTabsToUpdate.map(async (tab) => {
          const response = await fetch(`/api/notes/${tab.content.noteId}`);
          if (response.ok) {
            const updatedNote = await response.json();
            return { tabId: tab.id, updatedNote };
          }
          return null;
        })
      );
      
      // Only update tabs if we have successful updates
      const validUpdates = noteUpdates.filter((u): u is NonNullable<typeof u> => u !== null);
      if (validUpdates.length > 0) {
        setTabs(prevTabs => 
          prevTabs.map(tab => {
            const update = validUpdates.find(u => u.tabId === tab.id);
            if (update) {
              return {
                ...tab,
                title: update.updatedNote.title,
                content: { ...tab.content, note: update.updatedNote }
              };
            }
            return tab;
          })
        );
      }
    } catch (error) {
      console.error('[Layout] Error batch updating note tabs:', error);
    }
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

  const handleTaskSelect = useCallback(async (task: TaskInstance) => {
    // Check if task belongs to a note
    if (task.sourceNote) {
      const noteId = task.sourceNote.id;
      
      // Check if note is already open in a tab
      const existingTab = tabs.find(tab => tab.content.noteId === noteId);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        // Update tab to scroll to task
        setTabs(prev => prev.map(t => 
          t.id === existingTab.id 
            ? { ...t, content: { ...t.content, scrollToTaskId: task.id } }
            : t
        ));
        return;
      }

      // Fetch note content
      try {
        const response = await fetch(`/api/notes/${noteId}`);
        if (response.ok) {
          const note = await response.json();
          const newTab = createTab('note', note.title, { 
            noteId: note.id, 
            note, 
            scrollToTaskId: task.id 
          });
          setTabs(prev => [...prev, newTab]);
          setActiveTabId(newTab.id);
        } else {
            console.error('Failed to fetch source note');
        }
      } catch (error) {
        console.error('Error fetching source note:', error);
      }
    } else {
      // Standalone task logic
      const existingTab = tabs.find(tab => tab.content.task?.id === task.id);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }

      // Create new tab for the task
      // Cast TaskInstance to Task by adding missing fields (visual purposes only for tab title)
      const taskForTab = { 
        ...task, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      } as unknown as import('@/types').Task;
      
      const newTab = createTab('task', `Task: ${task.content.slice(0, 30)}${task.content.length > 30 ? '...' : ''}`, { task: taskForTab });
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
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

  const handleCalendarViewClick = useCallback(() => {
    // Check if calendar view is already open in a tab
    const existingTab = tabs.find(tab => tab.type === 'calendar');
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      // Create new calendar tab
      const newCalendarTab = createTab('calendar', 'Calendar', {});
      setTabs(prev => [...prev, newCalendarTab]);
      setActiveTabId(newCalendarTab.id);
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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Left Sidebar - File Navigator */}
      <div 
        className="flex-shrink-0 flex flex-col relative"
        style={{ 
          width: leftSidebarExpanded ? leftSidebar.width : 60,
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-default)'
        }}
      >
        {leftSidebarExpanded ? (
          <div className="px-3 py-3 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleHomeClick}
                className="text-base font-semibold truncate transition-colors cursor-pointer text-left"
                style={{ 
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                title="Go to Home"
              >
                The Docket
              </button>
              <button
                onClick={() => setLeftSidebarExpanded(false)}
                className="p-1 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                title="Collapse sidebar"
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
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                Quick Actions
              </div>
              <button
                onClick={handleTasksViewClick}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                All Tasks
              </button>
              <button
                onClick={handleCalendarViewClick}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </button>
            </div>
          </div>
        ) : (
          /* Collapsed Sidebar - Icon Only */
          <div className="py-3 flex flex-col items-center gap-3 flex-1">
            {/* Expand Button */}
            <button
              onClick={() => setLeftSidebarExpanded(true)}
              className="p-2 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Home Button */}
            <button
              onClick={handleHomeClick}
              className="p-2 rounded transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-blue)';
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Home"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
            
            <div className="w-6 h-px bg-gray-200 dark:bg-gray-700"></div>
            
            {/* Quick Create Actions */}
            <button
              onClick={() => handleCreateNote('1')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="New Note"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <button
              onClick={handleCreateStandaloneTask}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="New Task"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            
            <div className="w-6 h-px bg-gray-200 dark:bg-gray-700"></div>
            
            {/* Quick Views */}
            <button
              onClick={handleTasksViewClick}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="All Tasks"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </button>
            
            <button
              onClick={handleCalendarViewClick}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Calendar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Resize Handle - Only show when expanded */}
        {leftSidebarExpanded && (
          <div
            ref={leftSidebar.resizeHandleRef}
            onMouseDown={leftSidebar.handleMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:opacity-50 transition-all duration-150"
            style={{ transform: 'translateX(50%)' }}
          />
        )}
      </div>


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
              onCalendarViewClick={handleCalendarViewClick}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  No tabs open
                </h3>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Select a folder or note from the sidebar to get started, or click "The Docket" to open the dashboard.
                </p>
                <button
                  onClick={handleHomeClick}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--accent-blue)', 
                    color: 'white' 
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-blue-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-blue)'}
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
        <div className="w-80 flex-shrink-0 relative" style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderLeft: '1px solid var(--border-default)' 
        }}>
          <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Productivity Panel
            </h2>
            <button
              onClick={() => setRightSidebarVisible(false)}
              className="p-1 transition-colors rounded"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Hide right panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <RightSidebar 
            selectedFolder={selectedFolder} 
            onTaskSelect={handleTaskSelect}
          />
        </div>
      )}
    </div>
  );
}