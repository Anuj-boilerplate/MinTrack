// Date Utilities
export function getStartOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getDaysLeft(currentDate, endDateString) {
    const end = getStartOfDay(new Date(endDateString));
    const current = getStartOfDay(currentDate);
    const diffTime = end - current;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatISODateForDisplay(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString; // fallback if invalid
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatHoursToMins(decimalHours) {
    if (isNaN(decimalHours) || decimalHours < 0) return '0h';
    const totalMins = Math.round(decimalHours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

export function getSessionRangeFromTimes(startTime, endTime, referenceDate = new Date()) {
    const year = referenceDate.getFullYear();
    const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
    const day = String(referenceDate.getDate()).padStart(2, '0');
    const datePrefix = `${year}-${month}-${day}`;

    const start = new Date(`${datePrefix}T${startTime}`);
    const end = new Date(`${datePrefix}T${endTime}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    if (end < start) {
        end.setDate(end.getDate() + 1);
    }

    return {
        start,
        end,
        durationMinutes: (end - start) / 60000
    };
}
