/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStartOfDay } from '../utils';

const STATE_KEY = 'mintrack_state';

const StateContext = createContext();

export const useStateContext = () => useContext(StateContext);

function normalizeSubject(subject) {
  return {
    ...subject,
    target_hours: Number(subject.target_hours ?? 0),
    valid_hours: Number(subject.valid_hours ?? 0),
    carryover: Number(subject.carryover ?? 0),
    completed_today: Number(subject.completed_today ?? 0),
    paused_time_total: Number(subject.paused_time_total ?? 0),
    paused_time_today: Number(subject.paused_time_today ?? 0),
    deadline: subject.deadline ? new Date(subject.deadline).toISOString() : null
  };
}

function normalizeState(rawState = {}) {
  const normalizedTerm = rawState.term ? {
    startDate: rawState.term.startDate?.includes('T') 
      ? rawState.term.startDate 
      : new Date(rawState.term.startDate).toISOString(),
    endDate: rawState.term.endDate?.includes('T') 
      ? rawState.term.endDate 
      : new Date(rawState.term.endDate).toISOString()
  } : null;

  return {
    term: normalizedTerm,
    subjects: Array.isArray(rawState.subjects) ? rawState.subjects.map(normalizeSubject) : [],
    activeSession: rawState.activeSession ? {
      ...rawState.activeSession,
      startedAt: rawState.activeSession.startedAt || new Date(rawState.activeSession.startTime).toISOString(),
    } : null,
    last_updated_date: rawState.last_updated_date || new Date().toISOString()
  };
}

export const StateProvider = ({ children, session }) => {
  const [state, setState] = useState({
    term: null,
    subjects: [],
    activeSession: null,
    last_updated_date: null
  });
  
  const [loading, setLoading] = useState(true);
  const initializedUserRef = useRef(null);

  const saveState = (newState) => {
    localStorage.setItem(STATE_KEY, JSON.stringify(newState));
  };

  // Load and patch state on mount
  async function initState(userId) {
    if (!userId || initializedUserRef.current === userId) return;
    initializedUserRef.current = userId;

    try {
      const localData = localStorage.getItem(STATE_KEY);
      let patchedState = normalizeState(localData ? JSON.parse(localData) : {});

      // Simple Daily Reset: If the last update was before today, reset daily stats
      const lastUpdate = getStartOfDay(new Date(patchedState.last_updated_date));
      const today = getStartOfDay();

      if (lastUpdate.getTime() < today.getTime()) {
        patchedState.subjects.forEach(sub => {
          sub.completed_today = 0;
          sub.paused_time_today = 0;
        });
        patchedState.last_updated_date = today.toISOString();
      }

      // Sync with Supabase
      const [{ data: dbProfile }, { data: dbSubjects }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('subjects').select('*').eq('user_id', userId)
      ]);

      // Profile (Term) Reconciliation
      if (dbProfile?.term_start_date) {
        patchedState.term = { startDate: dbProfile.term_start_date, endDate: dbProfile.term_end_date };
      } else if (patchedState.term) {
        await supabase.from('profiles').upsert({ id: userId, term_start_date: patchedState.term.startDate, term_end_date: patchedState.term.endDate });
      }

      // Subjects Reconciliation
      if (dbSubjects?.length > 0) {
        patchedState.subjects = dbSubjects.map(dbSub => {
          const localSub = patchedState.subjects.find(ls => ls.id === dbSub.id) || {};
          return {
            ...dbSub,
            valid_hours: Math.max(dbSub.valid_hours || 0, localSub.valid_hours || 0),
            completed_today: localSub.completed_today || 0,
            paused_time_today: localSub.paused_time_today || 0,
            paused_time_total: localSub.paused_time_total || 0
          };
        });
      } else if (patchedState.subjects.length > 0) {
        const toInsert = patchedState.subjects.map(s => ({ ...s, user_id: userId }));
        await supabase.from('subjects').upsert(toInsert);
      }

      updateState(patchedState);
      setLoading(false);
    } catch (err) {
      console.error("Initialization failed", err);
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!session?.user) return;
    if (initializedUserRef.current !== session.user.id) {
      setLoading(true);
    }
    initState(session.user.id);
  }, [session]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Wrapper to update state and save automatically
  function updateState(updater) {
    setState(prev => {
      const candidate = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const next = normalizeState(candidate);
      saveState(next);
      return next;
    });
  }

  const logout = async () => {
    localStorage.removeItem(STATE_KEY);
    await supabase.auth.signOut();
  };

  return (
    <StateContext.Provider value={{ state, updateState, logout, loading, userId: session?.user?.id }}>
      {children}
    </StateContext.Provider>
  );
};
