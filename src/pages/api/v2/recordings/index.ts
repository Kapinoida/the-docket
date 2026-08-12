import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecordings, createRecording, GetRecordingsOptions } from '@/lib/db';
import { CreateRecordingInput } from '@/types';

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
        if (status && typeof status === 'string') options.status = status;

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
        if (limit && typeof limit === 'string') options.limit = parseInt(limit);

        const offset = req.query.offset;
        if (offset && typeof offset === 'string') options.offset = parseInt(offset);

        const recordings = await getRecordings(options);
        return res.status(200).json(recordings);
      }

      case 'POST': {
        const body: CreateRecordingInput = req.body;

        if (!body.stream_id || !body.title || !body.start_time || !body.end_time) {
          return res.status(400).json({
            error: 'Missing required fields: stream_id, title, start_time, end_time'
          });
        }

        const recording = await createRecording(body);
        return res.status(201).json(recording);
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error: unknown) {
    console.error('API Error:', error);
    const err = error as { code?: string };
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Recording with this stream_id and start_time already exists'
      });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
