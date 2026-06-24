import { createMocks } from 'node-mocks-http';
import handler from '../tasks';
import { deleteTask, deleteCompletedTasks } from '../../../../lib/db';

jest.mock('../../../../lib/db', () => {
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

describe('/api/v2/tasks DELETE Cleanup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('DELETE with id calls deleteTask', async () => {
        const taskId = 123;

        const { req, res } = createMocks({
            method: 'DELETE',
            query: { id: String(taskId) },
        });

        (deleteTask as jest.Mock).mockResolvedValueOnce(undefined);

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        expect(deleteTask).toHaveBeenCalledWith(taskId);
    });

    it('DELETE with string id converts to number and calls deleteTask', async () => {
        const taskId = 999;
        const { req, res } = createMocks({ method: 'DELETE', query: { id: String(taskId) } });

        (deleteTask as jest.Mock).mockResolvedValueOnce(undefined);

        await handler(req, res);

        expect(deleteTask).toHaveBeenCalledWith(taskId);
    });

    it('DELETE without id returns 400', async () => {
        const { req, res } = createMocks({ method: 'DELETE' });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
    });

    it('DELETE with bulk_action=delete_completed calls deleteCompletedTasks', async () => {
        const { req, res } = createMocks({
            method: 'DELETE',
            query: { bulk_action: 'delete_completed' },
        });

        (deleteCompletedTasks as jest.Mock).mockResolvedValueOnce(3);

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        expect(JSON.parse(res._getData())).toEqual({ success: true, count: 3 });
        expect(deleteCompletedTasks).toHaveBeenCalled();
    });
});