'use client';

import { useState, useEffect } from 'react';
import { TaskInstance } from '@/types';
import { format } from 'date-fns';
import { Calendar, X } from 'lucide-react';

interface TaskEditorProps {
  task?: TaskInstance;
  folderId?: string;
  onSave: (task: TaskInstance) => void;
  onClose: () => void;
  isInTab?: boolean;
}

export default function TaskEditor({ task, folderId, onSave, onClose, isInTab = false }: TaskEditorProps) {
  const [content, setContent] = useState(task?.content || '');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setContent(task.content);
      setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
    }
  }, [task]);

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Please enter task content');
      return;
    }

    setIsSaving(true);
    try {
      if (task) {
        // Update existing task
        const response = await fetch(`/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            dueDate: dueDate || null,
          }),
        });

        if (response.ok) {
          const updatedTask = await response.json();
          onSave(updatedTask);
        } else {
          throw new Error('Failed to update task');
        }
      } else {
        // Create new task
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            dueDate: dueDate || null,
          }),
        });

        if (response.ok) {
          const newTask = await response.json();
          onSave(newTask);
        } else {
          throw new Error('Failed to create task');
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'w') {
        e.preventDefault();
        onClose();
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const containerClasses = isInTab 
    ? "h-full flex flex-col bg-white dark:bg-gray-800"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    
  const editorClasses = isInTab 
    ? "h-full flex flex-col"
    : "bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className={editorClasses}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {task ? 'Edit Task' : 'New Task'}
          </h3>
          {!isInTab && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-4">
          {/* Task Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Description
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date (Optional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Source Note Info */}
          {task?.sourceNote && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Created from note: <span className="font-medium">{task.sourceNote.title}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Press Enter to save • Escape to cancel
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving...' : (task ? 'Update' : 'Create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}