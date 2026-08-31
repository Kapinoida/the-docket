import { createMocks } from 'node-mocks-http';
import handler from '../tasks';
import { createTask, getTask, getTasks, updateTask, deleteTask, deleteCompletedTasks, addItemToPage, createTombstone, deleteTaskReferences } from '../../../../lib/db';
import pool from '../../../../lib/db';

jest.mock('../../../../lib/db', () => {
    const originalModule = jest.requireActual('../../../../lib/db');
    return {
        __esModule: true,
        default: {
            query: jest.fn(),
        },
        createTask: jest.fn(),
        getTask: jest.fn(),
        getTasks: jest.fn(),
        updateTask: jest.fn(),
        deleteTask: jest.fn(),
        deleteCompletedTasks: jest.fn(),
        addItemToPage: jest.fn(),
        createTombstone: jest.fn(),
        deleteTaskReferences: jest.fn(),
        normalizeDateToNoon: jest.fn((d) => d),
    };
});

describe('/api/v2/tasks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET returns all tasks when no query params', async () => {
        const { req, res } = createMocks({ method: 'GET' });
        const mockTasks = [
            { id: 1, content: 'Task 1' },
            { id: 2, content: 'Task 2' },
        ];
        (getTasks as jest.Mock).mockResolvedValueOnce(mockTasks);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual(mockTasks);
    });

    it('GET with id returns single task', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { id: '42' },
        });
        const mockTask = { id: 42, content: 'Single task' };
        (getTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual(mockTask);
        expect(getTask).toHaveBeenCalledWith(42);
    });

    it('GET with id returns 404 when task not found', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { id: '999' },
        });
        (getTask as jest.Mock).mockResolvedValueOnce(null);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(404);
    });

    it('GET ?due=today delegates to getTasks', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { due: 'today' },
        });
        (getTasks as jest.Mock).mockResolvedValueOnce([]);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({ due: 'today' }));
    });

    it('GET ?status=todo delegates to getTasks', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { status: 'todo' },
        });
        (getTasks as jest.Mock).mockResolvedValueOnce([]);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({ status: 'todo' }));
    });

    it('POST creates a new task', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: { content: 'New Task', dueDate: '2023-01-01' },
        });
        const mockTask = { id: 1, content: 'New Task', due_date: '2023-01-01' };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
        expect(JSON.parse(res._getData())).toEqual(mockTask);
        expect(createTask).toHaveBeenCalledWith('New Task', expect.any(Date), null, null, null);
    });

    it('POST passes next_action to createTask', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: { content: 'Task', next_action: 'Call the dentist' },
        });
        const mockTask = { id: 1, content: 'Task', next_action: 'Call the dentist' };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
        expect(createTask).toHaveBeenCalledWith('Task', null, null, null, 'Call the dentist');
    });

    it('POST normalizes blank next_action to null', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: { content: 'Task', next_action: '   ' },
        });
        const mockTask = { id: 1, content: 'Task' };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(createTask).toHaveBeenCalledWith('Task', null, null, null, null);
    });

    it('POST returns 400 when content is missing', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {},
        });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(400);
    });

    it('POST allows empty string content', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: { content: '' },
        });
        const mockTask = { id: 1, content: '' };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
    });

    it('POST creates a task with end_time', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                content: 'Block',
                due_date: '2026-06-15T10:00:00.000Z',
                end_time: '2026-06-15T12:00:00.000Z',
            },
        });
        const mockTask = { id: 2, content: 'Block', end_time: '2026-06-15T12:00:00.000Z' };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
        expect(createTask).toHaveBeenCalledWith('Block', expect.any(Date), null, expect.any(Date), null);
    });

    it('POST rejects end_time on a different calendar day', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                content: 'Cross-day',
                due_date: '2026-06-15T10:00:00.000Z',
                end_time: '2026-06-16T14:00:00.000Z',
            },
        });
        (createTask as jest.Mock).mockResolvedValueOnce({});
        await handler(req, res);
        expect(res._getStatusCode()).toBe(400);
    });

    it('POST rejects end_time before due_date', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                content: 'Negative block',
                due_date: '2026-06-15T12:00:00.000Z',
                end_time: '2026-06-15T10:00:00.000Z',
            },
        });
        (createTask as jest.Mock).mockResolvedValueOnce({});
        await handler(req, res);
        expect(res._getStatusCode()).toBe(400);
    });

    it('PUT updates a task', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: '1' },
            body: { status: 'done' },
        });
        const updatedTask = { id: 1, content: 'Test', status: 'done' };
        (updateTask as jest.Mock).mockResolvedValueOnce(updatedTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual(updatedTask);
        expect(updateTask).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'done' }));
    });

    it('PUT sets next_action', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: '1' },
            body: { next_action: 'Send the email' },
        });
        const updatedTask = { id: 1, content: 'Test', next_action: 'Send the email' };
        (updateTask as jest.Mock).mockResolvedValueOnce(updatedTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(updateTask).toHaveBeenCalledWith(1, expect.objectContaining({ next_action: 'Send the email' }));
    });

    it('PUT clears next_action with null', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: '1' },
            body: { next_action: null },
        });
        const updatedTask = { id: 1, content: 'Test', next_action: null };
        (updateTask as jest.Mock).mockResolvedValueOnce(updatedTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(updateTask).toHaveBeenCalledWith(1, expect.objectContaining({ next_action: null }));
    });

    it('PUT omits next_action when not provided', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: '1' },
            body: { content: 'Updated' },
        });
        const updatedTask = { id: 1, content: 'Updated' };
        (updateTask as jest.Mock).mockResolvedValueOnce(updatedTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(updateTask).toHaveBeenCalledWith(1, expect.not.objectContaining({ next_action: expect.anything() }));
    });

    it('PUT returns 400 when no id provided', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            body: { status: 'done' },
        });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(400);
    });

    it('PUT returns 400 when no fields to update', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: '1' },
            body: {},
        });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(400);
    });

    it('DELETE with bulk_action=delete_completed uses deleteCompletedTasks', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            query: { bulk_action: 'delete_completed' },
        });
        (deleteCompletedTasks as jest.Mock).mockResolvedValueOnce(2);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual({ success: true, count: 2 });
        expect(deleteCompletedTasks).toHaveBeenCalled();
    });

    it('DELETE with bulk_action returns 0 count when no completed tasks', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            query: { bulk_action: 'delete_completed' },
        });
        (deleteCompletedTasks as jest.Mock).mockResolvedValueOnce(0);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual({ success: true, count: 0 });
    });
});