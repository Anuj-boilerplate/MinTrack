import { supabase } from './supabaseClient';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar`;

// Guardrails: define error codes the Edge Function can return
export const CALENDAR_ERRORS = {
  NOT_CONNECTED: 'not_connected',
  TOKEN_REFRESH_FAILED: 'token_refresh_failed',
};

export class CalendarError extends Error {
  constructor(message, code = null) {
    super(message);
    this.name = 'CalendarError';
    this.code = code;
  }
}

async function callCalendarFunction(action, params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new CalendarError('Not authenticated');

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CalendarError(data.error || 'Calendar request failed', data.error || null);
  }
  return data;
}

// Unused in the current design (the sync engine fetches on its own cadence).
// Kept out to avoid stale data — the 30s poll always fetches fresh.
export async function getCalendarEvents(startDate, endDate) {
  const timeMin = new Date(startDate + 'T00:00:00').toISOString();
  const timeMax = new Date(endDate + 'T23:59:59').toISOString();
  const { events } = await callCalendarFunction('get-events', { timeMin, timeMax });
  return events;
}

export async function createCalendarEvent(params) {
  return callCalendarFunction('create-event', params);
}

export async function updateCalendarEvent(params) {
  return callCalendarFunction('update-event', params);
}

export async function deleteCalendarEvent(eventId) {
  return callCalendarFunction('delete-event', { eventId });
}

export async function storeCalendarToken(code, redirectUri) {
  return callCalendarFunction('store-token', { code, redirectUri });
}

export async function checkCalendarConnection() {
  try {
    const { connected } = await callCalendarFunction('check-connection');
    return Boolean(connected);
  } catch {
    // Treated as disconnected on any transport/JWT error
    return false;
  }
}