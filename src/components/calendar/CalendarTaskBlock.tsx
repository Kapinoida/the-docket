'use client';

import { useState, useCallback } from 'react';
import { Task } from '@/types/v2';
import { format } from 'date-fns';
import { CheckCircle2, Circle, GripVertical } from 'lucide-react';
import { parseLocalDateNode } from '@/lib/dateUtils';

interface CalendarTaskBlockProps {
  task: Task;
  day: Date;
  hourHeight: number;
  top: number;
  onToggle?: (taskId: number, e: React.MouseEvent) => void;
  onDragStart?: (task: Task, e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  todo: { bg: 'rgba(124, 58, 237, 0.3)', border: 'rgba(124, 58, 237, 0.6)', text: '#fff' },
  in_progress: { bg: 'rgba(245, 158, 11, 0.3)', border: 'rgba(245, 158, 11, 0.6)', text: '#fff' },
  done: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.4)', text: 'rgba(255,255,255,0.6)' },
};

export function CalendarTaskBlock({
  task,
  day,
  hourHeight,
  top,
  onToggle,
  onDragStart,
  onDragEnd,
}: CalendarTaskBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isDone = task.status === 'done';
  const colors = statusColors[task.status] || statusColors.todo;

  const startTime = task.due_date
    ? format(parseLocalDateNode(task.due_date) as Date, 'h:mm a')
    : null;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('[data-task-checkbox]')) return;
  }, []);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(task.id, e);
  }, [onToggle, task.id]);

  return (
    <div
      draggable={!isDone}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `task-${task.id}`);
        e.dataTransfer.setData('application/task-id', String(task.id));
        onDragStart?.(task, e);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute left-12 right-1 z-20 rounded-md px-2 py-1 border overflow-hidden transition-opacity group ${
        isDone ? 'line-through opacity-50' : 'cursor-grab active:cursor-grabbing hover:shadow-md'
      }`}
      style={{
        top,
        minHeight: hourHeight,
        height: hourHeight,
        backgroundColor: colors.bg,
        borderColor: isHovered && !isDone ? 'rgba(124, 58, 237, 0.8)' : colors.border,
        color: colors.text,
      }}
    >
      <div className="flex items-start gap-1 h-full">
        <button
          data-task-checkbox
          onClick={handleCheckboxClick}
          className={`flex-shrink-0 min-w-[20px] min-h-[20px] flex items-center justify-center rounded transition-opacity ${
            isDone ? 'opacity-80' : isHovered ? 'opacity-100' : 'opacity-60 hover:opacity-100'
          }`}
        >
          {isDone ? (
            <CheckCircle2 size={14} className="text-green-400" />
          ) : (
            <Circle size={14} className="opacity-70" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate leading-tight ${isDone ? 'line-through' : ''}`}>
            {task.content || 'Untitled Task'}
          </div>
          {startTime && (
            <div className="text-[10px] opacity-75 leading-tight mt-0.5">
              {startTime}
            </div>
          )}
        </div>
        {isHovered && !isDone && (
          <GripVertical size={12} className="flex-shrink-0 opacity-50 mt-0.5" />
        )}
      </div>
    </div>
  );
}