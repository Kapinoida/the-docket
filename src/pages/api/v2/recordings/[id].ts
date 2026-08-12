import type { NextApiRequest, NextApiResponse } from 'next';
import { getRecording, updateRecording, deleteRecording } from '@/lib/db';
import { UpdateRecordingInput } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const { id } = req.query;
  const recordingId = parseInt(id as string);

  if (isNaN(recordingId)) {
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
        const body: UpdateRecordingInput = req.body;

        if (Object.keys(body).length === 0) {
          return res.status(400).json({ error: 'No fields to update' });
        }

        const updated = await updateRecording(recordingId, body);
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
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
