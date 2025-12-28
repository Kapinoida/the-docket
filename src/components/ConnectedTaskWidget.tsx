'use client';

import { useCallback, useEffect } from 'react';
import TaskWidget from './TaskWidget';
import { useTaskSync } from '@/hooks/useTaskSync';

interface ConnectedTaskWidgetProps {
  taskId: string;
  initialContent?: string | null;
  initialCompleted?: boolean | null;
  autoFocus?: boolean;
  onEdit?: (taskId: string) => void;
  onEnter?: () => void;
  onDelete?: () => void;
  onNotFound?: () => void;
  className?: string;
}

export default function ConnectedTaskWidget({
  taskId,
  initialContent,
  initialCompleted,
  autoFocus,
  onEdit, // This is for modal opening requests from parent
  onEnter,
  onDelete,
  onNotFound,
  className,
}: ConnectedTaskWidgetProps) {
  // Handle null/undefined taskId
  if (!taskId) {
    return (
      <div className={`inline-flex items-center gap-2 py-1 px-1 text-red-600 ${className || ''}`}>
        <div className="w-4 h-4 rounded border-2 border-red-300" />
        <span className="text-sm">Invalid task</span>
      </div>
    );
  }

  const { task, isLoading, error, updateTask, toggleComplete } = useTaskSync({
    taskId,
    onError: (error) => {
      // Don't log expected errors
      if (error.message !== 'Task was deleted' && error.message !== 'Task not found') {
        console.error(`Task sync error for ${taskId}:`, error);
      }
    },
  });

  const handleOpenModal = useCallback(() => {
    onEdit?.(taskId);
  }, [taskId, onEdit]);

  const handleContentUpdate = useCallback(async (newContent?: string) => {
    if (newContent !== undefined) {
         try {
             await updateTask({ content: newContent });
         } catch (error) {
             console.error('Failed to update task content:', error);
         }
    }
  }, [updateTask]);

  const handleToggle = useCallback(async (completed: boolean) => {
    try {
      await updateTask({ completed });
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }, [updateTask]);

  const handleDateChange = useCallback(async (dueDate: Date | null) => {
    try {
      await updateTask({ dueDate });
    } catch (error) {
      console.error('Failed to update task date:', error);
    }
  }, [updateTask]);

  // Error state (including deleted tasks)
  const isDeleted = error?.message === 'Task was deleted' || error?.message === 'Task not found';

  useEffect(() => {
    if (isDeleted && onNotFound) {
      console.log(`[ConnectedTaskWidget] Task ${taskId} is deleted/not found. Triggering removal.`);
      // Small delay to avoid render cycle issues
      const timer = setTimeout(() => {
        onNotFound();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isDeleted, onNotFound, taskId]);

  if (error) {
    console.log(`[ConnectedTaskWidget] Rendering error state for ${taskId}:`, error.message);
    return (
      <div className={`inline-flex items-center gap-2 py-1 px-1 ${
        isDeleted ? 'text-gray-400 line-through' : 'text-red-600'
      } ${className || ''}`}>
        <div className={`w-4 h-4 rounded border-2 ${
          isDeleted ? 'border-gray-300' : 'border-red-300'
        }`} />
        <span className="text-sm">
          {isDeleted ? 'Task deleted' : 'Error loading task'}
        </span>
      </div>
    );
  }

  // Loading state with Optimistic UI fallback
  if (isLoading || !task) {
    if (initialContent) {
        // Optimistic render
        return (
            <TaskWidget
              taskId={taskId}
              content={initialContent}
              completed={initialCompleted || false}
              dueDate={null} // Can't guess this easily, but null is safe
              onToggle={() => {}} // No-op during loading
              onEdit={handleContentUpdate} // Allow typing even while loading? Maybe safer to wait but fine for now
              onOpenModal={handleOpenModal}
              onEnter={onEnter}
              onDateChange={() => {}}  
              autoFocus={autoFocus}
              className={`${className || ''} opacity-70`} // Slight visual visual cue
            />
        );
    }

    return (
      <div className={`inline-flex items-center gap-2 py-1 px-1 ${className || ''}`}>
        <div className="w-4 h-4 rounded border-2 border-gray-300 animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <TaskWidget
      taskId={taskId}
      content={task.content}
      completed={task.completed}
      dueDate={task.dueDate}
      onToggle={handleToggle}
      onEdit={handleContentUpdate}
      onOpenModal={handleOpenModal}
      onEnter={onEnter}
      onDelete={onDelete}
      onDateChange={handleDateChange}
      autoFocus={autoFocus}
      className={className}
    />
  );
}