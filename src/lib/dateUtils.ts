// Helper utility for rendering tasks accurately in local time without timezone shifts
export const parseLocalDateNode = (dateVal: string | Date | null | undefined): Date | null => {
    if (!dateVal) return null;
    
    if (typeof dateVal === 'string') {
        // For ISO date-time strings (including UTC)
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/.test(dateVal)) {
            // It's a UTC timestamp with `Z` - parse carefully to avoid timezone shift
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