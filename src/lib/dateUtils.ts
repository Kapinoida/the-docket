// Helper utility for rendering tasks accurately in local time without timezone shifts

/**
 * Normalize a date value for database storage.
 * Date-only values (midnight UTC, bare date strings) are stored as noon LOCAL time
 * to avoid day-shift in America/Chicago (UTC-5/-6).
 * Values with explicit times are preserved as-is.
 */
export const normalizeDateToNoon = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    // ISO timestamps (containing 'T') have an explicit time component — preserve as-is
    // even if the time happens to be midnight UTC (e.g., 7 PM CT = 00:00 UTC next day)
    if (typeof dateVal === 'string' && dateVal.includes('T')) return d;
    // Bare date strings (e.g., "2026-05-30") arrive as midnight UTC — normalize to noon LOCAL
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
    }
    return d;
};

export const parseLocalDateNode = (dateVal: string | Date | null | undefined): Date | null => {
    if (!dateVal) return null;
    
    if (typeof dateVal === 'string') {
        // For ISO date-time strings (including UTC)
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(dateVal)) {
            // ISO timestamps have an explicit time component — return as-is
            return new Date(dateVal);
        }
        // Regular date string like "2026-05-18"  
        const [y, m, d] = dateVal.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
        return new Date(y, m - 1, d, 12, 0, 0, 0); // Noon to prevent shift by timezone
    }
    
    // If it's already a JS Date object, process normally
    const dt = new Date(dateVal);
    if (isNaN(dt.getTime())) return null;
    
    // Return local noon for date-only times
    if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0) {
        return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0, 0);
    }
    return dt;
};