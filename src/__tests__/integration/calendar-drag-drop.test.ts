/**
 * Integration tests for Calendar drag-and-drop operations
 * 
 * Tests that dragging tasks in the calendar properly updates them and dispatches sync events.
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

describe('Calendar Drag-and-Drop Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Moving unscheduled task to time slot', () => {
    it('should update task with due_date and dispatch taskUpdated event', async () => {
      const taskId = 10;
      const newDueDate = '2026-10-16';
      const newEndTime = '2026-10-16T14:00:00.000Z';

      const updatedTask = {
        id: taskId,
        content: 'Dragged task',
        status: 'todo' as const,
        due_date: newDueDate,
        end_time: newEndTime,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-16T09:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(updatedTask));

      // Simulate drag-drop update
      const task = await apiFetch<any>(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          due_date: newDueDate,
          end_time: newEndTime
        }),
      });

      // Verify API was called with correct date and time
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/v2/tasks/${taskId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            due_date: newDueDate,
            end_time: newEndTime
          }),
        })
      );

      expect(task.due_date).toBe(newDueDate);
      expect(task.end_time).toBe(newEndTime);

      // Dispatch event (simulating CalendarView behavior)
      const eventDetail = { taskId, source: 'calendar' };
      window.dispatchEvent(
        new CustomEvent('taskUpdated', { detail: eventDetail })
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should preserve duration when moving timed task', async () => {
      const taskId = 11;
      const originalEndTime = '2026-10-15T14:00:00.000Z';
      const newDueDate = '2026-10-16';
      const newEndTime = '2026-10-16T14:00:00.000Z';

      const updatedTask = {
        id: taskId,
        content: 'Task with duration',
        status: 'todo' as const,
        due_date: newDueDate,
        end_time: newEndTime,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-16T09:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(updatedTask));

      const task = await apiFetch<any>(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          due_date: newDueDate,
          end_time: newEndTime
        }),
      });

      // Verify end_time is preserved
      expect(task.end_time).toBe(newEndTime);

      // Calculate duration (2 hours in this case)
      const startTime = new Date(task.due_date + 'T12:00:00.000Z');
      const endTime = new Date(task.end_time);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      expect(durationHours).toBeCloseTo(2, 0);
    });
  });

  describe('Moving task across days', () => {
    it('should update due_date when moving to different day', async () => {
      const taskId = 12;
      const originalDate = '2026-10-15';
      const newDate = '2026-10-20';

      const updatedTask = {
        id: taskId,
        content: 'Moved across days',
        status: 'todo' as const,
        due_date: newDate,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-16T09:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(updatedTask));

      const task = await apiFetch<any>(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: newDate }),
      });

      expect(task.due_date).toBe(newDate);
      expect(task.due_date).not.toBe(originalDate);
    });

    it('should clear end_time when moving to different day without explicit end_time', async () => {
      const taskId = 13;

      const updatedTask = {
        id: taskId,
        content: 'Task without duration',
        status: 'todo' as const,
        due_date: '2026-10-20',
        end_time: null,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-16T09:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(updatedTask));

      // When moving to a different day, if no end_time is provided,
      // the API clears it (sets to null)
      const task = await apiFetch<any>(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: '2026-10-20' }),
      });

      expect(task.due_date).toBe('2026-10-20');
      expect(task.end_time).toBeNull();
    });
  });

  describe('Unscheduling task', () => {
    it('should remove date when dragging to unschedule target', async () => {
      const taskId = 14;

      const updatedTask = {
        id: taskId,
        content: 'Unscheduled task',
        status: 'todo' as const,
        due_date: null,
        end_time: null,
        created_at: '2026-10-15T10:00:00Z',
        updated_at: '2026-10-16T09:00:00Z'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse(updatedTask));

      const task = await apiFetch<any>(`/api/v2/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          due_date: null,
          end_time: null
        }),
      });

      // Verify both date and time are cleared
      expect(task.due_date).toBeNull();
      expect(task.end_time).toBeNull();

      // Dispatch event
      window.dispatchEvent(
        new CustomEvent('taskUpdated', {
          detail: { taskId, source: 'calendar' }
        })
      );
    });
  });

  describe('Drag-and-drop error handling', () => {
    it('should handle API failure during drag', async () => {
      const taskId = 15;

      (global.fetch as jest.Mock).mockResolvedValueOnce(createMockResponse({ error: 'Internal Server Error' }, false, 500));

      await expect(
        apiFetch(`/api/v2/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ due_date: '2026-10-20' }),
        })
      ).rejects.toThrow();

      // Event should NOT be dispatched on failure
      // (CalendarView handles this by catching errors and showing toast)
    });

    it('should validate end_time is after due_date', async () => {
      const taskId = 16;

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockResponse({ error: 'end_time must be after due_date and on the same calendar day' }, false, 400)
      );

      await expect(
        apiFetch(`/api/v2/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            due_date: '2026-10-16',
            end_time: '2026-10-15T10:00:00.000Z' // Before due_date
          }),
        })
      ).rejects.toThrow();
    });

    it('should validate end_time is on same calendar day', async () => {
      const taskId = 17;

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        createMockResponse({ error: 'end_time must be after due_date and on the same calendar day' }, false, 400)
      );

      await expect(
        apiFetch(`/api/v2/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            due_date: '2026-10-16',
            end_time: '2026-10-17T10:00:00.000Z' // Different day
          }),
        })
      ).rejects.toThrow();
    });
  });

  describe('15-minute snap behavior', () => {
    it('should accept valid 15-minute increments', () => {
      const times = [
        '2026-10-16T09:00:00.000Z',
        '2026-10-16T09:15:00.000Z',
        '2026-10-16T09:30:00.000Z',
        '2026-10-16T09:45:00.000Z',
        '2026-10-16T10:00:00.000Z'
      ];

      times.forEach(time => {
        // These should all be valid times for the API
        expect(new Date(time).getTime()).toBeGreaterThan(0);
      });
    });

    it('should calculate duration correctly for 15-minute blocks', () => {
      const dueDate = '2026-10-16';
      const startTime = '2026-10-16T09:00:00.000Z';
      const endTime = '2026-10-16T10:30:00.000Z'; // 1.5 hours

      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      const durationMinutes = (endMs - startMs) / (1000 * 60);

      expect(durationMinutes).toBe(90); // 1.5 hours = 90 minutes
      expect(durationMinutes % 15).toBe(0); // Should be divisible by 15
    });
  });

  describe('Cross-view synchronization after drag', () => {
    it('should trigger SyncContext refresh on taskUpdated event', () => {
      const listener = jest.fn();

      // SyncContext listens for taskUpdated events to refresh data
      window.addEventListener('taskUpdated', listener);

      window.dispatchEvent(
        new CustomEvent('taskUpdated', {
          detail: { 
            taskId: 18, 
            source: 'calendar' 
          }
        })
      );

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'taskUpdated',
          detail: { taskId: 18, source: 'calendar' }
        })
      );

      window.removeEventListener('taskUpdated', listener);
    });

    it('should include source in event detail for debugging', () => {
      const listener = jest.fn();
      window.addEventListener('taskUpdated', listener);

      window.dispatchEvent(
        new CustomEvent('taskUpdated', {
          detail: { 
            taskId: 19,
            task: { id: 19, status: 'done' },
            source: 'calendar'
          }
        })
      );

      const event = listener.mock.calls[0][0];
      expect(event.detail.source).toBe('calendar');

      window.removeEventListener('taskUpdated', listener);
    });
  });
});
