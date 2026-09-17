import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecordings, createRecording, upsertRecordingBySportarrId, GetRecordingsOptions } from '@/lib/db';
import { CreateRecordingInput, RecordingStatus, RecordingSource } from '@/types';

const VALID_STATUSES: RecordingStatus[] = ['pending', 'scheduled', 'recording', 'completed', 'failed', 'cancelled'];
const VALID_SOURCES: RecordingSource[] = ['fixture', 'manual', 'replay', 'sportarr'];

function isValidStatus(s: unknown): s is RecordingStatus {
  return typeof s === 'string' && VALID_STATUSES.includes(s as RecordingStatus);
}

function isValidSource(s: unknown): s is RecordingSource {
  return typeof s === 'string' && VALID_SOURCES.includes(s as RecordingSource);
}

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

  try {
    switch (method) {
      case 'GET': {
        const options: GetRecordingsOptions = {};

        const status = req.query.status;
        if (status && typeof status === 'string' && isValidStatus(status)) options.status = status;

        const league = req.query.league;
        if (league && typeof league === 'string') options.league = league;

        const dateRange = req.query.dateRange;
        if (dateRange && typeof dateRange === 'string' && ['today', 'upcoming', 'past'].includes(dateRange)) {
          options.dateRange = dateRange as 'today' | 'upcoming' | 'past';
        }

        const startDate = req.query.startDate;
        if (startDate && typeof startDate === 'string') options.startDate = startDate;

        const endDate = req.query.endDate;
        if (endDate && typeof endDate === 'string') options.endDate = endDate;

        const limit = req.query.limit;
        if (limit && typeof limit === 'string') {
          const parsed = parseInt(limit);
          if (!isNaN(parsed) && parsed > 0) options.limit = parsed;
        }

        const offset = req.query.offset;
        if (offset && typeof offset === 'string') {
          const parsed = parseInt(offset);
          if (!isNaN(parsed) && parsed >= 0) options.offset = parsed;
        }

        const recordings = await getRecordings(options);
        return res.status(200).json(recordings);
      }

      case 'POST': {
        const body = req.body;
        if (!body || typeof body !== 'object') {
          return res.status(400).json({ error: 'Request body is required' });
        }

        const streamId = typeof body.stream_id === 'string' ? body.stream_id.trim() : '';
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        const startTime = parseISO(body.start_time);
        const endTime = parseISO(body.end_time);

        if (!streamId || !title || !startTime || !endTime) {
          return res.status(400).json({
            error: 'Missing or invalid required fields: stream_id, title, start_time, end_time'
          });
        }

        if (new Date(endTime) <= new Date(startTime)) {
          return res.status(400).json({ error: 'end_time must be after start_time' });
        }

        if (body.status !== undefined && !isValidStatus(body.status)) {
          return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
        }

        if (body.source !== undefined && !isValidSource(body.source)) {
          return res.status(400).json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` });
        }

        if (body.file_size_bytes !== undefined && (typeof body.file_size_bytes !== 'number' || body.file_size_bytes < 0)) {
          return res.status(400).json({ error: 'file_size_bytes must be a non-negative number' });
        }

        const input: CreateRecordingInput = {
          stream_id: streamId,
          title,
          start_time: startTime,
          end_time: endTime,
          sportarr_id: typeof body.sportarr_id === 'string' ? body.sportarr_id.trim() || undefined : undefined,
          league: typeof body.league === 'string' ? body.league : undefined,
          channel_name: typeof body.channel_name === 'string' ? body.channel_name : undefined,
          status: body.status,
          source: body.source,
          output_path: typeof body.output_path === 'string' ? body.output_path : undefined,
          file_size_bytes: typeof body.file_size_bytes === 'number' ? body.file_size_bytes : undefined,
          error_message: typeof body.error_message === 'string' ? body.error_message : undefined,
          metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
        };

        if (input.sportarr_id) {
          const recording = await upsertRecordingBySportarrId(input.sportarr_id, input);
          return res.status(200).json(recording);
        }

        const recording = await createRecording(input);
        return res.status(201).json(recording);
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Recording with this stream_id and start_time already exists'
      });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
