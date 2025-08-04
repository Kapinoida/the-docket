'use client';

import { useState, useEffect } from 'react';
import { Tab, Note, Folder, TaskInstance } from '@/types';
import NoteEditor from './NoteEditor';
import NoteList from './NoteList';
import TaskList from './TaskList';
import TaskEditor from './TaskEditor';

interface TabContentProps {
  tab: Tab;
  onNotesChange?: () => void;
  onNoteSelect?: (note: Note) => void;
  onTaskSelect?: (task: TaskInstance) => void;
}

export default function TabContent({ tab, onNotesChange, onNoteSelect, onTaskSelect }: TabContentProps) {
  const [stats, setStats] = useState({ notes: 0, tasks: 0 });
  const [mounted, setMounted] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskInstance | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && tab.type === 'home') {
      // Delay stats fetching to prevent any potential SSR issues
      setTimeout(fetchStats, 100);
    }
  }, [mounted, tab.type]);

  const fetchStats = async () => {
    try {
      // Fetch all notes to count them
      const notesResponse = await fetch('/api/notes');
      if (notesResponse.ok) {
        const notes = await notesResponse.json();
        setStats(prev => ({ ...prev, notes: notes.length }));
      }
      
      // Fetch all tasks to count them
      const tasksResponse = await fetch('/api/tasks');
      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        setStats(prev => ({ ...prev, tasks: tasks.length }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTaskEdit = (task: TaskInstance) => {
    setEditingTask(task);
  };

  const handleTaskCreate = (folderId?: string) => {
    setCreatingTask(true);
  };

  const handleTaskSave = (task: TaskInstance) => {
    setEditingTask(null);
    setCreatingTask(false);
    // Refresh stats if we're on home tab
    if (tab.type === 'home') {
      fetchStats();
    }
    onTaskSelect?.(task);
  };

  const handleTaskEditorClose = () => {
    setEditingTask(null);
    setCreatingTask(false);
  };

  const renderHomeContent = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
          <svg
            className="w-8 h-8 text-blue-500"
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
          Welcome to The Docket
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your personal productivity hub. Create notes, manage tasks, and stay organized.
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.notes}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Notes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.tasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasks</div>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a folder from the sidebar to get started
        </p>
      </div>
    </div>
  );

  const renderNoteContent = () => {
    if (!tab.content.note) return <div>Note not found</div>;
    
    return (
      <div className="h-full">
        <NoteEditor
          note={tab.content.note}
          onSave={(updatedNote) => {
            onNotesChange?.();
          }}
          onClose={() => {
            // Tab-based editor doesn't close on its own, parent handles tab management
          }}
          isInTab={true}
        />
      </div>
    );
  };

  const renderFolderContent = () => {
    if (!tab.content.folder) return <div>Folder not found</div>;
    
    return (
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {tab.content.folder.name}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Notes and tasks in this folder
          </p>
        </div>

        {/* Notes Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <NoteList 
              folderId={tab.content.folder.id}
              onNoteSelect={onNoteSelect || (() => {})}
              refreshTrigger={0}
              onNotesChange={onNotesChange}
            />
          </div>

          {/* Tasks Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <TaskList 
              folderId={tab.content.folder.id}
              onTaskEdit={handleTaskEdit}
              onTaskCreate={handleTaskCreate}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaContent = () => (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Agenda
      </h2>
      <div className="text-gray-600 dark:text-gray-400 text-center py-12">
        Agenda view coming soon! This will show your tasks organized by date.
      </div>
    </div>
  );

  const renderTaskContent = () => {
    if (!tab.content.task) return <div>Task not found</div>;
    
    return (
      <div className="h-full">
        <TaskEditor
          task={tab.content.task}
          onSave={(updatedTask) => {
            // Refresh stats if we're on home tab
            if (tab.type === 'home') {
              fetchStats();
            }
          }}
          onClose={() => {
            // Tab-based editor doesn't close on its own, parent handles tab management
          }}
          isInTab={true}
        />
      </div>
    );
  };

  const content = (() => {
    switch (tab.type) {
      case 'home':
        return renderHomeContent();
      case 'note':
        return renderNoteContent();
      case 'folder':
        return renderFolderContent();
      case 'agenda':
        return renderAgendaContent();
      case 'task':
        return renderTaskContent();
      default:
        return <div>Unknown tab type</div>;
    }
  })();

  return (
    <>
      {content}
      
      {/* Task Editor Modals */}
      {editingTask && (
        <TaskEditor
          task={editingTask}
          onSave={handleTaskSave}
          onClose={handleTaskEditorClose}
        />
      )}
      
      {creatingTask && (
        <TaskEditor
          folderId={tab.content.folderId}
          onSave={handleTaskSave}
          onClose={handleTaskEditorClose}
        />
      )}
    </>
  );
}