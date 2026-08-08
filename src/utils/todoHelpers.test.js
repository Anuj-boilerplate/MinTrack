import { describe, it, expect } from 'vitest';
import {
  formatCarriedFrom,
  getDaysCarried,
  datePart,
  forwardOverdueTodos,
  dropGhostTodos
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
