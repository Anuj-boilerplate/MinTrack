import { useCallback, useState, useEffect } from 'react';
import { supabase, supabaseConfigError } from './lib/supabaseClient';
import Auth from './components/Auth';
import { StateProvider, useStateContext, useUserContext } from './contexts/StateContext';
import { useTimer } from './hooks/useTimer';
import { addSessionToQueue, processSyncQueue, removeSessionsForSubject, removeSessionFromQueue, addActionToQueue } from './lib/syncQueue';

import SetupScreen from './components/screens/SetupScreen';
import HomeScreen from './components/screens/HomeScreen';
import TimerScreen from './components/screens/TimerScreen';
import Navbar from './components/Navbar';
import TodoScreen from './components/screens/TodoScreen';
import DigestScreen from './components/screens/DigestScreen';

import AddSubjectModal from './components/modals/AddSubjectModal';

import SettingsModal from './components/modals/SettingsModal';
import SessionHistoryModal from './components/modals/SessionHistoryModal';
import PomodoroConfigModal from './components/modals/PomodoroConfigModal';
import SessionReviewModal from './components/modals/SessionReviewModal';
import UpdateModal from './components/modals/UpdateModal';
import { getSessionRangeFromTimes, splitSessionAtMidnight, calculateDailyTarget, parseDateAsLocal } from './utils';
import { CalendarProvider } from './contexts/CalendarContext';
import { APP_VERSION } from './config';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from './components/TopBar';
import ThemeTransitionOverlay from './components/ThemeTransitionOverlay';

import './index.css';

// Debounced wrapper — batches rapid post-action sync triggers into one call.
// The 60s interval and the online listener in useEffect use processSyncQueue directly
// since those are intentional timed sweeps, not user-action bursts.
let _syncDebounceTimer = null;
function scheduleSyncQueue() {
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(() => {
    _syncDebounceTimer = null;
    processSyncQueue();
  }, 600);
}

// The inner app that has access to the StateContext
function AppContent() {
  const { state, updateState, loading, isTransitioning, transitionToTheme, onTransitionDone, toggleTodoCompleted, toggleTodoScratched } = useStateContext();
  const { userId } = useUserContext();
  const timer = useTimer(state, updateState);

  const [activeModal, setActiveModal] = useState(() => (
    !localStorage.getItem(`seen_update_${APP_VERSION}`) ? { type: 'update' } : null
  )); // { type, subjectId }
  const [sessionReviewData, setSessionReviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('goals');

  const handleStopSession = useCallback(() => {
    const activeSession = state.activeSession;
    if (!activeSession) return;

    const { subjectId } = activeSession;
    const hours = timer.calculateNetFocusTime();
    const sub = state.subjects.find((s) => s.id === subjectId);

    const { totalPausedMs = 0, isPaused, pausedAt } = activeSession;
    const currentPausedSessionMs = isPaused ? (Date.now() - pausedAt) : 0;
    const finalTotalPausedMs = totalPausedMs + currentPausedSessionMs;
    const pausedHours = finalTotalPausedMs / (1000 * 60 * 60);

    timer.clearSession();

    updateState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => s.id === subjectId ? {
        ...s,
        paused_time_total: (s.paused_time_total || 0) + pausedHours,
        paused_time_today: (s.paused_time_today || 0) + pausedHours
      } : s)
    }));

    const linkedTask = activeSession.taskId
      ? state.todos.find(t => t.id === activeSession.taskId)
      : null;
    setSessionReviewData({
      subjectId,
      subjectName: sub?.name || 'Unknown Subject',
      hours,
      startTime: activeSession.startedAt || new Date(activeSession.startTime).toISOString(),
      taskId: linkedTask ? linkedTask.id : null,
      taskTitle: linkedTask ? linkedTask.title : null,
      taskIsRecurring: linkedTask?.recurrence_days?.length > 0 || false
    });
    setActiveModal({ type: 'sessionReview' });
  }, [state.activeSession, state.subjects, state.todos, timer, updateState]);

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

  const handleOpenModal = useCallback((type, subjectId = null) => {
    setActiveModal({ type, subjectId });
  }, []);

  const handleAddSubject = async (name, target, deadline) => {
    const newId = crypto.randomUUID();
    const newSubject = {
      id: newId,
      name,
      target_hours: target,
      valid_hours: 0,
      deadline,
      sessions: [],
      daily_target: calculateDailyTarget(
        { target_hours: target, valid_hours: 0, deadline, sessions: [] },
        state.term?.endDate
      )
    };

    updateState(prev => ({
      ...prev,
      subjects: [...prev.subjects, newSubject]
    }));
    setActiveModal(null);

    // Sync to Supabase via Queue
    if (userId) {
      await addActionToQueue({
        type: 'INSERT_SUBJECT',
        payload: {
          id: newId,
          user_id: userId,
          name: name,
          target_hours: target,
          valid_hours: 0,
          deadline: deadline,
          accent_color: '#c97b6e'
        }
      });
      scheduleSyncQueue();
    }
  };

  const handleEditSubject = async (id, name, target, deadline) => {
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === id ? { ...s, name, target_hours: target, deadline } : s)
    }));
    setActiveModal(null);

    // Sync to Supabase via Queue
    if (userId) {
      await addActionToQueue({
        type: 'UPDATE_SUBJECT',
        subjectId: id,
        payload: { name: name, target_hours: target, deadline }
      });
      scheduleSyncQueue();
    }
  };

  const handleDeleteSubject = async (id) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      updateState(prev => ({ ...prev, subjects: prev.subjects.filter(s => s.id !== id) }));
      setActiveModal(null);

      // Sync to Supabase via Queue
      if (userId) {
        await removeSessionsForSubject(id);
        await addActionToQueue({
          type: 'DELETE_SUBJECT',
          subjectId: id
        });
        scheduleSyncQueue();
      }
    }
  };

  const handleManualLog = async (subjectId, startStr, endStr, durationMins, dateStr) => {
    const refDate = dateStr ? parseDateAsLocal(dateStr) : new Date();
    const range = getSessionRangeFromTimes(startStr, endStr, refDate);
    
    const startTimeISO = range?.start.toISOString() || refDate.toISOString();
    const endTimeISO = range?.end.toISOString() || refDate.toISOString();

    const newSessions = splitSessionAtMidnight(subjectId, startTimeISO, endTimeISO, durationMins);

    updateState(prev => {
      return {
        ...prev,
        subjects: prev.subjects.map(s => s.id === subjectId
          ? {
            ...s,
            sessions: [...newSessions, ...(s.sessions || [])]
          }
          : s)
      };
    });
    setActiveModal(null);

    for (const session of newSessions) {
      await addSessionToQueue(session);
    }

    // We still call processSyncQueue but the queue handles it
    scheduleSyncQueue();
  };

  const handleSaveSession = async (data) => {
    const startTimeISO = data.startTime;
    const endTimeISO = new Date().toISOString();
    const durationMins = data.hours * 60;

    const newSessions = splitSessionAtMidnight(data.subjectId, startTimeISO, endTimeISO, durationMins);

    updateState(prev => {
      return {
        ...prev,
        subjects: prev.subjects.map(s => s.id === data.subjectId
          ? {
            ...s,
            sessions: [...newSessions, ...(s.sessions || [])]
          }
          : s)
      };
    });
    
    setActiveModal(null);
    setSessionReviewData(null);

    for (const session of newSessions) {
      await addSessionToQueue(session);
    }

    scheduleSyncQueue();
  };

  const handleDiscardSession = async (data) => {
    setActiveModal(null);
    setSessionReviewData(null);
    await addSessionToQueue({ subject_id: data.subjectId, start_time: data.startTime, end_time: new Date().toISOString(), duration_minutes: data.hours * 60, is_discarded: true });
  };

  const handleDeleteSession = async (subjectId, sessionId) => {
    updateState(prev => ({
      ...prev,
      subjects: prev.subjects.map(s =>
        s.id === subjectId
          ? { ...s, sessions: s.sessions.filter(sess => sess.id !== sessionId) }
          : s
      )
    }));

    if (userId) {
      await removeSessionFromQueue(sessionId);
      await addActionToQueue({ type: 'DELETE_SESSION', sessionId });
      scheduleSyncQueue();
    }
  };

  if (loading) return null;

  const currentModal = activeModal?.type;
  const activeSubjectData = activeModal?.subjectId ? state.subjects.find(s => s.id === activeModal.subjectId) : null;
  const activeAccentColor = activeSubjectData?.accentColor || '#c97b6e';

  return (
    <div className={`app-shell ${currentModal ? 'modal-active' : ''}`}>
      {!state.term ? (
        <SetupScreen />
      ) : (
        <>
          <TopBar onOpenSettings={() => handleOpenModal('settings')} />
          <AnimatePresence mode="wait">
            {state.activeSession ? (
              <TimerScreen key="timer-screen" timer={timer} onStop={handleStopSession} />
            ) : (
              <div key="main-app" className="contents">
                <motion.div
                  className="flex-grow flex flex-col w-full"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className={activeTab === 'goals' ? 'flex-grow flex flex-col w-full' : 'hidden'}>
                    <HomeScreen
                      isActive={activeTab === 'goals'}
                      onOpenModal={handleOpenModal}
                      onLogSession={handleManualLog}
                      onEditSubject={handleEditSubject}
                      onDeleteSubject={handleDeleteSubject}
                    />
                  </div>
                  <div className={activeTab === 'todo' ? 'flex-grow flex flex-col w-full' : 'hidden'}>
                    <TodoScreen isActive={activeTab === 'todo'} />
                  </div>
                  <div className={activeTab === 'analytics' ? 'flex-grow flex flex-col w-full' : 'hidden'}>
                    <DigestScreen />
                  </div>
                </motion.div>
                <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {isTransitioning && (
        <ThemeTransitionOverlay targetTheme={transitionToTheme} onDone={onTransitionDone} />
      )}

      {/* Modals */}
      <AnimatePresence mode="wait">
        {currentModal === 'addSubject' && (
          <AddSubjectModal key="addSubject" onClose={() => setActiveModal(null)} onAdd={handleAddSubject} />
        )}

        {currentModal === 'settings' && (
          <SettingsModal
            key="settings"
            onClose={() => setActiveModal(null)}
            onOpenHistory={() => setActiveModal({ type: 'sessionHistory' })}
          />
        )}

        {currentModal === 'sessionHistory' && (
          <SessionHistoryModal
            key="sessionHistory"
            subjects={state.subjects}
            onClose={() => setActiveModal(null)}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {currentModal === 'pomodoro' && (
          <PomodoroConfigModal
            key="pomodoro"
            accentColor={activeAccentColor}
            onClose={() => setActiveModal(null)}
            onStart={(config) => {
              timer.startFocusSession(activeModal.subjectId, config);
              setActiveModal(null);
            }}
          />
        )}

        {currentModal === 'sessionReview' && (
          <SessionReviewModal
            key="sessionReview"
            reviewData={sessionReviewData}
            accentColor={activeAccentColor}
            onSave={handleSaveSession}
            onDiscard={handleDiscardSession}
            onCompleteTask={(taskId, isRecurring) => {
              if (isRecurring) {
                toggleTodoScratched(taskId);
              } else {
                toggleTodoCompleted(taskId);
              }
            }}
          />
        )}

        {currentModal === 'update' && (
          <UpdateModal
            key="update"
            onClose={() => {
              localStorage.setItem(`seen_update_${APP_VERSION}`, "true");
              setActiveModal(null);
            }}
          />
        )}
      </AnimatePresence>
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
        <div className="glass-panel w-full max-w-[580px]">
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
      <CalendarProvider>
        <AppContent />
      </CalendarProvider>
    </StateProvider>
  );
}
