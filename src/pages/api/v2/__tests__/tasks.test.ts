import { createMocks } from 'node-mocks-http';
import handler from '../tasks';
import { createTask, getTask } from '../../../../lib/db';
import pool from '../../../../lib/db';

// Mock the DB module
jest.mock('../../../../lib/db', () => {
    const originalModule = jest.requireActual('../../../../lib/db');
    return {
        __esModule: true,
        default: {
            query: jest.fn(),
        },
        createTask: jest.fn(),
        getTask: jest.fn(),
        addItemToPage: jest.fn(),
        createTombstone: jest.fn(),
        deleteTaskReferences: jest.fn(),
    };
});

describe('/api/v2/tasks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── GET: basic ────────────────────────────────────────
    it('GET returns all tasks when no query params', async () => {
        const { req, res } = createMocks({ method: 'GET' });
        const mockRows = [
            { id: 1, content: 'Task 1' },
            { id: 2, content: 'Task 2' },
        ];
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual(mockRows);
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

    // ── GET: today filter ─────────────────────────────────
    it('GET ?due=today filters to overdue + today, not done, non-empty', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { due: 'today' },
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        const sql = (pool.query as jest.Mock).mock.calls[0][0];
        expect(sql).toContain("t.due_date::date <= CURRENT_DATE");
        expect(sql).toContain("t.status != 'done'");
        expect(sql).toContain("t.content != ''");
        expect(sql).toContain("page_name");
    });

    // ── GET: inbox filter (context=none) ──────────────────
    it('GET ?context=none returns tasks with no page_items link', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { context: 'none' },
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        const sql = (pool.query as jest.Mock).mock.calls[0][0];
        expect(sql).toContain('NOT EXISTS');
        expect(sql).toContain('page_items');
        expect(sql).toContain('child_task_id');
    });

    // ── GET: status filter ────────────────────────────────
    it('GET ?status=todo filters to non-done tasks', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { status: 'todo' },
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        await handler(req, res);
        const sql = (pool.query as jest.Mock).mock.calls[0][0];
        expect(sql).toContain("t.status != 'done'");
    });

    it('GET ?status=done filters to done tasks only', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { status: 'done' },
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        await handler(req, res);
        const sql = (pool.query as jest.Mock).mock.calls[0][0];
        expect(sql).toContain("t.status = 'done'");
    });

    // ── GET: sort ─────────────────────────────────────────
    it('GET defaults to newest first', async () => {
        const { req, res } = createMocks({ method: 'GET' });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        await handler(req, res);
        const sql = (pool.query as jest.Mock).mock.calls[0][0];
        expect(sql).toContain('ORDER BY t.created_at DESC');
    });

    it('GET ?sort=dueDate sorts by due_date', async () => {
        const { req, res } = createMocks({
            method: 'GET',
            query: { sort: 'dueDate' },
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        await handler(req, res);
        const sql = (pool.query as jest.Mock).mock.calls[0][0];
        expect(sql).toContain('ORDER BY t.due_date ASC NULLS LAST');
    });

    // ── POST ──────────────────────────────────────────────
    it('POST creates a new task', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: { content: 'New Task', dueDate: '2023-01-01' },
        });
        const mockTask = { id: 1, content: 'New Task', due_date: new Date('2023-01-01') };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
        expect(JSON.parse(res._getData())).toEqual(JSON.parse(JSON.stringify(mockTask)));
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

    it('POST allows empty string content (new task from editor)', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: { content: '' },
        });
        const mockTask = { id: 1, content: '' };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);
        await handler(req, res);
        expect(res._getStatusCode()).toBe(201);
    });

    // ── PUT ───────────────────────────────────────────────
    it('PUT updates a task', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: '1' },
            body: { status: 'done' },
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: 1, status: 'done' }],
        });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE tasks SET'),
            expect.arrayContaining(['done', 1])
        );
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

    // ── DELETE: bulk ──────────────────────────────────────
    it('DELETE with bulk_action=delete_completed removes done tasks', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            query: { bulk_action: 'delete_completed' },
        });
        (pool.query as jest.Mock).mockImplementation(() =>
            Promise.resolve({ rows: [{ id: 1 }, { id: 2 }] })
        );
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(pool.query).toHaveBeenCalledWith("SELECT id FROM tasks WHERE status = 'done'");
    });

    it('DELETE with bulk_action returns 0 count when no completed tasks', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            query: { bulk_action: 'delete_completed' },
        });
        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual({ count: 0 });
    });
});
