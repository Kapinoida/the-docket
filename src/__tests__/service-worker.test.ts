/**
 * @jest-environment node
 */

/**
 * The service worker caches app-shell HTML by pathname. `/capture` is opened
 * cold from a launcher shortcut, so it must always be fetched fresh: a cached
 * copy would reference JS chunk hashes that no longer exist after a deploy,
 * and a cached login redirect would mask the real page.
 */

type FetchHandler = (event: unknown) => void;

interface ServiceWorkerGlobals {
  self: {
    addEventListener: (type: string, handler: FetchHandler) => void;
    skipWaiting: () => void;
  };
  caches: {
    match: jest.Mock;
    open: jest.Mock;
    keys: jest.Mock;
  };
  fetch: jest.Mock;
}

function loadServiceWorker(): { handlers: Record<string, FetchHandler>; globals: ServiceWorkerGlobals } {
  const handlers: Record<string, FetchHandler> = {};

  const globals = {
    self: {
      addEventListener: (type: string, handler: FetchHandler) => {
        handlers[type] = handler;
      },
      skipWaiting: () => {},
    },
    caches: {
      match: jest.fn().mockResolvedValue(undefined),
      open: jest.fn().mockResolvedValue({
        put: jest.fn().mockResolvedValue(undefined),
        addAll: jest.fn().mockResolvedValue(undefined),
      }),
      keys: jest.fn().mockResolvedValue([]),
    },
    fetch: jest.fn().mockResolvedValue({
      ok: true,
      clone: () => ({ ok: true }),
    }),
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
