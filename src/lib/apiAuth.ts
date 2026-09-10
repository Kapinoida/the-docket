import { NextApiRequest, NextApiResponse } from 'next';
import { jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireAuth(req: NextApiRequest): Promise<void> {
  const token = req.cookies.token;

  if (!token) {
    throw new AuthError('No token provided');
  }

  try {
    await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'the-docket',
      audience: 'the-docket',
    });
  } catch (error) {
    throw new AuthError('Invalid or expired token');
  }
}

export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await requireAuth(req);
      return await handler(req, res);
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(401).json({ error: error.message });
      }
      throw error;
    }
  };
}
