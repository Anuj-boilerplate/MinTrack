import { describe, it, expect } from 'vitest';
import {
  formatCarriedFrom,
  getDaysCarried,
  datePart,
  forwardOverdueTodos,
  dropGhostTodos,
  getTodosForDate,
  generateRecurringInstances
} from './todoHelpers';

const makeTodo = (overrides = {}) => ({
  id: 't1',
  title: 'Task',
  is_completed: false,
  is_scratched_today: false,
  recurrence_days: null,
  scheduled_date: null,
  original_date: null,
  ...overrides
});

describe('datePart', () => {
  it('passes through YYYY-MM-DD strings', () => {
    expect(datePart('2026-08-05')).toBe('2026-08-05');
  });

  it('strips the time from ISO timestamps', () => {
    expect(datePart('2026-08-05T12:00:00.000Z')).toBe('2026-08-05');
    expect(datePart('2026-08-05T18:30:00+05:30')).toBe('2026-08-05');
  });

  it('returns null for falsy values', () => {
    expect(datePart(null)).toBeNull();
    expect(datePart('')).toBeNull();
    expect(datePart(undefined)).toBeNull();
  });
});

describe('formatCarriedFrom', () => {
  it('formats a valid date', () => {
    expect(formatCarriedFrom('2026-08-05')).toBe('from Aug 5');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(formatCarriedFrom(null)).toBe('');
    expect(formatCarriedFrom('')).toBe('');
    expect(formatCarriedFrom('not-a-date')).toBe('');
  });
});

describe('getDaysCarried', () => {
  it('computes the day difference between original and current date', () => {
    expect(getDaysCarried('2026-08-05', '2026-08-08')).toBe(3);
    expect(getDaysCarried('2026-08-05', '2026-08-05')).toBe(0);
  });

  it('returns 0 for missing or invalid inputs', () => {
    expect(getDaysCarried(null, '2026-08-08')).toBe(0);
    expect(getDaysCarried('2026-08-05', null)).toBe(0);
    expect(getDaysCarried('garbage', '2026-08-08')).toBe(0);
  });
});

describe('forwardOverdueTodos', () => {
  const today = '2026-08-08';

  it('forwards an incomplete one-off task and stamps original_date once', () => {
    const todo = makeTodo({ scheduled_date: '2026-08-05' });
    const { todos, forwarded } = forwardOverdueTodos([todo], today);

    expect(todos[0].scheduled_date).toBe(today);
    expect(todos[0].original_date).toBe('2026-08-05');
    expect(forwarded).toEqual([{ id: 't1', original_date: '2026-08-05' }]);
  });

  it('preserves original_date on a second forward', () => {
    const todo = makeTodo({ scheduled_date: '2026-08-06', original_date: '2026-08-05' });
    const { todos, forwarded } = forwardOverdueTodos([todo], today);

    expect(todos[0].scheduled_date).toBe(today);
    expect(todos[0].original_date).toBe('2026-08-05');
    expect(forwarded).toEqual([{ id: 't1', original_date: '2026-08-05' }]);
  });

  it('does not forward completed tasks', () => {
    const todo = makeTodo({ scheduled_date: '2026-08-05', is_completed: true });
    const { todos, forwarded } = forwardOverdueTodos([todo], today);

    expect(todos[0].scheduled_date).toBe('2026-08-05');
    expect(forwarded).toEqual([]);
  });

  it('does not forward recurring tasks', () => {
    const todo = makeTodo({ scheduled_date: '2026-08-05', recurrence_days: [1, 3] });
    const { todos, forwarded } = forwardOverdueTodos([todo], today);

    expect(todos[0].scheduled_date).toBe('2026-08-05');
    expect(forwarded).toEqual([]);
  });

  it('does not forward tasks scheduled today or in the future', () => {
    const todayTodo = makeTodo({ id: 'a', scheduled_date: today });
    const futureTodo = makeTodo({ id: 'b', scheduled_date: '2026-08-20' });
    const { todos, forwarded } = forwardOverdueTodos([todayTodo, futureTodo], today);

    expect(todos).toEqual([todayTodo, futureTodo]);
    expect(forwarded).toEqual([]);
  });

  it('does not forward tasks without a scheduled date', () => {
    const todo = makeTodo({ scheduled_date: null });
    const { todos, forwarded } = forwardOverdueTodos([todo], today);

    expect(todos).toEqual([todo]);
    expect(forwarded).toEqual([]);
  });

  it('handles ISO timestamps in scheduled_date', () => {
    const todo = makeTodo({ scheduled_date: '2026-08-05T12:00:00.000Z' });
    const { todos, forwarded } = forwardOverdueTodos([todo], today);

    expect(todos[0].scheduled_date).toBe(today);
    expect(todos[0].original_date).toBe('2026-08-05');
    expect(forwarded.length).toBe(1);
  });
});

describe('dropGhostTodos', () => {
  const termEnd = '2026-12-31';

  it('drops one-off tasks scheduled beyond the term end', () => {
    const ghost = makeTodo({ id: 'ghost', scheduled_date: '2030-01-01' });
    const keep = makeTodo({ id: 'keep', scheduled_date: '2026-12-31' });
    const { todos, ghostRemoved } = dropGhostTodos([ghost, keep], termEnd);

    expect(todos.map(t => t.id)).toEqual(['keep']);
    expect(ghostRemoved).toEqual(['ghost']);
  });

  it('keeps recurring tasks and tasks without a scheduled date', () => {
    const recurring = makeTodo({ id: 'r', scheduled_date: '2030-01-01', recurrence_days: [0] });
    const noDate = makeTodo({ id: 'n', scheduled_date: null });
    const { todos, ghostRemoved } = dropGhostTodos([recurring, noDate], termEnd);

    expect(todos.map(t => t.id)).toEqual(['r', 'n']);
    expect(ghostRemoved).toEqual([]);
  });

  it('keeps everything when there is no term end', () => {
    const ghost = makeTodo({ scheduled_date: '2030-01-01' });
    const { todos, ghostRemoved } = dropGhostTodos([ghost], null);

    expect(todos).toEqual([ghost]);
    expect(ghostRemoved).toEqual([]);
  });
});

describe('generateRecurringInstances', () => {
  it('generates an instance for every day in a date range for daily recurrence', () => {
    const instances = generateRecurringInstances({
      title: 'Leetcode',
      recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2026-09-01', // Tuesday
      endDate: '2026-09-07',   // Monday
      userId: 'user-1'
    });

    expect(instances.length).toBe(7);
    expect(instances.map(i => i.scheduled_date)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
      '2026-09-07'
    ]);

    // All instances have unique IDs and share the same recurring_group_id
    const ids = new Set(instances.map(i => i.id));
    expect(ids.size).toBe(7);
    expect(instances.every(i => i.recurring_group_id === instances[0].recurring_group_id)).toBe(true);
    expect(instances.every(i => i.is_completed === false)).toBe(true);
    expect(instances.every(i => i.user_id === 'user-1')).toBe(true);
  });

  it('filters by weekdays correctly', () => {
    const instances = generateRecurringInstances({
      title: 'Gym',
      recurrenceDays: [1, 2, 3, 4, 5], // Mon-Fri
      startDate: '2026-09-04', // Friday
      endDate: '2026-09-07'    // Monday
    });

    // 2026-09-04 is Fri (5), 05 is Sat (6), 06 is Sun (0), 07 is Mon (1)
    expect(instances.map(i => i.scheduled_date)).toEqual([
      '2026-09-04',
      '2026-09-07'
    ]);
  });

  it('returns empty array when recurrenceDays is empty or null', () => {
    expect(generateRecurringInstances({ title: 'Task', recurrenceDays: [] })).toEqual([]);
    expect(generateRecurringInstances({ title: 'Task', recurrenceDays: null })).toEqual([]);
  });
});

describe('getTodosForDate with independent recurring instances', () => {
  it('places each concrete recurring instance strictly on its own scheduled_date', () => {
    const instances = generateRecurringInstances({
      title: 'Leetcode',
      recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
      startDate: '2026-09-01',
      endDate: '2026-09-03'
    });

    // Completing the task on Sep 02
    instances[1].is_completed = true;

    const day1Todos = getTodosForDate(instances, '2026-09-01');
    const day2Todos = getTodosForDate(instances, '2026-09-02');
    const day3Todos = getTodosForDate(instances, '2026-09-03');

    expect(day1Todos.length).toBe(1);
    expect(day1Todos[0].id).toBe(instances[0].id);
    expect(day1Todos[0].is_completed).toBe(false);

    expect(day2Todos.length).toBe(1);
    expect(day2Todos[0].id).toBe(instances[1].id);
    expect(day2Todos[0].is_completed).toBe(true); // completed on day 2!

    expect(day3Todos.length).toBe(1);
    expect(day3Todos[0].id).toBe(instances[2].id);
    expect(day3Todos[0].is_completed).toBe(false); // day 3 remains incomplete!
  });
});

