import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseConfigError } from './lib/supabaseClient';
import Auth from './components/Auth';
import { StateProvider, useStateContext } from './contexts/StateContext';
import { useTimer } from './hooks/useTimer';
import useAppRoute from './hooks/useAppRoute';
import SetupScreen from './components/screens/SetupScreen';
import TodayScreen from './components/screens/TodayScreen';
import HomeScreen from './components/screens/HomeScreen';
import TodoScreen from './components/screens/TodoScreen';
import DigestScreen from './components/screens/DigestScreen';
import GoalFormScreen from './components/screens/GoalFormScreen';
import GoalEditScreen from './components/screens/GoalEditScreen';
import GoalColorScreen from './components/screens/GoalColorScreen';
import GoalSessionLogScreen from './components/screens/GoalSessionLogScreen';
import TermsScreen from './components/screens/TermsScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import SessionsScreen from './components/screens/SessionsScreen';
import TimerScreen from './components/screens/TimerScreen';
import TimerSetupScreen from './components/screens/TimerSetupScreen';
import SessionReviewScreen from './components/screens/SessionReviewScreen';
import AppSidebar from './components/AppSidebar';
import AppHeader from './components/AppHeader';
import { getSessionRangeFromTimes, splitSessionAtMidnight, parseDateAsLocal, getStartOfDay } from './utils';
import { CalendarProvider } from './contexts/CalendarContext';
import './index.css';

function AppContent() {
  const {
    state, loading, loadError, mutationError, clearMutationError, refresh,
    addSubject, editSubject, deleteSubject, insertSessions, deleteSession, timerAction, setSubjectAccentColor
  } = useStateContext();
  const timer = useTimer(state, timerAction);
  const [route, navigate] = useAppRoute();
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered;
  const [sessionReviewData, setSessionReviewData] = useState(null);
  const routePath = route.split('?')[0];
  const queryString = route.includes('?') ? route.slice(route.indexOf('?') + 1) : '';
  const routeQuery = new URLSearchParams(queryString);

  const handleStopSession = useCallback(async () => {
    const activeSession = state.activeSession;
    if (!activeSession || activeSession.status === 'review') return;
    const stopped = await timerAction('stop_timer');
    if (!stopped) return;

    const stoppedSession = {
      ...activeSession,
      stoppedAt: stopped.stopped_at,
      totalPausedMs: Number(stopped.total_paused_ms || 0),
      isPaused: false
    };
    const subject = state.subjects.find(item => item.id === activeSession.subjectId);
    const task = activeSession.taskId ? state.todos.find(item => item.id === activeSession.taskId) : null;
    setSessionReviewData({
      subjectId: activeSession.subjectId,
      subjectName: subject?.name || 'Unknown goal',
      hours: timer.calculateNetFocusTime(stoppedSession),
      startTime: activeSession.startedAt,
      endTime: stopped.stopped_at,
      taskId: task?.id || null,
      taskTitle: task?.title || null,
      taskIsRecurring: Boolean(task?.recurrence_days?.length)
    });
    navigate('/timer/review');
  }, [navigate, state.activeSession, state.subjects, state.todos, timer, timerAction]);

  useEffect(() => {
    if (!timer.isDone || !state.activeSession) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleStopSession();
  }, [handleStopSession, timer.isDone, state.activeSession]);

  useEffect(() => {
    const active = state.activeSession;
    if (active?.status !== 'review' || sessionReviewData) return;
    const task = active.taskId ? state.todos.find(item => item.id === active.taskId) : null;
    const subject = state.subjects.find(item => item.id === active.subjectId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionReviewData({
      subjectId: active.subjectId,
      subjectName: subject?.name || 'Unknown goal',
      hours: timer.calculateNetFocusTime(active),
      startTime: active.startedAt,
      endTime: active.stoppedAt,
      taskId: task?.id || null,
      taskTitle: task?.title || null,
      taskIsRecurring: Boolean(task?.recurrence_days?.length)
    });
    navigate('/timer/review');
  }, [navigate, sessionReviewData, state.activeSession, state.subjects, state.todos, timer]);

  const handleOpenScreen = useCallback((type, subjectId = null) => {
    if (type === 'addSubject') navigate('/goals/new');
    if (type === 'editGoal' && subjectId) navigate(`/goals/edit?goal=${encodeURIComponent(subjectId)}`);
    if (type === 'logSession' && subjectId) navigate(`/sessions/new?goal=${encodeURIComponent(subjectId)}`);
    if (type === 'pomodoro' && subjectId) navigate(`/timer/setup?goal=${subjectId}`);
    if (type === 'sessionHistory') navigate('/sessions');
    if (type === 'settings') navigate('/settings');
  }, [navigate]);

  const handleAddSubject = async (name, target, deadline) => {
    const saved = await addSubject(name, target, deadline);
    if (saved) navigate('/goals');
    return saved;
  };

  const handleEditSubject = async (id, name, target, deadline) => {
    const saved = await editSubject(id, name, target, deadline);
    if (saved) navigate('/goals');
    return saved;
  };
  const handleDeleteSubject = async id => {
    const deleted = await deleteSubject(id);
    if (deleted) navigate('/goals');
    return deleted;
  };
  const handleSaveGoalColor = (id, color) => setSubjectAccentColor(id, color);

  const handleManualLog = async (subjectId, startStr, endStr, durationMins, dateStr) => {
    const refDate = dateStr ? parseDateAsLocal(dateStr) : getStartOfDay(new Date());
    const range = getSessionRangeFromTimes(startStr, endStr, refDate);
    const start = range?.start || getStartOfDay(refDate);
    const end = range?.end || new Date(start.getTime() + durationMins * 60000);
    const rows = splitSessionAtMidnight(subjectId, start.toISOString(), end.toISOString(), durationMins);
    return insertSessions(rows);
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
    navigate('/today');
    await refresh();
  };

  const handleDiscardSession = async () => {
    if (await timerAction('clear_timer')) {
      setSessionReviewData(null);
      navigate('/today');
    }
  };

  useEffect(() => {
    if (routePath === '/timer' && !state.activeSession) navigate('/goals', { replace: true });
  }, [navigate, routePath, state.activeSession]);

  useEffect(() => {
    if (routePath === '/timer/review' && !state.activeSession && !sessionReviewData) navigate('/today', { replace: true });
  }, [navigate, routePath, sessionReviewData, state.activeSession]);

  if (loading) return <div className="app-loading" role="status">Loading your study space…</div>;
  if (loadError) return <div className="app-loading app-load-error"><p>Could not load your study data: {loadError}</p><button className="primary-action" onClick={refresh}>Retry</button></div>;

  const goalId = routeQuery.get('goal');
  const goal = state.subjects.find(subject => subject.id === goalId);
  const page = !state.term ? <SetupScreen /> : (() => {
    if (routePath === '/today') return <TodayScreen navigate={navigate} />;
    if (routePath === '/goals') return <HomeScreen onOpenScreen={handleOpenScreen} />;
    if (routePath === '/goals/new') return <GoalFormScreen onSave={handleAddSubject} onCancel={() => navigate('/goals')} />;
    if (routePath === '/goals/edit') return <GoalEditScreen goal={goal} onSave={handleEditSubject} onDelete={handleDeleteSubject} onChooseColor={id => navigate(`/goals/color?goal=${encodeURIComponent(id)}`)} onBack={() => navigate('/goals')} />;
    if (routePath === '/goals/color' || routePath === '/goals/color/custom') return <GoalColorScreen goal={goal} isCustom={routePath.endsWith('/custom')} onSaveColor={handleSaveGoalColor} onBack={() => navigate(routePath.endsWith('/custom') ? `/goals/color?goal=${encodeURIComponent(goalId || '')}` : `/goals/edit?goal=${encodeURIComponent(goalId || '')}`)} onDone={() => navigate(`/goals/edit?goal=${encodeURIComponent(goalId || '')}`)} onCustom={() => navigate(`/goals/color/custom?goal=${encodeURIComponent(goalId || '')}`)} />;
    if (routePath === '/sessions/new') return <GoalSessionLogScreen goal={goal} onSave={async (id, durationMins, dateStr) => {
      const saved = await handleManualLog(id, undefined, undefined, durationMins, dateStr);
      if (saved) navigate('/goals');
      return saved;
    }} onBack={() => navigate('/goals')} />;
    if (routePath === '/tasks') return <TodoScreen isActive />;
    if (routePath === '/sessions') return <SessionsScreen onDeleteSession={deleteSession} />;
    if (routePath === '/insights') return <DigestScreen />;
    if (routePath === '/terms') return <TermsScreen />;
    if (routePath === '/settings') return <SettingsScreen />;
    if (routePath === '/timer/setup') {
      if (!goal) return <div className="empty-state"><h2>Select a goal first</h2><button className="text-action" type="button" onClick={() => navigate('/goals')}>Browse goals</button></div>;
      return <TimerSetupScreen onBack={() => navigate('/goals')} accentColor={goal.accentColor} onStart={async config => { if (await timer.startFocusSession(goal.id, config)) navigate('/timer'); }} />;
    }
    if (routePath === '/timer/review') {
      return sessionReviewData
        ? <SessionReviewScreen reviewData={sessionReviewData} accentColor={goal?.accentColor} onBack={() => navigate('/today')} onSave={handleSaveSession} onDiscard={handleDiscardSession} />
        : <div className="page-content"><p>Loading session review…</p></div>;
    }
    if (routePath === '/timer' && state.activeSession) return <TimerScreen timer={timer} onStop={handleStopSession} />;
    return <div className="empty-state"><h2>Page not found</h2><button className="text-action" type="button" onClick={() => navigate('/today')}>Go to Today</button></div>;
  })();

  if (!state.term) return <div className="workspace-onboarding">{page}</div>;

  return (
    <div className={`workspace-shell${sidebarExpanded ? ' is-sidebar-expanded' : ''}`}>
      <AppHeader route={route} navigate={navigate} />
      <AppSidebar route={route} navigate={navigate} expanded={sidebarExpanded} pinned={sidebarPinned} onExpandedChange={setSidebarPinned} onHoverChange={setSidebarHovered} />
      {mutationError && <div role="alert" className="workspace-toast">{mutationError}<button type="button" onClick={clearMutationError}>Dismiss</button></div>}
      <div className="workspace-main">
        <main className="workspace-content" key={routePath}>{page}</main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (supabaseConfigError || !supabase) return undefined;
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => setSession(currentSession));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession));
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    return () => authListener.subscription.unsubscribe();
  }, []);

  if (supabaseConfigError) return <div className="app-loading"><div className="form-panel"><h1 className="page-title">MinTrack needs configuration</h1><p>{supabaseConfigError}</p><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your hosting environment, then redeploy.</p></div></div>;
  if (!session) return <Auth />;

  return <StateProvider session={session}><CalendarProvider><AppContent /></CalendarProvider></StateProvider>;
}
