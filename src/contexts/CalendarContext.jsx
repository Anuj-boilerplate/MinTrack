/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarError,
  CALENDAR_ERRORS,
  getCalendarEvents,
  checkCalendarConnection,
  storeCalendarToken,
  clearCalendarEventsCache,
} from '../lib/calendarClient';
import { supabase } from '../lib/supabaseClient';
import { groupEventsByDate } from '../utils/calendarHelpers';

const CalendarContext = createContext();
export const useCalendar = () => useContext(CalendarContext);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

export function CalendarProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [events, setEvents] = useState({}); // keyed by date string "YYYY-MM-DD" → event[]

  // Check connection on mount
  useEffect(() => {
    checkCalendarConnection()
      .then(setIsConnected)
      .finally(() => setIsChecking(false));
  }, []);

  const redirectUri = `${window.location.origin}/calendar-callback`;

  // Initiate Google OAuth consent flow
  const connectCalendar = useCallback(() => {
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
    clearCalendarEventsCache();
    setIsConnected(true);
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
      handleOAuthCallback(code).catch(() => {
        // Consent failed or code exchange errored — remain disconnected
        setIsConnected(false);
      });
    }
  }, [handleOAuthCallback]);

  // Disconnect: delete the stored tokens
  const disconnectCalendar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('google_tokens').delete().eq('user_id', user.id);
    }
    clearCalendarEventsCache();
    setIsConnected(false);
    setEvents({});
  }, []);

  // Fetch events for a date range and organize by date
  const fetchEventsForRange = useCallback(async (startDateStr, endDateStr) => {
    if (!isConnected) return;
    try {
      const rawEvents = await getCalendarEvents(startDateStr, endDateStr);
      const byDate = groupEventsByDate(rawEvents);
      setEvents(prev => ({ ...prev, ...byDate }));
    } catch (err) {
      // The token is gone or revoked — fall back to disconnected state
      if (err instanceof CalendarError &&
          (err.code === CALENDAR_ERRORS.NOT_CONNECTED || err.code === CALENDAR_ERRORS.TOKEN_REFRESH_FAILED)) {
        setIsConnected(false);
        setEvents({});
      }
      // Otherwise silently fail — calendar is supplementary
    }
  }, [isConnected]);

  const value = useMemo(() => ({
    isConnected,
    isChecking,
    events,
    connectCalendar,
    disconnectCalendar,
    fetchEventsForRange,
  }), [isConnected, isChecking, events, connectCalendar, disconnectCalendar, fetchEventsForRange]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}