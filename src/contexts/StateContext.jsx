/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStartOfDay, getAccentColor, recalculateSubjectStats, calculateDailyTarget, toLocalDateString } from '../utils';
import { addActionToQueue, processSyncQueue } from '../lib/syncQueue';
import { datePart, forwardOverdueTodos, dropGhostTodos, generateRecurringInstances } from '../utils/todoHelpers';

// Debounced sync trigger for todo mutations — batches rapid actions into one flush
let _todoSyncTimer = null;
function scheduleTodoSync() {
  if (_todoSyncTimer) clearTimeout(_todoSyncTimer);
  _todoSyncTimer = setTimeout(() => {
    _todoSyncTimer = null;
    processSyncQueue();
  }, 600);
}

const STATE_KEY = 'mintrack_state';
// Tombstone: tracks session IDs deleted locally but not yet confirmed deleted in Supabase.
// Prevents them from being re-added on reload before the DELETE_SESSION sync completes.
const DELETED_SESSIONS_KEY = 'mintrack_deleted_sessions';

function getDeletedSessionTombstones() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DELETED_SESSIONS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function addDeletedSessionTombstone(sessionId) {
  const tombstones = getDeletedSessionTombstones();
  tombstones.add(sessionId);
  localStorage.setItem(DELETED_SESSIONS_KEY, JSON.stringify([...tombstones]));
}

export function clearDeletedSessionTombstone(sessionId) {
  const tombstones = getDeletedSessionTombstones();
  tombstones.delete(sessionId);
  localStorage.setItem(DELETED_SESSIONS_KEY, JSON.stringify([...tombstones]));
}

const StateContext = createContext();
const UserContext = createContext();

export const useStateContext = () => useContext(StateContext);
export const useUserContext = () => useContext(UserContext);

function normalizeSubject(subject) {
  return {
    ...subject,
    target_hours: Number(subject.target_hours ?? 0),
    paused_time_total: Number(subject.paused_time_total ?? 0),
    paused_time_today: Number(subject.paused_time_today ?? 0),
    deadline: subject.deadline ? new Date(subject.deadline).toISOString() : null,
    accentColor: subject.accent_color || subject.accentColor || '#c97b6e',
    sessions: subject.sessions || []
  };
}

function normalizeTodo(todo) {
  return {
    id: todo.id,
    user_id: todo.user_id || null,
    title: todo.title || '',
    is_completed: Boolean(todo.is_completed),
    is_scratched_today: Boolean(todo.is_scratched_today),
    recurrence_days: Array.isArray(todo.recurrence_days) ? todo.recurrence_days : null,
    recurring_group_id: todo.recurring_group_id || null,
    scheduled_date: todo.scheduled_date || null,
    display_order: todo.display_order ?? 0,
    created_at: todo.created_at ? new Date(todo.created_at).toISOString() : new Date().toISOString(),
    note: todo.note || '',
    deadline: todo.deadline || null,
    original_date: todo.original_date || null,
    google_event_id: todo.google_event_id || null
  };
}

function normalizeState(rawState = {}) {
  const normalizedTerm = rawState.term ? {
    startDate: rawState.term.startDate?.includes('T')
      ? rawState.term.startDate
      : new Date(rawState.term.startDate).toISOString(),
    endDate: rawState.term.endDate?.includes('T')
      ? rawState.term.endDate
      : new Date(rawState.term.endDate).toISOString()
  } : null;

  return {
    term: normalizedTerm,
    subjects: Array.isArray(rawState.subjects)
      ? rawState.subjects.map(normalizeSubject).sort((a, b) => a.name.localeCompare(b.name))
      : [],
    todos: Array.isArray(rawState.todos) ? rawState.todos.map(normalizeTodo) : [],
    activeSession: rawState.activeSession ? {
      ...rawState.activeSession,
      startedAt: rawState.activeSession.startedAt || new Date(rawState.activeSession.startTime).toISOString(),
    } : null,
    last_updated_date: rawState.last_updated_date || new Date().toISOString()
  };
}

export const StateProvider = ({ children, session }) => {
  const [state, setState] = useState({
    term: null,
    subjects: [],
    todos: [],
    activeSession: null,
    last_updated_date: null
  });

  const [loading, setLoading] = useState(true);
  const initializedUserRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionToTheme, setTransitionToTheme] = useState(null);

  const [smartTaskInput, setSmartTaskInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smart_task_input') !== 'false';
    }
    return true;
  });

  const toggleSmartTaskInput = useCallback(() => {
    setSmartTaskInput(prev => {
      const next = !prev;
      localStorage.setItem('smart_task_input', String(next));
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    if (isTransitioning) return; // Ignore clicks if already transitioning

    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      // Store in local storage but DO NOT apply data-theme here. 
      // The overlay applies it exactly on frame 0 to avoid flashing.
      localStorage.setItem('theme', next);
      setTransitionToTheme(next);
      setIsTransitioning(true);
      return prev; // Keep current theme in React state until overlay is ready to switch
    });
  }, [isTransitioning]);

  const onTransitionDone = useCallback(() => {
    setTheme(transitionToTheme);
    setIsTransitioning(false);
    setTransitionToTheme(null);
  }, [transitionToTheme]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        const nextTheme = e.newValue || 'dark';
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const pendingSaveStateRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  // Maintenance mutations (tidal forwards + ghost deletes) captured inside setState, flushed by an effect
  const pendingMaintenanceRef = useRef(null);

  // Debounced saveState helper
  const saveStateDebounced = useCallback((newState) => {
    pendingSaveStateRef.current = newState;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveStateRef.current) {
        localStorage.setItem(STATE_KEY, JSON.stringify(pendingSaveStateRef.current));
        pendingSaveStateRef.current = null;
      }
      saveTimeoutRef.current = null;
    }, 1000); // 1s debounce
  }, []);

  const flushSaveState = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (pendingSaveStateRef.current) {
      localStorage.setItem(STATE_KEY, JSON.stringify(pendingSaveStateRef.current));
      pendingSaveStateRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushSaveState();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushSaveState();
    };
  }, [flushSaveState]);

  // Load and patch state on mount
  const initState = useCallback(async (userId) => {
    if (!userId || initializedUserRef.current === userId) return;
    initializedUserRef.current = userId;

    try {
      const localData = localStorage.getItem(STATE_KEY);
      let patchedState = normalizeState(localData ? JSON.parse(localData) : {});

      // Simple Daily Reset Check for Todos and last_updated_date
      const lastUpdate = getStartOfDay(new Date(patchedState.last_updated_date));
      const today = getStartOfDay();
      const todayStr = toLocalDateString(today);
      const isNewDay = lastUpdate.getTime() < today.getTime();

      if (isNewDay) {
        patchedState.last_updated_date = today.toISOString();
      }

      // Sync with Supabase
      const [{ data: dbProfile }, { data: dbSubjects }, { data: dbTodos }, { data: dbSessions }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('todos').select('*').eq('user_id', userId),
        supabase.from('sessions').select('*')
      ]);

      // Profile (Term) Reconciliation
      if (dbProfile?.term_start_date) {
        patchedState.term = { startDate: dbProfile.term_start_date, endDate: dbProfile.term_end_date };
      } else if (patchedState.term) {
        await supabase.from('profiles').upsert({ id: userId, term_start_date: patchedState.term.startDate, term_end_date: patchedState.term.endDate });
      }

      // Subjects Reconciliation
      const deletedTombstones = getDeletedSessionTombstones();
      if (dbSubjects?.length > 0) {
        patchedState.subjects = dbSubjects.map(dbSub => {
          const localSub = patchedState.subjects.find(ls => ls.id === dbSub.id) || {};
          const subjectSessions = dbSessions
            ? dbSessions.filter(s => s.subject_id === dbSub.id && !deletedTombstones.has(s.id))
            : [];
          const dbSessionIds = new Set(subjectSessions.map(s => s.id));

          // Preserve local-only sessions (queued, not yet synced to DB), excluding any tombstoned ones
          const localOnlySessions = (localSub.sessions || []).filter(
            s => !dbSessionIds.has(s.id) && !deletedTombstones.has(s.id)
          );
          const mergedSessions = [...subjectSessions, ...localOnlySessions];

          return {
            ...dbSub,
            paused_time_today: localSub.paused_time_today || 0,
            paused_time_total: localSub.paused_time_total || 0,
            accent_color: dbSub.accent_color || localSub.accentColor || '#c97b6e',
            accentColor: dbSub.accent_color || localSub.accentColor || '#c97b6e',
            sessions: mergedSessions
          };
        });
        patchedState.subjects.sort((a, b) => a.name.localeCompare(b.name));
        // Snapshot daily target: recalculate on new day, or fill in for subjects missing it
        patchedState.subjects = patchedState.subjects.map(s => ({
          ...s,
          daily_target: (isNewDay || s.daily_target == null)
            ? calculateDailyTarget(s, patchedState.term?.endDate)
            : s.daily_target
        }));
      } else if (patchedState.subjects.length > 0) {
        const toInsert = patchedState.subjects.map(s => {
          // eslint-disable-next-line no-unused-vars
          const { accentColor, sessions, ...rest } = s;
          return {
            ...rest,
            accent_color: accentColor || s.accent_color || '#c97b6e',
            user_id: userId
          };
        });
        await supabase.from('subjects').upsert(toInsert);
      }

      // Todos Reconciliation — prefer local state for fields that may have been mutated
      // but not yet synced (completed, scheduled) to survive page reloads mid-flight.
      const localTodosSnapshot = [...patchedState.todos];
      if (dbTodos && dbTodos.length > 0) {
        patchedState.todos = dbTodos
          .map(dbTodo => {
            const localTodo = patchedState.todos.find(lt => lt.id === dbTodo.id) || {};
            // Prefer local values for mutable fields so in-flight mutations aren't overwritten
            return {
              ...dbTodo,
              title: localTodo.title || dbTodo.title || '',
              is_completed: localTodo.id ? (localTodo.is_completed ?? dbTodo.is_completed ?? false) : (dbTodo.is_completed ?? false),
              is_scratched_today: localTodo.id ? (localTodo.is_scratched_today ?? dbTodo.is_scratched_today ?? false) : (dbTodo.is_scratched_today ?? false),
              recurrence_days: localTodo.id ? (localTodo.recurrence_days ?? dbTodo.recurrence_days ?? null) : (dbTodo.recurrence_days ?? null),
              scheduled_date: localTodo.id ? (localTodo.scheduled_date ?? dbTodo.scheduled_date ?? null) : (dbTodo.scheduled_date ?? null),
              display_order: localTodo.id ? (localTodo.display_order ?? dbTodo.display_order ?? 0) : (dbTodo.display_order ?? 0),
              created_at: dbTodo.created_at ? new Date(dbTodo.created_at).toISOString() : new Date().toISOString(),
              note: localTodo.note ?? dbTodo.note ?? '',
              deadline: localTodo.deadline ?? dbTodo.deadline ?? null,
              original_date: localTodo.id ? (localTodo.original_date ?? dbTodo.original_date ?? null) : (dbTodo.original_date ?? null),
              google_event_id: localTodo.id ? (localTodo.google_event_id ?? dbTodo.google_event_id ?? null) : (dbTodo.google_event_id ?? null)
            };
          });
        // Also keep any local-only todos not yet in DB (queued inserts)
        const dbIds = new Set(patchedState.todos.map(t => t.id));
        const localOnlyTodos = localTodosSnapshot.filter(t => !dbIds.has(t.id));
        patchedState.todos = [...patchedState.todos, ...localOnlyTodos];
      } else if (patchedState.todos.length > 0) {
        const toInsert = patchedState.todos.map(todo => ({
          id: todo.id,
          user_id: userId,
          title: todo.title,
          is_completed: todo.is_completed,
          is_scratched_today: todo.is_scratched_today,
          recurrence_days: todo.recurrence_days,
          scheduled_date: todo.scheduled_date,
          display_order: todo.display_order,
          created_at: todo.created_at,
          note: todo.note,
          deadline: todo.deadline,
          original_date: todo.original_date,
          google_event_id: todo.google_event_id ?? null
        }));
        await supabase.from('todos').upsert(toInsert);
      }

      // ── New-day maintenance: reset scratch state and auto-forward overdue one-off tasks ──
      let forwardedTodos = [];
      if (isNewDay) {
        patchedState.todos = patchedState.todos.map(todo =>
          todo.is_scratched_today ? { ...todo, is_scratched_today: false } : todo
        );
        const sweep = forwardOverdueTodos(patchedState.todos, todayStr);
        patchedState.todos = sweep.todos;
        forwardedTodos = sweep.forwarded;
      }

      // ── Boot-time ghost cleanup: drop one-off tasks scheduled beyond the term end ──
      const cleanup = dropGhostTodos(patchedState.todos, datePart(patchedState.term?.endDate));
      patchedState.todos = cleanup.todos;
      const ghostTodos = cleanup.ghostRemoved;

      // ── Legacy recurring migration: expand virtual recurring tasks into discrete instances ──
      const legacyRecurring = patchedState.todos.filter(t => !t.scheduled_date && t.recurrence_days?.length > 0);
      const migratedLegacyTasks = [];
      if (legacyRecurring.length > 0) {
        const remainingTodos = patchedState.todos.filter(t => t.scheduled_date || !t.recurrence_days?.length);
        for (const legacy of legacyRecurring) {
          const instances = generateRecurringInstances({
            title: legacy.title,
            note: legacy.note,
            deadline: legacy.deadline,
            recurrenceDays: legacy.recurrence_days,
            startDate: todayStr,
            endDate: datePart(patchedState.term?.endDate),
            userId,
            maxDays: 90
          });
          migratedLegacyTasks.push(...instances);
        }
        patchedState.todos = [...remainingTodos, ...migratedLegacyTasks];
      }

      setState(patchedState);
      localStorage.setItem(STATE_KEY, JSON.stringify(patchedState));
      setLoading(false);

      // Queue syncs for maintenance mutations (auto-forwards + ghost deletes)
      for (const forwarded of forwardedTodos) {
        await addActionToQueue({
          type: 'UPDATE_TODO',
          todoId: forwarded.id,
          payload: { scheduled_date: todayStr, original_date: forwarded.original_date }
        });
      }
      for (const id of ghostTodos) {
        await addActionToQueue({ type: 'DELETE_TODO', todoId: id });
      }
      if (forwardedTodos.length > 0 || ghostTodos.length > 0) {
        scheduleTodoSync();
      }
    } catch (err) {
      console.error("Initialization failed", err);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    if (initializedUserRef.current !== session.user.id) {
      setLoading(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initState(session.user.id);
  }, [session, initState]);

  // Periodic Daily Reset Check: runs every minute to silently clear hours, return uncompleted tasks to backlog,
  // auto-forward overdue one-off tasks, and drop one-off tasks scheduled beyond the term end.
  useEffect(() => {
    const checkDailyReset = () => {
      const today = getStartOfDay();
      const todayStr = toLocalDateString(today);
      setState(prev => {
        if (!prev.last_updated_date) return prev;
        const lastUpdate = getStartOfDay(new Date(prev.last_updated_date));
        if (lastUpdate.getTime() < today.getTime()) {
          const termEnd = datePart(prev.term?.endDate);

          const resetTodos = prev.todos.map(todo =>
            todo.is_scratched_today ? { ...todo, is_scratched_today: false } : todo
          );
          // Tidal: auto-forward incomplete one-off tasks from the past
          const sweep = forwardOverdueTodos(resetTodos, todayStr);
          // Ghost cleanup: remove one-off tasks beyond the term end
          const cleanup = dropGhostTodos(sweep.todos, termEnd);

          pendingMaintenanceRef.current = {
            forwarded: sweep.forwarded,
            ghostRemoved: cleanup.ghostRemoved,
            todayStr
          };

          // Snapshot daily targets at midnight for all subjects
          const nextSubjects = prev.subjects.map(s => ({
            ...s,
            daily_target: calculateDailyTarget(s, prev.term?.endDate)
          }));
          const nextState = {
            ...prev,
            subjects: nextSubjects,
            todos: cleanup.todos,
            last_updated_date: today.toISOString()
          };
          localStorage.setItem(STATE_KEY, JSON.stringify(nextState));
          return nextState;
        }
        return prev;
      });
    };
    const interval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(interval);
  }, []);

  // Flush maintenance syncs (tidal forwards + ghost deletes) captured by the daily reset.
  // Runs after every render as a post-commit hook so the setState updater stays side-effect free.
  useEffect(() => {
    const pending = pendingMaintenanceRef.current;
    if (!pending) return;
    pendingMaintenanceRef.current = null;
    const { forwarded, ghostRemoved, todayStr } = pending;
    (async () => {
      for (const item of forwarded) {
        await addActionToQueue({
          type: 'UPDATE_TODO',
          todoId: item.id,
          payload: { scheduled_date: todayStr, original_date: item.original_date }
        });
      }
      for (const id of ghostRemoved) {
        await addActionToQueue({ type: 'DELETE_TODO', todoId: id });
      }
      if (forwarded.length > 0 || ghostRemoved.length > 0) {
        scheduleTodoSync();
      }
    })();
  });


  // Wrapper to update state and save automatically
  const updateState = useCallback((updater) => {
    setState(prev => {
      const candidate = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (candidate.subjects) {
        candidate.subjects = [...candidate.subjects].sort((a, b) => a.name.localeCompare(b.name));
      }
      const next = {
        ...candidate,
        last_updated_date: candidate.last_updated_date || new Date().toISOString()
      };
      saveStateDebounced(next);
      return next;
    });
  }, [saveStateDebounced]);

  const logout = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingSaveStateRef.current = null;
    localStorage.removeItem(STATE_KEY);
    await supabase.auth.signOut();
  }, []);

  const userId = session?.user?.id;

  const addTodo = useCallback(async (
    title,
    note = '',
    deadline = null,
    scheduledDate = null,
    recurrenceDays = null
  ) => {
    // Guardrail: clamp the schedule date to the term end boundary
    const termEnd = datePart(state.term?.endDate);
    let targetDate = scheduledDate ? datePart(scheduledDate) : null;
    if (targetDate && termEnd && targetDate > termEnd) {
      targetDate = termEnd;
    }

    if (recurrenceDays && recurrenceDays.length > 0) {
      const todayStr = toLocalDateString(new Date());
      const effectiveStartDate = targetDate || todayStr;
      const instances = generateRecurringInstances({
        title,
        note,
        deadline,
        recurrenceDays,
        startDate: effectiveStartDate,
        endDate: termEnd,
        userId,
        maxDays: 90
      });

      if (instances.length === 0) return null;

      updateState(prev => ({
        ...prev,
        todos: [...prev.todos, ...instances]
      }));

      if (userId) {
        await addActionToQueue({
          type: 'INSERT_TODOS',
          payload: instances
        });
        scheduleTodoSync();
      }
      return instances[0].id;
    }

    const newId = crypto.randomUUID();
    const newTodo = {
      id: newId,
      user_id: userId,
      title,
      is_completed: false,
      is_scratched_today: false,
      recurrence_days: null,
      scheduled_date: targetDate,
      display_order: 0,
      created_at: new Date().toISOString(),
      note,
      deadline,
      original_date: null,
      google_event_id: null
    };

    updateState(prev => ({
      ...prev,
      todos: [...prev.todos, newTodo]
    }));

    if (userId) {
      await addActionToQueue({
        type: 'INSERT_TODO',
        todoId: newId,
        payload: {
          id: newTodo.id,
          user_id: newTodo.user_id,
          title: newTodo.title,
          is_completed: newTodo.is_completed,
          is_scratched_today: newTodo.is_scratched_today,
          recurrence_days: newTodo.recurrence_days,
          scheduled_date: newTodo.scheduled_date,
          display_order: newTodo.display_order,
          created_at: newTodo.created_at,
          note: newTodo.note,
          deadline: newTodo.deadline,
          original_date: newTodo.original_date,
          google_event_id: newTodo.google_event_id
        }
      });
      scheduleTodoSync();
    }
    return newId;
  }, [userId, updateState, state.term]);

  const toggleTodoCompleted = useCallback(async (id) => {
    let updatedTodo = null;
    updateState(prev => {
      const todos = prev.todos.map(t => {
        if (t.id === id) {
          updatedTodo = { ...t, is_completed: !t.is_completed };
          return updatedTodo;
        }
        return t;
      });
      return { ...prev, todos };
    });

    if (userId && updatedTodo) {
      await addActionToQueue({
        type: 'UPDATE_TODO',
        todoId: id,
        payload: { is_completed: updatedTodo.is_completed }
      });
      scheduleTodoSync();
    }
  }, [userId, updateState]);

  const toggleTodoScratched = useCallback(async (id) => {
    let updatedTodo = null;
    updateState(prev => {
      const todos = prev.todos.map(t => {
        if (t.id === id) {
          updatedTodo = { ...t, is_scratched_today: !t.is_scratched_today };
          return updatedTodo;
        }
        return t;
      });
      return { ...prev, todos };
    });

    if (userId && updatedTodo) {
      await addActionToQueue({
        type: 'UPDATE_TODO',
        todoId: id,
        payload: { is_scratched_today: updatedTodo.is_scratched_today }
      });
      scheduleTodoSync();
    }
  }, [userId, updateState]);

  const updateTodoRecurrence = useCallback(async (id, recurrenceDays) => {
    let updatedTodo = null;
    updateState(prev => {
      const todos = prev.todos.map(t => {
        if (t.id === id) {
          updatedTodo = { ...t, recurrence_days: recurrenceDays };
          return updatedTodo;
        }
        return t;
      });
      return { ...prev, todos };
    });

    if (userId && updatedTodo) {
      await addActionToQueue({
        type: 'UPDATE_TODO',
        todoId: id,
        payload: { recurrence_days: recurrenceDays }
      });
      scheduleTodoSync();
    }
  }, [userId, updateState]);

  const deleteTodo = useCallback(async (id) => {
    updateState(prev => ({
      ...prev,
      todos: prev.todos.filter(t => t.id !== id)
    }));

    if (userId) {
      await addActionToQueue({
        type: 'DELETE_TODO',
        todoId: id
      });
      scheduleTodoSync();
    }
  }, [userId, updateState]);

  const deleteTodoSeries = useCallback(async (recurringGroupId) => {
    if (!recurringGroupId) return;
    let deletedIds = [];
    updateState(prev => {
      const toDelete = prev.todos.filter(t => t.recurring_group_id === recurringGroupId);
      deletedIds = toDelete.map(t => t.id);
      return {
        ...prev,
        todos: prev.todos.filter(t => t.recurring_group_id !== recurringGroupId)
      };
    });

    if (userId && deletedIds.length > 0) {
      for (const id of deletedIds) {
        await addActionToQueue({
          type: 'DELETE_TODO',
          todoId: id
        });
      }
      scheduleTodoSync();
    }
  }, [userId, updateState]);

  const updateTodoTitle = useCallback(async (id, title) => {
    updateState(prev => ({
      ...prev,
      todos: prev.todos.map(t => t.id === id ? { ...t, title } : t)
    }));

    if (userId) {
      await addActionToQueue({
        type: 'UPDATE_TODO',
        todoId: id,
        payload: { title }
      });
      scheduleTodoSync();
    }
  }, [userId, updateState]);

  const setSubjectAccentColor = useCallback(async (subjectId, color) => {
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? { ...s, accentColor: color, accent_color: color } : s
      )
    }));

    if (userId) {
      await addActionToQueue({
        type: 'UPDATE_SUBJECT',
        subjectId,
        payload: { accent_color: color }
      });
      scheduleTodoSync();
    }
  }, [userId, updateState]);

  const mappedSubjects = useMemo(() => {
    const isLight = theme === 'light';
    return state.subjects.map(s => {
      const stats = recalculateSubjectStats(s);
      return {
        ...s,
        ...stats,
        accentColor: getAccentColor(s.accent_color || s.accentColor || '#c97b6e', isLight)
      };
    });
  }, [state.subjects, theme]);

  const stateContextValue = useMemo(() => ({
    state: {
      ...state,
      subjects: mappedSubjects
    },
    updateState,
    loading,
    addTodo,
    toggleTodoCompleted,
    toggleTodoScratched,
    updateTodoRecurrence,
    deleteTodo,
    deleteTodoSeries,
    updateTodoTitle,
    setSubjectAccentColor,
    theme,
    toggleTheme,
    smartTaskInput,
    toggleSmartTaskInput,
    isTransitioning,
    transitionToTheme,
    onTransitionDone
  }), [state, mappedSubjects, updateState, loading, addTodo, toggleTodoCompleted, toggleTodoScratched, updateTodoRecurrence, deleteTodo, deleteTodoSeries, updateTodoTitle, setSubjectAccentColor, theme, toggleTheme, smartTaskInput, toggleSmartTaskInput, isTransitioning, transitionToTheme, onTransitionDone]);

  const userContextValue = useMemo(() => ({
    userId,
    logout
  }), [userId, logout]);

  return (
    <UserContext.Provider value={userContextValue}>
      <StateContext.Provider value={stateContextValue}>
        {children}
      </StateContext.Provider>
    </UserContext.Provider>
  );
};
