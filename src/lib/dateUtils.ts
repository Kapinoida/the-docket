// Helper utility for rendering tasks accurately in local time without timezone shifts
export const parseLocalDateNode = (dateVal: string | Date | null | undefined): Date | null => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
        // Strip timezone and time if present "YYYY-MM-DDT..."
        const dateStr = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
        const [y, m, d] = dateStr.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date(dateVal); // fallback for totally invalid formats
        
        // Return a local Date object securely placed precisely at Noom to avoid ANY shift
        const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
        return dt;
    }
    // If it's already a JS Date object, just normalize to noon.
    const dt = new Date(dateVal);
    dt.setHours(12, 0, 0, 0);
    return dt;
};
