/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateDailyTarget, getAccentColor, recalculateSubjectStats, toLocalDateString } from '../utils';
import { datePart, generateRecurringInstances } from '../utils/todoHelpers';

const StateContext = createContext(null);
const UserContext = createContext(null);

export const useStateContext = () => useContext(StateContext);
export const useUserContext = () => useContext(UserContext);

const blank = () => ({ term: null, subjects: [], todos: [], activeSession: null });

const message = error => error?.message || String(error || 'Save failed. Please try again.');

const asTimer = row => row && ({
  subjectId: row.subject_id,
  taskId: row.task_id,
  startTime: Date.parse(row.started_at),
  startedAt: row.started_at,
  ui: {
    focusLength: row.focus_length,
    breakLength: row.break_length,
    cycles: row.cycles
  },
  isPaused: row.status === 'paused',
  pausedAt: row.paused_at ? Date.parse(row.paused_at) : null,
  totalPausedMs: Number(row.total_paused_ms || 0),
  status: row.status,
  stoppedAt: row.stopped_at
});

export function StateProvider({ children, session }) {
  const userId = session?.user?.id;
  const [state, setState] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [smartTaskInput, setSmartTaskInput] = useState(() => localStorage.getItem('smart_task_input') !== 'false');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionToTheme, setTransitionToTheme] = useState(null);

  // Clean up any legacy offline snapshots or tombstones from old architecture
  useEffect(() => {
    try {
      localStorage.removeItem('mintrack_state');
      localStorage.removeItem('mintrack_deleted_sessions');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const results = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('subjects').select('*').eq('user_id', userId),
        supabase.from('todos').select('*').eq('user_id', userId),
        supabase.from('sessions').select('*'),
        supabase.from('active_timers').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      for (const result of results) {
        if (result.error) throw result.error;
      }

      const [profile, subjects, todos, sessions, timer] = results.map(result => result.data);

      setState({
        term: profile?.term_start_date ? {
          startDate: profile.term_start_date,
          endDate: profile.term_end_date
        } : null,
        subjects: (subjects || []).map(subject => ({
          ...subject,
          target_hours: Number(subject.target_hours || 0),
          sessions: (sessions || []).filter(item => item.subject_id === subject.id)
        })).sort((a, b) => a.name.localeCompare(b.name)),
        todos: todos || [],
        activeSession: asTimer(timer),
      });
    } catch (error) {
      setLoadError(message(error));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Keep today's date string updated across day transitions
  useEffect(() => {
    const id = setInterval(() => setToday(toLocalDateString(new Date())), 60000);
    return () => clearInterval(id);
  }, []);

  // Realtime subscription for active_timers — keeps active timer synchronized across open tabs
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`active_timers:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_timers',
          filter: `user_id=eq.${userId}`
        },
        payload => {
          if (payload.eventType === 'DELETE') {
            setState(prev => ({ ...prev, activeSession: null }));
          } else if (payload.new) {
            setState(prev => ({ ...prev, activeSession: asTimer(payload.new) }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const run = useCallback(async work => {
    setMutationError(null);
    try {
      return await work();
    } catch (error) {
      setMutationError(message(error));
      return null;
    }
  }, []);

  const checked = useCallback(async query => {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }, []);

  const updateVersioned = useCallback(async (table, id, version, fields) => {
    const data = await checked(
      supabase
        .from(table)
        .update({ ...fields, version: (version || 1) + 1 })
        .eq('id', id)
        .eq('version', version || 1)
        .select()
        .maybeSingle()
    );
    if (!data) {
      await refresh();
      throw new Error('This item changed elsewhere. We loaded the latest version for you. Please try again.');
    }
    return data;
  }, [checked, refresh]);

  const saveTerm = useCallback(term => run(async () => {
    const data = await checked(
      supabase
        .from('profiles')
        .upsert({
          id: userId,
          term_start_date: term.startDate,
          term_end_date: term.endDate
        })
        .select()
        .single()
    );
    setState(prev => ({
      ...prev,
      term: { startDate: data.term_start_date, endDate: data.term_end_date }
    }));
    return data;
  }), [checked, run, userId]);

  const addSubject = useCallback((name, target, deadline) => run(async () => {
    const data = await checked(
      supabase
        .from('subjects')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          name,
          target_hours: target,
          valid_hours: 0,
          deadline,
          accent_color: '#c97b6e'
        })
        .select()
        .single()
    );
    setState(prev => ({
      ...prev,
      subjects: [...prev.subjects, { ...data, sessions: [] }].sort((a, b) => a.name.localeCompare(b.name))
    }));
    return data;
  }), [checked, run, userId]);

  const editSubject = useCallback((id, name, target, deadline) => run(async () => {
    const current = state.subjects.find(item => item.id === id);
    if (!current) throw new Error('Goal no longer exists.');
    const data = await updateVersioned('subjects', id, current.version, {
      name,
      target_hours: target,
      deadline
    });
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(item => (item.id === id ? { ...item, ...data } : item)).sort((a, b) => a.name.localeCompare(b.name))
    }));
    return data;
  }), [run, state.subjects, updateVersioned]);

  const deleteSubject = useCallback(id => run(async () => {
    const data = await checked(
      supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
    );
    if (!data.length) throw new Error('Goal was not deleted. Reload and try again.');
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.filter(item => item.id !== id)
    }));
    return true;
  }), [checked, run, userId]);

  const setSubjectAccentColor = useCallback((id, color) => run(async () => {
    const current = state.subjects.find(item => item.id === id);
    if (!current) throw new Error('Goal no longer exists.');
    const data = await updateVersioned('subjects', id, current.version, { accent_color: color });
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(item => (item.id === id ? { ...item, ...data } : item))
    }));
    return data;
  }), [run, state.subjects, updateVersioned]);

  const addTodo = useCallback((title, note = '', deadline = null, scheduledDate = null, recurrenceDays = null) => run(async () => {
    const termEnd = datePart(state.term?.endDate);
    const targetDate = scheduledDate && termEnd && datePart(scheduledDate) > termEnd ? termEnd : datePart(scheduledDate);
    const rows = recurrenceDays?.length
      ? generateRecurringInstances({
          title,
          note,
          deadline,
          recurrenceDays,
          startDate: targetDate || today,
          endDate: termEnd,
          userId,
          maxDays: 90
        })
      : [{
          id: crypto.randomUUID(),
          user_id: userId,
          title,
          note,
          deadline,
          scheduled_date: targetDate,
          is_completed: false,
          is_scratched_today: false,
          recurrence_days: null,
          recurring_group_id: null,
          display_order: 0,
          original_date: null,
          google_event_id: null
        }];

    if (!rows.length) throw new Error('No tasks fall within the selected dates.');
    const data = await checked(supabase.from('todos').insert(rows).select());
    setState(prev => ({ ...prev, todos: [...prev.todos, ...data] }));
    return data[0]?.id;
  }), [checked, run, state.term, today, userId]);

  const updateTodoFields = useCallback((id, fields) => run(async () => {
    const current = state.todos.find(item => item.id === id);
    if (!current) throw new Error('Task no longer exists.');
    const data = await updateVersioned('todos', id, current.version, fields);
    setState(prev => ({
      ...prev,
      todos: prev.todos.map(item => (item.id === id ? data : item))
    }));
    return data;
  }), [run, state.todos, updateVersioned]);

  const toggleTodoCompleted = useCallback(id => {
    const item = state.todos.find(todo => todo.id === id);
    return item ? updateTodoFields(id, { is_completed: !item.is_completed }) : Promise.resolve(null);
  }, [state.todos, updateTodoFields]);

  const toggleTodoScratched = useCallback(id => {
    const item = state.todos.find(todo => todo.id === id);
    return item ? updateTodoFields(id, { is_scratched_today: !item.is_scratched_today }) : Promise.resolve(null);
  }, [state.todos, updateTodoFields]);

  const updateTodoRecurrence = useCallback((id, days) => updateTodoFields(id, { recurrence_days: days }), [updateTodoFields]);

  const updateTodoTitle = useCallback((id, title) => updateTodoFields(id, { title }), [updateTodoFields]);

  const deleteTodo = useCallback(id => run(async () => {
    const data = await checked(
      supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
    );
    if (!data.length) throw new Error('Task was not deleted. Reload and try again.');
    setState(prev => ({ ...prev, todos: prev.todos.filter(item => item.id !== id) }));
    return true;
  }), [checked, run, userId]);

  const deleteTodoSeries = useCallback(groupId => run(async () => {
    if (!groupId) return false;
    const data = await checked(
      supabase
        .from('todos')
        .delete()
        .eq('recurring_group_id', groupId)
        .eq('user_id', userId)
        .select('id')
    );
    if (!data.length) throw new Error('Task series was not found.');
    const ids = new Set(data.map(item => item.id));
    setState(prev => ({ ...prev, todos: prev.todos.filter(item => !ids.has(item.id)) }));
    return true;
  }), [checked, run, userId]);

  const insertSessions = useCallback(rows => run(async () => {
    const data = await checked(supabase.from('sessions').insert(rows).select());
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(subject => ({
        ...subject,
        sessions: [...subject.sessions, ...data.filter(item => item.subject_id === subject.id)]
      }))
    }));
    return data;
  }), [checked, run]);

  const deleteSession = useCallback(id => run(async () => {
    const data = await checked(supabase.from('sessions').delete().eq('id', id).select('id'));
    if (!data.length) throw new Error('Session was not deleted. Reload and try again.');
    setState(prev => ({
      ...prev,
      subjects: prev.subjects.map(subject => ({
        ...subject,
        sessions: subject.sessions.filter(item => item.id !== id)
      }))
    }));
    return true;
  }), [checked, run]);

  const timerAction = useCallback((action, payload = {}) => run(async () => {
    const data = await checked(supabase.rpc(action, payload));
    setState(prev => ({
      ...prev,
      activeSession: action === 'clear_timer' ? null : asTimer(data)
    }));
    return data || true;
  }), [checked, run]);

  const clearAllData = useCallback(() => run(async () => {
    await checked(supabase.rpc('clear_all_study_data'));
    setState(blank());
    return true;
  }), [checked, run]);

  const logout = useCallback(() => supabase.auth.signOut(), []);

  const toggleSmartTaskInput = useCallback(() => setSmartTaskInput(prev => {
    localStorage.setItem('smart_task_input', String(!prev));
    return !prev;
  }), []);

  const toggleTheme = useCallback(() => {
    if (isTransitioning) return;
    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    setTransitionToTheme(next);
    setIsTransitioning(true);
  }, [isTransitioning, theme]);

  const onTransitionDone = useCallback(() => {
    setTheme(transitionToTheme);
    setTransitionToTheme(null);
    setIsTransitioning(false);
  }, [transitionToTheme]);

  const mappedSubjects = useMemo(() => state.subjects.map(subject => {
    const stats = recalculateSubjectStats(subject);
    return {
      ...subject,
      ...stats,
      daily_target: calculateDailyTarget(subject, state.term?.endDate),
      accentColor: getAccentColor(subject.accent_color || '#c97b6e', theme === 'light')
    };
  }), [state.subjects, state.term, theme]);

  const value = {
    state: { ...state, subjects: mappedSubjects },
    loading,
    loadError,
    mutationError,
    clearMutationError: () => setMutationError(null),
    refresh,
    saveTerm,
    addSubject,
    editSubject,
    deleteSubject,
    addTodo,
    updateTodoFields,
    toggleTodoCompleted,
    toggleTodoScratched,
    updateTodoRecurrence,
    updateTodoTitle,
    deleteTodo,
    deleteTodoSeries,
    setSubjectAccentColor,
    insertSessions,
    deleteSession,
    timerAction,
    clearAllData,
    theme,
    toggleTheme,
    smartTaskInput,
    toggleSmartTaskInput,
    isTransitioning,
    transitionToTheme,
    onTransitionDone
  };

  const userValue = useMemo(() => ({ userId, logout }), [userId, logout]);

  return (
    <UserContext.Provider value={userValue}>
      <StateContext.Provider value={value}>
        {children}
      </StateContext.Provider>
    </UserContext.Provider>
  );
}
