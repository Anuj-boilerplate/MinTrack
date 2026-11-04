# MinTrack

MinTrack is a React + Vite study tracker for planning an academic term, tracking subject goals, and logging focused study sessions.

## What it does

- magic-link sign in with Supabase
- term setup with start and end dates
- per-subject target hours and progress tracking
- Pomodoro-style focus sessions
- manual session logging
- offline-first session queueing with later sync to Supabase
- local backup export and import

## Tech stack

- React 19
- Vite 8
- Tailwind CSS
- Supabase
- localForage

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set the public client configuration:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_CLIENT_ID=...
```

Values with the `VITE_` prefix are included in browser assets by Vite. Use only the Supabase anon/publishable key and Google OAuth client ID here; never put a Supabase service-role key, database password, or Google OAuth client secret in a `VITE_` variable. In Netlify, keep these client configuration variables unmarked as secrets because they are intentionally public.

If Netlify's secret scanner flags these public values, add a site-level `SECRETS_SCAN_OMIT_KEYS` variable with `VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_GOOGLE_CLIENT_ID`. If the deploy log identifies Smart Detection instead, allowlist only the specific public values with `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES`. Keep scanning enabled for all other values and files.

3. Start the dev server:

```bash
npm run dev
```

## Current architecture

The active app lives in `src/` and uses `StateContext` plus `useTimer` as the canonical runtime path for local state, timer state, and cloud sync behavior.

- [Architecture diagram](docs/architecture.md)
- [Data flow diagram](docs/data-flow.md)

## Database schema

Documentation:

- [docs/database-schema.md](/C:/Users/Anuj/Alexandria/docs/database-schema.md)

SQL schema:

- [supabase/schema.sql](/C:/Users/Anuj/Alexandria/supabase/schema.sql)
