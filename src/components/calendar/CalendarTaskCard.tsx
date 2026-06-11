'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { Task } from '@/types/v2';

interface CalendarTaskCardProps {
  task: Task;
  onToggle?: (taskId: number, e: React.MouseEvent) => void;
  onClick?: (task: Task) => void;
  variant?: 'default' | 'compact' | 'overdue';
  draggable?: boolean;
}

export function CalendarTaskCard({ task, onToggle, onClick, variant = 'default', draggable = false }: CalendarTaskCardProps) {
  const isDone = task.status === 'done';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `task-${task.id}`);
    e.dataTransfer.setData('application/task-id', String(task.id));
  };

  const dragProps = draggable && !isDone ? {
    draggable: true as const,
    onDragStart: handleDragStart,
  } : {};

  if (variant === 'compact') {
    return (
      <div
        onClick={() => onClick?.(task)}
        {...dragProps}
        className={`p-0.5 px-1.5 rounded text-[10px] truncate ${
          draggable && !isDone ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${
          isDone ? 'bg-green-50 dark:bg-green-900/20 text-green-600 line-through' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        {task.content}
      </div>
    );
  }

  if (variant === 'overdue') {
    return (
      <div
        onClick={() => onClick?.(task)}
        {...dragProps}
        className={`group relative p-2.5 rounded-md border text-sm transition-all hover:shadow-sm bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 ${
          draggable && !isDone ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle?.(task.id, e); }}
            className="p-1 -m-1 min-w-[32px] min-h-[32px] flex items-center justify-center text-red-300 hover:text-green-500 transition-colors"
          >
            <Circle size={16} strokeWidth={2} />
          </button>
          <span className="line-clamp-2 text-red-700 dark:text-red-300">
            {task.content || 'Untitled Task'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick?.(task)}
      {...dragProps}
      className={`p-2.5 rounded-md border text-sm transition-all hover:shadow-sm ${
        draggable && !isDone ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        isDone ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 line-through' :
        'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle?.(task.id, e); }}
          className="min-w-[32px] min-h-[32px] flex items-center justify-center text-gray-300 hover:text-green-500 transition-colors"
        >
          {isDone ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} />}
        </button>
        <span className="line-clamp-2 text-gray-700 dark:text-gray-200">{task.content || 'Untitled Task'}</span>
      </div>
    </div>
  );
}