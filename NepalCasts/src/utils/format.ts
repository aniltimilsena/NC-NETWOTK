export const formatMessagePreview = (text: string | null | undefined): string => {
    if (!text)
        return '';
    if (typeof text !== 'string')
        return String(text);
    const trimmed = text.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const lower = trimmed.toLowerCase();
        if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('/video/')) {
            return ' Sent a video';
        }
        if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('.webp') || lower.includes('/image/') || lower.includes('cloudinary')) {
            return ' Sent a photo';
        }
        return ' Sent a link';
    }
    return text;
};

export const formatRole = (role: string | null | undefined): string => {
    if (!role) return 'Actor';
    const trimmed = String(role).trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'user' || lower === 'talent') return 'Actor';
    if (lower.includes('actor') || lower.includes('actress')) return 'Actor';
    return trimmed;
};

/**
 * Checks whether a casting call / audition deadline has closed.
 * Returns true if:
 * - call.status === 'closed'
 * - call.isClosed === true
 * - call.deadline date is in the past (after end-of-day of the deadline date)
 */
export const isCastingCallClosed = (call: any): boolean => {
    if (!call) return true;
    if (call.status === 'closed' || call.isClosed === true || call.closed === true) return true;

    if (call.deadline) {
        const deadlineStr = String(call.deadline).trim();
        if (!deadlineStr || deadlineStr.toLowerCase() === 'n/a' || deadlineStr.toLowerCase() === 'none') {
            return false;
        }

        // Standard date format YYYY-MM-DD (e.g. 2026-09-11)
        if (/^\d{4}-\d{2}-\d{2}$/.test(deadlineStr)) {
            const [year, month, day] = deadlineStr.split('-').map(Number);
            // Valid until the end of the deadline day (23:59:59.999 local time)
            const endOfDeadlineDay = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
            return Date.now() > endOfDeadlineDay;
        }

        // Any other parseable date/time string
        const parsedDate = new Date(deadlineStr);
        if (!isNaN(parsedDate.getTime())) {
            // If time was omitted or set to midnight 00:00:00, allow until end of that day
            if (parsedDate.getHours() === 0 && parsedDate.getMinutes() === 0 && parsedDate.getSeconds() === 0) {
                parsedDate.setHours(23, 59, 59, 999);
            }
            return Date.now() > parsedDate.getTime();
        }
    }

    return false;
};

