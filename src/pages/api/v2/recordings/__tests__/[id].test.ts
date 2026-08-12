import handler from '../[id]';
import { createMocks } from 'node-mocks-http';
import { getRecording, updateRecording, deleteRecording } from '@/lib/db';

jest.mock('@/lib/db');

const mockGetRecording = getRecording as jest.MockedFunction<typeof getRecording>;
const mockUpdateRecording = updateRecording as jest.MockedFunction<typeof updateRecording>;
const mockDeleteRecording = deleteRecording as jest.MockedFunction<typeof deleteRecording>;

describe('/api/v2/recordings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns a recording by ID', async () => {
      const mockRecording = { id: 1, stream_id: '123', title: 'Test Match' };
      mockGetRecording.mockResolvedValue(mockRecording as any);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockRecording);
      expect(mockGetRecording).toHaveBeenCalledWith(1);
    });

    it('returns 400 for invalid ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings/invalid',
        query: { id: 'invalid' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('returns 404 for non-existent recording', async () => {
      mockGetRecording.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings/999',
        query: { id: '999' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('handles errors', async () => {
      mockGetRecording.mockRejectedValue(new Error('DB error'));

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('PATCH', () => {
    it('updates a recording', async () => {
      const updated = { id: 1, status: 'recording' };
      mockUpdateRecording.mockResolvedValue(updated as any);

      const { req, res } = createMocks({
        method: 'PATCH',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
        body: { status: 'recording' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(updated);
      expect(mockUpdateRecording).toHaveBeenCalledWith(1, { status: 'recording' });
    });

    it('updates multiple fields', async () => {
      const updated = { id: 1, status: 'completed', output_path: '/tmp/recording.mp4' };
      mockUpdateRecording.mockResolvedValue(updated as any);

      const { req, res } = createMocks({
        method: 'PATCH',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
        body: {
          status: 'completed',
          output_path: '/tmp/recording.mp4',
        },
      });

      await handler(req, res);

      expect(mockUpdateRecording).toHaveBeenCalledWith(1, {
        status: 'completed',
        output_path: '/tmp/recording.mp4',
      });
    });

    it('returns 400 for invalid ID', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
        url: '/api/v2/recordings/invalid',
        query: { id: 'invalid' },
        body: { status: 'recording' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('returns 400 for empty update', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
        body: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('returns 404 for non-existent recording', async () => {
      mockUpdateRecording.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'PATCH',
        url: '/api/v2/recordings/999',
        query: { id: '999' },
        body: { status: 'recording' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('handles errors', async () => {
      mockUpdateRecording.mockRejectedValue(new Error('DB error'));

      const { req, res } = createMocks({
        method: 'PATCH',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
        body: { status: 'recording' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('DELETE', () => {
    it('deletes a recording', async () => {
      mockDeleteRecording.mockResolvedValue(true);

      const { req, res } = createMocks({
        method: 'DELETE',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ success: true });
      expect(mockDeleteRecording).toHaveBeenCalledWith(1);
    });

    it('returns 400 for invalid ID', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        url: '/api/v2/recordings/invalid',
        query: { id: 'invalid' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });

    it('returns 404 for non-existent recording', async () => {
      mockDeleteRecording.mockResolvedValue(false);

      const { req, res } = createMocks({
        method: 'DELETE',
        url: '/api/v2/recordings/999',
        query: { id: '999' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('handles errors', async () => {
      mockDeleteRecording.mockRejectedValue(new Error('DB error'));

      const { req, res } = createMocks({
        method: 'DELETE',
        url: '/api/v2/recordings/1',
        query: { id: '1' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });
});
