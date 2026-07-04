// Date Utilities

// Returns the local date as a YYYY-MM-DD string, safe for any timezone.
// Never use new Date().toISOString().split('T')[0] — that gives UTC date, not local.
export function toLocalDateString(date = new Date()) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Parses a YYYY-MM-DD date string as local midnight, not UTC midnight.
// new Date('2026-07-04') parses as UTC — this avoids that.
export function parseDateAsLocal(dateStr) {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}
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

export function splitSessionAtMidnight(subjectId, startTimeISO, endTimeISO, fallbackDurationMins) {
    const start = new Date(startTimeISO);
    const end = new Date(endTimeISO);

    // If invalid dates, return a single session with the fallback duration
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return [{
            id: crypto.randomUUID(),
            subject_id: subjectId,
            start_time: startTimeISO,
            end_time: endTimeISO,
            duration_minutes: fallbackDurationMins,
            is_discarded: false
        }];
    }

    const startDay = getStartOfDay(start);
    const endDay = getStartOfDay(end);

    // If it doesn't cross midnight, return single session
    if (startDay.getTime() === endDay.getTime()) {
        return [{
            id: crypto.randomUUID(),
            subject_id: subjectId,
            start_time: startTimeISO,
            end_time: endTimeISO,
            duration_minutes: Math.max(0, fallbackDurationMins),
            is_discarded: false
        }];
    }

    // It crosses midnight. Let's do a proportional split of the ACTUAL duration
    const midnight = new Date(endDay); // 00:00:00 of the end day
    
    // Calculate raw time elapsed on each side of midnight
    const rawTotal = (end.getTime() - start.getTime()) / 60000;
    const raw1 = (midnight.getTime() - start.getTime()) / 60000;
    
    // Failsafe against division by zero
    if (rawTotal <= 0) {
        return [{
            id: crypto.randomUUID(),
            subject_id: subjectId,
            start_time: startTimeISO,
            end_time: endTimeISO,
            duration_minutes: Math.max(0, fallbackDurationMins),
            is_discarded: false
        }];
    }

    // Distribute the true duration (which has breaks subtracted) proportionally
    const ratio = raw1 / rawTotal;
    const duration1 = Math.round(fallbackDurationMins * ratio);
    const duration2 = Math.max(0, fallbackDurationMins - duration1); // Ensure exact total sum

    return [
        {
            id: crypto.randomUUID(),
            subject_id: subjectId,
            start_time: start.toISOString(),
            end_time: new Date(midnight.getTime() - 1000).toISOString(),
            duration_minutes: duration1,
            is_discarded: false
        },
        {
            id: crypto.randomUUID(),
            subject_id: subjectId,
            start_time: midnight.toISOString(),
            end_time: end.toISOString(),
            duration_minutes: duration2,
            is_discarded: false
        }
    ];
}

export function recalculateSubjectStats(subject) {
    const sessions = subject.sessions || [];
    const todayStart = getStartOfDay().getTime();
    
    let totalMins = 0;
    let todayMins = 0;
    
    for (const s of sessions) {
        if (!s.is_discarded) {
            totalMins += (s.duration_minutes || 0);
            
            const sessionStart = new Date(s.start_time).getTime();
            if (sessionStart >= todayStart) {
                todayMins += (s.duration_minutes || 0);
            }
        }
    }
    
    return {
        valid_hours: totalMins / 60,
        completed_today: todayMins / 60
    };
}

// Calculate a subject's frozen daily target based on current progress and days remaining.
// Called at midnight to snapshot a stable value for the day.
export function calculateDailyTarget(subject, termEndDate) {
    const endDate = subject.deadline || termEndDate;
    if (!endDate) return 0;
    const daysLeft = getDaysLeft(getStartOfDay(), endDate);
    if (daysLeft <= 0) return 0;
    const { valid_hours } = recalculateSubjectStats(subject);
    const hoursRemaining = Math.max(0, (subject.target_hours || 0) - valid_hours);
    return hoursRemaining / daysLeft;
}


