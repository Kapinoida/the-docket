'use client';

import { useState, useEffect } from 'react';
import { Tab, Note, Folder, TaskInstance } from '@/types';
import NoteEditor from './NoteEditor';
import NoteList from './NoteList';
import TaskList from './TaskList';
import TaskEditor from './TaskEditor';
import WeeklyAgenda from './WeeklyAgenda';
import RecentNotes from './RecentNotes';
import TaskListView from './TaskListView';
import CalendarView from './CalendarView';

interface TabContentProps {
  tab: Tab;
  onNotesChange?: () => void;
  onNoteSelect?: (note: Note) => void;
  onTaskSelect?: (task: TaskInstance) => void;
  onTasksViewClick?: () => void;
  onCalendarViewClick?: () => void;
}

export default function TabContent({ tab, onNotesChange, onNoteSelect, onTaskSelect, onTasksViewClick, onCalendarViewClick }: TabContentProps) {
  const [stats, setStats] = useState({ 
    notes: 0, 
    tasks: 0, 
    overdueTasks: 0, 
    dueTodayTasks: 0 
  });
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
      
      // Fetch all tasks to count them and categorize by due date
      const tasksResponse = await fetch('/api/tasks');
      if (tasksResponse.ok) {
        const tasks = await tasksResponse.json();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        const overdueTasks = tasks.filter(task => 
          !task.completed && task.dueDate && new Date(task.dueDate) < today
        ).length;
        
        const dueTodayTasks = tasks.filter(task => 
          !task.completed && task.dueDate && 
          new Date(task.dueDate) >= today && new Date(task.dueDate) < tomorrow
        ).length;
        
        setStats(prev => ({ 
          ...prev, 
          tasks: tasks.length,
          overdueTasks,
          dueTodayTasks
        }));
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
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your productivity overview
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.notes}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Notes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.tasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Tasks</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.overdueTasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.dueTodayTasks}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Due Today</div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={onTasksViewClick}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              View All Tasks
            </button>
            <button
              onClick={onCalendarViewClick}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar View
            </button>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Weekly Agenda */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              This Week's Tasks
            </h3>
            <WeeklyAgenda 
              onTaskSelect={onTaskSelect} 
              onTaskComplete={(taskId) => {
                // Refresh stats when task is completed
                fetchStats();
                // Trigger note refresh for any open note tabs
                if (onNotesChange) {
                  onNotesChange();
                }
              }}
            />
          </div>
          
          {/* Recent Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Notes
            </h3>
            <RecentNotes onNoteSelect={onNoteSelect} />
          </div>
        </div>
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
            console.log('[TabContent] Note saved, triggering notes change refresh');
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
          onNoteSelect={onNoteSelect}
        />
      </div>
    );
  };

  const renderTasksContent = () => {
    return (
      <div className="h-full">
        <TaskListView
          onTaskSelect={onTaskSelect}
          onTaskComplete={(taskId) => {
            // Refresh stats when task is completed
            fetchStats();
            // Trigger note refresh for any open note tabs
            if (onNotesChange) {
              onNotesChange();
            }
          }}
        />
      </div>
    );
  };

  const renderCalendarContent = () => {
    return (
      <div className="h-full">
        <CalendarView
          onTaskSelect={onTaskSelect}
          onTaskComplete={(taskId) => {
            // Refresh stats when task is completed
            fetchStats();
            // Trigger note refresh for any open note tabs
            if (onNotesChange) {
              onNotesChange();
            }
          }}
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
      case 'tasks':
        return renderTasksContent();
      case 'calendar':
        return renderCalendarContent();
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
          onNoteSelect={onNoteSelect}
        />
      )}
      
      {creatingTask && (
        <TaskEditor
          folderId={tab.content.folderId}
          onSave={handleTaskSave}
          onClose={handleTaskEditorClose}
          onNoteSelect={onNoteSelect}
        />
      )}
    </>
  );
}