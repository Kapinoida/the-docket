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

    // ── UTC midnight (date-only from DB) ─────────────────
    it('detects midnight UTC and preserves the correct calendar day', () => {
        // "2026-05-18T00:00:00.000Z" is 7pm May 17 in Chicago
        // Must return noon May 18, NOT May 17
        const result = parseLocalDateNode('2026-05-18T00:00:00.000Z');
        expect(result!.getFullYear()).toBe(2026);
        expect(result!.getMonth()).toBe(4);
        expect(result!.getDate()).toBe(18);
        expect(result!.getHours()).toBe(12);
    });

    it('detects midnight UTC without fractional seconds', () => {
        const result = parseLocalDateNode('2026-01-01T00:00:00Z');
        expect(result!.getFullYear()).toBe(2026);
        expect(result!.getMonth()).toBe(0);
        expect(result!.getDate()).toBe(1);
        expect(result!.getHours()).toBe(12);
    });

    it('handles leap year date at midnight UTC', () => {
        const result = parseLocalDateNode('2024-02-29T00:00:00.000Z');
        expect(result!.getMonth()).toBe(1);  // February
        expect(result!.getDate()).toBe(29);
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
    it('handles date during CST (winter, UTC-6)', () => {
        // January 15 — firmly in CST
        const result = parseLocalDateNode('2026-01-15T00:00:00.000Z');
        expect(result!.getMonth()).toBe(0);
        expect(result!.getDate()).toBe(15);
        expect(result!.getHours()).toBe(12);
    });

    it('handles date during CDT (summer, UTC-5)', () => {
        // July 15 — firmly in CDT
        const result = parseLocalDateNode('2026-07-15T00:00:00.000Z');
        expect(result!.getMonth()).toBe(6);
        expect(result!.getDate()).toBe(15);
        expect(result!.getHours()).toBe(12);
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
