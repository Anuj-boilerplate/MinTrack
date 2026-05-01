/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getStartOfDay, getDaysLeft } from '../utils';

const STATE_KEY = 'mintrack_state';

const StateContext = createContext();

export const useStateContext = () => useContext(StateContext);

function normalizeSubject(subject) {
  return {
    ...subject,
    target_hours: Number(subject.target_hours ?? subject.targetHours ?? 0),
    valid_hours: Number(subject.valid_hours ?? subject.validHours ?? 0),
    carryover: Number(subject.carryover ?? 0),
    completed_today: Number(subject.completed_today ?? 0),
    discarded_time_total: Number(subject.discarded_time_total ?? 0),
    discarded_time_today: Number(subject.discarded_time_today ?? 0)
  };
}

function normalizeState(rawState = {}) {
  const normalizedTerm = rawState.term ? {
    startDate: rawState.term.startDate && !rawState.term.startDate.includes('T')
      ? new Date(rawState.term.startDate).toISOString()
      : rawState.term.startDate,
    endDate: rawState.term.endDate && !rawState.term.endDate.includes('T')
      ? new Date(rawState.term.endDate).toISOString()
      : rawState.term.endDate
  } : null;

  const activeSession = rawState.activeSession ? {
    ...rawState.activeSession,
    startedAt: rawState.activeSession.startedAt || new Date(rawState.activeSession.startTime).toISOString(),
    lastNotifiedPhaseId: rawState.activeSession.lastNotifiedPhaseId || null
  } : null;

  return {
    term: normalizedTerm,
    subjects: Array.isArray(rawState.subjects) ? rawState.subjects.map(normalizeSubject) : [],
    activeSession,
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
  const initInFlightRef = useRef(null);
  const initializedUserRef = useRef(null);

  const saveState = (newState = state) => {
    localStorage.setItem(STATE_KEY, JSON.stringify(newState));
  };

  // Load and patch state on mount
  async function initState(userId) {
    if (!userId || initInFlightRef.current === userId || initializedUserRef.current === userId) {
      return;
    }

    initInFlightRef.current = userId;

    try {
    let localState = localStorage.getItem(STATE_KEY);
    localState = localState ? JSON.parse(localState) : null;

    // Default empty state
    let patchedState = normalizeState(localState || {
      term: null,
      subjects: [],
      activeSession: null,
      last_updated_date: new Date().toISOString()
    });

    // Daily Updates Logic
    if (patchedState.term && patchedState.last_updated_date) {
      let loopDate = getStartOfDay(new Date(patchedState.last_updated_date));
      const todayDate = getStartOfDay();

      while (loopDate < todayDate) {
        if (getDaysLeft(loopDate, patchedState.term.endDate) < 0) break;
        patchedState.subjects.forEach(sub => {
          sub.completed_today = 0;
          sub.discarded_time_today = 0;
        });
        loopDate.setDate(loopDate.getDate() + 1);
        patchedState.last_updated_date = loopDate.toISOString();
      }

      if (getDaysLeft(todayDate, patchedState.term.endDate) >= 0) {
        if (getStartOfDay(new Date(patchedState.last_updated_date)).getTime() !== todayDate.getTime()) {
          patchedState.last_updated_date = todayDate.toISOString();
        }
      }
    }

    // Sync with Supabase (Reconciliation)
    const { data: dbProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    const { data: dbSubjects } = await supabase.from('subjects').select('*').eq('user_id', userId);

    // Profile (Term) Reconciliation
    if (patchedState.term && !dbProfile?.term_start_date) {
      // Migrate local term to Supabase
      await supabase.from('profiles').upsert({
        id: userId,
        term_start_date: patchedState.term.startDate,
        term_end_date: patchedState.term.endDate
      });
    } else if (dbProfile?.term_start_date && dbProfile?.term_end_date) {
      // Use Supabase term
      patchedState.term = {
        startDate: dbProfile.term_start_date,
        endDate: dbProfile.term_end_date
      };
    }

    if ((!dbSubjects || dbSubjects.length === 0) && patchedState.subjects.length > 0) {
      // Migrate local subjects exactly once using stable IDs.
      const toInsert = patchedState.subjects.map(s => ({
        id: s.id || crypto.randomUUID(),
        user_id: userId,
        name: s.name,
        target_hours: s.targetHours || s.target_hours, // Handle legacy keys
        valid_hours: s.validHours || s.valid_hours
      }));
      await supabase.from('subjects').upsert(toInsert);
      patchedState.subjects = toInsert.map(s => ({...s, completed_today: 0, discarded_time_today: 0, discarded_time_total: 0}));
    } else if (dbSubjects && dbSubjects.length > 0) {
      // Merge db subjects with local transient fields (completed_today)
      patchedState.subjects = dbSubjects.map(dbSub => {
        const localSub = patchedState.subjects.find(ls => ls.id === dbSub.id) || {};
        return {
          ...dbSub,
          // Safety net: Use the higher value of valid_hours between DB and local storage
          valid_hours: Math.max(dbSub.valid_hours || 0, localSub.valid_hours || 0),
          completed_today: localSub.completed_today || 0,
          discarded_time_today: localSub.discarded_time_today || 0,
          discarded_time_total: localSub.discarded_time_total || 0
        };
      });
    }

    const normalizedState = normalizeState(patchedState);
    setState(normalizedState);
    saveState(normalizedState);
    initializedUserRef.current = userId;
    setLoading(false);
    } finally {
      initInFlightRef.current = null;
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
  const updateState = (updater) => {
    setState(prev => {
      const candidate = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const next = normalizeState(candidate);
      saveState(next);
      return next;
    });
  };

  return (
    <StateContext.Provider value={{ state, updateState, loading, userId: session?.user?.id }}>
      {children}
    </StateContext.Provider>
  );
};
