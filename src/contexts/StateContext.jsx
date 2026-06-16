/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStartOfDay } from '../utils';
import { addActionToQueue, processSyncQueue } from '../lib/syncQueue';

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

const StateContext = createContext();
const UserContext = createContext();

export const useStateContext = () => useContext(StateContext);
export const useUserContext = () => useContext(UserContext);

function normalizeSubject(subject) {
  return {
    ...subject,
    target_hours: Number(subject.target_hours ?? 0),
    valid_hours: Number(subject.valid_hours ?? 0),
    carryover: Number(subject.carryover ?? 0),
    completed_today: Number(subject.completed_today ?? 0),
    paused_time_total: Number(subject.paused_time_total ?? 0),
    paused_time_today: Number(subject.paused_time_today ?? 0),
    deadline: subject.deadline ? new Date(subject.deadline).toISOString() : null,
    accentColor: subject.accentColor || '#c97b6e',
    sessions: subject.sessions || []
  };
}

function normalizeTodo(todo) {
  return {
    id: todo.id,
    subject_id: todo.subject_id,
    title: todo.title || '',
    is_completed: Boolean(todo.is_completed),
    scheduled_for_today: Boolean(todo.scheduled_for_today),
    created_at: todo.created_at ? new Date(todo.created_at).toISOString() : new Date().toISOString(),
    note: todo.note || '',
    deadline: todo.deadline || null,
    priority: todo.priority || 'low'
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
    subjects: Array.isArray(rawState.subjects) ? rawState.subjects.map(normalizeSubject) : [],
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
  const pendingSaveStateRef = useRef(null);
  const saveTimeoutRef = useRef(null);

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

      // Simple Daily Reset: If the last update was before today, reset daily stats
      const lastUpdate = getStartOfDay(new Date(patchedState.last_updated_date));
      const today = getStartOfDay();

      if (lastUpdate.getTime() < today.getTime()) {
        patchedState.subjects.forEach(sub => {
          sub.completed_today = 0;
          sub.paused_time_today = 0;
        });
        patchedState.todos.forEach(todo => {
          if (todo.scheduled_for_today && !todo.is_completed) {
            todo.scheduled_for_today = false;
          }
        });
        patchedState.last_updated_date = today.toISOString();
      }

      // Sync with Supabase
      const [{ data: dbProfile }, { data: dbSubjects }, { data: dbTodos }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('todos').select('*')
      ]);

      // Profile (Term) Reconciliation
      if (dbProfile?.term_start_date) {
        patchedState.term = { startDate: dbProfile.term_start_date, endDate: dbProfile.term_end_date };
      } else if (patchedState.term) {
        await supabase.from('profiles').upsert({ id: userId, term_start_date: patchedState.term.startDate, term_end_date: patchedState.term.endDate });
      }

      // Subjects Reconciliation
      if (dbSubjects?.length > 0) {
        patchedState.subjects = dbSubjects.map(dbSub => {
          const localSub = patchedState.subjects.find(ls => ls.id === dbSub.id) || {};
          return {
            ...dbSub,
            valid_hours: Math.max(dbSub.valid_hours || 0, localSub.valid_hours || 0),
            completed_today: localSub.completed_today || 0,
            paused_time_today: localSub.paused_time_today || 0,
            paused_time_total: localSub.paused_time_total || 0
          };
        });
      } else if (patchedState.subjects.length > 0) {
        const toInsert = patchedState.subjects.map(s => ({ ...s, user_id: userId }));
        await supabase.from('subjects').upsert(toInsert);
      }

      // Todos Reconciliation — prefer local state for fields that may have been mutated
      // but not yet synced (completed, scheduled) to survive page reloads mid-flight.
      const localTodosSnapshot = [...patchedState.todos];
      if (dbTodos && dbTodos.length > 0) {
        const userSubjectIds = new Set(patchedState.subjects.map(s => s.id));
        patchedState.todos = dbTodos
          .filter(t => userSubjectIds.has(t.subject_id))
          .map(dbTodo => {
            const localTodo = patchedState.todos.find(lt => lt.id === dbTodo.id) || {};
            // Prefer local values for mutable fields so in-flight mutations aren't overwritten
            return {
              ...dbTodo,
              title: localTodo.title || dbTodo.title || '',
              is_completed: localTodo.id ? (localTodo.is_completed ?? dbTodo.is_completed ?? false) : (dbTodo.is_completed ?? false),
              scheduled_for_today: localTodo.id ? (localTodo.scheduled_for_today ?? dbTodo.scheduled_for_today ?? false) : (dbTodo.scheduled_for_today ?? false),
              created_at: dbTodo.created_at ? new Date(dbTodo.created_at).toISOString() : new Date().toISOString(),
              note: localTodo.note ?? dbTodo.note ?? '',
              deadline: localTodo.deadline ?? dbTodo.deadline ?? null,
              priority: localTodo.priority ?? dbTodo.priority ?? 'low'
            };
          });
        // Also keep any local-only todos not yet in DB (queued inserts)
        const dbIds = new Set(patchedState.todos.map(t => t.id));
        const localOnlyTodos = localTodosSnapshot.filter(t => !dbIds.has(t.id) && userSubjectIds.has(t.subject_id));
        patchedState.todos = [...patchedState.todos, ...localOnlyTodos];
      } else if (patchedState.todos.length > 0) {
        const toInsert = patchedState.todos.map(todo => ({
          id: todo.id,
          subject_id: todo.subject_id,
          title: todo.title,
          is_completed: todo.is_completed,
          scheduled_for_today: todo.scheduled_for_today,
          created_at: todo.created_at
        }));
        await supabase.from('todos').upsert(toInsert);
      }

      setState(patchedState);
      localStorage.setItem(STATE_KEY, JSON.stringify(patchedState));
      setLoading(false);
    } catch (err) {
      console.error("Initialization failed", err);
    }
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!session?.user) return;
    if (initializedUserRef.current !== session.user.id) {
      setLoading(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initState(session.user.id);
  }, [session, initState]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Periodic Daily Reset Check: runs every minute to silently clear hours and return uncompleted tasks to backlog
  useEffect(() => {
    const checkDailyReset = () => {
      const today = getStartOfDay();
      setState(prev => {
        if (!prev.last_updated_date) return prev;
        const lastUpdate = getStartOfDay(new Date(prev.last_updated_date));
        if (lastUpdate.getTime() < today.getTime()) {
          const nextSubjects = prev.subjects.map(sub => ({
            ...sub,
            completed_today: 0,
            paused_time_today: 0
          }));
          const nextTodos = prev.todos.map(todo => {
            if (todo.scheduled_for_today && !todo.is_completed) {
              return { ...todo, scheduled_for_today: false };
            }
            return todo;
          });
          const nextState = {
            ...prev,
            subjects: nextSubjects,
            todos: nextTodos,
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


  // Wrapper to update state and save automatically
  const updateState = useCallback((updater) => {
    setState(prev => {
      const candidate = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
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

  const addTodo = useCallback(async (subjectId, title, note = '', deadline = null, priority = 'low') => {
    const newId = crypto.randomUUID();
    const newTodo = {
      id: newId,
      subject_id: subjectId,
      title,
      is_completed: false,
      scheduled_for_today: false,
      created_at: new Date().toISOString(),
      note,
      deadline,
      priority
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
          subject_id: newTodo.subject_id,
          title: newTodo.title,
          is_completed: newTodo.is_completed,
          scheduled_for_today: newTodo.scheduled_for_today,
          created_at: newTodo.created_at
        }
      });
      scheduleTodoSync();
    }
    return newId;
  }, [userId, updateState]);

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

  const toggleTodoScheduled = useCallback(async (id) => {
    let updatedTodo = null;
    updateState(prev => {
      const todos = prev.todos.map(t => {
        if (t.id === id) {
          updatedTodo = { ...t, scheduled_for_today: !t.scheduled_for_today };
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
        payload: { scheduled_for_today: updatedTodo.scheduled_for_today }
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
    }
  }, [userId, updateState]);

  const setSubjectAccentColor = useCallback((subjectId, color) => {
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId ? { ...s, accentColor: color } : s
      )
    }));
  }, [updateState]);

  const stateContextValue = useMemo(() => ({
    state,
    updateState,
    loading,
    addTodo,
    toggleTodoCompleted,
    toggleTodoScheduled,
    deleteTodo,
    updateTodoTitle,
    setSubjectAccentColor
  }), [state, updateState, loading, addTodo, toggleTodoCompleted, toggleTodoScheduled, deleteTodo, updateTodoTitle, setSubjectAccentColor]);

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
