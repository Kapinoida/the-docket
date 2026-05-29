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
    // Check UTC hours — midnight UTC means date-only (bare date string like "2026-05-30")
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        // Reconstruct as noon LOCAL time to prevent day-shift in America/Chicago
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
    }
    // Has an explicit time — preserve as-is for timestamptz
    return d;
};

export const parseLocalDateNode = (dateVal: string | Date | null | undefined): Date | null => {
    if (!dateVal) return null;
    
    if (typeof dateVal === 'string') {
        // For ISO date-time strings (including UTC)
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(dateVal)) {
            // It's an ISO timestamp — parse carefully to avoid timezone shift
            const dt = new Date(dateVal);
            // For midnight UTC, preserve the day correctly  
            if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0) {
                // This is a date-only input that became midnight UTC. Represent as local noon to avoid day flip.
                return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0, 0);
            }
            // Time-based datetime from DB - just return it
            return dt;
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