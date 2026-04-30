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

2. Copy `.env.example` to `.env` and set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Start the dev server:

```bash
npm run dev
```

## Current architecture

The active app lives in `src/` and uses `StateContext` plus `useTimer` as the canonical runtime path for local state, timer state, and cloud sync behavior.
