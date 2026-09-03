export function hexToRgba(hex, opacity) {
  if (!hex) return `rgba(255, 255, 255, ${opacity})`;
  if (hex.startsWith('var(')) {
    return `color-mix(in srgb, ${hex} ${opacity * 100}%, transparent)`;
  }
  const num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function formatTodoDeadline(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export function formatRecurrence(days) {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map(d => WEEKDAYS_SHORT[d]).join(' ');
}

export function getDateForOffset(offset, pivot = new Date()) {
  const d = new Date(pivot);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

// Normalizes any date-ish value (ISO timestamp or YYYY-MM-DD) to a YYYY-MM-DD string
export function datePart(value) {
  if (!value) return null;
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formats the origin date of an auto-forwarded task, e.g. "from Aug 5"
export function formatCarriedFrom(originalDate) {
  if (!originalDate) return '';
  const date = new Date(originalDate + 'T12:00:00');
  if (isNaN(date.getTime())) return '';
  return `from ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

// Number of days a task has been carried forward from its original date
export function getDaysCarried(originalDate, currentDate) {
  if (!originalDate || !currentDate) return 0;
  const orig = new Date(originalDate + 'T12:00:00');
  const curr = new Date(currentDate + 'T12:00:00');
  if (isNaN(orig.getTime()) || isNaN(curr.getTime())) return 0;
  return Math.round((curr - orig) / (1000 * 60 * 60 * 24));
}

export function getTodosForDate(todos, dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun, 6=Sat
  return todos.filter(todo => {
    const sched = datePart(todo.scheduled_date);
    if (sched) {
      return sched === dateStr;
    }
    if (todo.recurrence_days && todo.recurrence_days.length > 0) {
      return todo.recurrence_days.includes(dow);
    }
    return false;
  });
}

export function generateRecurringInstances({
  title,
  note = '',
  deadline = null,
  recurrenceDays,
  startDate,
  endDate = null,
  userId = null,
  maxDays = 90
}) {
  if (!recurrenceDays || recurrenceDays.length === 0) return [];

  const startStr = datePart(startDate) || new Date().toISOString().split('T')[0];
  const start = new Date(startStr + 'T12:00:00');
  if (isNaN(start.getTime())) return [];

  const endStr = endDate ? datePart(endDate) : null;
  let end = endStr ? new Date(endStr + 'T12:00:00') : null;

  // Default to 30 days if no valid endDate or if endDate is before startDate
  if (!end || isNaN(end.getTime()) || end < start) {
    end = new Date(start);
    end.setDate(end.getDate() + 29);
  }

  // Safety cap to avoid runaway loops
  const maxEnd = new Date(start);
  maxEnd.setDate(maxEnd.getDate() + maxDays - 1);
  if (end > maxEnd) {
    end = maxEnd;
  }

  const recurringGroupId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const instances = [];
  const current = new Date(start);

  while (current <= end) {
    const dow = current.getDay();
    if (recurrenceDays.includes(dow)) {
      const dateStr = current.toISOString().split('T')[0];
      instances.push({
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `todo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        user_id: userId,
        title,
        note,
        deadline,
        scheduled_date: dateStr,
        recurrence_days: [...recurrenceDays],
        recurring_group_id: recurringGroupId,
        is_completed: false,
        is_scratched_today: false,
        display_order: 0,
        created_at: new Date().toISOString(),
        original_date: null,
        google_event_id: null
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return instances;
}


// Tidal sweep: auto-forward incomplete one-off tasks scheduled before today.
// The first forward stamps original_date with the task's first scheduled date;
// subsequent forwards preserve it. Returns the updated todos plus the forwards
// that need to be synced as UPDATE_TODO actions.
export function forwardOverdueTodos(todos, todayStr) {
  const forwarded = [];
  const next = todos.map(todo => {
    const scheduled = datePart(todo.scheduled_date);
    if (
      scheduled &&
      scheduled < todayStr &&
      !todo.is_completed &&
      (!todo.recurrence_days || todo.recurrence_days.length === 0)
    ) {
      forwarded.push({ id: todo.id, original_date: todo.original_date || scheduled });
      return {
        ...todo,
        original_date: todo.original_date || scheduled,
        scheduled_date: todayStr
      };
    }
    return todo;
  });
  return { todos: next, forwarded };
}

// Ghost cleanup: drop one-off tasks scheduled beyond the term end date.
// Returns the surviving todos plus the ids of dropped tasks to sync as DELETE_TODO actions.
export function dropGhostTodos(todos, termEnd) {
  if (!termEnd) return { todos, ghostRemoved: [] };
  const ghostRemoved = [];
  const next = todos.filter(todo => {
    if (!todo.scheduled_date || todo.recurrence_days?.length > 0) return true;
    const withinTerm = datePart(todo.scheduled_date) <= termEnd;
    if (!withinTerm) ghostRemoved.push(todo.id);
    return withinTerm;
  });
  return { todos: next, ghostRemoved };
}
