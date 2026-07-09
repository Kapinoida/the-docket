/**
 * Tests for parseLocalDateNode — the most bug-prone utility in the app.
 * 
 * Context: America/Chicago (UTC-5/-6). A UTC midnight date like 
 * "2026-05-18T00:00:00.000Z" is 7pm May 17 in Chicago. This function must
 * detect date-only inputs and return local noon on the correct calendar day.
 */
import { parseLocalDateNode } from '@/lib/dateUtils';

describe('parseLocalDateNode', () => {
    // ── Null/undefined ────────────────────────────────────
    it('returns null for null input', () => {
        expect(parseLocalDateNode(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(parseLocalDateNode(undefined)).toBeNull();
    });

    // ── Bare date strings ("2026-05-18") ─────────────────
    it('parses bare date string to noon on correct day', () => {
        const result = parseLocalDateNode('2026-05-18');
        expect(result).not.toBeNull();
        expect(result!.getFullYear()).toBe(2026);
        expect(result!.getMonth()).toBe(4); // May is 4
        expect(result!.getDate()).toBe(18);
        expect(result!.getHours()).toBe(12);
        expect(result!.getMinutes()).toBe(0);
    });

    it('handles single-digit month and day in bare date string', () => {
        const result = parseLocalDateNode('2026-01-03');
        expect(result).not.toBeNull();
        expect(result!.getMonth()).toBe(0);  // January
        expect(result!.getDate()).toBe(3);
    });

    // ── UTC midnight ISO timestamps (explicit T component) ─
    // These have an explicit time component and are preserved as-is,
    // NOT normalized to local noon. A UTC midnight may land on the
    // previous calendar day in Chicago — that is the correct behavior.
    const tzOffsetMin = new Date('2026-07-15T00:00:00.000Z').getTimezoneOffset();

    it('preserves UTC midnight ISO timestamp as-is', () => {
        const input = '2026-05-18T00:00:00.000Z';
        const result = parseLocalDateNode(input);
        expect(result).toEqual(new Date(input));
    });

    it('preserves UTC midnight timestamp without fractional seconds', () => {
        const input = '2026-01-01T00:00:00Z';
        const result = parseLocalDateNode(input);
        expect(result).toEqual(new Date(input));
    });

    it('preserves leap year UTC midnight timestamp as-is', () => {
        const input = '2024-02-29T00:00:00.000Z';
        const result = parseLocalDateNode(input);
        expect(result).toEqual(new Date(input));
        // Sanity check: month/day depend on the local timezone offset
        expect(result!.getUTCMonth()).toBe(1);  // February (UTC)
        expect(result!.getUTCDate()).toBe(29);
    });

    // ── UTC timestamps with explicit time (NOT midnight) ─
    it('preserves explicit UTC time (3:30 PM)', () => {
        // 3:30 PM UTC = 10:30 AM Chicago
        const result = parseLocalDateNode('2026-05-18T15:30:00.000Z');
        expect(result!.getUTCHours()).toBe(15);
        expect(result!.getUTCMinutes()).toBe(30);
    });

    it('preserves non-midnight hour in UTC', () => {
        // 1:00 AM UTC — not midnight, should preserve the hour
        const result = parseLocalDateNode('2026-05-18T01:00:00.000Z');
        expect(result!.getUTCHours()).toBe(1);
        expect(result!.getUTCMinutes()).toBe(0); // minutes are 0 in input
    });

    // ── Date objects (already parsed) ────────────────────
    it('handles Date object set to midnight UTC', () => {
        const date = new Date('2026-05-18T00:00:00.000Z');
        const result = parseLocalDateNode(date);
        expect(result!.getFullYear()).toBe(2026);
        expect(result!.getMonth()).toBe(4);
        expect(result!.getDate()).toBe(18);
        expect(result!.getHours()).toBe(12);
    });

    it('handles Date object with explicit time', () => {
        const date = new Date('2026-05-18T15:30:00.000Z');
        const result = parseLocalDateNode(date);
        expect(result!.getUTCHours()).toBe(15);
        expect(result!.getUTCMinutes()).toBe(30);
    });

    // ── Invalid inputs ───────────────────────────────────
    it('returns null for invalid date string', () => {
        expect(parseLocalDateNode('not-a-date')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(parseLocalDateNode('')).toBeNull();
    });

    // ── DST transition edge cases (America/Chicago) ──────
    // UTC midnight timestamps are preserved as-is; the local calendar
    // day/hour depends on the DST offset. Verify preservation, not noon.
    it('preserves UTC midnight timestamp during CST (winter, UTC-6)', () => {
        const input = '2026-01-15T00:00:00.000Z';
        const result = parseLocalDateNode(input);
        expect(result).toEqual(new Date(input));
    });

    it('preserves UTC midnight timestamp during CDT (summer, UTC-5)', () => {
        const input = '2026-07-15T00:00:00.000Z';
        const result = parseLocalDateNode(input);
        expect(result).toEqual(new Date(input));
    });

    // ── iso strings without Z (local midnight) ────────────
    it('handles ISO string without timezone as local midnight', () => {
        // "2026-05-18T00:00:00" — no Z means local time per ECMAScript spec
        // In Chicago this is midnight CDT, 5:00 AM UTC
        const result = parseLocalDateNode('2026-05-18T00:00:00');
        expect(result!.getMonth()).toBe(4);
        expect(result!.getDate()).toBe(18);
        // It's local midnight with a real time — hours preserved
        expect(result!.getHours()).toBe(0);
    });
});
