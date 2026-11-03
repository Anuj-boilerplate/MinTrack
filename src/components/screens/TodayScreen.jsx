import { useMemo } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { formatHoursToMins, toLocalDateString } from '../../utils';
import { getTodosForDate } from '../../utils/todoHelpers';

export default function TodayScreen({ navigate }) {
  const { state, toggleTodoCompleted } = useStateContext();
  const today = toLocalDateString();
  const todaysTasks = useMemo(() => getTodosForDate(state.todos || [], today), [state.todos, today]);
  const minutesStudied = state.subjects.flatMap(subject => subject.sessions || [])
    .filter(session => !session.is_discarded && toLocalDateString(new Date(session.start_time)) === today)
    .reduce((total, session) => total + (session.duration_minutes || 0), 0);
  const completedCount = todaysTasks.filter(task => task.is_completed).length;

  return (
    <section className="page-content today-page">
      <div className="page-heading-row"><div><p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1 className="page-title">Today</h1><p className="page-description">A clear plan for your next study session.</p></div><button className="primary-action" type="button" onClick={() => navigate(state.activeSession ? '/timer' : '/goals')}>{state.activeSession ? 'Open timer' : 'Start studying'}</button></div>

      <div className="today-stats-grid">
        <article className="today-stat"><span>Study time today</span><strong>{formatHoursToMins(minutesStudied / 60)}</strong></article>
        <article className="today-stat"><span>Tasks complete</span><strong>{completedCount}<small> / {todaysTasks.length}</small></strong></article>
        <article className="today-stat"><span>Active goals</span><strong>{state.subjects.length}</strong></article>
      </div>

      <div className="today-columns">
        <section className="content-panel"><div className="panel-heading-row"><div><h2 className="section-title">Today’s plan</h2><p className="panel-description">Small steps add up.</p></div><button type="button" className="text-action" onClick={() => navigate('/tasks')}>Open tasks</button></div>
          {todaysTasks.length ? <div className="today-task-list">{todaysTasks.slice(0, 8).map(task => <label className={`today-task${task.is_completed ? ' is-complete' : ''}`} key={task.id}><input type="checkbox" checked={Boolean(task.is_completed)} onChange={() => toggleTodoCompleted(task.id)} /><span>{task.title}</span></label>)}</div> : <div className="inline-empty"><p>No tasks planned for today.</p><button type="button" className="text-action" onClick={() => navigate('/tasks')}>Add a task</button></div>}
        </section>

        <section className="content-panel"><div className="panel-heading-row"><div><h2 className="section-title">Your goals</h2><p className="panel-description">{state.term?.name || 'Current term'}</p></div><button type="button" className="text-action" onClick={() => navigate('/goals')}>View goals</button></div>
          {state.subjects.length ? <div className="today-goal-list">{state.subjects.slice(0, 5).map(subject => <button className="today-goal-row" key={subject.id} type="button" onClick={() => navigate(`/timer/setup?goal=${subject.id}`)}><span className="goal-color-dot" style={{ backgroundColor: subject.accentColor }} /><span className="today-goal-name">{subject.name}</span><span className="today-goal-hours">{formatHoursToMins(subject.valid_hours || 0)} / {formatHoursToMins(subject.target_hours || 0)}</span></button>)}</div> : <div className="inline-empty"><p>No goals yet for this term.</p><button className="text-action" type="button" onClick={() => navigate('/goals/new')}>Create a goal</button></div>}
        </section>
      </div>
    </section>
  );
}
