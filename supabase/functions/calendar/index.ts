/* global Deno */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function exchangeGoogleToken(params) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  return res.json();
}

async function refreshGoogleToken(refreshToken) {
  return exchangeGoogleToken({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
}

async function getAccessToken(supabase, user) {
  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow) return { error: "not_connected", status: 404 };

  const isExpired = !tokenRow.token_expires_at || new Date(tokenRow.token_expires_at) < new Date();
  if (!isExpired) {
    return { accessToken: tokenRow.access_token, refreshToken: tokenRow.refresh_token };
  }

  const refreshed = await refreshGoogleToken(tokenRow.refresh_token);
  if (refreshed.error) {
    return { error: "token_refresh_failed", status: 401 };
  }

  await supabase
    .from("google_tokens")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
    })
    .eq("user_id", user.id);

  return { accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token || tokenRow.refresh_token };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { action, ...params } = body;

  if (action === "store-token") {
    const { code, redirectUri } = params;
    if (!code || !redirectUri) {
      return json({ error: "Missing code or redirectUri" }, 400);
    }

    const tokens = await exchangeGoogleToken({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    if (!tokens.refresh_token) {
      return json(
        { error: "No refresh token received. User may need to re-consent.", detail: tokens.error_description || null },
        400
      );
    }

    await supabase.from("google_tokens").upsert({
      user_id: user.id,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });

    return json({ success: true });
  }

  // Lightweight probe — does the user have stored tokens? (no Google API call)
  if (action === "check-connection") {
    const { data: tokenRow } = await supabase
      .from("google_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return json({ connected: Boolean(tokenRow) });
  }

  const token = await getAccessToken(supabase, user);
  if (token.error) {
    return json({ error: token.error }, token.status);
  }

  if (action === "get-events") {
    const { timeMin, timeMax } = params;
    if (!timeMin || !timeMax) return json({ error: "Missing timeMin or timeMax" }, 400);

    const url =
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
      `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      "&singleEvents=true&orderBy=startTime&maxResults=50";

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      return json({ error: data.error?.message || "Google Calendar request failed" }, 502);
    }

    const events = (data.items || []).map((e) => ({
      id: e.id,
      summary: e.summary || "(No title)",
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      allDay: !e.start?.dateTime,
    }));

    return json({ events });
  }

  if (action === "create-event") {
    const { summary, date, description, recurrence, iCalUID } = params;
    if (!summary || !date) return json({ error: "Missing summary or date" }, 400);

    const body = {
      summary,
      description: description || undefined,
      start: { date },
      // All-day events use exclusive end dates — one day covers a single day
      end: { date: addDays(date, 1) },
      reminders: { useDefault: true },
    };

    if (Array.isArray(recurrence) && recurrence.length > 0) {
      body.recurrence = [buildWeeklyRrule(recurrence)];
    }
    if (iCalUID) {
      body.iCalUID = iCalUID;
    }

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      return json({ error: data.error?.message || "Google Calendar request failed" }, 502);
    }

    return json({ eventId: data.id, link: data.htmlLink });
  }

  if (action === "update-event") {
    const { eventId, summary, date, description, recurrence } = params;
    if (!eventId || !date) return json({ error: "Missing eventId or date" }, 400);

    const body = {
      summary: summary || undefined,
      description: description || undefined,
      start: { date },
      end: { date: addDays(date, 1) },
      reminders: { useDefault: true },
    };
    if (Array.isArray(recurrence) && recurrence.length > 0) {
      body.recurrence = [buildWeeklyRrule(recurrence)];
    } else {
      body.recurrence = [];
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (res.status === 404) {
      // The event was deleted natively in Google — heal by recreating it
      return json({ missing: true });
    }
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data.error?.message || "Google Calendar request failed" }, 502);
    }

    return json({ eventId: data.id, link: data.htmlLink });
  }

  if (action === "delete-event") {
    const { eventId } = params;
    if (!eventId) return json({ error: "Missing eventId" }, 400);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token.accessToken}` } }
    );

    if (res.status === 404) {
      // Already gone natively — treat as success
      return json({ success: true });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return json({ error: data.error?.message || "Google Calendar request failed" }, 502);
    }

    return json({ success: true });
  }

  return json({ error: "Unknown action" }, 400);
});

// Adds days to a YYYY-MM-DD date string (returns YYYY-MM-DD in the same calendar)
function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

// Maps MinTrack recurrence days (0=Sun … 6=Sat) to a weekly RRULE
function buildWeeklyRrule(recurrence) {
  const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const byDay = [...recurrence].sort((a, b) => a - b).map((d) => DAY_CODES[d]).join(",");
  return `FREQ=WEEKLY;BYDAY=${byDay}`;
}