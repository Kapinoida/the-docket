// Helper utility for rendering tasks accurately in local time without timezone shifts
export const parseLocalDateNode = (dateVal: string | Date | null | undefined): Date | null => {
    if (!dateVal) return null;
    const dt = new Date(dateVal);
    if (isNaN(dt.getTime())) return null;
    // Check UTC hours — midnight UTC means it was a date-only value (no explicit time set).
    // Shift to noon local to prevent timezone day-off-by-one on display.
    if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0) {
        return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0, 0);
    }
    // Has a real time — return as-is (browser auto-converts UTC to local for display)
    return dt;
};
