import { useCallback, useState, useEffect } from 'react';
import { supabase, supabaseConfigError } from './lib/supabaseClient';
import Auth from './components/Auth';
import { StateProvider, useStateContext } from './contexts/StateContext';
import { useTimer } from './hooks/useTimer';
import { addSessionToQueue, processSyncQueue } from './lib/syncQueue';

import SetupScreen from './components/screens/SetupScreen';
import HomeScreen from './components/screens/HomeScreen';
import TimerScreen from './components/screens/TimerScreen';

import AddSubjectModal from './components/modals/AddSubjectModal';
import EditSubjectModal from './components/modals/EditSubjectModal';
import ManualLogModal from './components/modals/ManualLogModal';
import SettingsModal from './components/modals/SettingsModal';
import PomodoroConfigModal from './components/modals/PomodoroConfigModal';
import SessionReviewModal from './components/modals/SessionReviewModal';
import UpdateModal from './components/modals/UpdateModal';
import { getSessionRangeFromTimes } from './utils';

import './index.css';

// The inner app that has access to the StateContext
function AppContent() {
  const { state, updateState, loading, userId } = useStateContext();
  const timer = useTimer(state, updateState);

  const APP_VERSION = '1.2';
  const [activeModal, setActiveModal] = useState(() => (
    !localStorage.getItem(`seen_update_${APP_VERSION}`) ? { type: 'update' } : null
  )); // { type, subjectId }
  const [sessionReviewData, setSessionReviewData] = useState(null);

  const handleStopSession = useCallback(() => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const { subjectId } = activeSession;
    const hours = timer.calculateNetFocusTime();
    const sub = state.subjects.find((s) => s.id === subjectId);

    timer.clearSession();

    if (hours < 0.25) {
      updateState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) => s.id === subjectId ? {
          ...s,
          discarded_time_total: (s.discarded_time_total || 0) + hours,
          discarded_time_today: (s.discarded_time_today || 0) + hours
        } : s)
      }));
      return;
    }

    setSessionReviewData({
      subjectId,
      subjectName: sub?.name || 'Unknown Subject',
      hours,
      startTime: activeSession.startedAt || new Date(activeSession.startTime).toISOString()
    });
    setActiveModal({ type: 'sessionReview' });
  }, [state.activeSession, state.subjects, timer, updateState]);

  useEffect(() => {
    const interval = setInterval(processSyncQueue, 60000);
    window.addEventListener('online', processSyncQueue);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', processSyncQueue);
    };
  }, []);

  useEffect(() => {
    if (!timer.isDone || !state.activeSession) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleStopSession();
  }, [handleStopSession, timer.isDone, state.activeSession]);

  const toggleTheme = () => {
    let current = document.documentElement.getAttribute('data-theme') || 'dark';
    let next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const handleAddSubject = async (name, target) => {
    const newId = crypto.randomUUID();
    const newSubject = { id: newId, name, target_hours: target, valid_hours: 0, carryover: 0 };

    updateState(prev => ({
      ...prev,
      subjects: [...prev.subjects, newSubject]
    }));
    setActiveModal(null);

    // Sync to Supabase
    if (userId) {
      await supabase.from('subjects').insert({
        id: newId,
        user_id: userId,
        name: name,
        target_hours: target,
        valid_hours: 0
      });
    }
  };

  const handleEditSubject = async (id, name, target) => {
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === id ? { ...s, name, target_hours: target } : s)
    }));
    setActiveModal(null);

    // Sync to Supabase
    if (userId) {
      await supabase.from('subjects').update({
        name: name,
        target_hours: target
      }).eq('id', id);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (confirm("Are you sure you want to delete this subject?")) {
      updateState(prev => ({ ...prev, subjects: prev.subjects.filter(s => s.id !== id) }));
      setActiveModal(null);

      // Sync to Supabase
      if (userId) {
        await supabase.from('subjects').delete().eq('id', id);
      }
    }
  };

  const handleManualLog = async (subjectId, startStr, endStr, durationMins) => {
    const hours = durationMins / 60;
    const range = getSessionRangeFromTimes(startStr, endStr);
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === subjectId ? { ...s, valid_hours: (s.valid_hours || 0) + hours, completed_today: (s.completed_today || 0) + hours } : s)
    }));
    setActiveModal(null);

    // Offline queue
    await addSessionToQueue({
      subject_id: subjectId,
      start_time: range?.start.toISOString() || new Date().toISOString(),
      end_time: range?.end.toISOString() || new Date().toISOString(),
      duration_minutes: durationMins,
      is_discarded: false
    });
  };

  const handleSaveSession = async (data) => {
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === data.subjectId ? { ...s, valid_hours: (s.valid_hours || 0) + data.hours, completed_today: (s.completed_today || 0) + data.hours } : s)
    }));
    setActiveModal(null);
    setSessionReviewData(null);
    await addSessionToQueue({ subject_id: data.subjectId, start_time: data.startTime, end_time: new Date().toISOString(), duration_minutes: data.hours * 60, is_discarded: false });
  };

  const handleDiscardSession = async (data) => {
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === data.subjectId ? { ...s, discarded_time_total: (s.discarded_time_total || 0) + data.hours, discarded_time_today: (s.discarded_time_today || 0) + data.hours } : s)
    }));
    setActiveModal(null);
    setSessionReviewData(null);
    await addSessionToQueue({ subject_id: data.subjectId, start_time: data.startTime, end_time: new Date().toISOString(), duration_minutes: data.hours * 60, is_discarded: true });
  };

  if (loading) return null;

  const currentModal = activeModal?.type;
  const activeSubjectData = activeModal?.subjectId ? state.subjects.find(s => s.id === activeModal.subjectId) : null;

  return (
    <div className={`app-shell ${currentModal ? 'modal-active' : ''}`}>
      {!state.term ? (
        <SetupScreen />
      ) : state.activeSession ? (
        <TimerScreen timer={timer} onStop={handleStopSession} />
      ) : (
        <HomeScreen
          onOpenModal={(type, subjectId = null) => setActiveModal({ type, subjectId })}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Modals */}
      {currentModal === 'addSubject' && <AddSubjectModal onClose={() => setActiveModal(null)} onAdd={handleAddSubject} />}
      {currentModal === 'editSubject' && <EditSubjectModal key={activeSubjectData?.id} subject={activeSubjectData} onClose={() => setActiveModal(null)} onSave={handleEditSubject} onDelete={handleDeleteSubject} />}
      {currentModal === 'manualLog' && <ManualLogModal onClose={() => setActiveModal(null)} onLog={handleManualLog} />}
      {currentModal === 'settings' && <SettingsModal onClose={() => setActiveModal(null)} />}

      {currentModal === 'pomodoro' && (
        <PomodoroConfigModal
          onClose={() => setActiveModal(null)}
          onStart={(config) => {
            timer.startFocusSession(activeModal.subjectId, config);
            setActiveModal(null);
          }}
        />
      )}

      {currentModal === 'sessionReview' && (
        <SessionReviewModal reviewData={sessionReviewData} onSave={handleSaveSession} onDiscard={handleDiscardSession} />
      )}

      {currentModal === 'update' && (
        <UpdateModal onClose={() => {
          localStorage.setItem(`seen_update_${APP_VERSION}`, "true");
          setActiveModal(null);
        }} />
      )}
    </div>
  );
}

// Wrapper to handle Auth and State Provider
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (supabaseConfigError || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (supabaseConfigError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-8">
        <div className="glass-panel w-full max-w-[560px]">
          <h1 className="text-display mb-5 text-text-primary tracking-tight">MinTrack needs configuration</h1>
          <p className="text-text-secondary mb-9">
            {supabaseConfigError}
          </p>
          <div className="text-sm text-text-secondary space-y-3">
            <p>Add these in Netlify under Site configuration → Environment variables:</p>
            <p><code>VITE_SUPABASE_URL</code></p>
            <p><code>VITE_SUPABASE_ANON_KEY</code></p>
            <p>Then trigger a fresh deploy.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <StateProvider session={session}>
      <AppContent />
    </StateProvider>
  );
}
