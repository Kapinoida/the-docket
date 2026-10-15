import handler from '@/pages/api/v2/decisions/create-task';
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockPoolQuery = (pool as unknown as { query: jest.Mock }).query;

function createMockReqRes(method: string, body: Record<string, unknown> = {}): { req: NextApiRequest; res: NextApiResponse } {
  const req = {
    method,
    body,
  } as NextApiRequest;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    end: jest.fn(),
  } as unknown as NextApiResponse;

  return { req, res };
}

describe('POST /api/v2/decisions/create-task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = createMockReqRes('GET');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns 400 for missing required fields', async () => {
    const { req, res } = createMockReqRes('POST', {});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for missing criterionId', async () => {
    const { req, res } = createMockReqRes('POST', { criterionText: 'Test', pageId: 1 });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for missing criterionText', async () => {
    const { req, res } = createMockReqRes('POST', { criterionId: 'crit_1', pageId: 1 });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for missing pageId', async () => {
    const { req, res } = createMockReqRes('POST', { criterionId: 'crit_1', criterionText: 'Test' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a task and links it to the page', async () => {
    const mockTask = { id: 42, content: 'Test criterion', status: 'todo' };
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [mockTask] }) // INSERT task
      .mockResolvedValueOnce({ rows: [] }); // INSERT page_items

    const { req, res } = createMockReqRes('POST', {
      criterionId: 'crit_123',
      criterionText: 'Test criterion',
      pageId: 5,
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      task_id: 42,
      task: mockTask,
    });

    // Verify task creation query
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      ['Test criterion']
    );

    // Verify page_items link query
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO page_items'),
      [5, 42]
    );
  });

  it('returns 500 on database error', async () => {
    mockPoolQuery.mockRejectedValue(new Error('DB error'));

    const { req, res } = createMockReqRes('POST', {
      criterionId: 'crit_1',
      criterionText: 'Test',
      pageId: 1,
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
