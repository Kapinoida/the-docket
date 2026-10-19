/**
 * @jest-environment node
 */

/**
 * The service worker caches app-shell HTML by pathname. `/capture` is opened
 * cold from a launcher shortcut, so it must always be fetched fresh: a cached
 * copy would reference JS chunk hashes that no longer exist after a deploy,
 * and a cached login redirect would mask the real page.
 *
 * Every `event.respondWith()` branch must resolve to a real `Response`.
 * `caches.match()` resolves to `undefined` on a miss, and handing `undefined`
 * to `respondWith()` throws
 * `TypeError: Failed to convert value to 'Response'` in the browser (BUG-023).
 */

type FetchHandler = (event: unknown) => void;

interface ServiceWorkerGlobals {
  self: {
    addEventListener: (type: string, handler: FetchHandler) => void;
    skipWaiting: () => void;
    clients: { claim: jest.Mock };
  };
  caches: {
    match: jest.Mock;
    open: jest.Mock;
    keys: jest.Mock;
    delete: jest.Mock;
  };
  fetch: jest.Mock;
}

interface ServiceWorkerOptions {
  fetchImpl?: jest.Mock;
  cacheMatchImpl?: jest.Mock;
  cacheKeysImpl?: jest.Mock;
}

const PREVIOUS_CACHE_NAME = 'docket-v5';

function loadServiceWorker(options: ServiceWorkerOptions = {}): {
  handlers: Record<string, FetchHandler>;
  globals: ServiceWorkerGlobals;
} {
  const handlers: Record<string, FetchHandler> = {};

  const fetchImpl =
    options.fetchImpl ??
    jest.fn().mockResolvedValue({
      ok: true,
      clone: () => ({ ok: true }),
    });
  const cacheMatchImpl =
    options.cacheMatchImpl ?? jest.fn().mockResolvedValue(undefined);
  const cacheKeysImpl = options.cacheKeysImpl ?? jest.fn().mockResolvedValue([]);

  const globals = {
    self: {
      addEventListener: (type: string, handler: FetchHandler) => {
        handlers[type] = handler;
      },
      skipWaiting: () => {},
      clients: { claim: jest.fn() },
    },
    caches: {
      match: cacheMatchImpl,
      open: jest.fn().mockResolvedValue({
        put: jest.fn().mockResolvedValue(undefined),
        addAll: jest.fn().mockResolvedValue(undefined),
      }),
      keys: cacheKeysImpl,
      delete: jest.fn().mockResolvedValue(true),
    },
    fetch: fetchImpl,
  } as unknown as ServiceWorkerGlobals;

  (globalThis as unknown as { self: unknown }).self = globals.self;
  (globalThis as unknown as { caches: unknown }).caches = globals.caches;
  (globalThis as unknown as { fetch: unknown }).fetch = globals.fetch;

  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../../public/sw.js');

  return { handlers, globals };
}

function dispatchFetch(handlers: Record<string, FetchHandler>, pathname: string) {
  const respondWith = jest.fn();
  const event = {
    request: { method: 'GET', url: `https://docket.dcplaskett.com${pathname}` },
    respondWith,
  };

  handlers.fetch(event);
  return respondWith;
}

/** Await the value handed to `event.respondWith()`. */
async function respondValue(respondWith: jest.Mock): Promise<unknown> {
  expect(respondWith).toHaveBeenCalledTimes(1);
  const value = respondWith.mock.calls[0][0];
  return await value;
}

describe('service worker fetch routing', () => {
  afterEach(() => {
    delete (globalThis as unknown as { self?: unknown }).self;
    delete (globalThis as unknown as { caches?: unknown }).caches;
  });

  it('always fetches /capture fresh instead of serving cached HTML', () => {
    const { handlers, globals } = loadServiceWorker();

    const respondWith = dispatchFetch(handlers, '/capture');

    expect(respondWith).toHaveBeenCalledTimes(1);
    expect(globals.caches.match).not.toHaveBeenCalled();
    expect(globals.fetch).toHaveBeenCalledTimes(1);
  });

  it('still serves the rest of the app shell stale-while-revalidate', () => {
    const { handlers, globals } = loadServiceWorker();

    dispatchFetch(handlers, '/inbox');

    expect(globals.caches.match).toHaveBeenCalledTimes(1);
  });

  it('leaves API and Next.js asset requests alone', () => {
    const { handlers, globals } = loadServiceWorker();

    const respondWith = dispatchFetch(handlers, '/api/v2/tasks');

    expect(respondWith).not.toHaveBeenCalled();
    expect(globals.fetch).not.toHaveBeenCalled();
  });
});

describe('service worker offline fallbacks', () => {
  afterEach(() => {
    delete (globalThis as unknown as { self?: unknown }).self;
    delete (globalThis as unknown as { caches?: unknown }).caches;
  });

  it('responds with a Response when /capture fails on the network with no cached copy', async () => {
    const { handlers } = loadServiceWorker({
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
      cacheMatchImpl: jest.fn().mockResolvedValue(undefined),
    });

    const respondWith = dispatchFetch(handlers, '/capture');
    const value = await respondValue(respondWith);

    expect(value).toBeInstanceOf(Response);
  });

  it('responds with a Response when /page/{id} fails on the network with no cached copy', async () => {
    const { handlers } = loadServiceWorker({
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
      cacheMatchImpl: jest.fn().mockResolvedValue(undefined),
    });

    const respondWith = dispatchFetch(handlers, '/page/42');
    const value = await respondValue(respondWith);

    expect(value).toBeInstanceOf(Response);
  });

  it('responds with a Response when an app-shell route fails on the network with no cached copy', async () => {
    const { handlers } = loadServiceWorker({
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
      cacheMatchImpl: jest.fn().mockResolvedValue(undefined),
    });

    const respondWith = dispatchFetch(handlers, '/inbox');
    const value = await respondValue(respondWith);

    expect(value).toBeInstanceOf(Response);
  });

  it('serves the cached copy when the network fails', async () => {
    const cached = new Response('<html>cached shell</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
    const { handlers } = loadServiceWorker({
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
      cacheMatchImpl: jest.fn().mockResolvedValue(cached),
    });

    const respondWith = dispatchFetch(handlers, '/capture');
    const value = (await respondValue(respondWith)) as Response;

    expect(value).toBeInstanceOf(Response);
    expect(value.status).toBe(200);
    await expect(value.text()).resolves.toContain('cached shell');
  });

  it('does not fabricate a successful app page when offline and uncached', async () => {
    const { handlers } = loadServiceWorker({
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
      cacheMatchImpl: jest.fn().mockResolvedValue(undefined),
    });

    const respondWith = dispatchFetch(handlers, '/capture');
    const value = (await respondValue(respondWith)) as Response;

    expect(value).toBeInstanceOf(Response);
    expect(value.ok).toBe(false);
    expect(value.status).toBe(503);
    expect(value.headers.get('Content-Type')).toContain('text/plain');
  });

  it('does not cache the offline fallback as an app-shell entry', async () => {
    const { handlers, globals } = loadServiceWorker({
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
      cacheMatchImpl: jest.fn().mockResolvedValue(undefined),
    });

    dispatchFetch(handlers, '/inbox');
    // Let the revalidation promise settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globals.caches.open).not.toHaveBeenCalled();
  });
});

describe('service worker cache versioning', () => {
  afterEach(() => {
    delete (globalThis as unknown as { self?: unknown }).self;
    delete (globalThis as unknown as { caches?: unknown }).caches;
  });

  it('bumped the cache version so clients receive the corrected worker', () => {
    const { handlers, globals } = loadServiceWorker();

    handlers.install({ waitUntil: () => {} });

    const cacheName = globals.caches.open.mock.calls[0][0];
    expect(cacheName).not.toBe(PREVIOUS_CACHE_NAME);
    expect(cacheName).toMatch(/^docket-v\d+$/);
  });

  it('deletes stale caches on activate', async () => {
    const { handlers, globals } = loadServiceWorker({
      cacheKeysImpl: jest.fn().mockResolvedValue([PREVIOUS_CACHE_NAME, 'docket-v9']),
    });
    let activationPromise: Promise<unknown> | undefined;

    handlers.activate({
      waitUntil: (promise: Promise<unknown>) => {
        activationPromise = promise;
      },
    });
    await activationPromise;

    expect(globals.caches.delete).toHaveBeenCalledWith(PREVIOUS_CACHE_NAME);
    expect(globals.caches.delete).toHaveBeenCalledWith('docket-v9');
  });
});
