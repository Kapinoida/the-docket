/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

jest.mock('jose', () => ({
  jwtVerify: jest.fn(async () => ({ payload: { sub: 'dave' } })),
}));

const TRIGGER_HEADER = 'x-push-trigger-token';

function request(pathname: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    method: 'POST',
    headers,
  });
}

describe('middleware', () => {
  beforeEach(() => {
    process.env.PUSH_TRIGGER_TOKEN = 'trigger-token-for-tests';
  });

  afterEach(() => {
    delete process.env.PUSH_TRIGGER_TOKEN;
  });

  it('lets a valid push trigger through without a session cookie', async () => {
    const res = await middleware(request('/api/push/send', { [TRIGGER_HEADER]: 'trigger-token-for-tests' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('rejects a push trigger request with the wrong token', async () => {
    const res = await middleware(request('/api/push/send', { [TRIGGER_HEADER]: 'wrong-token' }));

    expect(res.status).toBe(401);
  });

  it('rejects a push trigger request with no credential at all', async () => {
    const res = await middleware(request('/api/push/send'));

    expect(res.status).toBe(401);
  });

  it('rejects a push trigger request when no trigger token is configured', async () => {
    delete process.env.PUSH_TRIGGER_TOKEN;

    const res = await middleware(request('/api/push/send', { [TRIGGER_HEADER]: 'trigger-token-for-tests' }));

    expect(res.status).toBe(401);
  });

  it('still requires a session for ordinary API routes', async () => {
    const res = await middleware(request('/api/v2/tasks'));

    expect(res.status).toBe(401);
  });

  it('does not let the trigger bypass other routes', async () => {
    const res = await middleware(request('/api/v2/tasks', { [TRIGGER_HEADER]: 'trigger-token-for-tests' }));

    expect(res.status).toBe(401);
  });
});
