'use client';

import { useCallback, useEffect } from 'react';
import TaskWidget from './TaskWidget';
import { useTaskSync } from '@/hooks/useTaskSync';

interface ConnectedTaskWidgetProps {
  taskId: string;
  onEdit?: (taskId: string) => void;
  className?: string;
}

export default function ConnectedTaskWidget({
  taskId,
  onEdit,
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
      console.error(`Task sync error for ${taskId}:`, error);
    },
  });

  const handleEdit = useCallback(() => {
    onEdit?.(taskId);
  }, [taskId, onEdit]);

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

  // Loading state
  if (isLoading || !task) {
    return (
      <div className={`inline-flex items-center gap-2 py-1 px-1 ${className || ''}`}>
        <div className="w-4 h-4 rounded border-2 border-gray-300 animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Error state (including deleted tasks)
  if (error) {
    const isDeleted = error.message === 'Task was deleted';
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

  return (
    <TaskWidget
      key={`${taskId}-${task.updatedAt}`}
      taskId={taskId}
      content={task.content}
      completed={task.completed}
      dueDate={task.dueDate}
      onToggle={handleToggle}
      onEdit={handleEdit}
      onDateChange={handleDateChange}
      className={className}
    />
  );
}