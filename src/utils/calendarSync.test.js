import { describe, it, expect } from 'vitest';
import { isTodoEligibleForCalendar, buildTodoSnapshot, computeCalendarOps } from '../lib/calendarSync';

const T = '2026-08-10';

const makeTodo = (overrides = {}) => ({
  id: 't1',
  title: 'Write essay',
  scheduled_date: '2026-08-12',
  recurrence_days: null,
  is_completed: false,
  is_scratched_today: false,
  google_event_id: null,
  ...overrides
});

describe('isTodoEligibleForCalendar', () => {
  it('accepts a scheduled, uncompleted task', () => {
    expect(isTodoEligibleForCalendar(makeTodo(), T)).toBe(true);
  });

  it('rejects unscheduled tasks', () => {
    expect(isTodoEligibleForCalendar(makeTodo({ scheduled_date: null }), T)).toBe(false);
  });

  it('rejects tasks scheduled in the past', () => {
    expect(isTodoEligibleForCalendar(makeTodo({ scheduled_date: '2026-08-09' }), T)).toBe(false);
  });

  it('rejects completed tasks', () => {
    expect(isTodoEligibleForCalendar(makeTodo({ is_completed: true }), T)).toBe(false);
  });

  it('keeps recurring series eligible even when scratched today', () => {
    const todo = makeTodo({ recurrence_days: [1, 3], is_scratched_today: true });
    expect(isTodoEligibleForCalendar(todo, T)).toBe(true);
  });
});

describe('computeCalendarOps', () => {
  it('creates events for new eligible tasks (backfill included)', () => {
    const todo = makeTodo();
    const ops = computeCalendarOps(new Map(), [todo], T);
    expect(ops.creates.map(c => c.id)).toEqual(['t1']);
    expect(ops.updates).toEqual([]);
    expect(ops.deletes).toEqual([]);
  });

  it('creates nothing for ineligible tasks', () => {
    const todos = [
      makeTodo({ id: 'a', scheduled_date: null }),
      makeTodo({ id: 'b', is_completed: true }),
      makeTodo({ id: 'c', scheduled_date: '2026-08-01' }),
    ];
    const ops = computeCalendarOps(new Map(), todos, T);
    expect(ops.creates).toEqual([]);
  });

  it('updates when the title changes', () => {
    const previous = buildTodoSnapshot([makeTodo({ google_event_id: 'ev1' })]);
    const current = makeTodo({ google_event_id: 'ev1', title: 'Write essay v2' });
    const ops = computeCalendarOps(previous, [current], T);
    expect(ops.updates.map(u => u.id)).toEqual(['t1']);
    expect(ops.creates).toEqual([]);
  });

  it('updates when the scheduled date changes (tidal forward)', () => {
    const previous = buildTodoSnapshot([makeTodo({ google_event_id: 'ev1', scheduled_date: '2026-08-11' })]);
    const current = makeTodo({ google_event_id: 'ev1', scheduled_date: '2026-08-12' });
    const ops = computeCalendarOps(previous, [current], T);
    expect(ops.updates.map(u => u.id)).toEqual(['t1']);
  });

  it('updates when recurrence changes', () => {
    const previous = buildTodoSnapshot([makeTodo({ google_event_id: 'ev1', recurrence_days: [1] })]);
    const current = makeTodo({ google_event_id: 'ev1', recurrence_days: [1, 3, 5] });
    const ops = computeCalendarOps(previous, [current], T);
    expect(ops.updates.map(u => u.id)).toEqual(['t1']);
  });

  it('does not re-push when nothing relevant changed', () => {
    const previous = buildTodoSnapshot([makeTodo({ google_event_id: 'ev1', is_scratched_today: false })]);
    const current = makeTodo({ google_event_id: 'ev1', is_scratched_today: true });
    const ops = computeCalendarOps(previous, [current], T);
    expect(ops.creates).toEqual([]);
    expect(ops.updates).toEqual([]);
    expect(ops.deletes).toEqual([]);
  });

  it('deletes the event when a one-off task is completed', () => {
    const previous = buildTodoSnapshot([makeTodo({ google_event_id: 'ev1' })]);
    const current = makeTodo({ google_event_id: 'ev1', is_completed: true });
    const ops = computeCalendarOps(previous, [current], T);
    expect(ops.deletes).toEqual([{ id: 't1', googleEventId: 'ev1' }]);
  });

  it('deletes the event when the task is gone from state', () => {
    const previous = buildTodoSnapshot([makeTodo({ google_event_id: 'ev1' })]);
    const ops = computeCalendarOps(previous, [], T);
    expect(ops.deletes).toEqual([{ id: 't1', googleEventId: 'ev1' }]);
  });

  it('creates a fresh event after uncompleting (old one was deleted)', () => {
    const current = makeTodo({ is_completed: false, google_event_id: null });
    const ops = computeCalendarOps(new Map(), [current], T);
    expect(ops.creates.map(c => c.id)).toEqual(['t1']);
  });

  it('deletes the series when a recurring task is deleted', () => {
    const todo = makeTodo({ recurrence_days: [1, 3], google_event_id: 'ev-r1' });
    const previous = buildTodoSnapshot([todo]);
    const ops = computeCalendarOps(previous, [], T);
    expect(ops.deletes).toEqual([{ id: 't1', googleEventId: 'ev-r1' }]);
  });
});