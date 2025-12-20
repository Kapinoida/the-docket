'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskInstance } from '@/types';

interface TaskUpdateEvent {
  taskId: string;
  updates: Partial<Task>;
  source: 'inline' | 'modal' | 'calendar' | 'external';
}

interface UseTaskSyncOptions {
  taskId: string;
  onUpdate?: (task: TaskInstance) => void;
  onError?: (error: Error) => void;
}

interface UseTaskSyncReturn {
  task: TaskInstance | null;
  isLoading: boolean;
  error: Error | null;
  updateTask: (updates: Partial<Task>) => Promise<void>;
  toggleComplete: () => Promise<void>;
  refreshTask: () => Promise<void>;
}

// Global task cache and event system
const taskCache = new Map<string, TaskInstance>();
const taskSubscribers = new Map<string, Set<(task: TaskInstance) => void>>();

// Emit task update to all subscribers
const emitTaskUpdate = (taskId: string, updatedTask: TaskInstance, broadcast: boolean = false) => {
  taskCache.set(taskId, updatedTask);
  const subscribers = taskSubscribers.get(taskId);
  if (subscribers) {
    subscribers.forEach(callback => callback(updatedTask));
  }
  
  if (broadcast) {
    window.dispatchEvent(new CustomEvent('taskUpdated', { 
      detail: { 
        taskId, 
        task: updatedTask,
        source: 'app-internal' 
      } 
    }));
  }
};

// Subscribe to task updates
const subscribeToTask = (taskId: string, callback: (task: TaskInstance) => void) => {
  if (!taskSubscribers.has(taskId)) {
    taskSubscribers.set(taskId, new Set());
  }
  taskSubscribers.get(taskId)!.add(callback);
  
  return () => {
    const subscribers = taskSubscribers.get(taskId);
    if (subscribers) {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        taskSubscribers.delete(taskId);
      }
    }
  };
};

export const useTaskSync = ({ 
  taskId, 
  onUpdate, 
  onError 
}: UseTaskSyncOptions): UseTaskSyncReturn => {
  const [task, setTask] = useState<TaskInstance | null>(() => taskCache.get(taskId) || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  // Fetch task data if not in cache
  const fetchTask = useCallback(async () => {
    // Don't fetch if taskId is null or undefined
    if (!taskId) {
      setError(new Error('No task ID provided'));
      return;
    }

    if (taskCache.has(taskId)) {
      setTask(taskCache.get(taskId)!);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [taskId] })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }

      const tasks: TaskInstance[] = await response.json();
      const fetchedTask = tasks.find(t => t.id === taskId);

      if (fetchedTask) {
        emitTaskUpdate(taskId, fetchedTask);
      } else {
        throw new Error('Task not found');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, onError]);

  // Refresh task from server
  const refreshTask = useCallback(async () => {
    // Remove from cache to force refresh
    taskCache.delete(taskId);
    await fetchTask();
  }, [taskId, fetchTask]);

  // Update task with optimistic UI updates
  const updateTask = useCallback(async (updates: Partial<Task>) => {
    if (!task) return;

    // Optimistic update
    const optimisticTask: TaskInstance = {
      ...task,
      ...updates,
      // Handle completion timestamp
      ...(updates.completed !== undefined && {
        completedAt: updates.completed ? new Date() : undefined,
      }),
    };

    // Update local state immediately to prevent revert
    setTask(optimisticTask);
    
    emitTaskUpdate(taskId, optimisticTask, true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const updatedTask: Task = await response.json();
      
      // Convert Task to TaskInstance format
      const taskInstance: TaskInstance = {
        id: updatedTask.id,
        content: updatedTask.content,
        dueDate: updatedTask.dueDate,
        completed: updatedTask.completed,
        completedAt: updatedTask.completedAt,
        recurrenceRule: updatedTask.recurrenceRule,
        sourceNote: task.sourceNote, // Preserve source note info
        createdAt: updatedTask.createdAt,
        updatedAt: updatedTask.updatedAt,
      };

      emitTaskUpdate(taskId, taskInstance, true);
    } catch (err) {
      // Rollback optimistic update
      emitTaskUpdate(taskId, task, true);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    }
  }, [task, taskId, onError]);

  // Toggle completion status
  const toggleComplete = useCallback(async () => {
    if (!task) return;
    await updateTask({ completed: !task.completed });
  }, [task, updateTask]);

  // Subscribe to task updates
  useEffect(() => {
    const unsubscribe = subscribeToTask(taskId, (updatedTask) => {
      if (isMountedRef.current) {
        setTask(updatedTask);
        onUpdate?.(updatedTask);
      }
    });

    return unsubscribe;
  }, [taskId, onUpdate]);

  // Listen for global task update events
  useEffect(() => {
    const handleTaskUpdated = (event: CustomEvent) => {
      if (event.detail.taskId === taskId && isMountedRef.current) {
        const { task: newTask, source } = event.detail;

        // For updates from the modal or other external sources, fetch fresh data to ensure consistency
        if (source === 'modal' || source === 'calendar' || source === 'external') {
          refreshTask();
          return;
        }

        // For internal/optimistic updates, use payload directly
        if (!newTask) {
          return;
        }

        // Update cache so remounts get fresh data
        taskCache.set(taskId, newTask);

        setTask(newTask);
        onUpdate?.(newTask);
      }
    };

    const handleTaskDeleted = (event: CustomEvent) => {
      if (event.detail.taskId === taskId && isMountedRef.current) {
        // Clear the task from cache and state
        taskCache.delete(taskId);
        setTask(null);
        setError(new Error('Task was deleted'));
      }
    };

    window.addEventListener('taskUpdated', handleTaskUpdated as EventListener);
    window.addEventListener('taskDeleted', handleTaskDeleted as EventListener);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdated as EventListener);
      window.removeEventListener('taskDeleted', handleTaskDeleted as EventListener);
    };
  }, [taskId, refreshTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!task && !isLoading) {
      fetchTask();
    }
  }, [task, isLoading, fetchTask]);

  return {
    task,
    isLoading,
    error,
    updateTask,
    toggleComplete,
    refreshTask,
  };
};

// Utility function to preload tasks into cache
export const preloadTasks = async (taskIds: string[]): Promise<void> => {
  const uncachedIds = taskIds.filter(id => !taskCache.has(id));
  
  if (uncachedIds.length === 0) return;

  try {
    const response = await fetch(`/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: uncachedIds })
    });

    if (response.ok) {
      const tasks: TaskInstance[] = await response.json();
      tasks.forEach(task => {
        taskCache.set(task.id, task);
      });
    }
  } catch (error) {
    console.error('Failed to preload tasks:', error);
  }
};

// Clear task cache (useful for testing or forced refresh)
export const clearTaskCache = (): void => {
  taskCache.clear();
  taskSubscribers.clear();
};