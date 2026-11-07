# MinTrack data flow

This diagram follows data through startup, edits, offline sync and focus sessions. Solid arrows are writes or requests; arrows pointing back into state are reads or responses.

```mermaid
flowchart TD
  U[Student action] --> AUTH{Signed in?}
  AUTH --> |No| LOGIN[Supabase Auth<br/>magic link or Google sign-in]
  LOGIN --> BOOT
  AUTH --> |Yes| BOOT[Startup reconciliation]

  LOCAL[(localStorage<br/>app snapshot)] --> |cached state| BOOT
  DB[(Supabase tables<br/>profiles / terms / subjects / sessions / todos)] --> |parallel reads| BOOT
  BOOT --> |merge remote rows with queued local changes| STATE[React StateContext]
  STATE --> |debounced snapshot| LOCAL
  STATE --> VIEW[Goals / tasks / digest / timer UI]

  U --> |term / subject / todo edit| EDIT[Mutation handlers]
  EDIT --> |optimistic update| STATE
  EDIT --> |pending action| AQ[(IndexedDB<br/>action_queue)]

  U --> |focus timer or manual log| TIMER[useTimer + worker<br/>compute focus minutes; split at midnight]
  TIMER --> |active timer / saved session| STATE
  TIMER --> |pending session, including discard| SQ[(IndexedDB<br/>session_queue)]

  AQ --> FLUSH[Sync sweep<br/>after action, online event, or 60 s]
  SQ --> FLUSH
  FLUSH --> |actions first, then session upserts| DB
  DB --> |successful write: remove queue item| FLUSH
  DB --> |next startup read| BOOT
```

## How to read the paths

1. **Startup:** Supabase Auth supplies the user session. `StateContext` fetches remote records and merges queued local changes into React state.
2. **Edits and logs:** The UI updates React state immediately. Subject, profile and todo writes enter `action_queue`; saved or discarded sessions enter `session_queue`.
3. **Cloud sync:** The queue is swept after user actions, when the browser comes online, and every 60 seconds. Successful items leave IndexedDB; failed items remain for a later attempt.
4. **Focus timer:** The worker emits ticks. `useTimer` calculates elapsed focus time in the browser; finishing opens a review step. Saving creates session rows and queues them. The active timer itself stays in the browser snapshot.

## API route map

| Route / SDK call | Caller | Purpose |
| --- | --- | --- |
| Supabase Auth SDK | Browser | User sign-in and session token |
| Supabase table SDK | Browser | Read and write profiles, terms, subjects, sessions and todos |
| Google Fonts | Browser | Load typefaces referenced by `index.html` |

Smart task date recognition uses `chrono-node` locally and makes no parsing API call. Google sign-in uses Supabase Auth.

Sources: `src/components/Auth.jsx`, `src/contexts/StateContext.jsx`, `src/App.jsx`, `src/hooks/useTimer.js`, `src/lib/syncQueue.js`.
