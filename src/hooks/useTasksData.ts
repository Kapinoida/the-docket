import { useState, useCallback, useRef } from 'react';
import { TaskInstance } from '@/types';

interface UseTasksDataReturn {
  tasks: TaskInstance[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  fetchTasksForDateRange: (startDate: Date, endDate: Date) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskInstance>) => Promise<void>;
  refreshTasks: () => void;
}

// Cache to store fetched tasks data
const tasksCache = new Map<string, { data: TaskInstance[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export function useTasksData(): UseTasksDataReturn {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCacheKey = (startDate?: Date, endDate?: Date) => {
    if (startDate && endDate) {
      return `dateRange-${startDate.toISOString()}-${endDate.toISOString()}`;
    }
    return 'all-tasks';
  };

  const isValidCache = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  const fetchTasks = useCallback(async () => {
    const cacheKey = getCacheKey();
    const cached = tasksCache.get(cacheKey);

    if (cached && isValidCache(cached.timestamp)) {
      setTasks(cached.data);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks', {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      setTasks(data);
      
      // Cache the result
      tasksCache.set(cacheKey, { data, timestamp: Date.now() });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch tasks');
        console.error('Error fetching tasks:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTasksForDateRange = useCallback(async (startDate: Date, endDate: Date) => {
    const cacheKey = getCacheKey(startDate, endDate);
    const cached = tasksCache.get(cacheKey);

    if (cached && isValidCache(cached.timestamp)) {
      setTasks(cached.data);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/tasks?${params}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      const data = await response.json();
      setTasks(data);
      
      // Cache the result
      tasksCache.set(cacheKey, { data, timestamp: Date.now() });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch tasks');
        console.error('Error fetching tasks for date range:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<TaskInstance>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const updatedTask = await response.json();
      
      // Update local state optimistically
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, ...updatedTask } : task
        )
      );

      // Invalidate cache to ensure fresh data on next fetch
      tasksCache.clear();
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
      console.error('Error updating task:', err);
      throw err;
    }
  }, []);

  const refreshTasks = useCallback(() => {
    // Clear cache and refetch
    tasksCache.clear();
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    fetchTasksForDateRange,
    updateTask,
    refreshTasks,
  };
}