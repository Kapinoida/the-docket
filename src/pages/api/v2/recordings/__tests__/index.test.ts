import handler from '../index';
import { createMocks } from 'node-mocks-http';
import { getRecordings, createRecording, upsertRecordingBySportarrId } from '@/lib/db';

jest.mock('@/lib/db');

const mockGetRecordings = getRecordings as jest.MockedFunction<typeof getRecordings>;
const mockCreateRecording = createRecording as jest.MockedFunction<typeof createRecording>;
const mockUpsertRecording = upsertRecordingBySportarrId as jest.MockedFunction<typeof upsertRecordingBySportarrId>;

describe('/api/v2/recordings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns recordings with default options', async () => {
      const mockRecordings = [
        { id: 1, stream_id: '123', title: 'Test Match', status: 'pending' },
      ];
      mockGetRecordings.mockResolvedValue(mockRecordings as any);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getData()).toEqual(JSON.stringify(mockRecordings));
      expect(mockGetRecordings).toHaveBeenCalledWith({});
    });

    it('filters by status', async () => {
      mockGetRecordings.mockResolvedValue([]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings?status=recording',
        query: { status: 'recording' },
      });

      await handler(req, res);

      expect(mockGetRecordings).toHaveBeenCalledWith({ status: 'recording' });
    });

    it('filters by league', async () => {
      mockGetRecordings.mockResolvedValue([]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings?league=eng.1',
        query: { league: 'eng.1' },
      });

      await handler(req, res);

      expect(mockGetRecordings).toHaveBeenCalledWith({ league: 'eng.1' });
    });

    it('filters by dateRange', async () => {
      mockGetRecordings.mockResolvedValue([]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings?dateRange=today',
        query: { dateRange: 'today' },
      });

      await handler(req, res);

      expect(mockGetRecordings).toHaveBeenCalledWith({ dateRange: 'today' });
    });

    it('handles pagination', async () => {
      mockGetRecordings.mockResolvedValue([]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings?limit=10&offset=5',
        query: { limit: '10', offset: '5' },
      });

      await handler(req, res);

      expect(mockGetRecordings).toHaveBeenCalledWith({ limit: 10, offset: 5 });
    });

    it('rejects invalid status filter', async () => {
      mockGetRecordings.mockResolvedValue([]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings?status=invalid',
        query: { status: 'invalid' },
      });

      await handler(req, res);

      expect(mockGetRecordings).toHaveBeenCalledWith({});
    });

    it('handles errors', async () => {
      mockGetRecordings.mockRejectedValue(new Error('DB error'));

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('POST', () => {
    it('creates a recording with required fields', async () => {
      const input = {
        stream_id: '123',
        title: 'Test Match',
        start_time: '2026-08-11T20:00:00Z',
        end_time: '2026-08-11T22:30:00Z',
      };
      const created = { id: 1, ...input, status: 'pending', source: 'fixture' };
      mockCreateRecording.mockResolvedValue(created as any);

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: input,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(mockCreateRecording).toHaveBeenCalledWith({
        stream_id: '123',
        title: 'Test Match',
        start_time: '2026-08-11T20:00:00.000Z',
        end_time: '2026-08-11T22:30:00.000Z',
      });
    });

    it('creates a recording with all fields', async () => {
      const input = {
        stream_id: '123',
        title: 'Test Match',
        league: 'eng.1',
        channel_name: 'Sky Sports',
        start_time: '2026-08-11T20:00:00Z',
        end_time: '2026-08-11T22:30:00Z',
        status: 'scheduled' as const,
        source: 'manual' as const,
        metadata: { home: 'Team A', away: 'Team B' },
      };
      const created = { id: 1, ...input };
      mockCreateRecording.mockResolvedValue(created as any);

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: input,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(mockCreateRecording).toHaveBeenCalled();
    });

    it('upserts when sportarr_id is provided', async () => {
      const input = {
        stream_id: '123',
        sportarr_id: 'sportarr-42',
        title: 'Test Match',
        start_time: '2026-08-11T20:00:00Z',
        end_time: '2026-08-11T22:30:00Z',
      };
      const created = { id: 1, ...input, status: 'scheduled', source: 'sportarr' };
      mockUpsertRecording.mockResolvedValue(created as any);

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: input,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockUpsertRecording).toHaveBeenCalledWith('sportarr-42', expect.objectContaining({
        sportarr_id: 'sportarr-42',
        title: 'Test Match',
      }));
      expect(mockCreateRecording).not.toHaveBeenCalled();
    });

    it('returns 400 for missing required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: { stream_id: '123' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('Missing or invalid required fields');
    });

    it('returns 400 for end_time before start_time', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: {
          stream_id: '123',
          title: 'Test',
          start_time: '2026-08-11T22:30:00Z',
          end_time: '2026-08-11T20:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('end_time must be after start_time');
    });

    it('returns 400 for invalid status', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: {
          stream_id: '123',
          title: 'Test',
          start_time: '2026-08-11T20:00:00Z',
          end_time: '2026-08-11T22:30:00Z',
          status: 'invalid',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('Invalid status');
    });

    it('returns 400 for negative file_size_bytes', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: {
          stream_id: '123',
          title: 'Test',
          start_time: '2026-08-11T20:00:00Z',
          end_time: '2026-08-11T22:30:00Z',
          file_size_bytes: -1,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).error).toContain('file_size_bytes');
    });

    it('returns 409 for duplicate stream_id and start_time', async () => {
      const input = {
        stream_id: '123',
        title: 'Test Match',
        start_time: '2026-08-11T20:00:00Z',
        end_time: '2026-08-11T22:30:00Z',
      };
      const error = new Error('Duplicate') as any;
      error.code = '23505';
      mockCreateRecording.mockRejectedValue(error);

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: input,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(409);
      expect(JSON.parse(res._getData()).error).toContain('already exists');
    });

    it('handles errors', async () => {
      mockCreateRecording.mockRejectedValue(new Error('DB error'));

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/v2/recordings',
        body: {
          stream_id: '123',
          title: 'Test',
          start_time: '2026-08-11T20:00:00Z',
          end_time: '2026-08-11T22:30:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });
});
