// Date Utilities
function getStartOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getDaysLeft(currentDate, endDateString) {
    const end = getStartOfDay(new Date(endDateString));
    const current = getStartOfDay(currentDate);
    const diffTime = end - current;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatHoursToMins(decimalHours) {
    if (isNaN(decimalHours) || decimalHours < 0) return '0h';
    const totalMins = Math.round(decimalHours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}
