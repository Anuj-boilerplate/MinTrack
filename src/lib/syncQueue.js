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

  for (const action of actions) {
    let error = null;
    
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
      }

      if (!error) {
        await actionQueue.removeItem(action.id);
      } else {
        console.error(`Failed to sync action ${action.type}`, error);
      }
    } catch (err) {
      console.error(`Critical error syncing action ${action.type}`, err);
    }
  }
}

/**
 * SESSIONS QUEUE (High frequency: focus logs)
 */
export async function addSessionToQueue(sessionData) {
  const id = crypto.randomUUID();
  await sessionQueue.setItem(id, { ...sessionData, id });
  return id;
}

async function processSessionSyncQueue() {
  const keys = await sessionQueue.keys();
  if (keys.length === 0) return;

  for (const key of keys) {
    const session = await sessionQueue.getItem(key);
    
    const { error } = await supabase.from('sessions').insert({
      id: session.id,
      subject_id: session.subject_id,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      is_discarded: session.is_discarded
    });

    if (!error) {
      if (!session.is_discarded && session.new_valid_hours !== undefined) {
        await supabase.from('subjects')
          .update({ valid_hours: session.new_valid_hours })
          .eq('id', session.subject_id);
      }
      await sessionQueue.removeItem(key);
    } else {
      console.error('Failed to sync session', error);
    }
  }
}

/**
 * MAIN SYNC ENGINE
 */
export async function processSyncQueue() {
  if (!navigator.onLine) return;
  
  // Always process structural actions (deletes/edits) before logs
  await processActionQueue();
  await processSessionSyncQueue();
}

export async function removeSessionsForSubject(subjectId) {
  const keys = await sessionQueue.keys();
  for (const key of keys) {
    const session = await sessionQueue.getItem(key);
    if (session && session.subject_id === subjectId) {
      await sessionQueue.removeItem(key);
    }
  }
}
