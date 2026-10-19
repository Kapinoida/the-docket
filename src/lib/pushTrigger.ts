/**
 * Server-to-server authentication for the push reminder trigger.
 *
 * `/api/push/send` is invoked by an external cron job (Hermes) that has no
 * user session. Instead of leaving the route unauthenticated, the caller must
 * present a dedicated shared secret:
 *
 *   PUSH_TRIGGER_TOKEN    env var holding the expected secret
 *   X-Push-Trigger-Token  request header carrying the secret
 *
 * The secret is deliberately separate from `WIDGET_TOKEN` and the VAPID keys
 * so that rotating one never invalidates another, and so a leaked widget
 * token cannot be used to trigger pushes.
 *
 * These helpers are pure (no DB, no env access) so they can be unit tested
 * and reused from both the Edge middleware and the Node route handler.
 */

export const PUSH_TRIGGER_HEADER = 'x-push-trigger-token';

/** `Headers` instance — used by the Edge middleware. */
export interface HeaderGetter {
  get(name: string): string | null | undefined;
}

/** Plain header record — used by Node's `IncomingHttpHeaders` in API routes. */
export type HeaderRecord = Record<string, string | string[] | undefined>;

export type HeaderReader = HeaderGetter | HeaderRecord;

/**
 * Read a header from either a `Headers` instance (Edge middleware) or a
 * plain header record (Node `IncomingHttpHeaders`).
 */
function readHeader(headers: HeaderReader | null | undefined, name: string): string | null {
  if (!headers) return null;

  if (typeof (headers as HeaderGetter).get === 'function') {
    const value = (headers as HeaderGetter).get(name);
    return typeof value === 'string' ? value : null;
  }

  const record = headers as HeaderRecord;
  const direct = record[name];
  if (typeof direct === 'string') return direct;

  const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name);
  if (!key) return null;

  const value = record[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null;
  return null;
}

/**
 * Read the trigger token from a request's headers.
 * Returns `null` when the header is absent, empty, or not a string.
 */
export function extractTriggerToken(headers?: HeaderReader | null): string | null {
  if (!headers) return null;

  const raw = readHeader(headers, PUSH_TRIGGER_HEADER);
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Constant-time string comparison.
 *
 * Length is compared up front (an accepted trade-off — the secret length is
 * not itself a meaningful leak), then every character is folded into a
 * single accumulator so the comparison time does not depend on *where* the
 * first mismatch occurs.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  const left = a.trim();
  const right = b.trim();
  if (left.length === 0 || right.length === 0) return false;
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * True when the request carries the correct trigger credential.
 *
 * Fails closed: if no expected token is configured, or the request has no
 * header, the result is `false` and the caller must fall back to the normal
 * session authentication.
 */
export function isValidPushTrigger(
  headers: HeaderReader | null | undefined,
  expectedToken: string | undefined | null
): boolean {
  if (!expectedToken || typeof expectedToken !== 'string') return false;

  const provided = extractTriggerToken(headers);
  if (!provided) return false;

  return timingSafeEqual(provided, expectedToken);
}
