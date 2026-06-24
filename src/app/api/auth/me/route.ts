import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }

  try {
    const payload = await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({
      authenticated: true,
      user: payload.payload.sub,
    });
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
