'use client';

import { useState, useEffect, useRef } from 'react';
import { Task, RecurrenceRule } from '@/types';
import { format } from 'date-fns';
import { Calendar, X, Repeat } from 'lucide-react';
import { DatePickerPopover } from './v2/DatePickerPopover';
import { parseLocalDateNode } from '@/lib/dateUtils';

interface TaskEditorProps {
  task?: Task;
  folderId?: string;
  onSave: (taskUpdates: any) => void;
  onClose: () => void;
  isInTab?: boolean;
  onNoteSelect?: (note: any) => void;
}

export default function TaskEditor({ task, folderId, onSave, onClose, isInTab = false, onNoteSelect }: TaskEditorProps) {
  const [content, setContent] = useState(task?.content || '');
  const [dueDate, setDueDate] = useState(
    task?.due_date ? format(parseLocalDateNode(task.due_date) as Date, 'yyyy-MM-dd') : ''
  );
  const [dueTime, setDueTime] = useState(() => {
    if (!task?.due_date) return '';
    const rawDate = new Date(task.due_date);
    if (rawDate.getUTCHours() === 0 && rawDate.getUTCMinutes() === 0 && rawDate.getUTCSeconds() === 0) {
      return '';
    }
    return format(parseLocalDateNode(task.due_date) as Date, 'HH:mm');
  });
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | undefined>(task?.recurrence_rule);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<Task['status']>(task?.status || 'todo');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setContent(task.content);
      setDueDate(task.due_date ? format(parseLocalDateNode(task.due_date) as Date, 'yyyy-MM-dd') : '');
      if (task.due_date) {
        const rawDate = new Date(task.due_date);
        if (rawDate.getUTCHours() === 0 && rawDate.getUTCMinutes() === 0 && rawDate.getUTCSeconds() === 0) {
          setDueTime('');
        } else {
          setDueTime(format(parseLocalDateNode(task.due_date) as Date, 'HH:mm'));
        }
      } else {
        setDueTime('');
      }
      setRecurrenceRule(task.recurrence_rule);
      setStatus(task.status || 'todo');
    }
  }, [task]);

  const isDone = status === 'done';

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Please enter task content');
      return;
    }

    setIsSaving(true);
    try {
      const updates: any = {
        content: content.trim(),
        due_date: dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}:00`) : null,
        recurrence_rule: recurrenceRule || null,
        status,
      };

      if (task) {
        updates.id = task.id;
      }

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
    : "fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-50 p-4 overflow-y-auto";

  const editorClasses = isInTab
    ? "h-full flex flex-col"
    : "bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col";

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
              Due Date & Time
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  ref={dateButtonRef}
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {dueDate ? (() => { const [y, m, d] = dueDate.split('-').map(Number); return format(new Date(y, m - 1, d), 'MMMM d, yyyy'); })() : 'Set due date...'}
                    </span>
                  </div>
{recurrenceRule && (
                     <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {recurrenceRule.type === 'daily' && recurrenceRule.interval > 1 ? 'Every ' + recurrenceRule.interval + ' days' :
                         recurrenceRule.type === 'weekly' && (recurrenceRule.interval > 1 || (recurrenceRule.daysOfWeek && recurrenceRule.daysOfWeek.length > 0)) ? 'Custom Wk' :
                         recurrenceRule.type === 'monthly' && (recurrenceRule.interval > 1 || recurrenceRule.weekOfMonth) ? 'Custom Mo' :
                         recurrenceRule.type}
                        {recurrenceRule.count ? ` ×${recurrenceRule.count}` : ''}
                        {recurrenceRule.until ? ` until ${recurrenceRule.until.slice(0, 8)}` : ''}
                     </span>
                 )}
                </button>

                {showDatePicker && (
                  <DatePickerPopover
                    date={dueDate ? (() => { const [y, m, d] = dueDate.split('-').map(Number); return new Date(y, m - 1, d); })() : null}
                    recurrenceRule={recurrenceRule}
                    onSelect={(date, rule) => {
                      setDueDate(date ? format(date, 'yyyy-MM-dd') : '');
                      if (date && !dueTime) {
                        setDueTime('12:00');
                      }
                      setRecurrenceRule(rule);
                      setShowDatePicker(false);
                    }}
                    onClose={() => setShowDatePicker(false)}
                    triggerRef={dateButtonRef}
                  />
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  disabled={!dueDate}
                  className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Task Status */}
          {task && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="task-completed"
                checked={isDone}
                onChange={(e) => setStatus(e.target.checked ? 'done' : 'todo')}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
              />
              <label
                htmlFor="task-completed"
                className={`text-sm font-medium cursor-pointer ${
                  isDone
                    ? 'text-green-700 dark:text-green-400 line-through'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Mark as completed
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Press Enter to save &bull; Escape to cancel
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
                  setStatus(isDone ? 'todo' : 'done');
                  setTimeout(handleSave, 100);
                }}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  isDone
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isDone ? 'Mark Incomplete' : 'Mark Complete'}
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