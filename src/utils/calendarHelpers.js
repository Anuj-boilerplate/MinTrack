// Extracts the calendar-day string (YYYY-MM-DD) from an event start/end value.
// Google returns either a dateTime (ISO with offset, e.g. "2026-08-09T10:00:00+05:30")
// or a date (all-day, e.g. "2026-08-09"). The date component is always the
// calendar's local day, so it maps directly onto a runway column.
export function eventDate(value) {
  if (!value) return null;
  const str = String(value);
  if (!str) return null;
  const dateStr = str.includes('T') ? str.split('T')[0] : str;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  // Strict ISO parse rejects impossible dates (e.g. 2026-13-99, 2026-02-31)
  if (isNaN(new Date(`${dateStr}T00:00:00Z`).getTime())) return null;
  return dateStr;
}

// Groups a flat event list into a map of date string → event[]
export function groupEventsByDate(events) {
  const byDate = {};
  for (const event of events || []) {
    const dateStr = eventDate(event.start);
    if (!dateStr) continue;
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push(event);
  }
  return byDate;
}

// Formats the event start as a short local time (e.g. "2:30 PM"), or null for all-day events
export function formatEventTime(event) {
  if (!event || event.allDay || !event.start) return null;
  const date = new Date(event.start);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}