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
        expect(createTask).toHaveBeenCalledWith('New Task', expect.any(Date), null);
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