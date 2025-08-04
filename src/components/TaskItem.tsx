'use client';

import { useState, useEffect } from 'react';
import { TaskInstance } from '@/types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { CheckCircle2, Circle, Calendar, FileText, Edit2, Trash2 } from 'lucide-react';

interface TaskItemProps {
  task: TaskInstance;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onEdit: (task: TaskInstance) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskItem({ task, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;
    if (!mounted) return format(new Date(dueDate), 'MMM d, yyyy'); // Safe fallback for SSR
    
    if (isToday(dueDate)) return 'Today';
    if (isTomorrow(dueDate)) return 'Tomorrow';
    if (isPast(dueDate)) return `Overdue - ${format(dueDate, 'MMM d')}`;
    return format(dueDate, 'MMM d, yyyy');
  };

  const getDueDateColor = (dueDate: Date | null) => {
    if (!dueDate) return 'text-gray-400';
    if (!mounted) return 'text-gray-500'; // Safe fallback for SSR
    if (isPast(dueDate) && !isToday(dueDate)) return 'text-red-500';
    if (isToday(dueDate)) return 'text-orange-500';
    if (isTomorrow(dueDate)) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const dueDateText = formatDueDate(task.dueDate);
  const dueDateColor = getDueDateColor(task.dueDate);

  return (
    <div
      className={`
        group flex items-start gap-3 p-3 rounded-lg border transition-colors
        ${task.completed 
          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Completion Toggle */}
      <button
        onClick={() => onToggleComplete(task.id, !task.completed)}
        className="mt-0.5 transition-colors"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-400 hover:text-green-500" />
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div
          className={`
            text-sm font-medium transition-colors
            ${task.completed 
              ? 'text-gray-500 dark:text-gray-400 line-through' 
              : 'text-gray-900 dark:text-white'
            }
          `}
        >
          {task.content}
        </div>

        {/* Meta Information */}
        <div className="flex items-center gap-4 mt-1">
          {/* Due Date */}
          {dueDateText && (
            <div className={`flex items-center gap-1 text-xs ${dueDateColor}`}>
              <Calendar className="w-3 h-3" />
              {dueDateText}
            </div>
          )}

          {/* Source Note */}
          {task.sourceNote && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <FileText className="w-3 h-3" />
              {task.sourceNote.title}
            </div>
          )}

          {/* Completion Date */}
          {task.completed && task.completedAt && mounted && (
            <div className="text-xs text-gray-400">
              Completed {format(new Date(task.completedAt), 'MMM d, h:mm a')}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {(isHovered || task.completed) && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Edit task"
          >
            <Edit2 className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}