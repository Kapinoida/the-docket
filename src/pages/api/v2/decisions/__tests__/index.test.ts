import handler from '@/pages/api/v2/decisions/index';
import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockPoolQuery = (pool as any).query as jest.Mock;

function createMockReqRes(method: string, query: Record<string, string> = {}): { req: NextApiRequest; res: NextApiResponse } {
  const req = {
    method,
    query,
  } as NextApiRequest;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    end: jest.fn(),
  } as unknown as NextApiResponse;

  return { req, res };
}

describe('GET /api/v2/decisions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMockReqRes('POST');
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('returns empty array when no pages exist', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    const { req, res } = createMockReqRes('GET');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('extracts decisions from page content', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          title: 'Test Page',
          content: {
            type: 'doc',
            content: [
              {
                type: 'decision',
                attrs: {
                  id: 'dec_123',
                  title: 'Buy a car',
                  status: 'decided',
                  context: 'Need transport',
                  options: 'Tesla\nBMW',
                  criteria: 'Cost',
                  choice: 'BMW',
                  reasoning: 'Reliable',
                  revisit_date: null,
                  outcome: 'Happy',
                  created_at: '2026-09-01T00:00:00Z',
                  updated_at: '2026-09-02T00:00:00Z',
                },
              },
            ],
          },
        },
      ],
    });

    const { req, res } = createMockReqRes('GET');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const result = (res.json as jest.Mock).mock.calls[0][0];
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dec_123');
    expect(result[0].title).toBe('Buy a car');
    expect(result[0].page_id).toBe(1);
    expect(result[0].page_title).toBe('Test Page');
    expect(result[0].options).toEqual(['Tesla', 'BMW']);
  });

  it('respects limit parameter', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          title: 'Page',
          content: {
            type: 'doc',
            content: [
              { type: 'decision', attrs: { id: 'dec_1', title: 'A', status: 'active', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: null, outcome: '', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' } },
              { type: 'decision', attrs: { id: 'dec_2', title: 'B', status: 'active', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: null, outcome: '', created_at: '2026-09-02T00:00:00Z', updated_at: '2026-09-02T00:00:00Z' } },
              { type: 'decision', attrs: { id: 'dec_3', title: 'C', status: 'active', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: null, outcome: '', created_at: '2026-09-03T00:00:00Z', updated_at: '2026-09-03T00:00:00Z' } },
            ],
          },
        },
      ],
    });

    const { req, res } = createMockReqRes('GET', { limit: '2' });
    await handler(req, res);

    const result = (res.json as jest.Mock).mock.calls[0][0];
    expect(result).toHaveLength(2);
  });

  it('filters to decisions due for review', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          title: 'Page',
          content: {
            type: 'doc',
            content: [
              { type: 'decision', attrs: { id: 'dec_past', title: 'Past', status: 'active', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: '2020-01-01T00:00:00Z', outcome: '', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' } },
              { type: 'decision', attrs: { id: 'dec_future', title: 'Future', status: 'active', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: '2099-01-01T00:00:00Z', outcome: '', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' } },
              { type: 'decision', attrs: { id: 'dec_none', title: 'None', status: 'active', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: null, outcome: '', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' } },
            ],
          },
        },
      ],
    });

    const { req, res } = createMockReqRes('GET', { dueForReview: 'true' });
    await handler(req, res);

    const result = (res.json as jest.Mock).mock.calls[0][0];
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('dec_past');
  });

  it('handles pages with no decisions', async () => {
    mockPoolQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          title: 'No Decisions Page',
          content: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Just text' }] },
            ],
          },
        },
      ],
    });

    const { req, res } = createMockReqRes('GET');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('returns 500 on database error', async () => {
    mockPoolQuery.mockRejectedValue(new Error('DB error'));

    const { req, res } = createMockReqRes('GET');
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
