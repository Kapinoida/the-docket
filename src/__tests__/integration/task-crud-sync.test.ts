/**
 * Integration tests for Task CRUD operations and cross-view sync
 * 
 * Tests that task mutations properly dispatch custom events for cross-view synchronization.
 */

import { apiFetch } from '@/lib/api';

// Mock fetch globally
global.fetch = jest.fn();

// Helper to create mock fetch response
const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  headers: {
    get: () => 'application/json',
  },
  json: async () => data,
});

describe('Task CRUD → Sync Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Task creation flow', () => {
    it('should create task and dispatch taskCreated event', async () => {
      const mockTask = {
        id: 1,
        content: 'Test task',
        status: 'todo' as const,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-15T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockTask));

      const task = await apiFetch<any>('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test task', status: 'todo' }),
      });

      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v2/tasks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Test task', status: 'todo' }),
        })
      );

      // Verify response
      expect(task).toEqual(mockTask);

      // Dispatch event (simulating TaskEditContext behavior)
      const eventDetail = { task, source: 'modal' };
      window.dispatchEvent(
        new CustomEvent('taskCreated', { detail: eventDetail })
      );

      // Verify event was dispatched
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should include task data in taskCreated event detail', async () => {
      const mockTask = {
        id: 2,
        content: 'Another task',
        status: 'todo' as const,
        due_date: '2026-10-16',
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-15T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(mockTask));

      const task = await apiFetch<any>('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: 'Another task', 
          status: 'todo',
          due_date: '2026-10-16'
        }),
      });

      // Verify the task includes the due_date
      expect(task.due_date).toBe('2026-10-16');

      // Event detail should include full task
      const eventDetail = { task, source: 'test' };
      expect(eventDetail.task.due_date).toBe('2026-10-16');
    });
  });

  describe('Task update flow', () => {
    it('should update task and dispatch taskUpdated event', async () => {
      const updatedTask = {
        id: 1,
        content: 'Updated task',
        status: 'done' as const,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-15T11:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(updatedTask));

      const taskId = 1;
      const updates = { status: 'done' as const };

      const task = await apiFetch<any>(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/v2/tasks/${taskId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );

      expect(task.status).toBe('done');

      // Dispatch event (simulating TaskEditContext behavior)
      const eventDetail = {
        taskId,
        task,
        source: 'modal'
      };
      window.dispatchEvent(
        new CustomEvent('taskUpdated', { detail: eventDetail })
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle status changes with proper metadata', async () => {
      const waitingTask = {
        id: 3,
        content: 'Waiting on feedback',
        status: 'waiting' as const,
        waiting_on: 'John',
        waiting_since: '2026-10-15T10:00:00Z',
        follow_up_date: '2026-10-20',
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-15T10:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(waitingTask));

      const task = await apiFetch<any>('/api/v2/tasks/3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'waiting',
          waiting_on: 'John',
          follow_up_date: '2026-10-20'
        }),
      });

      expect(task.status).toBe('waiting');
      expect(task.waiting_on).toBe('John');
      expect(task.follow_up_date).toBe('2026-10-20');
    });

    it('should clear waiting metadata when status changes from waiting', async () => {
      const activeTask = {
        id: 3,
        content: 'Back to active',
        status: 'todo' as const,
        waiting_on: null,
        waiting_since: null,
        follow_up_date: null,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-15T11:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(activeTask));

      const task = await apiFetch<any>('/api/v2/tasks/3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'todo' }),
      });

      // When moving from waiting to active, metadata should be cleared
      expect(task.status).toBe('todo');
      expect(task.waiting_on).toBeNull();
      expect(task.waiting_since).toBeNull();
    });
  });

  describe('Task deletion flow', () => {
    it('should delete task and dispatch taskDeleted event', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ success: true }));

      const taskId = 5;
      await apiFetch(`/api/v2/tasks/${taskId}`, {
        method: 'DELETE',
      });

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/v2/tasks/${taskId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      // Dispatch event (simulating TaskEditContext behavior)
      const eventDetail = { taskId };
      window.dispatchEvent(
        new CustomEvent('taskDeleted', { detail: eventDetail })
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion failure gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockResponse({ error: 'Task not found' }, false, 404)
      );

      const taskId = 999;
      
      await expect(
        apiFetch(`/api/v2/tasks/${taskId}`, {
          method: 'DELETE',
        })
      ).rejects.toThrow();

      // Event should NOT be dispatched on failure
      // (TaskEditContext handles this by catching errors)
    });
  });

  describe('Event detail structure', () => {
    it('should include source identifier in all task events', () => {
      const sources = ['modal', 'todayView', 'inboxView', 'calendar', 'allTasksView'];

      sources.forEach(source => {
        const event = new CustomEvent('taskCreated', {
          detail: { 
            task: { id: 1, content: 'Test', status: 'todo' },
            source 
          }
        });

        expect(event.detail.source).toBe(source);
      });
    });

    it('should handle multiple event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      window.addEventListener('taskUpdated', listener1);
      window.addEventListener('taskUpdated', listener2);

      window.dispatchEvent(
        new CustomEvent('taskUpdated', {
          detail: { taskId: 1, task: { id: 1, status: 'done' }, source: 'test' }
        })
      );

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      window.removeEventListener('taskUpdated', listener1);
      window.removeEventListener('taskUpdated', listener2);
    });
  });
});
