'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, isToday, isTomorrow, isYesterday, isPast } from 'date-fns';
import { Edit2, Calendar, Check } from 'lucide-react';

interface TaskWidgetProps {
  taskId: string;
  content: string;
  completed: boolean;
  dueDate?: Date | null;
  onToggle?: (completed: boolean) => void;
  onEdit?: () => void;
  onDateChange?: (date: Date | null) => void;
  className?: string;
}

export default function TaskWidget({
  taskId,
  content,
  completed,
  dueDate,
  onToggle,
  onEdit,
  onDateChange,
  className = '',
}: TaskWidgetProps) {
  const [isHovered, setIsHovered] = useState(false);

  /* Local state for immediate UI feedback (optimistic) */
  const [localCompleted, setLocalCompleted] = useState(completed);

  /* Sync local state with prop */
  if (completed !== localCompleted) {
    setLocalCompleted(completed);
  }

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !localCompleted;
    setLocalCompleted(newStatus);
    onToggle?.(newStatus);
  }, [localCompleted, onToggle]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  }, [onEdit]);

  // Format due date for display
  const formatDueDate = useCallback((date: Date) => {
    // Normalize input date to midnight for comparison
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize 'now' to midnight
    
    // date-fns isToday/isTomorrow/isYesterday checks against system local time
    // which effectively does the same as comparing against 'now'
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    
    // Calculate difference in FULL days
    const diffInTime = targetDate.getTime() - now.getTime();
    const diffInDays = Math.round(diffInTime / (1000 * 60 * 60 * 24));
    
    if (diffInDays > 0 && diffInDays <= 7) {
      return `In ${diffInDays} days`;
    }
    if (diffInDays < 0 && diffInDays >= -7) {
      return `${Math.abs(diffInDays)} days ago`;
    }
    
    return format(date, 'MMM d');
  }, []);

  // Determine due date badge styling
  const getDueDateStyle = useCallback((date: Date) => {
    if (isPast(date) && !isToday(date)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200';
    }
    if (isToday(date)) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200';
    }
    if (isTomorrow(date)) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-2 py-1 px-1 rounded group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-task-id={taskId}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`
          w-4 h-4 rounded border-2 flex items-center justify-center 
          transition-colors duration-150 hover:shadow-sm
          ${localCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-gray-500 hover:border-green-400'
          }
        `}
        title={localCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        {localCompleted && (
          <Check className="w-3 h-3" />
        )}
      </button>

      {/* Task Content */}
      <span
        className={`
          text-sm select-none cursor-pointer
          ${localCompleted 
            ? 'line-through text-gray-500 dark:text-gray-400' 
            : 'text-gray-900 dark:text-gray-100'
          }
        `}
        onClick={handleEdit}
      >
        {content}
      </span>

      {/* Due Date Badge */}
      {dueDate && (
        <span
          className={`
            text-xs px-2 py-0.5 rounded-full border font-medium
            ${getDueDateStyle(dueDate)}
          `}
          title={`Due: ${format(dueDate, 'PPP')}`}
        >
          {formatDueDate(dueDate)}
        </span>
      )}

      {/* Edit Button (appears on hover) */}
      {isHovered && onEdit && (
        <button
          onClick={handleEdit}
          className="
            w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-gray-600 
            flex items-center justify-center text-gray-500 hover:text-gray-700
            transition-colors duration-150
          "
          title="Edit task"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      )}

      {/* Date Edit Button (appears on hover if date exists) */}
      {isHovered && dueDate && onDateChange && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open date picker
          }}
          className="
            w-6 h-6 rounded hover:bg-gray-200 dark:hover:bg-gray-600 
            flex items-center justify-center text-gray-500 hover:text-gray-700
            transition-colors duration-150
          "
          title="Change due date"
        >
          <Calendar className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}