/**
 * Centralized API fetch wrapper with global 401 (auth-expired) handling.
 *
 * - On any 401 response: dispatches an `auth:expired` CustomEvent on `window`
 *   so the UI layer can show a toast and redirect to /login. Throws an
 *   `AuthError` so callers' `.catch`/`try-catch` blocks exit cleanly without
 *   silently continuing as if the request succeeded.
 * - On other non-2xx responses: throws an `ApiError` carrying `status` +
 *   `statusText` so callers can surface a user-facing message.
 * - On 2xx: returns the parsed JSON body (or `undefined` for 204).
 *
 * Why a module-level redirect guard: rapid successive 401s (e.g. parallel
 * `Promise.all` of tasks + events) should only trigger one redirect, not N.
 */

export class ApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    constructor(status: number, statusText: string) {
        super(`API error ${status}${statusText ? `: ${statusText}` : ''}`);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
    }
}

export class AuthError extends Error {
    constructor() {
        super('Session expired');
        this.name = 'AuthError';
    }
}

let redirectingRef = false;

export function handleSessionExpired(): void {
    if (redirectingRef) return;
    redirectingRef = true;
    if (typeof window === 'undefined') return;
    // Guard: already on the login page — don't redirect to self (prevents infinite loop
    // when providers/components on the login page trigger API calls that return 401).
    if (window.location.pathname === '/login') return;
    const target = window.location.pathname + window.location.search;
    window.location.href = `/login?redirect=${encodeURIComponent(target)}`;
}

/**
 * Dispatch the global `auth:expired` event. The UI listener (wired in
 * LayoutWrapper) shows a toast and then calls `handleSessionExpired()`.
 * Exported so non-`apiFetch` callers (e.g. raw `fetch` in `login/page.tsx`
 * that explicitly opts out) can still signal expiry centrally.
 */
export function notifyAuthExpired(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('auth:expired'));
}

/**
 * Fetch wrapper that parses JSON and converts non-2xx responses into
 * `ApiError` (or `AuthError` for 401). Returns the parsed JSON body on
 * success, or `undefined` for 204 No Content responses.
 *
 * @example
 *   const task = await apiFetch<Task>(`/api/v2/tasks/${id}`);
 *   await apiFetch(`/api/v2/tasks/${id}`, { method: 'DELETE' });
 */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);

    if (res.status === 401) {
        notifyAuthExpired();
        throw new AuthError();
    }

    if (!res.ok) {
        throw new ApiError(res.status, res.statusText);
    }

    if (res.status === 204) {
        return undefined as unknown as T;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return (await res.json()) as T;
    }
    // Non-JSON success responses (e.g. text/plain) — return as text.
    return (await res.text()) as unknown as T;
}