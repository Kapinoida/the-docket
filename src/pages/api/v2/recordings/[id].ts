import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecording, updateRecording, deleteRecording } from '@/lib/db';
import { UpdateRecordingInput, RecordingStatus } from '@/types';

const VALID_STATUSES: RecordingStatus[] = ['pending', 'scheduled', 'recording', 'completed', 'failed', 'cancelled'];
const VALID_SOURCES = ['fixture', 'manual', 'replay', 'sportarr'];

function parseISO(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;
  const recordingId = parseInt(id as string);

  if (isNaN(recordingId) || recordingId <= 0) {
    return res.status(400).json({ error: 'Invalid recording ID' });
  }

  try {
    switch (method) {
      case 'GET': {
        const recording = await getRecording(recordingId);
        if (!recording) {
          return res.status(404).json({ error: 'Recording not found' });
        }
        return res.status(200).json(recording);
      }

      case 'PATCH': {
        const body = req.body;
        if (!body || typeof body !== 'object') {
          return res.status(400).json({ error: 'Request body is required' });
        }

        const input: UpdateRecordingInput = {};
        let hasField = false;

        if (body.status !== undefined) {
          if (typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status as RecordingStatus)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
          }
          input.status = body.status as RecordingStatus;
          hasField = true;
        }

        if (body.title !== undefined) {
          if (typeof body.title !== 'string' || !body.title.trim()) {
            return res.status(400).json({ error: 'title must be a non-empty string' });
          }
          input.title = body.title.trim();
          hasField = true;
        }

        if (body.league !== undefined) {
          input.league = typeof body.league === 'string' ? body.league : null as unknown as undefined;
          hasField = true;
        }

        if (body.channel_name !== undefined) {
          input.channel_name = typeof body.channel_name === 'string' ? body.channel_name : null as unknown as undefined;
          hasField = true;
        }

        if (body.stream_id !== undefined) {
          if (typeof body.stream_id !== 'string' || !body.stream_id.trim()) {
            return res.status(400).json({ error: 'stream_id must be a non-empty string' });
          }
          input.stream_id = body.stream_id.trim();
          hasField = true;
        }

        if (body.sportarr_id !== undefined) {
          input.sportarr_id = typeof body.sportarr_id === 'string' ? body.sportarr_id : null as unknown as undefined;
          hasField = true;
        }

        if (body.start_time !== undefined) {
          const parsed = parseISO(body.start_time);
          if (!parsed) return res.status(400).json({ error: 'start_time must be a valid ISO date string' });
          input.start_time = parsed;
          hasField = true;
        }

        if (body.end_time !== undefined) {
          const parsed = parseISO(body.end_time);
          if (!parsed) return res.status(400).json({ error: 'end_time must be a valid ISO date string' });
          input.end_time = parsed;
          hasField = true;
        }

        if (input.start_time && input.end_time && new Date(input.end_time) <= new Date(input.start_time)) {
          return res.status(400).json({ error: 'end_time must be after start_time' });
        }

        if (body.source !== undefined) {
          if (typeof body.source !== 'string' || !VALID_SOURCES.includes(body.source)) {
            return res.status(400).json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` });
          }
          hasField = true;
        }

        if (body.output_path !== undefined) {
          input.output_path = typeof body.output_path === 'string' ? body.output_path : null as unknown as undefined;
          hasField = true;
        }

        if (body.file_size_bytes !== undefined) {
          if (typeof body.file_size_bytes !== 'number' || body.file_size_bytes < 0) {
            return res.status(400).json({ error: 'file_size_bytes must be a non-negative number' });
          }
          input.file_size_bytes = body.file_size_bytes;
          hasField = true;
        }

        if (body.error_message !== undefined) {
          input.error_message = typeof body.error_message === 'string' ? body.error_message : null as unknown as undefined;
          hasField = true;
        }

        if (body.metadata !== undefined) {
          if (typeof body.metadata !== 'object') {
            return res.status(400).json({ error: 'metadata must be an object' });
          }
          input.metadata = body.metadata;
          hasField = true;
        }

        if (!hasField) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        const updated = await updateRecording(recordingId, input);
        if (!updated) {
          return res.status(404).json({ error: 'Recording not found' });
        }
        return res.status(200).json(updated);
      }

      case 'DELETE': {
        const deleted = await deleteRecording(recordingId);
        if (!deleted) {
          return res.status(404).json({ error: 'Recording not found' });
        }
        return res.status(200).json({ success: true });
      }

      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
