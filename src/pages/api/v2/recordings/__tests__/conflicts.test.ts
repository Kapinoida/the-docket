import handler from '../conflicts';
import { createMocks } from 'node-mocks-http';
import { getConflicts } from '@/lib/db';

jest.mock('@/lib/db');

const mockGetConflicts = getConflicts as jest.MockedFunction<typeof getConflicts>;

describe('/api/v2/recordings/conflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns conflicts', async () => {
    const mockConflicts = [
      {
        id: 1,
        conflict_id: 2,
        title: 'Match A',
        conflict_title: 'Match B',
        start_time: '2026-08-11T20:00:00Z',
        end_time: '2026-08-11T22:30:00Z',
        conflict_start: '2026-08-11T21:00:00Z',
        conflict_end: '2026-08-11T23:30:00Z',
      },
    ];
    mockGetConflicts.mockResolvedValue(mockConflicts as any);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/v2/recordings/conflicts',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockConflicts);
    expect(mockGetConflicts).toHaveBeenCalled();
  });

  it('returns empty array when no conflicts', async () => {
    mockGetConflicts.mockResolvedValue([]);

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/v2/recordings/conflicts',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual([]);
  });

  it('handles errors', async () => {
    mockGetConflicts.mockRejectedValue(new Error('DB error'));

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/v2/recordings/conflicts',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).error).toBe('Internal Server Error');
  });
});
