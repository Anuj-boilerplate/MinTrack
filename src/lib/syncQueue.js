import localforage from 'localforage';
import { supabase } from './supabaseClient';

// Initialize IndexedDB instances
const sessionQueue = localforage.createInstance({
  name: 'MinTrack',
  storeName: 'session_queue'
});

const actionQueue = localforage.createInstance({
  name: 'MinTrack',
  storeName: 'action_queue'
});

/**
 * ACTIONS QUEUE (General purpose: subjects, profiles, etc.)
 */
export async function addActionToQueue(action) {
  const id = crypto.randomUUID();
  console.log(`%c📦 [SyncQueue] Queuing action locally: ${action.type}`, 'color: #3b82f6; font-weight: bold;', {
    id,
    subjectId: action.subjectId,
    payload: action.payload
  });
  await actionQueue.setItem(id, { ...action, id, timestamp: Date.now() });
  return id;
}

async function processActionQueue() {
  const keys = await actionQueue.keys();
  if (keys.length === 0) return;

  // Sort by timestamp to ensure sequential order
  const actions = [];
  for (const key of keys) {
    actions.push(await actionQueue.getItem(key));
  }
  actions.sort((a, b) => a.timestamp - b.timestamp);

  console.log(`%c🔄 [SyncQueue] Processing ${actions.length} action(s)...`, 'color: #8b5cf6;');

  for (const action of actions) {
    let error = null;
    console.log(`[SyncQueue] Syncing action ${action.type} (ID: ${action.id})...`);

    try {
      switch (action.type) {
        case 'INSERT_SUBJECT':
          ({ error } = await supabase.from('subjects').insert(action.payload));
          break;
        case 'UPDATE_SUBJECT':
          ({ error } = await supabase.from('subjects').update(action.payload).eq('id', action.subjectId));
          break;
        case 'DELETE_SUBJECT':
          // Delete sessions first due to FK
          await supabase.from('sessions').delete().eq('subject_id', action.subjectId);
          ({ error } = await supabase.from('subjects').delete().eq('id', action.subjectId));
          break;
        case 'UPDATE_PROFILE':
          ({ error } = await supabase.from('profiles').update(action.payload).eq('id', action.userId));
          break;
        case 'DELETE_ALL_DATA':
          await supabase.from('subjects').delete().eq('user_id', action.userId);
          ({ error } = await supabase.from('profiles').update({ term_start_date: null, term_end_date: null }).eq('id', action.userId));
          break;
        case 'INSERT_TODO':
          ({ error } = await supabase.from('todos').insert({
            id: action.payload.id,
            subject_id: action.payload.subject_id,
            title: action.payload.title,
            is_completed: action.payload.is_completed,
            scheduled_for_today: action.payload.scheduled_for_today,
            created_at: action.payload.created_at
          }));
          break;
        case 'UPDATE_TODO': {
          const updatePayload = {};
          if (action.payload.title !== undefined) updatePayload.title = action.payload.title;
          if (action.payload.is_completed !== undefined) updatePayload.is_completed = action.payload.is_completed;
          if (action.payload.scheduled_for_today !== undefined) updatePayload.scheduled_for_today = action.payload.scheduled_for_today;
          ({ error } = await supabase.from('todos').update(updatePayload).eq('id', action.todoId));
          break;
        }
        case 'DELETE_TODO':
          ({ error } = await supabase.from('todos').delete().eq('id', action.todoId));
          break;
      }

      if (!error) {
        console.log(`%c✅ [SyncQueue] Successfully synced action ${action.type} (ID: ${action.id})`, 'color: #10b981;');
        await actionQueue.removeItem(action.id);
      } else {
        console.error(`%c❌ [SyncQueue] Failed to sync action ${action.type} (ID: ${action.id}):`, 'color: #ef4444;', error);
      }
    } catch (err) {
      console.error(`%c❌ [SyncQueue] Critical error syncing action ${action.type} (ID: ${action.id}):`, 'color: #ef4444;', err);
    }
  }
}

/**
 * SESSIONS QUEUE (High frequency: focus logs)
 */
export async function addSessionToQueue(sessionData) {
  const id = sessionData.id || crypto.randomUUID();
  const rawDuration = Number(sessionData.duration_minutes);
  const duration = isNaN(rawDuration) ? 0 : Math.round(rawDuration);

  console.log('%c📦 [SyncQueue] Queuing session locally:', 'color: #3b82f6; font-weight: bold;', {
    id,
    subject_id: sessionData.subject_id,
    duration_minutes: duration,
    is_discarded: sessionData.is_discarded
  });

  await sessionQueue.setItem(id, {
    ...sessionData,
    duration_minutes: duration,
    id
  });
  return id;
}

async function processSessionSyncQueue() {
  const keys = await sessionQueue.keys();
  if (keys.length === 0) return;

  console.log(`%c🔄 [SyncQueue] Processing ${keys.length} session(s)...`, 'color: #8b5cf6;');

  for (const key of keys) {
    const session = await sessionQueue.getItem(key);
    if (!session) continue;

    const rawDuration = Number(session.duration_minutes);
    const duration = isNaN(rawDuration) ? 0 : Math.round(rawDuration);

    console.log(`[SyncQueue] Syncing session (ID: ${session.id}, duration: ${duration}m, subject_id: ${session.subject_id})...`);

    const { error } = await supabase.from('sessions').upsert({
      id: session.id,
      subject_id: session.subject_id,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: duration,
      is_discarded: session.is_discarded
    }, { onConflict: 'id' });

    if (!error) {
      console.log(`%c✅ [SyncQueue] Successfully synced session (ID: ${session.id})`, 'color: #10b981;');
      await sessionQueue.removeItem(key);
    } else {
      console.error(`%c❌ [SyncQueue] Failed to sync session (ID: ${session.id}):`, 'color: #ef4444;', error);

      // Handle foreign key constraint violation (subject doesn't exist)
      if (error.code === '23503') {
        const actionKeys = await actionQueue.keys();
        let hasPendingInsert = false;
        for (const actionKey of actionKeys) {
          const action = await actionQueue.getItem(actionKey);
          if (action && action.type === 'INSERT_SUBJECT' && action.payload && action.payload.id === session.subject_id) {
            hasPendingInsert = true;
            break;
          }
        }

        if (!hasPendingInsert) {
          console.warn(`%c⚠️ [SyncQueue] Subject ${session.subject_id} does not exist and has no pending insert. Discarding session ${session.id} from queue.`, 'color: #f59e0b;');
          await sessionQueue.removeItem(key);
        } else {
          console.log(`[SyncQueue] Session ${session.id} will retry after its parent subject is inserted.`);
        }
      }
    }
  }
}

/**
 * MAIN SYNC ENGINE
 */
export async function processSyncQueue() {
  if (!navigator.onLine) {
    console.warn('%c⚠️ [SyncQueue] Device is offline. Skipping sync sweep.', 'color: #f59e0b;');
    return;
  }

  const actionKeys = await actionQueue.keys();
  const sessionKeys = await sessionQueue.keys();

  if (actionKeys.length === 0 && sessionKeys.length === 0) {
    return;
  }

  console.log(`%c🔄 [SyncQueue] Starting sync sweep. Pending actions: ${actionKeys.length}, Pending sessions: ${sessionKeys.length}`, 'color: #8b5cf6; font-weight: bold;');

  // Always process structural actions (deletes/edits) before logs
  await processActionQueue();
  await processSessionSyncQueue();

  console.log('%c✨ [SyncQueue] Sync sweep completed.', 'color: #10b981; font-weight: bold;');
}

export async function removeSessionsForSubject(subjectId) {
  const keys = await sessionQueue.keys();
  let count = 0;
  for (const key of keys) {
    const session = await sessionQueue.getItem(key);
    if (session && session.subject_id === subjectId) {
      await sessionQueue.removeItem(key);
      count++;
    }
  }
  if (count > 0) {
    console.log(`%c🧹 [SyncQueue] Removed ${count} local queued session(s) for deleted subject ${subjectId}`, 'color: #6b7280;');
  }
}
