import { createMocks } from 'node-mocks-http';
import handler from '../tasks'; // Target the correct handler file
import pool from '../../../../lib/db';
import { createTombstone, deleteTaskReferences } from '../../../../lib/db';

// Mock the DB module
jest.mock('../../../../lib/db', () => {
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
        calculateNextDueDate: jest.fn(),
    };
});

// Mock recurrence lib
jest.mock('../../../../lib/recurrence', () => ({
    calculateNextDueDate: jest.fn(),
}));

describe('/api/v2/tasks DELETE Cleanup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('DELETE removes task references from pages', async () => {
        const taskId = 123;
        const pageId = 456;

        const { req, res } = createMocks({
            method: 'DELETE',
            query: { id: String(taskId) },
        });

        // Mock Data
        const mockPageContent = {
            type: "doc",
            content: [
                { type: "paragraph", content: [{ type: "text", text: "Before task" }] },
                { type: "v2Task", attrs: { taskId: taskId } }, 
                { type: "paragraph", content: [{ type: "text", text: "After task" }] }
            ]
        };

        const expectedContent = {
            type: "doc",
            content: [
                { type: "paragraph", content: [{ type: "text", text: "Before task" }] },
                { type: "paragraph", content: [{ type: "text", text: "After task" }] }
            ]
        };

        // Setup pool.query mock
        (pool.query as jest.Mock).mockImplementation((query, params) => {
            // 1. SELECT pages with task
            // Check for regex usage
            if (query.includes('SELECT id, content FROM pages WHERE content::text ~')) {
                return Promise.resolve({
                    rows: [{ id: pageId, content: mockPageContent }]
                });
            }
            if (query.includes('UPDATE pages')) return Promise.resolve({ rowCount: 1 });
            // DELETE task
            if (query.includes('DELETE FROM tasks')) return Promise.resolve({ rowCount: 1 });
            // DELETE page_items
            if (query.includes('DELETE FROM page_items')) return Promise.resolve({ rowCount: 1 });
            
            return Promise.resolve({ rows: [], rowCount: 1 });
        });

        await handler(req, res);

        // Verify shared clean up function was called
        // Note: Since we mocked db.ts, `deleteTaskReferences` is a mock.
        // BUT, notice that `src/pages/api/v2/tasks.ts` imports the REAL definition unless we mock the module.
        // We DID mock the module.
        // However, the handler calls the function *exported* by the mocked module.
        // So we need to import it in the test to check if it was called.
        // But our mock setup above defines it as jest.fn().
        
        // Wait, the handler calls `deleteTaskReferences(taskId)`.
        // We mocked `../../../lib/db` to return an object with `deleteTaskReferences: jest.fn()`.
        
        // So we just check that.
        // We need to import it to check.
        // Wait, line 2 imports `pool`. We didn't import `deleteTaskReferences`.
        
        // Wait, the previous test verified `pool.query`.
        // Now `deleteTaskReferences` calls `pool.query`.
        // If we mock the whole module `lib/db`, then `handler` calls the MOCKED `deleteTaskReferences`.
        // The MOCKED function does nothing unless structured.
        // So `pool.query` inside `deleteTaskReferences` will NOT be called because we replaced `deleteTaskReferences` with a mock!
        
        // So we should verify `deleteTaskReferences` is called with taskId.
        
        // We need to import it to check expectation.
        
        expect(deleteTaskReferences).toHaveBeenCalledWith(taskId);

        // Verify DELETE operations
        // These are still in the handler (step 2 and 3)
        // Wait, step 2/3 use pool directly?
        // In tasks.ts:
        // await pool.query('DELETE FROM tasks ...')
        // await pool.query('DELETE FROM page_items...')
        // Since `pool` IS imported from `db` module, it uses the mocked `pool` from our factory.
        
        expect(pool.query).toHaveBeenCalledWith(
            'DELETE FROM tasks WHERE id = $1',
            [String(taskId)] // req param is string, converted to number but pool might see stringified? 
            // In code: `pool.query('DELETE ...', [id])`. id comes from `req.query.id`.
            // tasks.ts lines: `if (!id)... const taskId = Number(id)... pool.query(..., [id])`
            // So it passes the string `id` to the delete query.
            // But passed `taskId` (number) to `deleteTaskReferences`.
        );
    });

    it('DELETE removes task references when stored as string ID', async () => {
        const taskId = 999;
        const { req, res } = createMocks({ method: 'DELETE', query: { id: String(taskId) } });

        (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

        await handler(req, res);

        expect(deleteTaskReferences).toHaveBeenCalledWith(taskId);
    });
});
