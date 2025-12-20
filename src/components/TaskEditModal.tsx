'use client';

import { useState, useEffect, useRef } from 'react';
import { Task } from '@/types';
import { format } from 'date-fns';
import { Calendar, X, Save, Trash2 } from 'lucide-react';
import { extractDateFromContent } from '@/lib/taskParser';

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}

export default function TaskEditModal({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: TaskEditModalProps) {
  const [content, setContent] = useState(task.content);
  // Helper to format date safely (avoiding timezone shifts)
  const formatDateSafe = (dateStr: Date | string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Use getUTCDate to ensure we don't shift to previous day in Western timezones
    return date.toISOString().split('T')[0];
  };

  const [dueDate, setDueDate] = useState(formatDateSafe(task.dueDate));
  const [dueDateEnabled, setDueDateEnabled] = useState(!!task.dueDate);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when task changes
  useEffect(() => {
    setContent(task.content);
    setDueDate(formatDateSafe(task.dueDate));
    setDueDateEnabled(!!task.dueDate);
  }, [task]);

  // Focus content input when modal opens
  useEffect(() => {
    if (isOpen && contentInputRef.current) {
      setTimeout(() => {
        contentInputRef.current?.focus();
        contentInputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);



  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    try {
      // Parse content for any date strings (e.g. @today) that user might have typed
      const extraction = extractDateFromContent(content.trim());
      
      let finalContent = extraction.content;
      let finalDueDate = null;
      let finalDueDateEnabled = dueDateEnabled;

      if (extraction.date) {
        // If a new date was typed in the content, use it!
        finalDueDate = extraction.date;
        finalDueDateEnabled = true;

        // Also update the UI state immediately in case save fails or we stay open (though we close)
        setDueDate(format(finalDueDate, 'yyyy-MM-dd'));
        setDueDateEnabled(true);
      } else {
        // Fallback to the picker value if no inline date found
        if (dueDateEnabled && dueDate) {
           // We have a picker date. But we should check if we should keep it.
           // Yes, if user didn't type a NEW date, keep old picker date.
           finalDueDate = new Date(dueDate);
        } else {
           // Disabled or empty
           finalDueDate = null;
        }
      }

      const updates: Partial<Task> = {
        content: finalContent,
        dueDate: finalDueDate,
      };

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Task
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Task Content */}
          <div>
            <label
              htmlFor="task-content"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Task Description
            </label>
            <textarea
              ref={contentInputRef}
              id="task-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         resize-none"
              rows={3}
              placeholder="Enter task description..."
            />
          </div>

          {/* Due Date */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="due-date-enabled"
                checked={dueDateEnabled}
                onChange={(e) => setDueDateEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="due-date-enabled"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Set due date
              </label>
            </div>
            
            {dueDateEnabled && (
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            )}
          </div>

          {/* Task Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Status:
            </span>
            <span className={`text-sm font-medium ${
              task.completed 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {task.completed ? 'Completed' : 'Pending'}
            </span>
            {task.completed && task.completedAt && (
              <span className="text-xs text-gray-400">
                on {format(new Date(task.completedAt), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 
                           rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 
                         rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving || isDeleting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 text-center">
            Press Cmd/Ctrl + Enter to save • Escape to cancel
          </p>
        </div>
      </div>
    </div>
  );
}