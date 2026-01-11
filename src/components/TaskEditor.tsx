'use client';

import { useState, useEffect } from 'react';
import { TaskInstance, Note, RecurrenceRule } from '@/types';
import { format } from 'date-fns';
import { Calendar, X, Repeat } from 'lucide-react';
import { DatePickerPopover } from './v2/DatePickerPopover';

interface TaskEditorProps {
  task?: TaskInstance;
  folderId?: string;
  onSave: (taskUpdates: any) => void;
  onClose: () => void;
  isInTab?: boolean;
  onNoteSelect?: (note: Note) => void;
}

export default function TaskEditor({ task, folderId, onSave, onClose, isInTab = false, onNoteSelect }: TaskEditorProps) {
  const [content, setContent] = useState(task?.content || '');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
  );
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | undefined>(task?.recurrenceRule);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [completed, setCompleted] = useState(task?.completed || false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setContent(task.content);
      setDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
      setRecurrenceRule(task.recurrenceRule);
      setCompleted(task.completed || false);
    }
  }, [task]);

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Please enter task content');
      return;
    }

    setIsSaving(true);
    try {
      // Construct updates object
      const updates: any = {
        content: content.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrenceRule: recurrenceRule || null,
        completed: completed,
      };
      
      // If we have an ID, include it for completeness, though onSave in context handles it by closure state usually.
      if (task) {
          updates.id = task.id;
      }

      // Delegate to parent handler
      await onSave(updates);
      
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

          {/* Due Date & Recurrence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date & Recurrence
            </label>
            <div className="relative">
                <button 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {dueDate ? format(new Date(dueDate), 'MMMM d, yyyy') : 'Set due date...'}
                    </span>
                  </div>
                  {recurrenceRule && (
                     <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {recurrenceRule.type === 'daily' && recurrenceRule.interval > 1 ? 'Every ' + recurrenceRule.interval + ' days' :
                         recurrenceRule.type === 'weekly' && (recurrenceRule.interval > 1 || (recurrenceRule.daysOfWeek && recurrenceRule.daysOfWeek.length > 0)) ? 'Custom Wk' :
                         recurrenceRule.type === 'monthly' && (recurrenceRule.interval > 1 || recurrenceRule.weekOfMonth) ? 'Custom Mo' :
                         recurrenceRule.type}
                     </span>
                  )}
                </button>
                
                {showDatePicker && (
                  <DatePickerPopover 
                    date={dueDate ? new Date(dueDate) : null}
                    recurrenceRule={recurrenceRule}
                    onSelect={(date, rule) => {
                      setDueDate(date ? format(date, 'yyyy-MM-dd') : '');
                      setRecurrenceRule(rule);
                      setShowDatePicker(false);
                    }}
                    onClose={() => setShowDatePicker(false)}
                    position={{ top: 45, left: 0 }}
                  />
                )}
            </div>
          </div>

          {/* Task Completion */}
          {task && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="task-completed"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <label 
                htmlFor="task-completed" 
                className={`text-sm font-medium cursor-pointer ${
                  completed 
                    ? 'text-green-700 dark:text-green-400 line-through' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Mark as completed
              </label>
            </div>
          )}

          {/* Source Note Info */}
          {task?.sourceNote && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Created from note:{' '}
                {onNoteSelect ? (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/notes/${task.sourceNote!.id}`);
                        if (response.ok) {
                          const fullNote = await response.json();
                          onNoteSelect(fullNote);
                        } else {
                          console.error('Failed to fetch note');
                        }
                      } catch (error) {
                        console.error('Error fetching note:', error);
                      }
                    }}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                  >
                    {task.sourceNote.title}
                  </button>
                ) : (
                  <span className="font-medium">{task.sourceNote.title}</span>
                )}
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
            {task && (
              <button
                onClick={() => {
                  setCompleted(!completed);
                  // Auto-save when toggling completion
                  setTimeout(handleSave, 100);
                }}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  completed
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {completed ? 'Mark Incomplete' : 'Mark Complete'}
              </button>
            )}
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