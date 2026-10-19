import { createMocks } from 'node-mocks-http';
import webpush from 'web-push';
import {
  getPushSubscriptions,
  getTasksDueSoon,
  recordPushNotification,
  removePushSubscriptionById,
} from '@/lib/db';
import handler from '@/pages/api/push/send';

// `jose` is ESM only and cannot be loaded by the CJS test runtime, so the
// session verification is stubbed. The route's job is to wire the credential
// check, not to re-implement JWT validation.
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
  getPushSubscriptions: jest.fn(),
  getTasksDueSoon: jest.fn(),
  recordPushNotification: jest.fn(),
  removePushSubscriptionById: jest.fn(),
}));

const TRIGGER_TOKEN = 'trigger-token-for-tests';
const TRIGGER_HEADER = 'x-push-trigger-token';
const MOCK_SESSION_TOKEN = 'valid-session-token';

const subscription = {
  id: 7,
  endpoint: 'https://push.example.com/secret-endpoint-abc',
  p256dh: 'secret-p256dh-key',
  auth: 'secret-auth-key',
};

const task = {
  id: 42,
  content: 'Call the dentist',
  due_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
};

async function makeSessionToken() {
  return MOCK_SESSION_TOKEN;
}

function post(overrides: Record<string, unknown> = {}) {
  return createMocks({ method: 'POST', ...overrides });
}

describe('/api/push/send', () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.PUSH_TRIGGER_TOKEN = TRIGGER_TOKEN;
    process.env.VAPID_PUBLIC_KEY = 'test-vapid-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';

    (getTasksDueSoon as jest.Mock).mockResolvedValue([task]);
    (getPushSubscriptions as jest.Mock).mockResolvedValue([subscription]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);
    (recordPushNotification as jest.Mock).mockResolvedValue(undefined);
    (removePushSubscriptionById as jest.Mock).mockResolvedValue(undefined);

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    delete process.env.PUSH_TRIGGER_TOKEN;
  });

  describe('authorization', () => {
    it('rejects a request with no credential at all', async () => {
      const { req, res } = post();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(getTasksDueSoon).not.toHaveBeenCalled();
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('rejects a request with the wrong trigger token', async () => {
      const { req, res } = post({ headers: { [TRIGGER_HEADER]: 'wrong-token' } });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(getTasksDueSoon).not.toHaveBeenCalled();
    });

    it('rejects a trigger request when no trigger token is configured', async () => {
      delete process.env.PUSH_TRIGGER_TOKEN;

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(getTasksDueSoon).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('PUSH_TRIGGER_TOKEN is not configured')
      );
    });

    it('accepts the correct trigger token', async () => {
      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('accepts a valid session cookie', async () => {
      const token = await makeSessionToken();
      const { req, res } = post({ cookies: { token } });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid session cookie', async () => {
      const { req, res } = post({ cookies: { token: 'not-a-jwt' } });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('rejects non-POST methods', async () => {
      const { req, res } = createMocks({ method: 'GET' });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(res.getHeader('Allow')).toEqual(['POST']);
    });
  });

  describe('delivery accounting', () => {
    it('returns 200 with no tasks when nothing is due', async () => {
      (getTasksDueSoon as jest.Mock).mockResolvedValue([]);

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toMatchObject({
        sent: 0,
        delivered: 0,
        failed: 0,
        removed: 0,
        tasks: 0,
      });
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('returns 200 with no subscribers and does not record anything', async () => {
      (getPushSubscriptions as jest.Mock).mockResolvedValue([]);

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const body = JSON.parse(res._getData());
      expect(body).toMatchObject({ sent: 0, delivered: 0, failed: 0, removed: 0, tasks: 1 });
      expect(body.message).toBe('No subscribers');
      expect(recordPushNotification).not.toHaveBeenCalled();
    });

    it('records a notification and reports counts when delivery succeeds', async () => {
      (getPushSubscriptions as jest.Mock).mockResolvedValue([subscription, { ...subscription, id: 8 }]);

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        sent: 1,
        delivered: 2,
        failed: 0,
        removed: 0,
        tasks: 1,
      });
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(recordPushNotification).toHaveBeenCalledTimes(1);
      expect(recordPushNotification).toHaveBeenCalledWith(task.id);
    });

    it('records a notification when at least one delivery succeeds', async () => {
      (getPushSubscriptions as jest.Mock).mockResolvedValue([subscription, { ...subscription, id: 8 }]);
      (webpush.sendNotification as jest.Mock)
        .mockRejectedValueOnce(Object.assign(new Error('boom'), { statusCode: 500 }))
        .mockResolvedValueOnce(undefined);

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        sent: 1,
        delivered: 1,
        failed: 1,
        removed: 0,
        tasks: 1,
      });
      expect(recordPushNotification).toHaveBeenCalledWith(task.id);
    });

    it('does not record a notification when every delivery fails', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        Object.assign(new Error('boom'), { statusCode: 500 })
      );

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        sent: 0,
        delivered: 0,
        failed: 1,
        removed: 0,
        tasks: 1,
      });
      expect(recordPushNotification).not.toHaveBeenCalled();
    });

    it('removes expired subscriptions and does not record when nothing was delivered', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        Object.assign(new Error('gone'), { statusCode: 410 })
      );

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        sent: 0,
        delivered: 0,
        failed: 1,
        removed: 1,
        tasks: 1,
      });
      expect(removePushSubscriptionById).toHaveBeenCalledWith(subscription.id);
      expect(recordPushNotification).not.toHaveBeenCalled();
    });

    it('removes subscriptions that return 404', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        Object.assign(new Error('missing'), { statusCode: 404 })
      );

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(removePushSubscriptionById).toHaveBeenCalledWith(subscription.id);
      expect(JSON.parse(res._getData()).removed).toBe(1);
    });

    it('keeps subscriptions whose failure is not an expiry', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        Object.assign(new Error('server down'), { statusCode: 503 })
      );

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(removePushSubscriptionById).not.toHaveBeenCalled();
      expect(JSON.parse(res._getData()).removed).toBe(0);
    });

    it('reports failures without exposing subscription secrets', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        Object.assign(new Error('boom'), { statusCode: 500 })
      );

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      const body = res._getData();
      expect(body).not.toContain(subscription.endpoint);
      expect(body).not.toContain(subscription.p256dh);
      expect(body).not.toContain(subscription.auth);

      const logged = warnSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(logged).not.toContain(subscription.endpoint);
      expect(logged).not.toContain(subscription.p256dh);
      expect(logged).not.toContain(subscription.auth);
      expect(logged).toContain('500:1');
    });

    it('returns 500 when the database layer fails', async () => {
      (getTasksDueSoon as jest.Mock).mockRejectedValue(new Error('db is down'));

      const { req, res } = post({ headers: { [TRIGGER_HEADER]: TRIGGER_TOKEN } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({ error: 'Push notification failed' });
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
