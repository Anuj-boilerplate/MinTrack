import localforage from 'localforage';
import { supabase } from './supabaseClient';

// Initialize IndexedDB instance for sessions
const sessionQueue = localforage.createInstance({
  name: 'MinTrack',
  storeName: 'session_queue'
});

export async function addSessionToQueue(sessionData) {
  const id = crypto.randomUUID();
  await sessionQueue.setItem(id, { ...sessionData, id });
  return id;
}

export async function processSyncQueue() {
  if (!navigator.onLine) return; // Only process if online
  
  const keys = await sessionQueue.keys();
  if (keys.length === 0) return;

  console.log(`Processing ${keys.length} items in sync queue...`);
  
  for (const key of keys) {
    const session = await sessionQueue.getItem(key);
    
    // Attempt Supabase insert
    const { error } = await supabase.from('sessions').insert({
      id: session.id,
      subject_id: session.subject_id,
      start_time: session.start_time,
      end_time: session.end_time,
      duration_minutes: session.duration_minutes,
      is_discarded: session.is_discarded
    });

    if (!error) {
      // Successfully synced, remove from queue
      await sessionQueue.removeItem(key);
    } else {
      console.error('Failed to sync session', error);
      // It stays in the queue to retry later
    }
  }
}
