import { useCallback, useState, useEffect } from 'react';
import { supabase, supabaseConfigError } from './lib/supabaseClient';
import Auth from './components/Auth';
import { StateProvider, useStateContext } from './contexts/StateContext';
import { useTimer } from './hooks/useTimer';

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
import { getSessionRangeFromTimes, splitSessionAtMidnight, parseDateAsLocal, getStartOfDay } from './utils';
import { CalendarProvider } from './contexts/CalendarContext';
import { APP_VERSION } from './config';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from './components/TopBar';
import ThemeTransitionOverlay from './components/ThemeTransitionOverlay';

import './index.css';

// The inner app that has access to the StateContext
function AppContent() {
  const { state, loading, loadError, mutationError, clearMutationError, refresh,
    addSubject, editSubject, deleteSubject, insertSessions, deleteSession, timerAction,
    isTransitioning, transitionToTheme, onTransitionDone } = useStateContext();
  const timer = useTimer(state, timerAction);

  const [activeModal, setActiveModal] = useState(() => (
    !localStorage.getItem(`seen_update_${APP_VERSION}`) ? { type: 'update' } : null
  )); // { type, subjectId }
  const [sessionReviewData, setSessionReviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('goals');

  const handleStopSession = useCallback(async () => {
    const activeSession = state.activeSession;
    if (!activeSession || activeSession.status === 'review') return;

    const stopped = await timerAction('stop_timer');
    if (!stopped) return;

    const { subjectId } = activeSession;
    const stoppedSession = { ...activeSession, stoppedAt: stopped.stopped_at,
      totalPausedMs: Number(stopped.total_paused_ms || 0), isPaused: false };
    const hours = timer.calculateNetFocusTime(stoppedSession);
    const sub = state.subjects.find((s) => s.id === subjectId);

    const linkedTask = activeSession.taskId
      ? state.todos.find(t => t.id === activeSession.taskId)
      : null;
    setSessionReviewData({
      subjectId,
      subjectName: sub?.name || 'Unknown Subject',
      hours,
      startTime: activeSession.startedAt,
      endTime: stopped.stopped_at,
      taskId: linkedTask ? linkedTask.id : null,
      taskTitle: linkedTask ? linkedTask.title : null,
      taskIsRecurring: linkedTask?.recurrence_days?.length > 0 || false
    });
    setActiveModal({ type: 'sessionReview' });
  }, [state.activeSession, state.subjects, state.todos, timer, timerAction]);

  useEffect(() => {
    if (!timer.isDone || !state.activeSession) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleStopSession();
  }, [handleStopSession, timer.isDone, state.activeSession]);

  const handleOpenModal = useCallback((type, subjectId = null) => {
    setActiveModal({ type, subjectId });
  }, []);

  useEffect(() => {
    const active = state.activeSession;
    if (active?.status !== 'review' || sessionReviewData) return;
    const linkedTask = active.taskId ? state.todos.find(t => t.id === active.taskId) : null;
    const subject = state.subjects.find(s => s.id === active.subjectId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionReviewData({
      subjectId: active.subjectId,
      subjectName: subject?.name || 'Unknown Subject',
      hours: timer.calculateNetFocusTime(active),
      startTime: active.startedAt,
      endTime: active.stoppedAt,
      taskId: linkedTask?.id || null,
      taskTitle: linkedTask?.title || null,
      taskIsRecurring: Boolean(linkedTask?.recurrence_days?.length)
    });
    setActiveModal({ type: 'sessionReview' });
  }, [state.activeSession, state.todos, state.subjects, sessionReviewData, timer]);

  const handleAddSubject = async (name, target, deadline) => {
    if (await addSubject(name, target, deadline)) setActiveModal(null);
  };

  const handleEditSubject = async (id, name, target, deadline) => {
    const res = await editSubject(id, name, target, deadline);
    if (res) setActiveModal(null);
    return res;
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Are you sure you want to delete this goal and its sessions?')) return false;
    const res = await deleteSubject(id);
    if (res) setActiveModal(null);
    return res;
  };

  const handleManualLog = async (subjectId, startStr, endStr, durationMins, dateStr) => {
    const refDate = dateStr ? parseDateAsLocal(dateStr) : getStartOfDay(new Date());
    const range = getSessionRangeFromTimes(startStr, endStr, refDate);
    let startTimeISO, endTimeISO;
    if (range) {
      startTimeISO = range.start.toISOString();
      endTimeISO = range.end.toISOString();
    } else {
      const start = getStartOfDay(refDate);
      startTimeISO = start.toISOString();
      endTimeISO = new Date(start.getTime() + durationMins * 60000).toISOString();
    }
    const rows = splitSessionAtMidnight(subjectId, startTimeISO, endTimeISO, durationMins);
    if (await insertSessions(rows)) setActiveModal(null);
  };

  const handleSaveSession = async (data, markTaskComplete) => {
    const rows = splitSessionAtMidnight(data.subjectId, data.startTime, data.endTime, data.hours * 60);
    const saved = await timerAction('complete_timer', {
      p_sessions: rows.map(row => ({
        id: row.id, start_time: row.start_time, end_time: row.end_time,
        duration_minutes: row.duration_minutes
      })),
      p_mark_task_completed: Boolean(markTaskComplete)
    });
    if (!saved) return;
    setSessionReviewData(null);
    setActiveModal(null);
    await refresh();
  };

  const handleDiscardSession = async () => {
    if (await timerAction('clear_timer')) {
      setSessionReviewData(null);
      setActiveModal(null);
    }
  };

  const handleDeleteSession = async (_subjectId, sessionId) => {
    await deleteSession(sessionId);
  };
  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-secondary">Loading your study data…</div>;
  if (loadError) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
    <p className="text-text-primary">Could not load your study data: {loadError}</p>
    <button className="primary-btn" onClick={refresh}>Retry</button>
  </div>;

  const currentModal = activeModal?.type;
  const activeSubjectData = activeModal?.subjectId ? state.subjects.find(s => s.id === activeModal.subjectId) : null;
  const activeAccentColor = activeSubjectData?.accentColor || '#c97b6e';

  return (
    <div className={`app-shell ${currentModal ? 'modal-active' : ''}`}>
      {mutationError && <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] rounded-xl bg-[#4a1c1c] text-[#ffdddd] px-5 py-3 text-sm shadow-xl">
        {mutationError} <button className="ml-3 underline" onClick={clearMutationError}>Dismiss</button>
      </div>}
      {!state.term ? (
        <SetupScreen />
      ) : (
        <>
          <TopBar onOpenSettings={() => handleOpenModal('settings')} />
          <AnimatePresence mode="wait">
            {state.activeSession && state.activeSession.status !== 'review' ? (
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
            onStart={async (config) => {
              if (await timer.startFocusSession(activeModal.subjectId, config)) setActiveModal(null);
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
            <p>Add these in Netlify under Site configuration â†’ Environment variables:</p>
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

