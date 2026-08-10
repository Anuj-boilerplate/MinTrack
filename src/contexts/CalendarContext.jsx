/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CalendarError,
  CALENDAR_ERRORS,
  getCalendarEvents,
  checkCalendarConnection,
  storeCalendarToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../lib/calendarClient';
import { supabase } from '../lib/supabaseClient';
import { groupEventsByDate } from '../utils/calendarHelpers';
import { toLocalDateString } from '../utils';
import { computeCalendarOps, buildTodoSnapshot } from '../lib/calendarSync';
import { useUserContext, useStateContext } from './StateContext';
import { addActionToQueue } from '../lib/syncQueue';

const CalendarContext = createContext();
export const useCalendar = () => useContext(CalendarContext);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
const POLL_INTERVAL_MS = 30 * 1000; // native events mirror within 30s
const PUSH_DEBOUNCE_MS = 1200; // batch rapid todo mutations into one push

export function CalendarProvider({ children }) {
  const { userId } = useUserContext();
  const { state: appState, updateState } = useStateContext();
  const todos = appState.todos; // always defined — StateProvider seeds with []

  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [connectError, setConnectError] = useState(null);
  const [events, setEvents] = useState({}); // keyed by date string "YYYY-MM-DD" → event[]

  const windowRef = useRef(null); // { startDate, endDate } of the visible runway
  const trackedRef = useRef(new Map()); // todoId → last synced snapshot
  const pushTimerRef = useRef(null);
  const isPushingRef = useRef(false);
  const todosRef = useRef(todos);

  // Check connection on mount
  useEffect(() => {
    checkCalendarConnection()
      .then((connected) => {
        setIsConnected(connected);
        if (connected) trackedRef.current = buildTodoSnapshot([]); // seeded on first push cycle
      })
      .finally(() => setIsChecking(false));
  }, []);

  const redirectUri = `${window.location.origin}/calendar-callback`;

  // Initiate Google OAuth consent flow
  const connectCalendar = useCallback(() => {
    setConnectError(null);
    if (!GOOGLE_CLIENT_ID) {
      // Misconfiguration guard — surface the real problem instead of a cryptic Google page
      console.warn(
        'MinTrack: VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file / deployment env vars to use Google Calendar.'
      );
      alert('Google Calendar is not configured. Set VITE_GOOGLE_CLIENT_ID in your environment, then reload and try again.');
      return;
    }
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: CALENDAR_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: 'calendar_connect',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }, [redirectUri]);

  // Handle the OAuth callback (code + state in URL)
  const handleOAuthCallback = useCallback(async (code) => {
    await storeCalendarToken(code, redirectUri);
    setIsConnected(true);
    setConnectError(null);
    trackedRef.current = buildTodoSnapshot([]);
    // Clean the URL so the code isn't left in the address bar
    window.history.replaceState({}, '', window.location.pathname);
  }, [redirectUri]);

  // Listen for OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state === 'calendar_connect') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleOAuthCallback(code).catch((err) => {
        // Consent failed or code exchange errored — remain disconnected and say why
        setIsConnected(false);
        console.error('MinTrack: Google Calendar connect failed', err);
        setConnectError(err?.message || 'Connection failed. Check the console for details.');
      });
    }
  }, [handleOAuthCallback]);

  // ── Pull: fetch events for the registered runway window ──
  const fetchWindow = useCallback(async () => {
    const win = windowRef.current;
    if (!isConnected || !win) return;
    try {
      const rawEvents = await getCalendarEvents(win.startDate, win.endDate);
      const byDate = groupEventsByDate(rawEvents);
      setEvents(prev => ({ ...prev, ...byDate }));
    } catch (err) {
      if (err instanceof CalendarError &&
          (err.code === CALENDAR_ERRORS.NOT_CONNECTED || err.code === CALENDAR_ERRORS.TOKEN_REFRESH_FAILED)) {
        setIsConnected(false);
        setEvents({});
      }
      // Otherwise silently fail — calendar is supplementary
    }
  }, [isConnected]);

  // Called by TodoScreen when the visible runway window changes
  const registerWindow = useCallback((startDate, endDate) => {
    const prev = windowRef.current;
    windowRef.current = { startDate, endDate };
    if (!prev || prev.startDate !== startDate || prev.endDate !== endDate) {
      fetchWindow();
    }
  }, [fetchWindow]);

  // ── Push: mirror todo mutations into Google Calendar ──
  const persistEventId = useCallback((todoId, googleEventId) => {
    updateState(prev => ({
      ...prev,
      todos: prev.todos.map(t => t.id === todoId ? { ...t, google_event_id: googleEventId } : t)
    }));
    if (userId) {
      addActionToQueue({
        type: 'UPDATE_TODO',
        todoId,
        payload: { google_event_id: googleEventId }
      });
    }
  }, [updateState, userId]);

  const runPushCycle = useCallback(async (currentTodos) => {
    if (!isConnected || isPushingRef.current) return;
    isPushingRef.current = true;
    try {
      const todayStr = toLocalDateString(new Date());
      // Keep previously-assigned event ids for creates whose write-back hasn't landed yet
      const assignedEvents = {};
      for (const [id, snap] of trackedRef.current.entries()) {
        if (snap.googleEventId) assignedEvents[id] = snap.googleEventId;
      }
      const snapshot = buildTodoSnapshot(currentTodos, assignedEvents);
      const ops = computeCalendarOps(trackedRef.current, currentTodos, todayStr);
      trackedRef.current = snapshot;

      if (ops.creates.length === 0 && ops.updates.length === 0 && ops.deletes.length === 0) return;

      // Deletes first, then updates, then creates (uncomplete → delete old, create new)
      for (const del of ops.deletes) {
        try {
          await deleteCalendarEvent(del.googleEventId);
        } catch {
          // Transient failure — keep the tracker entry so the next cycle retries
          continue;
        }
        // Clear the stale tracker for completed-but-existing todos
        const todo = currentTodos.find(t => t.id === del.id);
        if (todo && todo.google_event_id) {
          persistEventId(del.id, null);
        }
        trackedRef.current.delete(del.id);
      }

      for (const upd of ops.updates) {
        let eventId = upd.googleEventId;
        try {
          const result = await updateCalendarEvent({
            eventId,
            summary: upd.title,
            date: upd.scheduled_date,
            description: '',
            recurrence: upd.recurrence_days,
          });
          if (result?.missing) {
            // Event was deleted natively — recreate it
            const created = await createCalendarEvent({
              summary: upd.title,
              date: upd.scheduled_date,
              description: '',
              recurrence: upd.recurrence_days,
              iCalUID: upd.id,
            });
            eventId = created.eventId;
            persistEventId(upd.id, eventId);
          }
        } catch { /* retried on next cycle */ }
        const snap = trackedRef.current.get(upd.id);
        if (snap) trackedRef.current.set(upd.id, { ...snap, googleEventId: eventId });
      }

      for (const create of ops.creates) {
        try {
          const result = await createCalendarEvent({
            summary: create.title,
            date: create.scheduled_date,
            description: '',
            recurrence: create.recurrence_days,
            iCalUID: create.id,
          });
          persistEventId(create.id, result.eventId);
          const snap = trackedRef.current.get(create.id);
          if (snap) trackedRef.current.set(create.id, { ...snap, googleEventId: result.eventId });
        } catch { /* retried on next cycle */ }
      }

      // Reflect pushed changes back into the runway immediately
      fetchWindow();
    } catch {
      // network-level failure — next cycle (mutation, poll, reconnect) retries
    } finally {
      isPushingRef.current = false;
    }
  }, [isConnected, fetchWindow, persistEventId]);

  // Watch todos; debounce rapid mutations into a single push cycle
  useEffect(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      runPushCycle(todos);
    }, PUSH_DEBOUNCE_MS);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [todos, runPushCycle]);

  // 30s poll + focus/online refresh (poll also retries any failed pushes)
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      fetchWindow();
      runPushCycle(todosRef.current);
    }, POLL_INTERVAL_MS);
    const onFocus = () => fetchWindow();
    const onOnline = () => fetchWindow();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [isConnected, fetchWindow, runPushCycle]);

  // Keep the latest todos alive for the interval callback without re-subscribing
  useEffect(() => {
    todosRef.current = todos;
  });

  // Disconnect: delete stored tokens, stop mirroring
  const disconnectCalendar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('google_tokens').delete().eq('user_id', user.id);
    }
    trackedRef.current = new Map();
    setIsConnected(false);
    setConnectError(null);
    setEvents({});
  }, []);

  const value = useMemo(() => ({
    isConnected,
    isChecking,
    connectError,
    events,
    connectCalendar,
    disconnectCalendar,
    registerWindow,
  }), [isConnected, isChecking, connectError, events, connectCalendar, disconnectCalendar, registerWindow]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}