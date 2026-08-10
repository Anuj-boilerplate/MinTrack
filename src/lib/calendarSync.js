// Pure diff engine for MinTrack → Google Calendar sync.
// Compares the previously-synced snapshot of todos against the current list
// and produces the minimal set of calendar ops needed to mirror them.

export function isTodoEligibleForCalendar(todo, todayStr) {
  if (!todo.scheduled_date) return false;          // unscheduled → no event
  if (String(todo.scheduled_date) < todayStr) return false; // past → never sync history
  if (todo.is_completed) return false;             // done one-off → no standing event
  return true;
}

function snapshotOf(todo) {
  return {
    id: todo.id,
    googleEventId: todo.google_event_id || null,
    title: todo.title || '',
    scheduled_date: todo.scheduled_date || null,
    recurrence_days: Array.isArray(todo.recurrence_days) ? [...todo.recurrence_days] : null,
    is_completed: Boolean(todo.is_completed),
    is_scratched_today: Boolean(todo.is_scratched_today),
  };
}

// Builds a Map snapshot from a todo list (used to seed / refresh the tracker)
export function buildTodoSnapshot(todos, preservedEventIds = {}) {
  const map = new Map();
  for (const todo of todos || []) {
    const snap = snapshotOf(todo);
    if (!snap.googleEventId && preservedEventIds[snap.id]) {
      snap.googleEventId = preservedEventIds[snap.id];
    }
    map.set(snap.id, snap);
  }
  return map;
}

// Naughty-but-clean comparison: JSON of the fields that can affect the event
function mirrorFieldsChanged(a, b) {
  return JSON.stringify([a.title, a.scheduled_date, a.recurrence_days]) !==
         JSON.stringify([b.title, b.scheduled_date, b.recurrence_days]);
}

/**
 * Returns { creates: [todoSnapshot], updates: [todoSnapshot], deletes: [{ id, googleEventId }] }
 */
export function computeCalendarOps(previous, todos, todayStr) {
  const creates = [];
  const updates = [];
  const deletes = [];

  const currentIds = new Set();
  for (const todo of todos || []) {
    const current = snapshotOf(todo);
    currentIds.add(current.id);
    const prior = previous?.get(current.id);

    if (!isTodoEligibleForCalendar(current, todayStr)) {
      // Was mirrored, no longer should be → remove the event
      const knownId = current.googleEventId || prior?.googleEventId;
      if (knownId) deletes.push({ id: current.id, googleEventId: knownId });
      continue;
    }

    if (!current.googleEventId) {
      // No event yet — either brand new or backfill of a previously-untracked task
      creates.push(current);
      continue;
    }

    if (prior && mirrorFieldsChanged(prior, current)) {
      updates.push(current);
    }
  }

  // Todos that vanished from state (deleted tasks) while an event existed
  for (const [id, prior] of (previous || new Map()).entries()) {
    if (!currentIds.has(id) && prior.googleEventId) {
      deletes.push({ id, googleEventId: prior.googleEventId });
    }
  }

  return { creates, updates, deletes };
}