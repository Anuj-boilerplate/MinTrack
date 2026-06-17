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

export function hexToRgba(hex, opacity) {
    if (!hex) return `rgba(255, 255, 255, ${opacity})`;
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function getAccentColor(savedColor, isLight) {
    const color = savedColor || '#c97b6e';
    if (!isLight) return color;
    
    switch (color.toLowerCase()) {
        case '#c97b6e': return '#a84551'; // Dusty Rose -> Crimson Ink
        case '#6b8f71': return '#4d7044'; // Sage Green -> Moss Green Ink
        case '#c49a3c': return '#99693b'; // Warm Amber -> Sepia Amber Ink
        case '#5b7a99': return '#3d5e7a'; // Slate Blue -> Slate Blue Ink
        case '#8b82b8': return '#6946a3'; // Muted Lavender -> Plum Ink
        case '#b5603a': return '#a8563b'; // Terracotta -> Terracotta Ink
        case '#4a8c8c': return '#2b7a7a'; // Soft Teal -> Teal Ink
        case '#b8960c': return '#a27e05'; // Antique Gold -> Saturated Antique Gold
        default: return color;
    }
}


