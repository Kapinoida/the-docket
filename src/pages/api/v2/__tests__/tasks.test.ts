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
        // mock other exports if needed or use simple fn
    };
});

describe('/api/v2/tasks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET returns all tasks when no query params', async () => {
        const { req, res } = createMocks({
            method: 'GET',
        });

        const mockRows = [
            { id: 1, content: 'Task 1' },
            { id: 2, content: 'Task 2' },
        ];

        (pool.query as jest.Mock).mockResolvedValueOnce({ rows: mockRows });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual(mockRows);
    });

    it('POST creates a new task', async () => {
        const { req, res } = createMocks({
            method: 'POST',
            body: {
                content: 'New Task',
                dueDate: '2023-01-01'
            },
        });

        const mockTask = { id: 1, content: 'New Task', due_date: new Date('2023-01-01') };
        (createTask as jest.Mock).mockResolvedValueOnce(mockTask);

        await handler(req, res);

        expect(res._getStatusCode()).toBe(201);
        expect(JSON.parse(res._getData())).toEqual(JSON.parse(JSON.stringify(mockTask))); // Stringify comparison for date handling
        expect(createTask).toHaveBeenCalledWith('New Task', expect.any(Date), null);
    });

    it('PUT updates a task', async () => {
        const { req, res } = createMocks({
            method: 'PUT',
            query: { id: '1' },
            body: {
                status: 'done'
            },
        });

        // The handler does a dynamic update via pool.query directly
        (pool.query as jest.Mock).mockResolvedValueOnce({ 
            rowCount: 1, 
            rows: [{ id: 1, status: 'done' }] 
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE tasks SET'),
            expect.arrayContaining(['done', 1])
        );
    });
});
