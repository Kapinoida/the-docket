import { createMocks } from 'node-mocks-http';
import webpush from 'web-push';
import { getPushSubscriptionByEndpoint, removePushSubscriptionById } from '@/lib/db';
import handler from '@/pages/api/push/test-notification';

// `jose` is ESM only and cannot be loaded by the CJS test runtime.
jest.mock('jose', () => ({
  jwtVerify: jest.fn(async (token: string) => {
    if (token === MOCK_SESSION_TOKEN) {
      return { payload: { sub: 'dave' } };
    }
    throw new Error('Invalid or expired token');
  }),
}));

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
  getPushSubscriptionByEndpoint: jest.fn(),
  removePushSubscriptionById: jest.fn(),
}));

const MOCK_SESSION_TOKEN = 'valid-session-token';

const subscription = {
  id: 11,
  endpoint: 'https://push.example.com/device-endpoint',
  p256dh: 'secret-p256dh-key',
  auth: 'secret-auth-key',
};

async function makeSessionToken() {
  return MOCK_SESSION_TOKEN;
}

describe('/api/push/test-notification', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.VAPID_PUBLIC_KEY = 'test-vapid-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';

    (getPushSubscriptionByEndpoint as jest.Mock).mockResolvedValue(subscription);
    (removePushSubscriptionById as jest.Mock).mockResolvedValue(undefined);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);

    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('requires a session', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { endpoint: subscription.endpoint },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('sends a test notification to a known subscription', async () => {
    const token = await makeSessionToken();
    const { req, res } = createMocks({
      method: 'POST',
      cookies: { token },
      body: { endpoint: subscription.endpoint },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ ok: true });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing endpoint', async () => {
    const token = await makeSessionToken();
    const { req, res } = createMocks({ method: 'POST', cookies: { token }, body: {} });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('rejects an endpoint that is not a known subscription', async () => {
    (getPushSubscriptionByEndpoint as jest.Mock).mockResolvedValue(null);

    const token = await makeSessionToken();
    const { req, res } = createMocks({
      method: 'POST',
      cookies: { token },
      body: { endpoint: 'https://push.example.com/unknown' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('cleans up an expired subscription', async () => {
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      Object.assign(new Error('gone'), { statusCode: 410 })
    );

    const token = await makeSessionToken();
    const { req, res } = createMocks({
      method: 'POST',
      cookies: { token },
      body: { endpoint: subscription.endpoint },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(410);
    expect(removePushSubscriptionById).toHaveBeenCalledWith(subscription.id);
  });

  it('does not leak the endpoint when delivery fails', async () => {
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      Object.assign(new Error('server down'), { statusCode: 500 })
    );

    const token = await makeSessionToken();
    const { req, res } = createMocks({
      method: 'POST',
      cookies: { token },
      body: { endpoint: subscription.endpoint },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(502);
    expect(res._getData()).not.toContain(subscription.endpoint);
    expect(errorSpy).toHaveBeenCalled();
  });
});
