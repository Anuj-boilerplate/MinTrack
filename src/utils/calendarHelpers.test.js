import { describe, it, expect } from 'vitest';
import { eventDate, groupEventsByDate, formatEventTime } from './calendarHelpers';

describe('eventDate', () => {
  it('passes through all-day date strings', () => {
    expect(eventDate('2026-08-09')).toBe('2026-08-09');
  });

  it('strips the time from dateTime ISO strings', () => {
    expect(eventDate('2026-08-09T10:00:00+05:30')).toBe('2026-08-09');
    expect(eventDate('2026-08-09T10:00:00.000Z')).toBe('2026-08-09');
  });

  it('rejects invalid values', () => {
    expect(eventDate(null)).toBeNull();
    expect(eventDate('')).toBeNull();
    expect(eventDate('not-a-date')).toBeNull();
    expect(eventDate('2026-13-99')).toBeNull();
  });
});

describe('groupEventsByDate', () => {
  const makeEvent = (overrides = {}) => ({
    id: 'ev1',
    summary: 'Event',
    start: '2026-08-09T10:00:00',
    end: '2026-08-09T11:00:00',
    allDay: false,
    ...overrides
  });

  it('groups timed and all-day events into their date buckets', () => {
    const events = [
      makeEvent({ id: 'a', start: '2026-08-09T10:00:00+05:30' }),
      makeEvent({ id: 'b', start: '2026-08-09', allDay: true }),
      makeEvent({ id: 'c', start: '2026-08-10T08:00:00Z' })
    ];
    expect(groupEventsByDate(events)).toEqual({
      '2026-08-09': [events[0], events[1]],
      '2026-08-10': [events[2]]
    });
  });

  it('skips events without a usable start date', () => {
    const events = [makeEvent({ start: null }), makeEvent({ start: undefined })];
    expect(groupEventsByDate(events)).toEqual({});
  });

  it('handles empty and undefined input', () => {
    expect(groupEventsByDate([])).toEqual({});
    expect(groupEventsByDate(undefined)).toEqual({});
  });
});

describe('formatEventTime', () => {
  it('returns null for all-day events', () => {
    expect(formatEventTime({ allDay: true, start: '2026-08-09' })).toBeNull();
    expect(formatEventTime({ allDay: true })).toBeNull();
  });

  it('returns null when no start is present', () => {
    expect(formatEventTime({ allDay: false })).toBeNull();
  });

  it('formats timed events to a short local time', () => {
    const time = formatEventTime({ allDay: false, start: '2026-08-09T14:30:00' });
    expect(time).toMatch(/2:30/);
  });
});