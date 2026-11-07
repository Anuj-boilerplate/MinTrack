# MinTrack architecture

This diagram shows the runtime components in the current `src/` app. The app uses Supabase for sign-in and cloud data, with local browser storage for queued changes and preferences.

```mermaid
flowchart LR
  U[Student] --> UI

  subgraph B[Browser: React 19 / Vite build]
    UI[Auth / setup / goals / tasks / digest / timer / settings]
    APP[App.jsx<br/>auth gate and screen routing]
    STATE[StateContext<br/>term / subjects / sessions / todos]
    TIMER[useTimer + Web Worker<br/>focus/break ticks]
    LS[(localStorage<br/>state snapshot / active timer / preferences)]
    IQ[(IndexedDB via localForage<br/>action_queue / session_queue)]
    SYNC[syncQueue<br/>ordered retries]
    UI --> APP
    APP --> STATE
    APP --> TIMER
    APP --> IQ
    STATE <--> LS
    STATE --> IQ
    TIMER --> STATE
    IQ --> SYNC
    STATE --> SYNC
  end

  subgraph S[Supabase project]
    AUTH[Auth<br/>email magic link or Google sign-in]
    DB[(Postgres + RLS<br/>profiles / terms / subjects / sessions / todos)]
  end

  APP <--> |session| AUTH
  STATE <--> |load and reconcile| DB
  SYNC --> |queued table writes| DB
```

## Component boundaries

| Component | Responsibility | Main source |
| --- | --- | --- |
| `App.jsx` | Checks the Supabase session, chooses screens, handles subject and session actions | `src/App.jsx` |
| `StateContext` | Loads remote records, manages local app state, and coordinates todo mutations | `src/contexts/StateContext.jsx` |
| `useTimer` and worker | Calculates focus/break phases locally; the worker sends one tick per second | `src/hooks/useTimer.js`, `public/worker.js` |
| `syncQueue` | Persists pending operations in IndexedDB and writes them to Supabase when online | `src/lib/syncQueue.js` |

The Vite output is a static browser app. Study data is stored in Supabase, while the browser keeps timer state, preferences, and pending offline work.

## Data locations

| Location | Data |
| --- | --- |
| Browser `localStorage` | App snapshot, active timer, theme and UI preferences |
| Browser IndexedDB | `MinTrack` action and session queues awaiting cloud sync |
| Supabase Postgres | Profiles, terms, subjects, sessions and todos |

Subject progress shown in the UI is recalculated from non-discarded sessions. Active timer state and preferences remain browser-local.

## External calls

| Origin | Destination | Purpose |
| --- | --- | --- |
| Browser | Supabase Auth | Session management, magic-link sign-in, Google sign-in, sign-out |
| Browser | Supabase PostgREST | Load and save user-owned study data |
| Browser | Google Fonts | Load typefaces referenced by `index.html` |

Sources: `src/App.jsx`, `src/contexts/StateContext.jsx`, `src/lib/syncQueue.js`, `supabase/schema.sql`, `index.html`.
