// Helper utility for rendering tasks accurately in local time without timezone shifts
export const parseLocalDateNode = (dateVal: string | Date | null | undefined): Date | null => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
        // Strip timezone and time if present "YYYY-MM-DDT..."
        const dateStr = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
        const [y, m, d] = dateStr.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date(dateVal); // fallback for totally invalid formats
        
        // Return a local Date object securely placed precisely at Noon to avoid ANY shift
        const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
        return dt;
    }
    // If it's already a JS Date object, preserve its time info if non-midnight,
    // otherwise normalize to noon to avoid timezone day-shifts
    const dt = new Date(dateVal);
    // Check UTC hours/min/sec — midnight UTC means it was a date-only value,
    // which would shift a day in non-UTC timezones
    if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0) {
        // Was a date-only value (midnight UTC) — reconstruct using UTC date parts
        return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0, 0);
    }
    return dt;
};
